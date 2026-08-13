import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePlexWebhookBody,
  plexPlayer,
  setWebhookAvailability,
} from '../src/devices/plexPlayer.js';
import { normalizeConfig } from '../src/config.js';
import { createFakeGladys } from './helpers/fakeGladys.js';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  setWebhookAvailability(false);
});

test('refresh discovers the Plex server and known Plex clients without active playback', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/status/sessions')) {
      return { ok: true, json: async () => ({ MediaContainer: { Metadata: [] } }) };
    }
    if (url.endsWith('/clients')) {
      return {
        ok: true,
        json: async () => ({
          MediaContainer: {
            Server: [{ machineIdentifier: 'living-room-tv', name: 'Living room TV' }],
          },
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  const gladys = createFakeGladys();
  let discovered = [];
  gladys.publishDiscoveredDevices = async (devices) => {
    discovered = devices;
  };

  await plexPlayer.refresh(gladys, normalizeConfig({ token: 'token' }));

  assert.deepEqual(discovered.map((device) => device.name).sort(), [
    'Living room TV',
    'Plex server',
  ]);
  const player = discovered.find((device) => device.name === 'Living room TV');
  assert.equal(player.poll_frequency, 30);
  const playbackState = player.features.find((feature) => feature.type === 'playback_state');
  assert.deepEqual({ min: playbackState.min, max: playbackState.max }, { min: 0, max: 1 });
});

test('webhook availability removes polling from discovered Plex devices', () => {
  const gladys = createFakeGladys();
  setWebhookAvailability(true);
  const devices = plexPlayer.buildDiscoveredDevices(gladys, normalizeConfig());
  assert.ok(devices.length >= 1);
  assert.equal(
    devices.every((device) => device.poll_frequency === undefined),
    true,
  );
});

test('parsePlexWebhookBody reads Plex multipart payload fields', () => {
  const event = { event: 'media.pause', Player: { uuid: 'player-1', title: 'TV' } };
  const body = `--boundary\r\nContent-Disposition: form-data; name="payload"\r\n\r\n${JSON.stringify(event)}\r\n--boundary--\r\n`;
  assert.deepEqual(parsePlexWebhookBody(body), event);
});

test('onWebhook creates a player device and publishes its playing state', async () => {
  const gladys = createFakeGladys();
  let discovered = [];
  gladys.publishDiscoveredDevices = async (devices) => {
    discovered = devices;
  };
  await plexPlayer.onWebhook(gladys, normalizeConfig(), {
    event: 'media.play',
    Player: { uuid: 'webhook-player', title: 'Bedroom TV' },
    Metadata: { title: 'Film' },
  });
  assert.ok(discovered.some((device) => device.name === 'Bedroom TV'));
  assert.ok(
    gladys.published.some(
      (state) =>
        state.featureExternalId === 'plex-player:webhook-player:playback-state' &&
        state.state === 1,
    ),
  );
});

test('all discovered features have a defined Gladys type', () => {
  const gladys = createFakeGladys();
  const devices = plexPlayer.buildDiscoveredDevices(gladys, normalizeConfig());
  for (const device of devices) {
    for (const feature of device.features) {
      assert.equal(typeof feature.type, 'string', `${feature.name} must declare a valid type`);
      assert.ok(feature.type.length > 0, `${feature.name} must not have an empty type`);
      assert.equal(typeof feature.min, 'number', `${feature.name} must declare a numeric min`);
      assert.equal(typeof feature.max, 'number', `${feature.name} must declare a numeric max`);
    }
  }
  const server = devices.find((device) => device.name === 'Plex server');
  const stop = server.features.find((feature) => feature.external_id.endsWith(':stop'));
  assert.deepEqual(
    { category: stop.category, type: stop.type },
    { category: 'television', type: 'stop' },
  );
});
