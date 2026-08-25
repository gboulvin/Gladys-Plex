import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { plexServer } from '../src/devices/plexServer.js';
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

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('Plex discovery publishes one contract-valid server device without Gladys polling', () => {
  const gladys = createFakeGladys();
  const devices = [plexServer.buildDevice(gladys, config)];
  assertGladysDeviceContract(devices);
  assert.equal(devices[0].poll_frequency, undefined);
  assert.deepEqual(
    devices[0].features.map((feature) => ({ category: feature.category, type: feature.type })),
    [
      { category: 'music', type: 'playback_state' },
      { category: 'television', type: 'stop' },
    ],
  );
});

test('session monitor publishes the numeric playback feature and deduplicates unchanged polls', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      MediaContainer: {
        Metadata: [{ Session: { id: 's1' }, title: 'Film', Player: { state: 'playing' } }],
      },
    }),
  });
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.playbackFeatureExternalId(gladys));
  await monitor.refresh();
  await monitor.refresh();
  assertGladysStateContract(gladys.publishedStates);
  assert.deepEqual(gladys.publishedStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:playback-state', state: 1 },
  ]);
});

test('Plex webhook updates the numeric scene state immediately', async () => {
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.playbackFeatureExternalId(gladys));
  await monitor.applyWebhook({
    state: 'paused',
    sessionId: null,
    playerId: 'p1',
    playerTitle: 'TV',
    title: '',
  });
  assertGladysStateContract(gladys.publishedStates);
  assert.deepEqual(gladys.publishedStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:playback-state', state: 0 },
  ]);
  monitor.stop();
});

test('Stop control terminates the selected active Plex session and schedules a refresh', async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith('/status/sessions')) {
      return {
        ok: true,
        json: async () => ({
          MediaContainer: {
            Metadata: [{ Session: { id: 'active' }, title: 'Film', Player: { state: 'playing' } }],
          },
        }),
      };
    }
    return { ok: true, text: async () => '' };
  };
  const gladys = createFakeGladys();
  const device = plexServer.buildDevice(gladys, config);
  const stopFeature = device.features.find((feature) => feature.type === 'stop');
  const monitor = new PlexMonitor(gladys, config, plexServer.playbackFeatureExternalId(gladys));
  await plexServer.onSetValue(gladys, { device, feature: stopFeature, value: 1, monitor });
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/status\/sessions\/terminate\?sessionId=active/);
  monitor.stop();
});

test('session monitor coalesces simultaneous refresh requests', async () => {
  let fetchCalls = 0;
  let resolveFetch;
  globalThis.fetch = () => {
    fetchCalls += 1;
    return new Promise((resolve) => {
      resolveFetch = () =>
        resolve({
          ok: true,
          json: async () => ({ MediaContainer: { Metadata: [] } }),
        });
    });
  };
  const gladys = createFakeGladys();
  const monitor = new PlexMonitor(gladys, config, plexServer.playbackFeatureExternalId(gladys));
  const first = monitor.refresh();
  const second = monitor.refresh();
  assert.equal(fetchCalls, 1);
  resolveFetch();
  await Promise.all([first, second]);
  assert.equal(gladys.publishedStates.length, 1);
  monitor.stop();
});
