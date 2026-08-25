import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlexNotifications } from '../src/notifications.js';

const instances = [];

class FakeWebSocket extends EventEmitter {
  constructor(url, options) {
    super();
    this.url = String(url);
    this.options = options;
    this.closed = false;
    instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

test('Plex notifications use the documented WebSocket endpoint and token', () => {
  instances.length = 0;
  const notifications = new PlexNotifications(
    {
      server_url: 'http://192.168.1.20:32400',
      token: 'plex-token',
      client_identifier: 'gladys-test',
    },
    { onPlaybackEvent: () => {} },
    FakeWebSocket,
  );
  notifications.start();
  assert.equal(instances.length, 1);
  assert.match(instances[0].url, /^ws:\/\/192\.168\.1\.20:32400\/:\/websocket\/notifications/);
  assert.match(instances[0].url, /X-Plex-Token=plex-token/);
  assert.equal(instances[0].options.headers['X-Plex-Client-Identifier'], 'gladys-test');
  notifications.stop();
});

test('a Plex playing notification requests an immediate session refresh', () => {
  instances.length = 0;
  let refreshRequests = 0;
  const notifications = new PlexNotifications(
    {
      server_url: 'http://192.168.1.20:32400',
      token: 'plex-token',
      client_identifier: 'gladys-test',
    },
    { onPlaybackEvent: () => refreshRequests++ },
    FakeWebSocket,
  );
  notifications.start();
  instances[0].emit(
    'message',
    Buffer.from(JSON.stringify({ NotificationContainer: { type: 'playing' } })),
  );
  instances[0].emit(
    'message',
    Buffer.from(JSON.stringify({ NotificationContainer: { type: 'library' } })),
  );
  assert.equal(refreshRequests, 1);
  notifications.stop();
});
