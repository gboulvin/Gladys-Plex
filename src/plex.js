const JSON_HEADERS = { Accept: 'application/json' };

function buildHeaders(config) {
  return {
    ...JSON_HEADERS,
    'X-Plex-Token': config.token,
    'X-Plex-Client-Identifier': config.client_identifier,
    'X-Plex-Product': 'Gladys Plex Integration',
    'X-Plex-Version': '1.0.0',
  };
}

async function request(config, path, options = {}) {
  if (!config.server_url) {
    throw new Error(
      'Plex Media Server URL is required. Use its LAN address, for example http://192.168.1.20:32400.',
    );
  }
  let server;
  try {
    server = new URL(config.server_url);
  } catch (error) {
    throw new Error(`Invalid Plex Media Server URL: ${config.server_url}`, { cause: error });
  }
  if (['localhost', '127.0.0.1', '::1'].includes(server.hostname)) {
    throw new Error(
      `Plex URL ${config.server_url} points to the integration container. Use the Plex server LAN address instead, for example http://192.168.1.20:32400.`,
    );
  }
  const target = `${config.server_url}${path}`;
  let response;
  try {
    response = await fetch(target, {
      ...options,
      headers: { ...buildHeaders(config), ...(options.headers ?? {}) },
    });
  } catch (error) {
    const code = error.cause?.code;
    if (code === 'ECONNREFUSED') {
      throw new Error(
        `Connection refused by Plex at ${config.server_url}. Check the LAN address, port 32400 and Plex network access from the Gladys host.`,
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

export async function getServerIdentity(config) {
  const response = await request(config, '/identity');
  return (await response.json()).MediaContainer ?? {};
}

export async function getSessions(config) {
  const response = await request(config, '/status/sessions');
  const container = (await response.json()).MediaContainer ?? {};
  const metadata = container.Metadata ?? [];
  return Array.isArray(metadata) ? metadata : [metadata];
}

export async function getClients(config) {
  const response = await request(config, '/clients');
  const container = (await response.json()).MediaContainer ?? {};
  const clients = container.Server ?? [];
  return Array.isArray(clients) ? clients : [clients];
}

export async function sendTimeline(config, session, state) {
  const params = new URLSearchParams({
    key: session.key ?? '',
    ratingKey: String(session.ratingKey ?? ''),
    state,
    time: String(session.viewOffset ?? 0),
    duration: String(session.duration ?? 0),
  });
  await request(config, `/:/timeline?${params.toString()}`, { method: 'POST' });
}

export async function terminateSession(config, sessionId) {
  const params = new URLSearchParams({ sessionId, reason: 'Controlled by Gladys' });
  await request(config, `/status/sessions/terminate?${params.toString()}`, { method: 'POST' });
}

export function normalizeSession(session) {
  const player = session.Player ?? {};
  return {
    sessionId: session.session?.id ?? session.Session?.id ?? null,
    key: session.key ?? null,
    ratingKey: session.ratingKey ?? null,
    title: session.grandparentTitle
      ? `${session.grandparentTitle} — ${session.title}`
      : (session.title ?? 'Plex'),
    state: session.Player?.state ?? 'stopped',
    viewOffset: Number(session.viewOffset ?? 0),
    duration: Number(session.duration ?? 0),
    playerId: player.machineIdentifier ?? player.uuid ?? player.title ?? null,
    playerTitle: player.title ?? player.product ?? 'Plex player',
  };
}
