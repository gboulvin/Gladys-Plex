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
  const response = await fetch(`${config.server_url}${path}`, {
    ...options,
    headers: { ...buildHeaders(config), ...(options.headers ?? {}) },
  });
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
