import { test } from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../gladys-assistant-integration.json' with { type: 'json' };
import { DEVICE_BLUEPRINTS } from '../src/devices/index.js';

test('manifest uses the Plex external integration identity and required configuration', () => {
  assert.equal(manifest.name, 'Plex');
  assert.equal(manifest.gladys_version, '>=4.85.0');
  assert.deepEqual(
    manifest.config_schema.filter((field) => field.type !== 'section').map((field) => field.key),
    ['server_url', 'token', 'client_identifier'],
  );
});

test('each manifest device action has a registered blueprint handler', () => {
  const actionKeys = new Set(
    DEVICE_BLUEPRINTS.flatMap((blueprint) => Object.keys(blueprint.actions ?? {})),
  );
  for (const action of manifest.actions) {
    if (action.key !== 'show_webhook_url')
      assert.ok(actionKeys.has(action.key), `${action.key} must have a handler`);
  }
});

test('manifest declares the exact Plex webhook key handled by the integration', () => {
  assert.deepEqual(manifest.webhooks, [
    {
      key: 'plex_events',
      label: { en: 'Plex playback events', fr: 'Événements de lecture Plex' },
      mode: 'fire_and_forget',
    },
  ]);
});
