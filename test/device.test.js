import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { plexServer } from '../src/devices/plexServer.js';
import { createFakeGladys } from './helpers/fakeGladys.js';
import { assertGladysDeviceContract, assertGladysStateContract } from './helpers/gladysContract.js';

const realFetch = globalThis.fetch;
const config = {
  server_url: 'http://192.168.1.20:32400',
  token: 'plex-token',
  client_identifier: 'gladys-test',
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('Plex discovery publishes one contract-valid server device', () => {
  const gladys = createFakeGladys();
  const devices = [plexServer.buildDevice(gladys, config)];
  assertGladysDeviceContract(devices);
  assert.deepEqual(
    devices[0].features.map((feature) => ({ category: feature.category, type: feature.type })),
    [
      { category: 'music', type: 'playback_state' },
      { category: 'television', type: 'stop' },
    ],
  );
});

test('poll publishes only the numeric playback feature used by Gladys scenes', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      MediaContainer: {
        Metadata: [{ Session: { id: 's1' }, title: 'Film', Player: { state: 'playing' } }],
      },
    }),
  });
  const gladys = createFakeGladys();
  await plexServer.onPoll(gladys, config);
  assertGladysStateContract(gladys.publishedStates);
  assert.deepEqual(gladys.publishedStates, [
    { device_feature_external_id: 'ext:test:plex-server:server:playback-state', state: 1 },
  ]);
});

test('playback webhook publishes a numeric paused state', async () => {
  const gladys = createFakeGladys();
  await plexServer.onWebhook(gladys, {
    state: 'paused',
    sessionId: null,
    playerId: 'p1',
    playerTitle: 'TV',
    title: '',
  });
  assertGladysStateContract(gladys.publishedStates);
  assert.equal(gladys.publishedStates[0].state, 0);
});

test('Stop control terminates the selected active Plex session', async () => {
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
  await plexServer.onSetValue(gladys, { device, feature: stopFeature, value: 1, config });
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /\/status\/sessions\/terminate\?sessionId=active/);
});

test('webhook relay availability removes regular polling from the published device', () => {
  const gladys = createFakeGladys();
  plexServer.setWebhookRelayAvailable(true);
  const device = plexServer.buildDevice(gladys, config);
  assert.equal(device.poll_frequency, undefined);
  assertGladysDeviceContract([device]);
  plexServer.setWebhookRelayAvailable(false);
});
