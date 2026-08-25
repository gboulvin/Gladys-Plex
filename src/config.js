export const DEFAULT_CONFIG = {
  server_url: '',
  token: '',
  client_identifier: 'gladys-plex-integration',
  session_refresh_seconds: 10,
};

function clampSessionRefresh(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CONFIG.session_refresh_seconds;
  return Math.min(60, Math.max(2, Math.round(parsed)));
}

export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    server_url: String(raw.server_url ?? DEFAULT_CONFIG.server_url)
      .trim()
      .replace(/\/$/, ''),
    token: String(raw.token ?? DEFAULT_CONFIG.token).trim(),
    client_identifier: String(raw.client_identifier ?? DEFAULT_CONFIG.client_identifier).trim(),
    session_refresh_seconds: clampSessionRefresh(
      raw.session_refresh_seconds ?? DEFAULT_CONFIG.session_refresh_seconds,
    ),
  };
}
