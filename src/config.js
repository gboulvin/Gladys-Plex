export const DEFAULT_CONFIG = {
  server_url: 'http://localhost:32400',
  token: '',
  client_identifier: 'gladys-plex-integration',
  player_name: '',
  poll_frequency: 30,
};

export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    server_url: String(raw.server_url ?? DEFAULT_CONFIG.server_url).replace(/\/$/, ''),
    token: String(raw.token ?? DEFAULT_CONFIG.token).trim(),
    client_identifier: String(raw.client_identifier ?? DEFAULT_CONFIG.client_identifier).trim(),
    poll_frequency: Number(raw.poll_frequency ?? DEFAULT_CONFIG.poll_frequency),
  };
}
