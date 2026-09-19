import * as THREE from 'three';

// Palette Definitions
const colorDeepTeal    = new THREE.Color(0x004e64); // Deep Teal Water
const colorShallowAqua = new THREE.Color(0x25a18e); // Shallow Aqua Waterways
const colorLotusSilt   = new THREE.Color(0x9fffcb); // Lotus Pools & Water-Edge Silt
const colorJadeSand    = new THREE.Color(0x7ae582); // Jade Sand
const colorEmeraldMoss = new THREE.Color(0x38b000); // Emerald Moss

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

// Deterministic cell pseudo-random generator
function cellHash(gx, gz) {
    const s = Math.sin(gx * 157.1 + gz * 331.3) * 43758.5453123;
    return s - Math.floor(s);
}

/**
 * Procedural Elevation for Lotus Grove
 * Generates low-lying tidal shelves (80% between 2.6m and 5.0m), smooth braided waterways,
 * and broad circular stepping lilypad mounds.
 * 
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @param {number} islandDist - Normalized distance from island center (optional)
 * @param {function} noise - Simplex noise function (snoise)
 * @returns {number} Elevation in meters
 */
export function getElevation(x, z, islandDist = 0, noise) {
    if (!noise) return 3.5;

    // 1. Domain Warping (f = 0.0018, alpha = 60.0)
    const wx = x + 60.0 * noise(x * 0.0018, z * 0.0018);
    const wz = z + 60.0 * noise((x + 52.3) * 0.0018, (z + 13.7) * 0.0018);

    // 2. Tidal Shelf: 80% constrained in [2.6m, 5.0m]
    const n1 = noise(wx * 0.0008, wz * 0.0008) * 0.5 + 0.5;
    let h = 2.6 + smoothstep(0.12, 0.88, n1) * 2.3; // 2.6m to 4.9m shelf

    // 3. Braided Waterways: Ribbons |sin(noise * pi)| < W carved smoothly down to 1.2m
    const nRiver = noise(wx * 0.0014 + 100.0, wz * 0.0014 - 100.0);
    const sineVal = Math.abs(Math.sin(nRiver * Math.PI));
    const W = 0.22;

    if (sineVal < W) {
        const channel = 1.0 - smoothstep(0.02, W, sineVal);
        h = h * (1.0 - channel) + 1.2 * channel; // Smooth, wadeable shallow water
    }

    // 4. Stepping Mounds: Isolated, broad circular lilypad mounds rising 0.8m–2.0m out of shallows
    const cellSize = 160.0;
    const gx = Math.floor(wx / cellSize);
    const gz = Math.floor(wz / cellSize);

    let moundH = 0.0;

    // Evaluate 3x3 neighboring cells for continuous mound placement
    for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
            const cgx = gx + ox;
            const cgz = gz + oz;
            const hCell = cellHash(cgx, cgz);

            // ~50% of cells contain a lilypad stepping mound
            if (hCell > 0.50) {
                const cx = (cgx + 0.5 + 0.3 * Math.sin(hCell * 15.0)) * cellSize;
                const cz = (cgz + 0.5 + 0.3 * Math.cos(hCell * 27.0)) * cellSize;
                const d = Math.hypot(wx - cx, wz - cz);

                const radius = 24.0 + 14.0 * (Math.sin(hCell * 9.0) * 0.5 + 0.5);
                const peakH = 0.9 + 1.1 * (Math.cos(hCell * 11.0) * 0.5 + 0.5);

                if (d < radius) {
                    const normD = d / radius;
                    // Flat, rounded top dome
                    const mound = smoothstep(1.0, 0.25, normD) * peakH;
                    if (mound > moundH) {
                        moundH = mound;
                    }
                }
            }
        }
    }

    return Math.max(1.2, h + moundH);
}

/**
 * Procedural Slope-Aware Coloring for Lotus Grove
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

    // 1. Water Depths
    if (height < 1.4) {
        outColor.copy(colorDeepTeal);
        return outColor;
    }

    if (height < 2.5) {
        // Shallow Aqua Waterways
        const tWater = smoothstep(1.4, 2.5, height);
        outColor.copy(colorDeepTeal).lerp(colorShallowAqua, tWater);
        return outColor;
    }

    // 2. Slope Awareness: Steep waterway banks / mound edges transition to silt/rock
    if (ny < 0.819 && height > 2.5) {
        outColor.copy(colorShallowAqua).lerp(colorDeepTeal, 0.5);
        return outColor;
    }

    // 3. Shoreline & Water-Edge Silt
    if (height < 3.2) {
        const tSilt = smoothstep(2.5, 3.2, height);
        outColor.copy(colorLotusSilt).lerp(colorJadeSand, tSilt);
        return outColor;
    }

    // 4. Tidal Shelf & Jade Sand
    if (height < 4.2) {
        const tSand = smoothstep(3.2, 4.2, height);
        outColor.copy(colorJadeSand).lerp(colorEmeraldMoss, tSand);
        return outColor;
    }

    // 5. Emerald Moss on Higher Mounds and Stepping Flats
    outColor.copy(colorEmeraldMoss);
    return outColor;
}

// Module default export for world generator pipeline
export default {
    name: "🪷 Lotus Grove",
    shoreName: "░ Tranquil Waterway",
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