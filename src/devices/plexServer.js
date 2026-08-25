import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';
import { getIdentity } from '../plex.js';

const DEVICE_TYPE = 'plex-server';
const PLATFORM_ID = 'server';
export const PLEX_SERVER_FEATURE = {
  PLAYBACK_STATE: 'playback-state',
  STOP: 'stop',
};

export function plexServerExternalIds(gladys) {
  return gladys.externalIds(DEVICE_TYPE, PLATFORM_ID);
}

export const plexServer = {
  key: DEVICE_TYPE,
  deviceExternalId(gladys) {
    return plexServerExternalIds(gladys).device;
  },
  playbackFeatureExternalId(gladys) {
    return plexServerExternalIds(gladys).feature(PLEX_SERVER_FEATURE.PLAYBACK_STATE);
  },
  buildDevice(gladys) {
    const ids = plexServerExternalIds(gladys);
    return {
      name: 'Plex server',
      external_id: ids.device,
      features: [
        {
          name: 'Playback state',
          external_id: ids.feature(PLEX_SERVER_FEATURE.PLAYBACK_STATE),
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
          external_id: ids.feature(PLEX_SERVER_FEATURE.STOP),
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
    const ids = plexServerExternalIds(gladys);
    if (feature.external_id !== ids.feature(PLEX_SERVER_FEATURE.STOP) || Number(value) !== 1)
      return;
    await monitor.stopActiveSession();
  },
};
