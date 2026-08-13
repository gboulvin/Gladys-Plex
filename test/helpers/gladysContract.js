import assert from 'node:assert/strict';
import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';

const VALID_POLL_FREQUENCIES = new Set([1000, 2000, 10_000, 15_000, 30_000, 60_000]);

function flatten(value) {
  if (typeof value === 'string') return [value];
  return Object.values(value).flatMap(flatten);
}

const VALID_CATEGORIES = new Set(flatten(DEVICE_FEATURE_CATEGORIES));
const VALID_TYPES = new Set(flatten(DEVICE_FEATURE_TYPES));

export function assertGladysDeviceContract(devices, selector = 'test') {
  assert.ok(Array.isArray(devices), 'devices must be an array');
  const prefix = `ext:${selector}:`;
  for (const [deviceIndex, device] of devices.entries()) {
    assert.equal(typeof device.name, 'string', `devices[${deviceIndex}].name must be a string`);
    assert.ok(device.name.length > 0, `devices[${deviceIndex}].name must not be empty`);
    assert.ok(
      device.external_id.startsWith(prefix),
      `devices[${deviceIndex}].external_id must use the selector prefix`,
    );
    assert.ok(Array.isArray(device.features), `devices[${deviceIndex}].features must be an array`);
    if (device.poll_frequency !== undefined) {
      assert.ok(
        VALID_POLL_FREQUENCIES.has(device.poll_frequency),
        `devices[${deviceIndex}].poll_frequency must be allowed`,
      );
    }
    for (const [featureIndex, feature] of device.features.entries()) {
      const path = `devices[${deviceIndex}].features[${featureIndex}]`;
      assert.ok(
        feature.external_id.startsWith(prefix),
        `${path}.external_id must use the selector prefix`,
      );
      assert.ok(VALID_CATEGORIES.has(feature.category), `${path}.category must be valid`);
      assert.ok(VALID_TYPES.has(feature.type), `${path}.type must be valid`);
      assert.equal(typeof feature.min, 'number', `${path}.min must be numeric`);
      assert.equal(typeof feature.max, 'number', `${path}.max must be numeric`);
      assert.ok(feature.min <= feature.max, `${path}.min must not exceed max`);
      assert.equal(typeof feature.read_only, 'boolean', `${path}.read_only must be boolean`);
      assert.equal(typeof feature.has_feedback, 'boolean', `${path}.has_feedback must be boolean`);
      assert.equal(typeof feature.keep_history, 'boolean', `${path}.keep_history must be boolean`);
    }
  }
}

export function assertGladysStateContract(states, selector = 'test') {
  const prefix = `ext:${selector}:`;
  for (const [index, state] of states.entries()) {
    assert.ok(
      state.device_feature_external_id.startsWith(prefix),
      `states[${index}] must use the selector prefix`,
    );
    assert.equal(typeof state.state, 'number', `states[${index}].state must be numeric`);
    assert.ok(Number.isFinite(state.state), `states[${index}].state must be finite`);
  }
}
