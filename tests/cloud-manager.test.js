import assert from 'node:assert/strict';
import test from 'node:test';

import {
    CLOUD_FACTORY_DEFAULTS,
    CloudManager,
    getCloudFactoryParams,
    sanitizeCloudControllers
} from '../js/cloud-manager.js';

test('factory parameters expose every cloud layer with the approved baseline', () => {
    assert.deepEqual(getCloudFactoryParams(), {
        cloudsLowCount: 79,
        cloudsLowSize: 0.4,
        cloudsLowSizeVariation: 0.9,
        cloudsLowAltitude: 285,
        cloudsLowDistance: 450,
        cloudsHighCount: 14,
        cloudsHighSize: 5.25,
        cloudsHighSizeVariation: 0.25,
        cloudsHighAltitude: 500,
        cloudsHighDistance: 14700,
        cloudsLowTowerCount: 17,
        cloudsLowTowerSize: 4.55,
        cloudsLowTowerSizeVariation: 0.35,
        cloudsLowTowerAltitude: -464,
        cloudsLowTowerDistance: 20000,
        cloudsGiantCount: 13,
        cloudsGiantSize: 6.9,
        cloudsGiantSizeVariation: 0.55,
        cloudsGiantAltitude: -500,
        cloudsGiantDistance: 20000,
        cloudsBillboardCount: 26,
        cloudsBillboardSize: 1,
        cloudsBillboardSizeVariation: 0.35,
        cloudsBillboardAltitude: 1400,
        cloudsBillboardDistance: 5200
    });
});

test('invalid saved cloud fields fall back independently without changing opacity', () => {
    const saved = {
        cloudsLowCount: Number.NaN,
        cloudsHighCount: 999,
        cloudsGiantSize: 'not-a-number',
        cloudsBillboardDistance: 8000,
        cloudsHighOpacity: 0.37
    };
    const clean = sanitizeCloudControllers(saved);

    assert.equal(clean.cloudsLowCount, 79);
    assert.equal(clean.cloudsHighCount, CLOUD_FACTORY_DEFAULTS.cumulusTowers.maxCount);
    assert.equal(clean.cloudsGiantSize, 6.9);
    assert.equal(clean.cloudsBillboardDistance, 8000);
    assert.equal(clean.cloudsHighOpacity, 0.37);
});

test('reset restores cloud fields and purges stale cloud persistence only', () => {
    const entries = new Map([
        ['flightSettings', '{}'],
        ['flight_biome_Coast', '{}'],
        ['cloudSettingsLegacy', '{}'],
        ['unrelatedSetting', 'keep']
    ]);
    const storage = {
        get length() { return entries.size; },
        key(index) { return [...entries.keys()][index] ?? null; },
        removeItem(key) { entries.delete(key); }
    };
    const params = { cloudsLowSize: 9, cloudsHighOpacity: 0.42 };
    const manager = new CloudManager(params, { storage });

    manager.resetToDefaults();

    assert.equal(params.cloudsLowSize, 0.4);
    assert.equal(params.cloudsHighOpacity, 0.42);
    assert.equal(entries.has('flightSettings'), false);
    assert.equal(entries.has('flight_biome_Coast'), false);
    assert.equal(entries.has('cloudSettingsLegacy'), false);
    assert.equal(entries.get('unrelatedSetting'), 'keep');
});
