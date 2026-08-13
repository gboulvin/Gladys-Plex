import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  DEVICE_BLUEPRINTS,
  buildDiscoveredDevices,
  findBlueprintByDevice,
  identifyDevice,
} from './src/devices/index.js';
import { parsePlexWebhookBody, setWebhookAvailability } from './src/devices/plexPlayer.js';

const gladys = new GladysIntegration();
let config = normalizeConfig();

async function refreshPlex() {
  for (const blueprint of DEVICE_BLUEPRINTS) {
    if (typeof blueprint.refresh === 'function') await blueprint.refresh(gladys, config);
  }
}

async function refreshWebhookState() {
  const state = await gladys.getWebhooks().catch(() => ({ available: false, webhooks: [] }));
  setWebhookAvailability(state.available === true);
  return state;
}

async function publishFallbackDevices() {
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
}

gladys.onScanRequest(async () => {
  logger.info('Plex discovery requested');
  try {
    await refreshPlex();
  } catch (error) {
    await publishFallbackDevices();
    throw error;
  }
});

gladys.onSetValue(async (device, feature, value) => {
  const blueprint = findBlueprintByDevice(gladys, device);
  if (!blueprint || typeof blueprint.onSetValue !== 'function') {
    throw new Error(`No command handler for ${device.external_id}`);
  }
  await blueprint.onSetValue(gladys, { device, feature, value, config });
});

gladys.onPoll(async (device) => {
  const blueprint = findBlueprintByDevice(gladys, device);
  if (blueprint?.onPoll) await blueprint.onPoll(gladys, config);
});

for (const blueprint of DEVICE_BLUEPRINTS) {
  for (const [actionKey, handler] of Object.entries(blueprint.actions ?? {})) {
    gladys.onAction(actionKey, (fields) => handler(gladys, { fields, config }));
  }
}

gladys.onAction('identify', (fields) => identifyDevice(gladys, fields.device, config));

gladys.onAction('show_webhook_url', async () => {
  const state = await refreshWebhookState();
  const url = state.webhooks?.find((webhook) => webhook.key === 'plex_events')?.url;
  if (!state.available || !url) {
    return {
      en: 'Webhook relay unavailable. Link Gladys Plus and configure its Open API key first; polling remains enabled.',
      fr: 'Relais webhook indisponible. Associez Gladys Plus et configurez sa clé Open API ; le polling reste actif.',
    };
  }
  return {
    en: `Copy this URL into Plex Web > Account > Webhooks: ${url}`,
    fr: `Copiez cette URL dans Plex Web > Compte > Webhooks : ${url}`,
  };
});

gladys.onWebhook('plex_events', async ({ body }) => {
  try {
    const payload = parsePlexWebhookBody(body);
    for (const blueprint of DEVICE_BLUEPRINTS) {
      if (typeof blueprint.onWebhook === 'function')
        await blueprint.onWebhook(gladys, config, payload);
    }
  } catch (error) {
    logger.error(`Invalid Plex webhook ignored: ${error.message}`);
  }
});

gladys.onWebhookUpdated(async () => {
  await refreshWebhookState();
  await refreshPlex();
});

gladys.onConfigUpdated(async (newConfig) => {
  config = normalizeConfig(newConfig);
  await refreshPlex();
});

gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    await refreshWebhookState();
    await refreshPlex();
    await gladys.setConnectionStatus(true);
  } catch (error) {
    logger.error('Plex initialization failed', error);
    await publishFallbackDevices().catch(() => {});
    await gladys.setConnectionStatus(false, {
      en: 'Plex connection failed. Check the URL, token and integration logs.',
      fr: 'La connexion Plex a échoué. Vérifiez l’URL, le token et les logs de l’intégration.',
    });
  }
});

gladys.handleShutdown((signal) => logger.info(`Received ${signal} -> graceful shutdown`));
logger.info('Starting Plex integration...');
gladys.connect().catch((error) => {
  logger.error('Initial connection failed', error);
  process.exit(1);
});
