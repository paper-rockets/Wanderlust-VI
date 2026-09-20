import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x133e75);
const colorShallowWater = new THREE.Color(0x2780a4);
const colorSand = new THREE.Color(0xf5e3b3);
const colorIslandGrass = new THREE.Color(0x6ec93e);
const colorEmeraldGrass = new THREE.Color(0x43ad38);
const colorOliveGrass = new THREE.Color(0x82be35);
const colorHigh = new THREE.Color(0x78d450);
const colorIslandRock = new THREE.Color(0x7d6a54);
const colorDirt = new THREE.Color(0xd2aa7d);
const scratchPatchColor = new THREE.Color();

export default {
    name: "🌊 Water Archipelago",
    shoreName: "🌊 Water Archipelago",
    getHeight(x, z, snoise) {
        // Multi-scale tropical island terrain: sandy shores, lush palm hills, and gentle ridges
        const wx = x + snoise(x * 0.0009 + 25.0, z * 0.0009 + 25.0) * 300.0;
        const wz = z + snoise(x * 0.0009 - 35.0, z * 0.0009 + 35.0) * 300.0;

        const n1 = snoise(wx * 0.0008, wz * 0.0008);
        const n2 = snoise(wx * 0.0022 + 80.0, wz * 0.0022 - 80.0);
        const n3 = snoise(x * 0.006 + 150.0, z * 0.006 + 150.0);
        const n4 = snoise(x * 0.016, z * 0.016);

        // Gentle central tropical peaks and soft rolling plateaus
        const peaks = Math.pow(Math.max(0, n1 * 0.65 + n2 * 0.35 + 0.3), 1.4) * 48.0;
        const detail = n3 * 3.0 + n4 * 0.8;

        // Atoll lagoons in some areas (softened transition)
        const lagoonN = snoise(wx * 0.0024 + 500.0, wz * 0.0024 - 500.0);
        const lagoonCarve = lagoonN > 0.65 ? Math.pow((lagoonN - 0.65) / 0.35, 1.5) * 14.0 : 0.0;

        return Math.max(1.5, peaks + detail + 4.0 - lagoonCarve);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const meadowNoise = snoise(x * 0.0035, z * 0.0035);
        const oliveNoise = snoise(x * 0.008 + 200, z * 0.008 + 200);

        if (h < 0.6) {
            tempColor.copy(colorDeepWater);
        } else if (h < 1.8) {
            tempColor.lerpColors(colorDeepWater, colorShallowWater, smoothstep(0.6, 1.8, h));
        } else if (h < 3.2) {
            tempColor.lerpColors(colorShallowWater, colorSand, smoothstep(1.8, 3.2, h));
        } else if (h < 5.8) {
            tempColor.copy(colorSand);
        } else if (h < 8.5) {
            tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(5.8, 8.5, h));
        } else if (h < 32) {
            scratchPatchColor.copy(colorIslandGrass);
            // Wide, feathered colour transitions keep the painted grass variation soft even on
            // the existing terrain grid. This changes colour only; heights stay untouched.
            const meadowBlend = smoothstep(0.04, 0.42, meadowNoise);
            const oliveBlend = smoothstep(0.08, 0.46, oliveNoise);
            scratchPatchColor.lerp(colorEmeraldGrass, meadowBlend * 0.58);
            scratchPatchColor.lerp(colorOliveGrass, oliveBlend * 0.42);
            tempColor.lerpColors(scratchPatchColor, colorHigh, smoothstep(8.5, 32, h));
        } else if (h < 48) {
            tempColor.lerpColors(colorHigh, colorIslandRock, smoothstep(32, 48, h));
        } else {
            tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(48, 70, h));
        }
    }
};
