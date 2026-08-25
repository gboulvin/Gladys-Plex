import WebSocket from 'ws';
import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'plex-notifications' });
const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const PATHS = ['/:/websocket/notifications', '/:/websockets/notifications'];

export class PlexNotifications {
  constructor(config, { onPlaybackEvent }, WebSocketImpl = WebSocket) {
    this.config = config;
    this.onPlaybackEvent = onPlaybackEvent;
    this.WebSocketImpl = WebSocketImpl;
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectDelay = INITIAL_DELAY_MS;
    this.pathIndex = 0;
    this.stopped = false;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  connect() {
    if (this.stopped) return;
    const url = new URL(PATHS[this.pathIndex], this.config.server_url);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('X-Plex-Token', this.config.token);
    try {
      this.socket = new this.WebSocketImpl(url, {
        handshakeTimeout: 5_000,
        headers: {
          'X-Plex-Client-Identifier': this.config.client_identifier,
          'X-Plex-Token': this.config.token,
        },
      });
    } catch (error) {
      logger.warn(`Plex notification socket creation failed: ${error.message}`);
      this.scheduleReconnect();
      return;
    }

    this.socket.on('open', () => {
      this.reconnectDelay = INITIAL_DELAY_MS;
      logger.info('Connected to Plex notification socket');
    });
    this.socket.on('message', (raw) => this.handleMessage(raw));
    this.socket.on('error', (error) =>
      logger.debug(`Plex notification socket error: ${error.message}`),
    );
    this.socket.on('close', () => {
      this.socket = null;
      if (!this.stopped) {
        this.pathIndex = (this.pathIndex + 1) % PATHS.length;
        this.scheduleReconnect();
      }
    });
  }

  handleMessage(raw) {
    try {
      const notification = JSON.parse(raw.toString()).NotificationContainer;
      if (notification?.type === 'playing') this.onPlaybackEvent();
    } catch {
      // The polling fallback remains authoritative if Plex emits an unknown frame.
    }
  }

  scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_DELAY_MS);
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.socket) this.socket.close();
    this.socket = null;
  }
}
