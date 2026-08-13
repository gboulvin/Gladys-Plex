import {
  createLogger,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
} from '@gladysassistant/integration-sdk';
import { getIdentity, getSessions, normalizeSession, stopSession } from '../plex.js';

const logger = createLogger({ name: 'plex-server' });
const DEVICE_TYPE = 'plex-server';
const PLATFORM_ID = 'server';
const POLL_FREQUENCY = 60_000;
const FEATURE = {
  PLAYBACK_STATE: 'playback-state',
  STOP: 'stop',
};

let currentSession = null;
let webhookRelayAvailable = false;

function isPlaying(session) {
  return session?.state === 'playing' ? 1 : 0;
}

function selectSession(sessions) {
  return sessions.find((session) => session.state === 'playing') ?? sessions[0] ?? null;
}

async function publishPlaybackState(gladys, session) {
  const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
  await gladys.publishState(ids.feature(FEATURE.PLAYBACK_STATE), isPlaying(session));
}

export const plexServer = {
  key: DEVICE_TYPE,
  deviceExternalId(gladys) {
    return gladys.externalIds(DEVICE_TYPE, PLATFORM_ID).device;
  },
  buildDevice(gladys) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    return {
      name: 'Plex server',
      external_id: ids.device,
      ...(webhookRelayAvailable ? {} : { poll_frequency: POLL_FREQUENCY }),
      features: [
        {
          name: 'Playback state',
          external_id: ids.feature(FEATURE.PLAYBACK_STATE),
          category: DEVICE_FEATURE_CATEGORIES.MUSIC,
          type: DEVICE_FEATURE_TYPES.MUSIC.PLAYBACK_STATE,
          min: 0,
          max: 1,
          read_only: true,
          has_feedback: false,
          keep_history: false,
        },
        {
          name: 'Stop playback',
          external_id: ids.feature(FEATURE.STOP),
          category: DEVICE_FEATURE_CATEGORIES.TELEVISION,
          type: DEVICE_FEATURE_TYPES.TELEVISION.STOP,
          min: 1,
          max: 1,
          read_only: false,
          has_feedback: false,
          keep_history: false,
        },
      ],
    };
  },
  setWebhookRelayAvailable(available) {
    webhookRelayAvailable = available === true;
  },
  actions: {
    async test_plex(gladys, { config }) {
      const identity = await getIdentity(config);
      return {
        en: `Plex server reachable${identity.version ? ` (v${identity.version})` : ''}.`,
        fr: `Serveur Plex accessible${identity.version ? ` (v${identity.version})` : ''}.`,
      };
    },
  },
  async onPoll(gladys, config) {
    const sessions = (await getSessions(config)).map(normalizeSession);
    currentSession = selectSession(sessions);
    await publishPlaybackState(gladys, currentSession);
  },
  async onSetValue(gladys, { feature, value, config }) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
    if (feature.external_id !== ids.feature(FEATURE.STOP) || Number(value) !== 1) return;
    const sessions = (await getSessions(config)).map(normalizeSession);
    currentSession = selectSession(sessions);
    if (!currentSession?.sessionId) throw new Error('No active Plex session can be stopped');
    await stopSession(config, currentSession.sessionId);
    logger.info(`Plex session ${currentSession.sessionId} stopped by Gladys`);
  },
  async onWebhook(gladys, playback) {
    currentSession = playback;
    await publishPlaybackState(gladys, currentSession);
    logger.info(`Plex webhook updated playback state to ${playback.state}`);
  },
};
