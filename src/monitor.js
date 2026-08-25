import { createLogger } from '@gladysassistant/integration-sdk';
import { getSessions, normalizeSession, stopSession } from './plex.js';

const logger = createLogger({ name: 'plex-monitor' });

function selectSession(sessions) {
  return sessions.find((session) => session.state === 'playing') ?? sessions[0] ?? null;
}

function playbackValue(session) {
  return session?.state === 'playing' ? 1 : 0;
}

export class PlexMonitor {
  constructor(gladys, config, playbackFeatureExternalId) {
    this.gladys = gladys;
    this.config = config;
    this.playbackFeatureExternalId = playbackFeatureExternalId;
    this.currentSession = null;
    this.lastPublishedPlayback = undefined;
    this.refreshInFlight = null;
    this.refreshTimer = null;
    this.stopped = false;
  }

  async refresh({ forcePublish = false } = {}) {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.#refresh({ forcePublish }).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  async #refresh({ forcePublish }) {
    const sessions = (await getSessions(this.config)).map(normalizeSession);
    this.currentSession = selectSession(sessions);
    await this.publishPlayback({ forcePublish });
  }

  async applyWebhook(playback) {
    this.currentSession = playback;
    await this.publishPlayback();
    this.scheduleRefresh(350);
  }

  async stopActiveSession() {
    await this.refresh();
    if (!this.currentSession?.sessionId) throw new Error('No active Plex session can be stopped');
    await stopSession(this.config, this.currentSession.sessionId);
    logger.info(`Plex session ${this.currentSession.sessionId} stopped by Gladys`);
    this.scheduleRefresh(350);
  }

  scheduleRefresh(delayMs = 250) {
    if (this.stopped || this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh().catch((error) => logger.warn(`Plex session refresh failed: ${error.message}`));
    }, delayMs);
  }

  resetPublicationCache() {
    this.lastPublishedPlayback = undefined;
  }

  stop() {
    this.stopped = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  async publishPlayback({ forcePublish = false } = {}) {
    const value = playbackValue(this.currentSession);
    if (!forcePublish && this.lastPublishedPlayback === value) return;
    await this.gladys.publishState(this.playbackFeatureExternalId, value);
    this.lastPublishedPlayback = value;
  }
}
