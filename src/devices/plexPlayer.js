import {
  createLogger,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
} from '@gladysassistant/integration-sdk';
import { getSessions, getServerIdentity, normalizeSession } from '../plex.js';

const DEVICE_TYPE = 'plex-player';
const logger = createLogger({ name: DEVICE_TYPE });
const FEATURE = {
  PLAYBACK_STATE: 'playback-state',
  TITLE: 'title',
  PLAY: 'play',
  PAUSE: 'pause',
  STOP: 'stop',
};

export function selectSession(sessions, playerName = '') {
  const normalized = sessions.map(normalizeSession);
  if (playerName) {
    return (
      normalized.find(
        (session) => session.playerTitle === playerName || session.playerId === playerName,
      ) ?? null
    );
  }
  return normalized[0] ?? null;
}

export const plexPlayer = {
  key: DEVICE_TYPE,
  deviceExternalId(gladys) {
    return gladys.externalIds(DEVICE_TYPE, 'server').device;
  },
  buildDevice(gladys, config) {
    const ids = gladys.externalIds(DEVICE_TYPE, 'server');
    return {
      name: 'Plex playback',
      external_id: ids.device,
      poll_frequency: config.poll_frequency,
      features: [
        {
          name: 'Playback state',
          external_id: ids.feature(FEATURE.PLAYBACK_STATE),
          category: DEVICE_FEATURE_CATEGORIES.MUSIC,
          type: DEVICE_FEATURE_TYPES.MUSIC.PLAYBACK_STATE,
          read_only: true,
          has_feedback: false,
          keep_history: false,
        },
        {
          name: 'Current title',
          external_id: ids.feature(FEATURE.TITLE),
          category: DEVICE_FEATURE_CATEGORIES.TEXT,
          type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
          read_only: true,
          has_feedback: false,
          keep_history: false,
        },
        ...[FEATURE.PLAY, FEATURE.PAUSE, FEATURE.STOP].map((command) => ({
          name: command[0].toUpperCase() + command.slice(1),
          external_id: ids.feature(command),
          category: DEVICE_FEATURE_CATEGORIES.MUSIC,
          type: DEVICE_FEATURE_TYPES.MUSIC[command.toUpperCase()],
          read_only: false,
          has_feedback: true,
          keep_history: false,
        })),
      ],
    };
  },
  actions: {
    async test_plex(gladys, { config }) {
      const identity = await getServerIdentity(config);
      return {
        en: `Plex server reachable${identity.version ? ` (v${identity.version})` : ''}.`,
        fr: `Serveur Plex accessible${identity.version ? ` (v${identity.version})` : ''}.`,
      };
    },
  },
  async onPoll(gladys, config) {
    const ids = gladys.externalIds(DEVICE_TYPE, 'server');
    const session = selectSession(await getSessions(config), config.player_name);
    await gladys.publishStates([
      {
        device_feature_external_id: ids.feature(FEATURE.PLAYBACK_STATE),
        state: session?.state === 'playing' ? 1 : 0,
      },
      { device_feature_external_id: ids.feature(FEATURE.TITLE), state: session?.title ?? '' },
    ]);
    logger.debug(`Playback state: ${session?.state ?? 'stopped'}`);
  },
  async onSetValue(gladys, { feature, value, config }) {
    const ids = gladys.externalIds(DEVICE_TYPE, 'server');
    const featureKey = Object.entries(FEATURE).find(
      ([, key]) => ids.feature(key) === feature.external_id,
    )?.[1];
    if (![FEATURE.PLAY, FEATURE.PAUSE, FEATURE.STOP].includes(featureKey) || Number(value) !== 1)
      return;
    const session = selectSession(await getSessions(config), config.player_name);
    if (!session) throw new Error('No active Plex playback session found');
    if (!session.sessionId) throw new Error('The active Plex session has no session id');
    const state =
      featureKey === FEATURE.PLAY ? 'playing' : featureKey === FEATURE.PAUSE ? 'paused' : 'stopped';
    await controlPlayer(config, session, state);
    await gladys.publishState(feature.external_id, 1);
  },
};

async function controlPlayer(config, session, state) {
  const sessions = await getSessions(config);
  const raw = sessions.find(
    (candidate) => (candidate.session?.id ?? candidate.Session?.id) === session.sessionId,
  );
  const player = raw?.Player ?? {};
  if (!player.address) {
    throw new Error('Plex did not return a reachable player address for the active session');
  }
  const protocol = player.protocol === 'https' ? 'https' : 'http';
  const port = player.port ?? (protocol === 'https' ? 32400 : 32500);
  const endpoint = `${protocol}://${player.address}:${port}/player/playback/${state}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Plex-Token': config.token,
      'X-Plex-Client-Identifier': config.client_identifier,
    },
  });
  if (!response.ok) throw new Error(`Plex player HTTP ${response.status}`);
}
