import * as THREE from 'three';

// Palette Definitions
const colorPastelWater    = new THREE.Color(0xa2d2ff); // Pastel Water
const colorBlossomSand    = new THREE.Color(0xffcad4); // Blossom Sand
const colorBleachedEarth  = new THREE.Color(0xf8f9fa); // Bleached Earth / Terrace Margins
const colorLowPetalTurf   = new THREE.Color(0xffb4a2); // Lowland Petal Turf
const colorHighPetalTurf  = new THREE.Color(0xe5989b); // Upper Tier Petal Turf
const colorCoralRoseRock  = new THREE.Color(0xb56576); // Exposed Terrace Steps & Coral Rose Rock

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

/**
 * Procedural Elevation for Sakura Realm
 * Generates stepped rice terraces, soft river bluffs, and sweeping cherry knolls.
 * 
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @param {number} islandDist - Normalized distance from island center (optional)
 * @param {function} noise - Simplex noise function (snoise)
 * @returns {number} Elevation in meters
 */
export function getElevation(x, z, islandDist = 0, noise) {
    if (!noise) return 4.0;

    // 1. Domain Warping (f = 0.0015, alpha = 80.0)
    const wx = x + 80.0 * noise(x * 0.0015, z * 0.0015);
    const wz = z + 80.0 * noise((x + 52.3) * 0.0015, (z + 13.7) * 0.0015);

    // 2. Soft Bluffs & Macro Rolling Hills
    const nBase = noise(wx * 0.00065, wz * 0.00065) * 0.5 + 0.5;
    const hBase = nBase * 34.0 + 5.0;

    // 3. Terracing Profile: Large horizontal expanses (30m–50m) dropping abruptly by 2.5m to 4.0m
    // H = h_base + deltaH * (floor(h_detail * k) + smoothstep(0.85, 1.0, fract(h_detail * k)))
    const deltaH = 3.2;
    const k = 1.0 / deltaH;
    const nDetail1 = noise(wx * 0.0012 + 60.0, wz * 0.0012 - 60.0) * 0.5 + 0.5;
    const nDetail2 = noise(wx * 0.0028 + 120.0, wz * 0.0028 - 120.0) * 0.5 + 0.5;
    const hDetail = (nDetail1 * 0.75 + nDetail2 * 0.25) * 26.0;

    const t = hDetail * k;
    const fl = Math.floor(t);
    const fr = t - fl;
    const hTerraces = deltaH * (fl + smoothstep(0.85, 1.0, fr));

    const totalH = hBase + hTerraces;
    // Smooth shoreline termination (sea level at y = 2.4m to 2.8m)
    return Math.max(2.5, totalH);
}

/**
 * Procedural Slope-Aware Coloring for Sakura Realm
 * 
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @param {number} height - Elevation in meters
 * @param {number} slope - Slope factor (1.0 - normal.y)
 * @param {object} normal - Normal vector { x, y, z } (optional)
 * @param {function} noise - Simplex noise function
 * @returns {THREE.Color} Normalized RGB color
 */
export function getBiomeColor(x, z, height, slope = 0, normal = null, noise = null) {
    const outColor = new THREE.Color();

    const ny = normal ? normal.y : (1.0 - slope);

    // 1. Slope Awareness: Slopes steeper than 35 deg (normal.y < 0.819) sharply transition to Coral Rose Rock
    if (ny < 0.819 && height > 3.2) {
        outColor.copy(colorCoralRoseRock);
        return outColor;
    }

    // 2. Shoreline & Water Transitions
    if (height < 2.0) {
        outColor.copy(colorPastelWater);
        return outColor;
    }

    if (height < 3.8) {
        // Blossom Sand
        const tSand = smoothstep(2.0, 2.08, height);
        const tTurf = smoothstep(3.72, 3.8, height);
        outColor.copy(colorPastelWater).lerp(colorBlossomSand, tSand);
        outColor.lerp(colorLowPetalTurf, tTurf);
        return outColor;
    }

    // 3. Terrace Margins: Bleached Earth at step edges
    // Recalculate terrace fraction at (x, z) if noise is available
    if (noise) {
        const wx = x + 80.0 * noise(x * 0.0015, z * 0.0015);
        const wz = z + 80.0 * noise((x + 52.3) * 0.0015, (z + 13.7) * 0.0015);
        const deltaH = 3.2;
        const k = 1.0 / deltaH;
        const nDetail1 = noise(wx * 0.0012 + 60.0, wz * 0.0012 - 60.0) * 0.5 + 0.5;
        const nDetail2 = noise(wx * 0.0028 + 120.0, wz * 0.0028 - 120.0) * 0.5 + 0.5;
        const hDetail = (nDetail1 * 0.75 + nDetail2 * 0.25) * 26.0;
        const fr = (hDetail * k) - Math.floor(hDetail * k);

        // Terrace edge rim highlighted with bleached earth
        if (fr > 0.78 && fr < 0.86) {
            outColor.copy(colorBleachedEarth);
            return outColor;
        }
    }

    // 4. Petal Turf: Dual-tone pinks (#FFB4A2 lowlands, shifting to #E5989B on upper tiers)
    if (height < 26.0) {
        const tTier = smoothstep(18.0, 26.0, height);
        outColor.copy(colorLowPetalTurf).lerp(colorHighPetalTurf, tTier);
    } else {
        outColor.copy(colorHighPetalTurf);
    }

    return outColor;
}

// Module default export for world generator pipeline
export default {
    name: "🌸 Sakura Realm",
    shoreName: "░ Blossom Shore",
    getElevation,
    getBiomeColor,

    // Backwards-compatible adapter for existing pipeline calls
    getHeight(x, z, snoise, islandDist) {
        return getElevation(x, z, islandDist || 0, snoise);
    },
    getColor(h, x, z, snoise, tempColor, smoothstepFn, slope, normal) {
        const c = getBiomeColor(x, z, h, slope || 0, normal || null, snoise);
        if (tempColor && tempColor.copy) {
            tempColor.copy(c);
        }
        return c;
    }
};