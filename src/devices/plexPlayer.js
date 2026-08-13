import {
  createLogger,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
} from '@gladysassistant/integration-sdk';
import { getClients, getServerIdentity, getSessions, normalizeSession } from '../plex.js';

const DEVICE_TYPE = 'plex-player';
const SERVER_ID = 'server';
const logger = createLogger({ name: DEVICE_TYPE });
const FEATURE = {
  PLAYBACK_STATE: 'playback-state',
  STATUS: 'status',
  TITLE: 'title',
  PLAY: 'play',
  PAUSE: 'pause',
  STOP: 'stop',
};

let webhookAvailable = false;
const players = new Map();

function playerPlatformId(session) {
  return session.playerId || session.playerTitle || SERVER_ID;
}

function playerName(session) {
  return session.playerTitle || 'Plex player';
}

function toStatus(session) {
  return session?.state ?? 'stopped';
}

function isPlaying(session) {
  return toStatus(session) === 'playing' ? 1 : 0;
}

function buildFeatures(ids, label) {
  return [
    {
      name: `${label} - Playback state`,
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
      name: `${label} - Status`,
      external_id: ids.feature(FEATURE.STATUS),
      category: DEVICE_FEATURE_CATEGORIES.TEXT,
      type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
      min: 0,
      max: 255,
      read_only: true,
      has_feedback: false,
      keep_history: false,
    },
    {
      name: `${label} - Current title`,
      external_id: ids.feature(FEATURE.TITLE),
      category: DEVICE_FEATURE_CATEGORIES.TEXT,
      type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
      min: 0,
      max: 255,
      read_only: true,
      has_feedback: false,
      keep_history: false,
    },
    ...[FEATURE.PLAY, FEATURE.PAUSE, FEATURE.STOP].map((command) => ({
      name: `${label} - ${command[0].toUpperCase() + command.slice(1)}`,
      external_id: ids.feature(command),
      category:
        command === FEATURE.STOP
          ? DEVICE_FEATURE_CATEGORIES.TELEVISION
          : DEVICE_FEATURE_CATEGORIES.MUSIC,
      type:
        command === FEATURE.STOP
          ? DEVICE_FEATURE_TYPES.TELEVISION.STOP
          : DEVICE_FEATURE_TYPES.MUSIC[command.toUpperCase()],
      min: 1,
      max: 1,
      read_only: false,
      has_feedback: false,
      keep_history: false,
    })),
  ];
}

function buildDevice(gladys, config, platformId, name) {
  const ids = gladys.externalIds(DEVICE_TYPE, platformId);
  const device = {
    name,
    external_id: ids.device,
    features: buildFeatures(ids, name),
  };
  if (!webhookAvailable) device.poll_frequency = config.poll_frequency;
  return device;
}

function sessionForFilter(sessions, playerFilter = '') {
  if (playerFilter) {
    return (
      sessions.find(
        (session) => session.playerTitle === playerFilter || session.playerId === playerFilter,
      ) ?? null
    );
  }
  return sessions[0] ?? null;
}

function stateOfPlayer(platformId) {
  return players.get(platformId)?.session ?? null;
}

function publishStatesForDevice(gladys, platformId, session) {
  const ids = gladys.externalIds(DEVICE_TYPE, platformId);
  return gladys.publishStates([
    { device_feature_external_id: ids.feature(FEATURE.PLAYBACK_STATE), state: isPlaying(session) },
    { device_feature_external_id: ids.feature(FEATURE.STATUS), text: toStatus(session) },
    { device_feature_external_id: ids.feature(FEATURE.TITLE), text: session?.title ?? '' },
  ]);
}

function updateKnownPlayers(sessions) {
  const activeIds = new Set();
  for (const raw of sessions) {
    const session = normalizeSession(raw);
    const platformId = playerPlatformId(session);
    activeIds.add(platformId);
    players.set(platformId, { name: playerName(session), session, raw });
  }
  for (const [platformId, player] of players) {
    if (!activeIds.has(platformId))
      players.set(platformId, { ...player, session: null, raw: null });
  }
}

function updateKnownClients(clients) {
  for (const client of clients) {
    const platformId = client.machineIdentifier ?? client.uuid ?? client.name ?? client.title;
    if (!platformId || platformId === SERVER_ID) continue;
    const existing = players.get(platformId);
    players.set(platformId, {
      name: client.name ?? client.title ?? existing?.name ?? 'Plex player',
      session: existing?.session ?? null,
      raw: existing?.raw ?? null,
    });
  }
}

export function setWebhookAvailability(available) {
  webhookAvailable = available;
}

export function parsePlexWebhookBody(body) {
  if (body && typeof body === 'object') {
    const payload = body.payload ?? body;
    return typeof payload === 'string' ? JSON.parse(payload) : payload;
  }
  if (typeof body !== 'string') throw new Error('Plex webhook body is missing');
  try {
    return JSON.parse(body);
  } catch {
    const match = body.match(
      /name=["']payload["'][^\r\n]*\r?\n(?:[^\r\n]*\r?\n)?\r?\n([\s\S]*?)\r?\n--/i,
    );
    if (!match) throw new Error('Plex webhook payload field not found');
    return JSON.parse(match[1]);
  }
}

export function selectSession(sessions, playerName = '') {
  return sessionForFilter(sessions.map(normalizeSession), playerName);
}

export const plexPlayer = {
  key: DEVICE_TYPE,
  deviceExternalId(gladys) {
    return gladys.externalIds(DEVICE_TYPE, SERVER_ID).device;
  },
  ownsDevice(gladys, device) {
    return device.external_id.includes(`:${DEVICE_TYPE}:`);
  },
  buildDiscoveredDevices(gladys, config) {
    const devices = [buildDevice(gladys, config, SERVER_ID, 'Plex server')];
    for (const [platformId, player] of players) {
      if (platformId !== SERVER_ID)
        devices.push(buildDevice(gladys, config, platformId, player.name));
    }
    return devices;
  },
  buildDevice(gladys, config) {
    return buildDevice(gladys, config, SERVER_ID, 'Plex server');
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
  async refresh(gladys, config) {
    const [rawSessions, clients] = await Promise.all([
      getSessions(config),
      getClients(config).catch((error) => {
        logger.debug(`Plex clients endpoint unavailable: ${error.message}`);
        return [];
      }),
    ]);
    updateKnownClients(clients);
    updateKnownPlayers(rawSessions);
    await gladys.publishDiscoveredDevices(this.buildDiscoveredDevices(gladys, config));
    const sessions = rawSessions.map(normalizeSession);
    await publishStatesForDevice(gladys, SERVER_ID, sessionForFilter(sessions, config.player_name));
    await Promise.all(
      [...players.keys()]
        .filter((platformId) => platformId !== SERVER_ID)
        .map((platformId) => publishStatesForDevice(gladys, platformId, stateOfPlayer(platformId))),
    );
  },
  async onPoll(gladys, config) {
    await this.refresh(gladys, config);
  },
  async onWebhook(gladys, config, payload) {
    const event = payload?.event;
    if (!['media.play', 'media.resume', 'media.pause', 'media.stop'].includes(event)) return;
    const rawSession = {
      title: payload.Metadata?.title,
      grandparentTitle: payload.Metadata?.grandparentTitle,
      Player: {
        state:
          event === 'media.play' || event === 'media.resume'
            ? 'playing'
            : event === 'media.pause'
              ? 'paused'
              : 'stopped',
        machineIdentifier: payload.Player?.uuid,
        title: payload.Player?.title,
      },
    };
    const session = normalizeSession(rawSession);
    const platformId = playerPlatformId(session);
    players.set(platformId, { name: playerName(session), session, raw: rawSession });
    await gladys.publishDiscoveredDevices(this.buildDiscoveredDevices(gladys, config));
    await publishStatesForDevice(gladys, platformId, session);
    const allSessions = [...players.values()].map((player) => player.session).filter(Boolean);
    await publishStatesForDevice(
      gladys,
      SERVER_ID,
      sessionForFilter(allSessions, config.player_name),
    );
    logger.info(`Plex webhook ${event} received for ${playerName(session)}`);
  },
  async onSetValue(gladys, { device, feature, value, config }) {
    if (Number(value) !== 1) return;
    const featureKey = Object.entries(FEATURE).find(([, key]) =>
      feature.external_id.endsWith(`:${key}`),
    )?.[1];
    if (![FEATURE.PLAY, FEATURE.PAUSE, FEATURE.STOP].includes(featureKey)) return;
    const rawSessions = await getSessions(config);
    const normalized = rawSessions.map(normalizeSession);
    const platformId = [...players.keys()].find(
      (id) => gladys.externalIds(DEVICE_TYPE, id).device === device.external_id,
    );
    const session =
      platformId === SERVER_ID
        ? sessionForFilter(normalized, config.player_name)
        : normalized.find((candidate) => playerPlatformId(candidate) === platformId);
    if (!session) throw new Error('No active Plex playback session found for this device');
    const raw = rawSessions.find(
      (candidate) => (candidate.session?.id ?? candidate.Session?.id) === session.sessionId,
    );
    await controlPlayer(config, raw?.Player, featureKey);
    await this.refresh(gladys, config);
  },
};

async function controlPlayer(config, player, command) {
  if (!player?.address) throw new Error('Plex did not return a reachable player address');
  const protocol = player.protocol === 'https' ? 'https' : 'http';
  const port = player.port ?? (protocol === 'https' ? 32400 : 32500);
  const response = await fetch(
    `${protocol}://${player.address}:${port}/player/playback/${command}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Plex-Token': config.token,
        'X-Plex-Client-Identifier': config.client_identifier,
      },
    },
  );
  if (!response.ok) throw new Error(`Plex player HTTP ${response.status}`);
}
