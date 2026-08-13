const PLAYBACK_EVENTS = new Map([
  ['media.play', 'playing'],
  ['media.resume', 'playing'],
  ['media.pause', 'paused'],
  ['media.stop', 'stopped'],
]);

export function parsePlexWebhook(body) {
  if (body && typeof body === 'object') {
    const payload = body.payload ?? body;
    return typeof payload === 'string' ? JSON.parse(payload) : payload;
  }
  if (typeof body !== 'string') throw new Error('Plex webhook body is missing');
  try {
    return JSON.parse(body);
  } catch {
    const match = body.match(
      /name=["']payload["'][^\r\n]*\r?\n(?:[^\r\n]*\r?\n)?\r?\n([\s\S]*?)\r?\n--/i,
    );
    if (!match) throw new Error('Plex webhook payload field not found');
    return JSON.parse(match[1]);
  }
}

export function playbackFromWebhook(payload) {
  const state = PLAYBACK_EVENTS.get(payload?.event);
  if (!state) return null;
  const player = payload.Player ?? {};
  const metadata = payload.Metadata ?? {};
  return {
    state,
    sessionId: null,
    playerId: player.uuid ?? player.title ?? null,
    playerTitle: player.title ?? 'Plex player',
    title: metadata.grandparentTitle
      ? `${metadata.grandparentTitle} — ${metadata.title}`
      : (metadata.title ?? ''),
  };
}
