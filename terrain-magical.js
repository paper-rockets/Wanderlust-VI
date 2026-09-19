import * as THREE from 'three';

// Palette Definitions
const colorAbyssWater  = new THREE.Color(0x0b132b); // Deep Water / Abyss
const colorGlowingSand = new THREE.Color(0x9bf6ff); // Glowing Shore / Sand
const colorMysticGrass = new THREE.Color(0x7b2cbf); // Plateau Topsoil / Mystical Grass
const colorBasaltCliff = new THREE.Color(0x1d1a44); // Basalt Cliffs & Sheer Faces
const colorSpireTip    = new THREE.Color(0xffc6ff); // Spire Tips & Vein Highlights

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

// Deterministic cell pseudo-random generator
function cellHash(gx, gz) {
    const s = Math.sin(gx * 127.1 + gz * 311.7) * 43758.5453123;
    return s - Math.floor(s);
}

/**
 * Procedural Elevation for Magical Sanctuary
 * Generates flat-topped mesa plateaus and vertical stone spires separated by chasms.
 * 
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @param {number} islandDist - Normalized distance from island center (optional)
 * @param {function} noise - Simplex noise function (snoise)
 * @returns {number} Elevation in meters
 */
export function getElevation(x, z, islandDist = 0, noise) {
    if (!noise) return 4.0;

    // 1. Domain Warping (f = 0.002, alpha = 60.0)
    const wx = x + 60.0 * noise(x * 0.002, z * 0.002);
    const wz = z + 60.0 * noise((x + 52.3) * 0.002, (z + 13.7) * 0.002);

    // 2. Base Foundation Relief
    const n1 = noise(wx * 0.00075, wz * 0.00075);
    const n2 = noise(wx * 0.0018 + 40.0, wz * 0.0018 - 40.0);
    const rawH = (n1 * 0.65 + n2 * 0.35 + 0.36) * 52.0 + 8.0;

    // 3. Mesa Clamping / Plateau Profile (Smooth-quantized terraces, Step S = 18m)
    const S = 18.0;
    const t = rawH / S;
    const fl = Math.floor(t);
    const fr = t - fl;
    const mesaH = fl * S + S * smoothstep(0.4, 0.6, fr);

    // 4. Stone Pillars (High-frequency vertical spires rising 40m to 80m)
    const cellSize = 220.0;
    const gx = Math.floor(wx / cellSize);
    const gz = Math.floor(wz / cellSize);

    let maxSpireH = 0.0;

    // Evaluate 3x3 neighboring cells for continuous spire coverage
    for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
            const cgx = gx + ox;
            const cgz = gz + oz;
            const h = cellHash(cgx, cgz);

            // ~45% of cells contain a stone pillar
            if (h > 0.55) {
                const px = (cgx + 0.5 + 0.3 * Math.sin(h * 17.0)) * cellSize;
                const pz = (cgz + 0.5 + 0.3 * Math.cos(h * 23.0)) * cellSize;
                const d = Math.hypot(wx - px, wz - pz);

                const radius = 26.0 + 16.0 * (Math.sin(h * 7.0) * 0.5 + 0.5);
                const spireHeight = 42.0 + 38.0 * (Math.cos(h * 13.0) * 0.5 + 0.5);

                if (d < radius) {
                    const normD = d / radius;
                    const spike = Math.pow(1.0 - normD, 3.0) * spireHeight;
                    if (spike > maxSpireH) {
                        maxSpireH = spike;
                    }
                }
            }
        }
    }

    const totalH = mesaH + maxSpireH;
    // Smooth shoreline termination (sea level at y = 2.4m to 2.8m)
    return Math.max(2.5, totalH);
}

/**
 * Procedural Slope-Aware Coloring for Magical Sanctuary
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

    // 1. Basalt Cliffs & Sheer Faces (applied sharply where normal.y < 0.75, slope > 41 deg)
    if (ny < 0.75 && height > 3.2) {
        outColor.copy(colorBasaltCliff);
        // Subtle vein striations on cliff walls
        if (noise) {
            const vNoise = noise(x * 0.003, (height * 0.08) + z * 0.003);
            if (vNoise > 0.65) {
                outColor.lerp(colorSpireTip, (vNoise - 0.65) * 0.45);
            }
        }
        return outColor;
    }

    // 2. Shoreline & Water Transitions
    if (height < 2.0) {
        outColor.copy(colorAbyssWater);
        return outColor;
    }

    if (height < 3.8) {
        // Glowing Shore / Sand
        const tSand = smoothstep(2.0, 2.08, height);
        const tGrass = smoothstep(3.72, 3.8, height);
        outColor.copy(colorAbyssWater).lerp(colorGlowingSand, tSand);
        outColor.lerp(colorMysticGrass, tGrass);
        return outColor;
    }

    // 3. Plateau Topsoil / Mystical Grass (Default Ground)
    outColor.copy(colorMysticGrass);

    // 4. Spire Tips & Vein Highlights (applied on high summits with boosted emission)
    if (height > 55.0) {
        const spireFactor = smoothstep(55.0, 78.0, height);
        if (spireFactor > 0) {
            // Emissive glow boost for spire tips
            const glowColor = colorSpireTip.clone().multiplyScalar(1.28);
            outColor.lerp(glowColor, spireFactor);
        }
    }

    return outColor;
}

// Module default export for world generator pipeline
export default {
    name: "✨ Magical Sanctuary",
    shoreName: "░ Magical Shore",
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
