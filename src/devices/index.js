import { plexPlayer } from './plexPlayer.js';

export const DEVICE_BLUEPRINTS = [plexPlayer];

export function buildDiscoveredDevices(gladys, config) {
  return DEVICE_BLUEPRINTS.flatMap((blueprint) =>
    typeof blueprint.buildDiscoveredDevices === 'function'
      ? blueprint.buildDiscoveredDevices(gladys, config)
      : [blueprint.buildDevice(gladys, config)],
  );
}

export function findBlueprintByDevice(gladys, device) {
  return DEVICE_BLUEPRINTS.find(
    (blueprint) =>
      (typeof blueprint.ownsDevice === 'function' && blueprint.ownsDevice(gladys, device)) ||
      blueprint.deviceExternalId(gladys) === device.external_id,
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
