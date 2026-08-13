import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.js';

test('normalizeConfig coerces Plex form values', () => {
  const config = normalizeConfig({
    server_url: 'http://plex:32400/',
    token: ' token ',
    poll_frequency: '45',
  });
  assert.equal(config.server_url, 'http://plex:32400');
  assert.equal(config.token, 'token');
  assert.equal(config.poll_frequency, 45);
  assert.equal(config.player_name, DEFAULT_CONFIG.player_name);
});

test('normalizeConfig provides stable Plex defaults', () => {
  assert.equal(DEFAULT_CONFIG.server_url, '');
  assert.equal(DEFAULT_CONFIG.client_identifier, 'gladys-plex-integration');
  assert.equal(DEFAULT_CONFIG.player_name, '');
});
