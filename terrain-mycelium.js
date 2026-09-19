import * as THREE from 'three';

// Palette Definitions
const colorTwilightWater = new THREE.Color(0x1a1a40); // Twilight Water
const colorVioletSand    = new THREE.Color(0x4d3b6b); // Violet Shoreline Sand
const colorDarkHumus     = new THREE.Color(0x241829); // Dark Humus Soil
const colorSporeVein     = new THREE.Color(0x5a189a); // Spore Veins & Meadow Carpeting
const colorBiolumPink    = new THREE.Color(0xff007f); // Bioluminescent Accents & Cap Crests

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

// Deterministic cell pseudo-random generator
function cellHash(gx, gz) {
    const s = Math.sin(gx * 143.3 + gz * 277.9) * 43758.5453123;
    return s - Math.floor(s);
}

/**
 * Procedural Elevation for Mycelium Forest
 * Generates whimsical spore dunes (billow noise) and collapsed caldera craters with lip ridges.
 * 
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @param {number} islandDist - Normalized distance from island center (optional)
 * @param {function} noise - Simplex noise function (snoise)
 * @returns {number} Elevation in meters
 */
export function getElevation(x, z, islandDist = 0, noise) {
    if (!noise) return 4.0;

    // 1. Domain Warping (f = 0.0018, alpha = 70.0)
    const wx = x + 70.0 * noise(x * 0.0018, z * 0.0018);
    const wz = z + 70.0 * noise((x + 52.3) * 0.0018, (z + 13.7) * 0.0018);

    // 2. Spore Dunes: Billow Noise H_billow = |2.0 * noise(p) - 1.0|
    // Combined with power curve (H_billow)^1.5 to produce rounded dome caps with narrow valleys
    const n1 = noise(wx * 0.0011, wz * 0.0011);
    const n2 = noise(wx * 0.0026 + 45.0, wz * 0.0026 - 45.0);

    const b1 = Math.pow(Math.abs(n1), 1.5) * 44.0;
    const b2 = Math.pow(Math.abs(n2), 1.5) * 16.0;
    const dunesH = b1 + b2 + 7.0;

    // 3. Caldera / Spore Pits: Inverted bell curve with swollen lip ridge at rim (r ~ 1.5 * sigma)
    const cellSize = 380.0;
    const gx = Math.floor(wx / cellSize);
    const gz = Math.floor(wz / cellSize);

    let calderaDelta = 0.0;

    // Evaluate 3x3 neighboring cells for continuous crater placement
    for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
            const cgx = gx + ox;
            const cgz = gz + oz;
            const h = cellHash(cgx, cgz);

            // ~45% of cells contain a caldera pit
            if (h > 0.55) {
                const cx = (cgx + 0.5 + 0.28 * Math.sin(h * 19.0)) * cellSize;
                const cz = (cgz + 0.5 + 0.28 * Math.cos(h * 31.0)) * cellSize;
                const d = Math.hypot(wx - cx, wz - cz);

                const sigma = 30.0 + 12.0 * (Math.sin(h * 11.0) * 0.5 + 0.5);
                const D = 15.0 + 8.0 * (Math.cos(h * 7.0) * 0.5 + 0.5);
                const Dlip = D * 0.38;

                if (d < sigma * 3.5) {
                    const r2 = d * d;
                    const s2 = 2.0 * sigma * sigma;
                    const gauss = Math.exp(-r2 / s2);
                    const crater = -D * gauss;
                    const lip = Dlip * (r2 / (sigma * sigma)) * gauss;
                    calderaDelta += (crater + lip);
                }
            }
        }
    }

    const totalH = dunesH + calderaDelta;
    // Smooth shoreline termination (sea level at y = 2.4m to 2.8m)
    return Math.max(2.5, totalH);
}

/**
 * Procedural Slope-Aware Coloring for Mycelium Forest
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

    // 1. Slope Awareness: Slopes steeper than 35 deg (normal.y < 0.819) sharply transition to Dark Humus Soil
    if (ny < 0.819 && height > 3.0) {
        outColor.copy(colorDarkHumus);
        return outColor;
    }

    // 2. Shoreline & Water Transitions
    if (height < 2.0) {
        outColor.copy(colorTwilightWater);
        return outColor;
    }

    if (height < 3.8) {
        // Violet Shoreline Sand
        const tSand = smoothstep(2.0, 2.08, height);
        const tSoil = smoothstep(3.72, 3.8, height);
        outColor.copy(colorTwilightWater).lerp(colorVioletSand, tSand);
        outColor.lerp(colorDarkHumus, tSoil);
        return outColor;
    }

    // 3. Low valleys and caldera bases: Dark Humus Soil
    if (height < 9.0) {
        const tVein = smoothstep(7.0, 9.0, height);
        outColor.copy(colorDarkHumus).lerp(colorSporeVein, tVein);
        return outColor;
    }

    // 4. Default Ground: Spore Veins & Meadow Carpeting
    outColor.copy(colorSporeVein);

    // 5. Bioluminescent Accents & Cap Crests (applied to top-most curvature and dome ridge crests)
    if (ny > 0.92 && height > 24.0) {
        const crestFactor = smoothstep(24.0, 42.0, height);
        const tAccents = smoothstep(0.92, 0.98, ny) * crestFactor;
        if (tAccents > 0) {
            outColor.lerp(colorBiolumPink, tAccents * 0.95);
        }
    }

    return outColor;
}

// Module default export for world generator pipeline
export default {
    name: "🍄 Mycelium Forest",
    shoreName: "░ Twilight Shore",
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