import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import {
  DEVICE_BLUEPRINTS,
  buildDiscoveredDevices,
  findBlueprintByDevice,
} from './src/devices/index.js';
import { playbackFromWebhook, parsePlexWebhook } from './src/webhook.js';

const gladys = new GladysIntegration();
let config = normalizeConfig();

async function publishDevices() {
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
}

async function updateWebhookRelayAvailability(webhookState) {
  const state = webhookState ?? (await gladys.getWebhooks());
  for (const blueprint of DEVICE_BLUEPRINTS) {
    blueprint.setWebhookRelayAvailable?.(state.available);
  }
}

gladys.onScanRequest(async () => {
  logger.info('Plex discovery requested');
  await publishDevices();
});

gladys.onSetValue(async (device, feature, value) => {
  const blueprint = findBlueprintByDevice(gladys, device);
  if (!blueprint?.onSetValue) throw new Error(`No command handler for ${device.external_id}`);
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

gladys.onAction('show_webhook_url', async () => {
  const webhookState = await gladys.getWebhooks();
  const url = webhookState.webhooks?.find((webhook) => webhook.key === 'plex_events')?.url;
  if (!webhookState.available || !url) {
    return {
      en: 'Webhook relay unavailable. Link Gladys Plus and configure its Open API key; polling remains enabled.',
      fr: 'Relais webhook indisponible. Associez Gladys Plus et configurez sa clé Open API ; le polling reste actif.',
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
    if (!playback) return;
    await DEVICE_BLUEPRINTS[0].onWebhook(gladys, playback);
  } catch (error) {
    logger.error(`Plex webhook ignored: ${error.message}`);
  }
});

gladys.onWebhookUpdated(async (webhookState) => {
  await updateWebhookRelayAvailability(webhookState);
  await publishDevices();
});

gladys.onConfigUpdated(async (newConfig) => {
  config = normalizeConfig(newConfig);
  await publishDevices();
  await DEVICE_BLUEPRINTS[0].onPoll(gladys, config);
});

gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    await updateWebhookRelayAvailability();
    await publishDevices();
    await DEVICE_BLUEPRINTS[0].actions.test_plex(gladys, { config });
    await DEVICE_BLUEPRINTS[0].onPoll(gladys, config);
    await gladys.setConnectionStatus(true);
  } catch (error) {
    logger.error('Plex initialization failed', error);
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
