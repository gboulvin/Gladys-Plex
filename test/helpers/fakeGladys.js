export function createFakeGladys() {
  const publishedStates = [];
  const publishedTextStates = [];
  const discoveredDevices = [];
  const connectionStatuses = [];

  return {
    publishedStates,
    publishedTextStates,
    discoveredDevices,
    connectionStatuses,
    externalIds(type, platformId) {
      const device = `ext:test:${type}:${platformId}`;
      return {
        device,
        feature: (key) => `${device}:${key}`,
      };
    },
    async publishState(deviceFeatureExternalId, value) {
      if (typeof value === 'object' && typeof value.text === 'string') {
        publishedTextStates.push({
          device_feature_external_id: deviceFeatureExternalId,
          text: value.text,
        });
        return;
      }
      publishedStates.push({ device_feature_external_id: deviceFeatureExternalId, state: value });
    },
    async publishDiscoveredDevices(devices) {
      discoveredDevices.splice(0, discoveredDevices.length, ...devices);
    },
    async setConnectionStatus(connected, message) {
      connectionStatuses.push({ connected, message });
    },
  };
}
