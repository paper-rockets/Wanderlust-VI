import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorIslandGrass = new THREE.Color(0x76d149);
const colorEmeraldGrass = new THREE.Color(0x56b847);
const colorOliveGrass = new THREE.Color(0x8cc440);
const colorFernGreen = new THREE.Color(0x2f6b3f);
const colorSageGreen = new THREE.Color(0x94ad72);
const colorMeadowGold = new THREE.Color(0xa8b95d);
const colorHigh = new THREE.Color(0x78965a);
const colorIslandRock = new THREE.Color(0x8a725a);
const colorDirt = new THREE.Color(0xdcb58a);
const scratchPatchColor = new THREE.Color();

export default {
    name: "Ghibli Land",
    shoreName: "░ Continental Shore",
    getHeight(x, z, snoise) {
        // Multi-octave natural rolling hills, gentle valleys, and green meadows
        const wx = x + snoise(x * 0.0008 + 42.0, z * 0.0008 - 42.0) * 350.0;
        const wz = z + snoise(x * 0.0008 - 84.0, z * 0.0008 + 84.0) * 350.0;

        const n1 = snoise(wx * 0.00065, wz * 0.00065);
        const n2 = snoise(wx * 0.0018 + 50.0, wz * 0.0018 + 50.0);
        const n3 = snoise(x * 0.006 + 100.0, z * 0.006 + 100.0);
        // Keep the landscape's large character, but make the finest ripple broad enough
        // for the terrain grid to render as a soft hill instead of visible little triangles.
        const n4 = snoise(x * 0.009 + 200.0, z * 0.009 + 200.0);

        const rollingHills = (n1 * 0.58 + n2 * 0.32) * 54.0 + (n3 * 3.2 + n4 * 0.35) + 18.0;

        // Gentle river valleys with wide soft banks
        const rn = Math.abs(snoise(wx * 0.0010 + 150.0, wz * 0.0010 + 150.0));
        let valleyCarve = 0;
        if (rn < 0.09) {
            const t = 1.0 - rn / 0.09;
            valleyCarve = t * t * (3.0 - 2.0 * t) * 9.0;
        }

        return Math.max(3.0, rollingHills - valleyCarve);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const meadowNoise = snoise(x * 0.0035, z * 0.0035);
        const oliveNoise = snoise(x * 0.008 + 200, z * 0.008 + 200);

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(4.2, 6.2, h));
        } else if (h < 48) {
            scratchPatchColor.copy(colorIslandGrass);
            // Four quiet grass families make broad meadows feel layered without adding terrain detail.
            if (meadowNoise < -0.18) scratchPatchColor.lerp(colorFernGreen, Math.min(1, (-meadowNoise - 0.18) * 1.9));
            if (meadowNoise > 0.12) scratchPatchColor.lerp(colorEmeraldGrass, Math.min(1, (meadowNoise - 0.12) * 2.1));
            if (oliveNoise > 0.08) scratchPatchColor.lerp(colorOliveGrass, Math.min(1, (oliveNoise - 0.08) * 1.8));
            if (oliveNoise < -0.30) scratchPatchColor.lerp(colorSageGreen, Math.min(1, (-oliveNoise - 0.30) * 1.7));
            if (meadowNoise > 0.30 && oliveNoise > 0.05) scratchPatchColor.lerp(colorMeadowGold, 0.20);
            // Valleys stay cool and dense; exposed upper slopes fade into a quiet sage rather than lime.
            scratchPatchColor.lerp(colorFernGreen, smoothstep(28.0, 10.0, h) * 0.34);
            scratchPatchColor.lerp(colorSageGreen, smoothstep(28.0, 48.0, h) * 0.38);
            tempColor.lerpColors(scratchPatchColor, colorHigh, smoothstep(24.0, 56.0, h));
        } else if (h < 75) {
            tempColor.lerpColors(colorHigh, colorIslandRock, smoothstep(48, 75, h));
        } else {
            tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(75, 110, h));
        }

    }
};
