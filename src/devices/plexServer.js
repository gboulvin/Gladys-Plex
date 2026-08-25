import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { getIdentity } from '../plex.js';

const DEVICE_TYPE = 'plex-server';
const PLATFORM_ID = 'server';
export const PLEX_SERVER_FEATURE = {
  PLAY: 'play',
  PAUSE: 'pause',
  STOP: 'stop',
  PREVIOUS: 'previous',
  NEXT: 'next',
  VOLUME: 'volume',
  PLAYBACK_STATE: 'playback-state',
  NOW_PLAYING: 'now-playing',
};

export function plexServerExternalIds(gladys) {
  return gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
}

export function plexServerFeatureExternalIds(gladys) {
  const ids = plexServerExternalIds(gladys);
  return Object.fromEntries(
    Object.values(PLEX_SERVER_FEATURE).map((key) => [key, ids.feature(key)]),
  );
}

function pushButton(externalId, name, category, type) {
  return {
    name,
    external_id: externalId,
    category,
    type,
    min: 1,
    max: 1,
    read_only: false,
    has_feedback: false,
    keep_history: false,
  };
}

export const plexServer = {
  key: DEVICE_TYPE,
  deviceExternalId(gladys) {
    return plexServerExternalIds(gladys).device;
  },
  featureExternalIds(gladys) {
    return plexServerFeatureExternalIds(gladys);
  },
  buildDevice(gladys) {
    const ids = plexServerFeatureExternalIds(gladys);
    return {
      name: 'Plex server',
      external_id: plexServerExternalIds(gladys).device,
      features: [
        pushButton(
          ids[PLEX_SERVER_FEATURE.PLAY],
          'Play',
          DEVICE_FEATURE_CATEGORIES.MUSIC,
          DEVICE_FEATURE_TYPES.MUSIC.PLAY,
        ),
        pushButton(
          ids[PLEX_SERVER_FEATURE.PAUSE],
          'Pause',
          DEVICE_FEATURE_CATEGORIES.MUSIC,
          DEVICE_FEATURE_TYPES.MUSIC.PAUSE,
        ),
        pushButton(
          ids[PLEX_SERVER_FEATURE.STOP],
          'Stop',
          DEVICE_FEATURE_CATEGORIES.TELEVISION,
          DEVICE_FEATURE_TYPES.TELEVISION.STOP,
        ),
        pushButton(
          ids[PLEX_SERVER_FEATURE.PREVIOUS],
          'Previous',
          DEVICE_FEATURE_CATEGORIES.MUSIC,
          DEVICE_FEATURE_TYPES.MUSIC.PREVIOUS,
        ),
        pushButton(
          ids[PLEX_SERVER_FEATURE.NEXT],
          'Next',
          DEVICE_FEATURE_CATEGORIES.MUSIC,
          DEVICE_FEATURE_TYPES.MUSIC.NEXT,
        ),
        {
          name: 'Volume',
          external_id: ids[PLEX_SERVER_FEATURE.VOLUME],
          category: DEVICE_FEATURE_CATEGORIES.MUSIC,
          type: DEVICE_FEATURE_TYPES.MUSIC.VOLUME,
          min: 0,
          max: 100,
          read_only: false,
          has_feedback: true,
          keep_history: false,
        },
        {
          name: 'Playback state',
          external_id: ids[PLEX_SERVER_FEATURE.PLAYBACK_STATE],
          category: DEVICE_FEATURE_CATEGORIES.MUSIC,
          type: DEVICE_FEATURE_TYPES.MUSIC.PLAYBACK_STATE,
          min: 0,
          max: 1,
          read_only: true,
          has_feedback: false,
          keep_history: false,
        },
        {
          name: 'Now playing',
          external_id: ids[PLEX_SERVER_FEATURE.NOW_PLAYING],
          category: DEVICE_FEATURE_CATEGORIES.TEXT,
          type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
          min: 0,
          max: 255,
          read_only: true,
          has_feedback: false,
          keep_history: false,
        },
      ],
    };
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
  async onSetValue(gladys, { feature, value, monitor }) {
    const ids = plexServerFeatureExternalIds(gladys);
    const featureKey = Object.entries(ids).find(
      ([, externalId]) => externalId === feature.external_id,
    )?.[0];
    if (!featureKey) return;
    if (featureKey === PLEX_SERVER_FEATURE.STOP && Number(value) === 1) {
      await monitor.stopActiveSession();
      return;
    }
    if (featureKey === PLEX_SERVER_FEATURE.VOLUME) {
      await monitor.setVolume(value);
      return;
    }
    if (
      [
        PLEX_SERVER_FEATURE.PLAY,
        PLEX_SERVER_FEATURE.PAUSE,
        PLEX_SERVER_FEATURE.PREVIOUS,
        PLEX_SERVER_FEATURE.NEXT,
      ].includes(featureKey) &&
      Number(value) === 1
    ) {
      await monitor.sendPlaybackCommand(featureKey);
    }
  },
};
