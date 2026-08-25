import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  DEVICE_BLUEPRINTS,
  buildDiscoveredDevices,
  findBlueprintByDevice,
} from './src/devices/index.js';
import { PlexMonitor } from './src/monitor.js';
import { PlexNotifications } from './src/notifications.js';
import { playbackFromWebhook, parsePlexWebhook } from './src/webhook.js';

const gladys = new GladysIntegration();
const plexServer = DEVICE_BLUEPRINTS[0];
let config = normalizeConfig();
let monitor = null;
let notifications = null;
let sessionInterval = null;
let initializationGeneration = 0;
let consecutiveRefreshFailures = 0;

function isConfigured(value) {
  return Boolean(value.server_url && value.token);
}

async function publishDevices() {
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
}

function stopRuntime() {
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = null;
  notifications?.stop();
  notifications = null;
  monitor?.stop();
  monitor = null;
  consecutiveRefreshFailures = 0;
}

async function refreshSessionsSafely({ forcePublish = false } = {}) {
  if (!monitor) return;
  try {
    await monitor.refresh({ forcePublish });
    if (consecutiveRefreshFailures >= 3) await gladys.setConnectionStatus(true);
    consecutiveRefreshFailures = 0;
  } catch (error) {
    consecutiveRefreshFailures += 1;
    logger.warn(`Plex session refresh failed (${consecutiveRefreshFailures}): ${error.message}`);
    if (consecutiveRefreshFailures === 3) {
      await gladys.setConnectionStatus(false, {
        en: `Lost contact with Plex: ${error.message}`,
        fr: `Contact perdu avec Plex : ${error.message}`,
      });
    }
  }
}

function startRuntime() {
  sessionInterval = setInterval(
    () => refreshSessionsSafely(),
    config.session_refresh_seconds * 1_000,
  );
  notifications = new PlexNotifications(config, {
    onPlaybackEvent: () => monitor?.scheduleRefresh(),
  });
  notifications.start();
}

async function initialize() {
  const generation = ++initializationGeneration;
  stopRuntime();
  if (!isConfigured(config)) {
    await gladys.setConnectionStatus(false, {
      en: 'Fill in the Plex server URL and token.',
      fr: 'Renseignez l’URL et le token du serveur Plex.',
    });
    return;
  }

  try {
    await plexServer.actions.test_plex(gladys, { config });
    if (generation !== initializationGeneration) return;
    const nextMonitor = new PlexMonitor(gladys, config, plexServer.featureExternalIds(gladys));
    monitor = nextMonitor;
    await publishDevices();
    await nextMonitor.refresh({ forcePublish: true });
    consecutiveRefreshFailures = 0;
    if (generation !== initializationGeneration || monitor !== nextMonitor) return;
    startRuntime();
    await gladys.setConnectionStatus(true);
  } catch (error) {
    if (generation !== initializationGeneration) return;
    logger.error('Plex initialization failed', error);
    await gladys.setConnectionStatus(false, {
      en: `Plex connection failed: ${error.message}`,
      fr: `La connexion Plex a échoué : ${error.message}`,
    });
  }
}

gladys.onScanRequest(async () => {
  await publishDevices();
  await refreshSessionsSafely({ forcePublish: true });
});

gladys.onDeviceCreated(async (device) => {
  if (device.external_id !== plexServer.deviceExternalId(gladys)) return;
  monitor?.resetPublicationCache();
  await refreshSessionsSafely({ forcePublish: true });
});

gladys.onSetValue(async (device, feature, value) => {
  const blueprint = findBlueprintByDevice(gladys, device);
  if (!blueprint?.onSetValue || !monitor) throw new Error('Plex server not connected');
  await blueprint.onSetValue(gladys, { device, feature, value, monitor });
});

for (const blueprint of DEVICE_BLUEPRINTS) {
  for (const [actionKey, handler] of Object.entries(blueprint.actions ?? {})) {
    gladys.onAction(actionKey, (fields) => handler(gladys, { fields, config }));
  }
}

gladys.onAction('show_webhook_url', async () => {
  const webhookState = await gladys.getWebhooks();
  const url = webhookState.webhooks?.find((webhook) => webhook.key === 'plex_events')?.url;
  if (!webhookState.available || !url) {
    return {
      en: 'Webhook relay unavailable. The Plex notification socket and polling fallback remain active.',
      fr: 'Relais webhook indisponible. Le socket de notifications Plex et le polling de secours restent actifs.',
    };
  }
  return {
    en: `Copy this URL to Plex Web > Account > Webhooks: ${url}`,
    fr: `Copiez cette URL dans Plex Web > Compte > Webhooks : ${url}`,
  };
});

gladys.onWebhook('plex_events', async ({ body }) => {
  try {
    const playback = playbackFromWebhook(parsePlexWebhook(body));
    if (playback && monitor) await monitor.applyWebhook(playback);
  } catch (error) {
    logger.warn(`Plex webhook ignored: ${error.message}`);
  }
});

gladys.onConfigUpdated(async (newConfig) => {
  config = normalizeConfig(newConfig);
  await initialize();
});

gladys.on('connected', async () => {
  config = normalizeConfig(await gladys.getConfig());
  await initialize();
});

gladys.on('disconnected', stopRuntime);
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  stopRuntime();
});
logger.info('Starting Plex integration...');
gladys.connect().catch((error) => {
  logger.error('Initial connection failed', error);
  process.exit(1);
});
