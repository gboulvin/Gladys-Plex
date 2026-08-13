import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlexWebhook, playbackFromWebhook } from '../src/webhook.js';

const playEvent = {
  event: 'media.play',
  Player: { uuid: 'player-1', title: 'Living room' },
  Metadata: { grandparentTitle: 'Show', title: 'Episode' },
};

test('parsePlexWebhook accepts the payload field provided by multipart parsers', () => {
  assert.deepEqual(parsePlexWebhook({ payload: JSON.stringify(playEvent) }), playEvent);
});

test('parsePlexWebhook extracts Plex multipart payloads', () => {
  const body = `--boundary\r\nContent-Disposition: form-data; name="payload"\r\n\r\n${JSON.stringify(playEvent)}\r\n--boundary--\r\n`;
  assert.deepEqual(parsePlexWebhook(body), playEvent);
});

test('playbackFromWebhook maps documented playback events to Gladys states', () => {
  assert.deepEqual(playbackFromWebhook(playEvent), {
    state: 'playing',
    sessionId: null,
    playerId: 'player-1',
    playerTitle: 'Living room',
    title: 'Show — Episode',
  });
  assert.equal(playbackFromWebhook({ event: 'media.pause', Player: {} }).state, 'paused');
  assert.equal(playbackFromWebhook({ event: 'media.stop', Player: {} }).state, 'stopped');
  assert.equal(playbackFromWebhook({ event: 'library.new' }), null);
});
