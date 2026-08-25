const ACCEPT_JSON = 'application/json';
const READ_TIMEOUT_MS = 5_000;
const COMMAND_TIMEOUT_MS = 2_500;
let commandId = 0;

const PLAYER_COMMAND_PATHS = {
  play: '/player/playback/play',
  pause: '/player/playback/pause',
  previous: '/player/playback/skipPrevious',
  next: '/player/playback/skipNext',
};

function headers(config) {
  return {
    Accept: ACCEPT_JSON,
    'X-Plex-Client-Identifier': config.client_identifier,
    'X-Plex-Product': 'Gladys Plex Integration',
    'X-Plex-Version': '1.0.0',
    'X-Plex-Token': config.token,
  };
}

async function request(config, path, options = {}) {
  if (!config.server_url) {
    throw new Error(
      'Plex Media Server URL is required. Use its LAN address, for example http://192.168.1.20:32400.',
    );
  }
  let url;
  try {
    url = new URL(path, `${config.server_url}/`);
  } catch (error) {
    throw new Error(`Invalid Plex Media Server URL: ${config.server_url}`, { cause: error });
  }
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(
      `Plex URL ${config.server_url} points to the integration container. Use the Plex server LAN address instead.`,
    );
  }
  const { timeoutMs = READ_TIMEOUT_MS, headers: extraHeaders, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: { ...headers(config), ...(extraHeaders ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(`Plex request timed out after ${timeoutMs} ms at ${config.server_url}`, {
        cause: error,
      });
    }
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(
        `Connection refused by Plex at ${config.server_url}. Check the LAN address, port 32400 and firewall.`,
        { cause: error },
      );
    }
    throw new Error(`Unable to reach Plex at ${config.server_url}: ${error.message}`, {
      cause: error,
    });
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Plex HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return response;
}

export async function getIdentity(config) {
  const response = await request(config, '/identity');
  return (await response.json()).MediaContainer ?? {};
}

export async function getSessions(config) {
  const response = await request(config, '/status/sessions');
  const sessions = (await response.json()).MediaContainer?.Metadata ?? [];
  return Array.isArray(sessions) ? sessions : [sessions];
}

export async function stopSession(config, sessionId) {
  if (!sessionId) throw new Error('Cannot stop a Plex session without a session id');
  const query = new URLSearchParams({ sessionId, reason: 'Stopped by Gladys' });
  await request(config, `/status/sessions/terminate?${query.toString()}`, {
    method: 'POST',
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
}

function commandMediaType(mediaType) {
  if (mediaType === 'track') return 'music';
  if (mediaType === 'photo') return 'photo';
  return 'video';
}

/**
 * Send a best-effort command to the Plex player currently attached to a session.
 * Plex Media Server proxies this legacy player-control route to the target client.
 */
export async function playerCommand(config, playerId, command, mediaType, parameters = {}) {
  if (!playerId) throw new Error('No active Plex player can receive this command');
  const path = PLAYER_COMMAND_PATHS[command];
  if (!path && command !== 'volume') throw new Error(`Unsupported Plex player command: ${command}`);
  commandId += 1;
  const query = new URLSearchParams({
    type: commandMediaType(mediaType),
    commandID: String(commandId),
    ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
  });
  await request(config, `${path ?? '/player/playback/setParameters'}?${query.toString()}`, {
    timeoutMs: COMMAND_TIMEOUT_MS,
    headers: { 'X-Plex-Target-Client-Identifier': playerId },
  });
}

export function normalizeSession(raw) {
  const player = raw.Player ?? {};
  const rawVolume = Number(player.volume);
  return {
    sessionId: raw.Session?.id ?? raw.session?.id ?? null,
    playerId: player.machineIdentifier ?? player.uuid ?? player.title ?? null,
    playerTitle: player.title ?? player.product ?? 'Plex player',
    state: player.state ?? 'stopped',
    title: raw.grandparentTitle ? `${raw.grandparentTitle} — ${raw.title}` : (raw.title ?? ''),
    mediaType: raw.type ?? 'video',
    volume: Number.isFinite(rawVolume) ? Math.min(100, Math.max(0, rawVolume)) : null,
  };
}
