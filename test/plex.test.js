import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSession } from '../src/plex.js';

test('normalizeSession parses a standard Plex session', () => {
  const raw = {
    session: { id: 'session-123' },
    key: '/library/metadata/1',
    ratingKey: '1',
    title: 'Interstellar',
    viewOffset: 1000,
    duration: 10000,
    Player: {
      state: 'playing',
      machineIdentifier: 'player-abc',
      title: 'Living Room TV',
    },
  };
  const normalized = normalizeSession(raw);
  assert.equal(normalized.sessionId, 'session-123');
  assert.equal(normalized.title, 'Interstellar');
  assert.equal(normalized.state, 'playing');
  assert.equal(normalized.playerId, 'player-abc');
  assert.equal(normalized.playerTitle, 'Living Room TV');
});

test('normalizeSession handles TV show titles', () => {
  const raw = {
    grandparentTitle: 'Breaking Bad',
    title: 'Pilot',
    Player: { state: 'paused' },
  };
  const normalized = normalizeSession(raw);
  assert.equal(normalized.title, 'Breaking Bad — Pilot');
  assert.equal(normalized.state, 'paused');
});
