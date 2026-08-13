import { plexPlayer } from './plexPlayer.js';

export const DEVICE_BLUEPRINTS = [plexPlayer];

export function buildDiscoveredDevices(gladys, config) {
  return DEVICE_BLUEPRINTS.map((blueprint) => blueprint.buildDevice(gladys, config));
}

export function findBlueprintByDevice(gladys, device) {
  return DEVICE_BLUEPRINTS.find(
    (blueprint) => blueprint.deviceExternalId(gladys) === device.external_id,
  );
}

export function buildTransportEntries() {
  return [];
}

export async function identifyDevice() {
  return {
    en: 'Plex players cannot be identified by a physical signal.',
    fr: 'Les lecteurs Plex ne peuvent pas être identifiés par un signal physique.',
  };
}
