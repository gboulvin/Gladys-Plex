import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getIdentity, getSessions, normalizeSession, stopSession } from '../src/plex.js';

const realFetch = globalThis.fetch;
const config = {
  server_url: 'http://192.168.1.20:32400',
  token: 'plex-token',
  client_identifier: 'gladys-test',
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('getSessions requests official Plex JSON sessions with required headers', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, json: async () => ({ MediaContainer: { Metadata: [] } }) };
  };
  assert.deepEqual(await getSessions(config), []);
  assert.equal(request.url, 'http://192.168.1.20:32400/status/sessions');
  assert.equal(request.options.headers.Accept, 'application/json');
  assert.equal(request.options.headers['X-Plex-Token'], 'plex-token');
  assert.equal(request.options.headers['X-Plex-Client-Identifier'], 'gladys-test');
});

test('stopSession uses the official server-side termination endpoint', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, text: async () => '' };
  };
  await stopSession(config, 'session-42');
  assert.match(request.url, /\/status\/sessions\/terminate\?sessionId=session-42/);
  assert.equal(request.options.method, 'POST');
});

test('getIdentity rejects a container-local Plex URL before making a request', async () => {
  await assert.rejects(
    () => getIdentity({ ...config, server_url: 'http://localhost:32400' }),
    /points to the integration container/,
  );
});

test('getIdentity returns a useful refused-connection error', async () => {
  globalThis.fetch = async () => {
    const error = new TypeError('fetch failed');
    error.cause = { code: 'ECONNREFUSED' };
    throw error;
  };
  await assert.rejects(() => getIdentity(config), /Connection refused by Plex.*port 32400/);
});

test('normalizeSession extracts the session, player, state and title', () => {
  assert.deepEqual(
    normalizeSession({
      Session: { id: 'session-1' },
      title: 'Pilot',
      grandparentTitle: 'Show',
      Player: { machineIdentifier: 'player-1', title: 'Living room', state: 'playing' },
    }),
    {
      sessionId: 'session-1',
      playerId: 'player-1',
      playerTitle: 'Living room',
      state: 'playing',
      title: 'Show — Pilot',
    },
  );
});
