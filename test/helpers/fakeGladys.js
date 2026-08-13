export function createFakeGladys() {
  const publishedStates = [];
  const discoveredDevices = [];
  const connectionStatuses = [];

  return {
    publishedStates,
    discoveredDevices,
    connectionStatuses,
    externalIds(type, platformId) {
      const device = `ext:test:${type}:${platformId}`;
      return {
        device,
        feature: (key) => `${device}:${key}`,
      };
    },
    async publishState(deviceFeatureExternalId, state) {
      publishedStates.push({ device_feature_external_id: deviceFeatureExternalId, state });
    },
    async publishDiscoveredDevices(devices) {
      discoveredDevices.splice(0, discoveredDevices.length, ...devices);
    },
    async setConnectionStatus(connected, message) {
      connectionStatuses.push({ connected, message });
    },
  };
}
