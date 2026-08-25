import { createLogger } from '@gladysassistant/integration-sdk';
import { getSessions, normalizeSession, playerCommand, stopSession } from './plex.js';
import { PLEX_SERVER_FEATURE } from './devices/plexServer.js';

const logger = createLogger({ name: 'plex-monitor' });
const IDLE_TITLE = '—';

function selectSession(sessions) {
  return sessions.find((session) => session.state === 'playing') ?? sessions[0] ?? null;
}

function playbackValue(session) {
  return session?.state === 'playing' ? 1 : 0;
}

export class PlexMonitor {
  constructor(gladys, config, featureExternalIds) {
    this.gladys = gladys;
    this.config = config;
    this.featureExternalIds = featureExternalIds;
    this.currentSession = null;
    this.lastPublished = new Map();
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
    await this.publishSession({ forcePublish });
  }

  async applyWebhook(playback) {
    this.currentSession = playback;
    await this.publishSession();
    this.scheduleRefresh(350);
  }

  async stopActiveSession() {
    await this.refresh();
    if (!this.currentSession?.sessionId) throw new Error('No active Plex session can be stopped');
    await stopSession(this.config, this.currentSession.sessionId);
    logger.info(`Plex session ${this.currentSession.sessionId} stopped by Gladys`);
    this.scheduleRefresh(350);
  }

  async sendPlaybackCommand(command) {
    await this.refresh();
    if (!this.currentSession?.playerId) {
      throw new Error('No active Plex player can receive this command');
    }
    await playerCommand(
      this.config,
      this.currentSession.playerId,
      command,
      this.currentSession.mediaType,
    );
    logger.info(`Plex ${command} command sent to ${this.currentSession.playerTitle}`);
    this.scheduleRefresh(350);
  }

  async setVolume(value) {
    const volume = Number(value);
    if (!Number.isFinite(volume)) throw new Error('Plex volume must be a numeric value');
    await this.refresh();
    if (!this.currentSession?.playerId) {
      throw new Error('No active Plex player can receive a volume command');
    }
    const clampedVolume = Math.min(100, Math.max(0, Math.round(volume)));
    await playerCommand(
      this.config,
      this.currentSession.playerId,
      'volume',
      this.currentSession.mediaType,
      { volume: clampedVolume },
    );
    this.currentSession.volume = clampedVolume;
    await this.publishNumber(PLEX_SERVER_FEATURE.VOLUME, clampedVolume, { forcePublish: true });
    logger.info(`Plex volume set to ${clampedVolume} on ${this.currentSession.playerTitle}`);
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
    this.lastPublished.clear();
  }

  stop() {
    this.stopped = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  async publishSession({ forcePublish = false } = {}) {
    await this.publishNumber(
      PLEX_SERVER_FEATURE.PLAYBACK_STATE,
      playbackValue(this.currentSession),
      {
        forcePublish,
      },
    );
    await this.publishText(
      PLEX_SERVER_FEATURE.NOW_PLAYING,
      this.currentSession?.title || IDLE_TITLE,
      {
        forcePublish,
      },
    );
    if (Number.isFinite(this.currentSession?.volume)) {
      await this.publishNumber(PLEX_SERVER_FEATURE.VOLUME, this.currentSession.volume, {
        forcePublish,
      });
    }
  }

  async publishNumber(featureKey, value, { forcePublish = false } = {}) {
    const externalId = this.featureExternalIds[featureKey];
    if (!externalId || (!forcePublish && this.lastPublished.get(externalId) === value)) return;
    await this.gladys.publishState(externalId, value);
    this.lastPublished.set(externalId, value);
  }

  async publishText(featureKey, text, { forcePublish = false } = {}) {
    const externalId = this.featureExternalIds[featureKey];
    if (!externalId || (!forcePublish && this.lastPublished.get(externalId) === text)) return;
    await this.gladys.publishState(externalId, { text });
    this.lastPublished.set(externalId, text);
  }
}
