export const DEFAULT_CONFIG = {
  server_url: '',
  token: '',
  client_identifier: 'gladys-plex-integration',
};

export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    server_url: String(raw.server_url ?? DEFAULT_CONFIG.server_url)
      .trim()
      .replace(/\/$/, ''),
    token: String(raw.token ?? DEFAULT_CONFIG.token).trim(),
    client_identifier: String(raw.client_identifier ?? DEFAULT_CONFIG.client_identifier).trim(),
  };
}
