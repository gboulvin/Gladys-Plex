import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { PLEX_SERVER_FEATURE, plexServer } from '../src/devices/plexServer.js';
import { PlexMonitor } from '../src/monitor.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { assertGladysDeviceContract, assertGladysStateContract } from './helpers/gladysContract.js';

const realFetch = globalThis.fetch;
const config = {
  server_url: 'http://192.168.1.20:32400',
  token: 'plex-token',
  client_identifier: 'gladys-test',
  session_refresh_seconds: 10,
};

function activeSession({ state = 'playing', volume = 32, type = 'track' } = {}) {
  return {
    type,
    Session: { id: 'active' },
    grandparentTitle: 'Artist',
    title: 'Song',
    Player: { machineIdentifier: 'player-1', title: 'Living room', state, volume },
  };
}

function sessionResponse(session = activeSession()) {
  return {
    ok: true,
    json: async () => ({ MediaContainer: { Metadata: session ? [session] : [] } }),
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('Plex discovery publishes contract-valid basic player features without Gladys polling', () => {
  const gladys = createFakeGladys();
  const devices = [plexServer.buildDevice(gladys, config)];
  assertGladysDeviceContract(devices);
  assert.equal(devices[0].poll_frequency, undefined);
  assert.deepEqual(
    devices[0].features.map((feature) => ({ category: feature.category, type: feature.type })),
    [
      { category: 'music', type: 'play' },
      { category: 'music', type: 'pause' },
      { category: 'television', type: 'stop' },
      { category: 'music', type: 'previous' },
      { category: 'music', type: 'next' },
      { category: 'music', type: 'volume' },
      { category: 'music', type: 'playback_state' },
      { category: 'text', type: 'text' },
    ],
  );
});

test('session monitor publishes playback, title and volume while deduplicating unchanged polls', async () => {
  globalThis.fetch = async () => sessionResponse();
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
  await monitor.refresh();
  await monitor.refresh();
  assertGladysStateContract(gladys.publishedStates);
  assert.deepEqual(gladys.publishedStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:playback-state', state: 1 },
    { device_feature_external_id: 'ext:test:plex-server:server:volume', state: 32 },
  ]);
  assert.deepEqual(gladys.publishedTextStates, [
    {
      device_feature_external_id: 'ext:test:plex-server:server:now-playing',
      text: 'Artist — Song',
    },
  ]);
  monitor.stop();
});

test('Plex webhook updates the numeric scene state and current title immediately', async () => {
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
  await monitor.applyWebhook({
    state: 'paused',
    sessionId: null,
    playerId: 'p1',
    playerTitle: 'TV',
    title: 'Episode',
  });
  assertGladysStateContract(gladys.publishedStates);
  assert.deepEqual(gladys.publishedStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:playback-state', state: 0 },
  ]);
  assert.deepEqual(gladys.publishedTextStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:now-playing', text: 'Episode' },
  ]);
  monitor.stop();
});

test('Stop control terminates the selected active Plex session', async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith('/status/sessions')) return sessionResponse();
    return { ok: true, text: async () => '' };
  };
  const gladys = createFakeGladys();
  const device = plexServer.buildDevice(gladys, config);
  const stopFeature = device.features.find((feature) => feature.type === 'stop');
  const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
  await plexServer.onSetValue(gladys, { device, feature: stopFeature, value: 1, monitor });
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/status\/sessions\/terminate\?sessionId=active/);
  monitor.stop();
});

test('Play, Pause, Previous and Next target the current Plex player', async () => {
  const commands = [
    [PLEX_SERVER_FEATURE.PLAY, '/player/playback/play'],
    [PLEX_SERVER_FEATURE.PAUSE, '/player/playback/pause'],
    [PLEX_SERVER_FEATURE.PREVIOUS, '/player/playback/skipPrevious'],
    [PLEX_SERVER_FEATURE.NEXT, '/player/playback/skipNext'],
  ];
  for (const [featureKey, path] of commands) {
    const requests = [];
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith('/status/sessions')) return sessionResponse();
      return { ok: true, text: async () => '' };
    };
    const gladys = createFakeGladys();
    const device = plexServer.buildDevice(gladys, config);
    const feature = device.features.find((candidate) =>
      candidate.external_id.endsWith(`:${featureKey}`),
    );
    const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
    await plexServer.onSetValue(gladys, { device, feature, value: 1, monitor });
    assert.equal(requests.length, 2);
    assert.match(requests[1].url, new RegExp(`${path}\\?`));
    assert.match(requests[1].url, /type=music/);
    assert.equal(requests[1].options.headers['X-Plex-Target-Client-Identifier'], 'player-1');
    monitor.stop();
  }
});

test('Volume control clamps the value, targets the active player and publishes feedback', async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith('/status/sessions')) return sessionResponse();
    return { ok: true, text: async () => '' };
  };
  const gladys = createFakeGladys();
  const device = plexServer.buildDevice(gladys, config);
  const volumeFeature = device.features.find((feature) => feature.type === 'volume');
  const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
  await plexServer.onSetValue(gladys, { device, feature: volumeFeature, value: 140, monitor });
  assert.match(requests[1].url, /\/player\/playback\/setParameters\?/);
  assert.match(requests[1].url, /volume=100/);
  assert.equal(requests[1].options.headers['X-Plex-Target-Client-Identifier'], 'player-1');
  assert.deepEqual(gladys.publishedStates.at(-1), {
    device_feature_external_id: 'ext:test:plex-server:server:volume',
    state: 100,
  });
  monitor.stop();
});

test('session monitor coalesces simultaneous refresh requests', async () => {
  let fetchCalls = 0;
  let resolveFetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return new Promise((resolve) => {
      resolveFetch = () => resolve(sessionResponse(null));
    });
  };
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
  const first = monitor.refresh();
  const second = monitor.refresh();
  assert.equal(fetchCalls, 1);
  resolveFetch();
  await Promise.all([first, second]);
  assert.equal(gladys.publishedStates.length, 1);
  monitor.stop();
});
