const layer = (count, scale, sizeVariation, altitude, distance, maxCount, keys) => Object.freeze({
    count,
    scale,
    sizeVariation,
    altitude,
    distance,
    maxCount,
    keys: Object.freeze(keys)
});

export const CLOUD_FACTORY_DEFAULTS = Object.freeze({
    lowClouds: layer(150, 1.0, 0.45, 150, 2200, 250, {
        count: 'cloudsLowCount', scale: 'cloudsLowSize', variation: 'cloudsLowSizeVariation',
        altitude: 'cloudsLowAltitude', distance: 'cloudsLowDistance'
    }),
    cumulusTowers: layer(28, 3.0, 0.25, 250, 8000, 48, {
        count: 'cloudsHighCount', scale: 'cloudsHighSize', variation: 'cloudsHighSizeVariation',
        altitude: 'cloudsHighAltitude', distance: 'cloudsHighDistance'
    }),
    lowHorizonTowers: layer(12, 1.1, 0.35, -35, 3200, 48, {
        count: 'cloudsLowTowerCount', scale: 'cloudsLowTowerSize', variation: 'cloudsLowTowerSizeVariation',
        altitude: 'cloudsLowTowerAltitude', distance: 'cloudsLowTowerDistance'
    }),
    horizonBanks: layer(28, 3.0, 0.55, 500, 8975, 48, {
        count: 'cloudsGiantCount', scale: 'cloudsGiantSize', variation: 'cloudsGiantSizeVariation',
        altitude: 'cloudsGiantAltitude', distance: 'cloudsGiantDistance'
    }),
    lowHorizonBanks: layer(14, 1.1, 0.40, -5, 4400, 48, {
        count: 'cloudsLowBankCount', scale: 'cloudsLowBankSize', variation: 'cloudsLowBankSizeVariation',
        altitude: 'cloudsLowBankAltitude', distance: 'cloudsLowBankDistance'
    }),
    distantHighClouds: layer(26, 1.0, 0.35, 1400, 5200, 36, {
        count: 'cloudsBillboardCount', scale: 'cloudsBillboardSize', variation: 'cloudsBillboardSizeVariation',
        altitude: 'cloudsBillboardAltitude', distance: 'cloudsBillboardDistance'
    })
});

export const CLOUD_BIOME_PROFILE_DEFAULTS = Object.freeze({});

const FIELD_LIMITS = Object.freeze({
    count: [0, 250],
    scale: [0.2, 12],
    variation: [0, 0.9],
    altitude: [-500, 3500],
    distance: [100, 20000]
});

function clampFinite(value, fallback, limits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(limits[1], Math.max(limits[0], number));
}

export function getCloudFactoryParams(biomeId = null) {
    const profile = biomeId ? CLOUD_BIOME_PROFILE_DEFAULTS[biomeId] : null;
    const result = {};
    for (const [layerId, factory] of Object.entries(CLOUD_FACTORY_DEFAULTS)) {
        const configured = profile?.[layerId] ? { ...factory, ...profile[layerId] } : factory;
        result[factory.keys.count] = configured.count;
        result[factory.keys.scale] = configured.scale;
        result[factory.keys.variation] = configured.sizeVariation;
        result[factory.keys.altitude] = configured.altitude;
        result[factory.keys.distance] = configured.distance;
    }
    return result;
}

export function sanitizeCloudControllers(controllers = {}, biomeId = null) {
    const clean = { ...controllers };
    const defaults = getCloudFactoryParams(biomeId);
    for (const factory of Object.values(CLOUD_FACTORY_DEFAULTS)) {
        for (const [field, key] of Object.entries(factory.keys)) {
            const limits = field === 'count' ? [0, factory.maxCount] : FIELD_LIMITS[field];
            clean[key] = clampFinite(clean[key], defaults[key], limits);
            if (field === 'count') clean[key] = Math.round(clean[key]);
        }
    }
    return clean;
}

export class CloudManager {
    constructor(params, options = {}) {
        this.params = params;
        this.storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
        this.biomeId = options.biomeId ?? null;
    }

    getFactoryState(biomeId = this.biomeId) {
        return getCloudFactoryParams(biomeId);
    }

    applyState(overrides = {}, biomeId = this.biomeId) {
        const next = sanitizeCloudControllers(overrides, biomeId);
        Object.assign(this.params, next);
        return next;
    }

    resetToDefaults(options = {}) {
        const biomeId = options.biomeId ?? this.biomeId;
        const defaults = this.getFactoryState(biomeId);
        Object.assign(this.params, defaults);

        if (this.storage) {
            this.storage.removeItem('flightSettings');
            const staleKeys = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && (key.startsWith('flight_biome_') || key.startsWith('cloudSettings'))) {
                    staleKeys.push(key);
                }
            }
            staleKeys.forEach(key => this.storage.removeItem(key));
        }
        return { ...defaults };
    }
}
