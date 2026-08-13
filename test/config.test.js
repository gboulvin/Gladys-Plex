import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';

test('Plex configuration has no container-local URL default', () => {
  assert.equal(DEFAULT_CONFIG.server_url, '');
  assert.equal(DEFAULT_CONFIG.client_identifier, 'gladys-plex-integration');
});

test('normalizeConfig trims the Plex URL, token and trailing slash', () => {
  const config = normalizeConfig({
    server_url: ' http://192.168.1.20:32400/ ',
    token: ' token ',
    client_identifier: ' gladys-test ',
  });
  assert.deepEqual(config, {
    server_url: 'http://192.168.1.20:32400',
    token: 'token',
    client_identifier: 'gladys-test',
  });
});
