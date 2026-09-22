import * as THREE from 'three';

const colorDeepWater    = new THREE.Color(0x1a4a8c);
const colorSand         = new THREE.Color(0xf2e1b8);
const colorMountainGrass= new THREE.Color(0x52913e);     // Lush alpine meadow green
const colorMountainGrassWarm = new THREE.Color(0x6ba848); // Warm sunlit grass for low meadows
const colorMountainRock = new THREE.Color(0x5a5e6b);      // Slate grey rock
const colorSnow         = new THREE.Color(0xf5f6fa);      // Crisp snow white

// Centered in this app's playable world so the existing mountain chain reaches its island.
const CHAIN_CENTER_Z = 0;
const CHAIN_ANGLE = Math.PI / 5.5; // ~32.7° diagonal spine
const _cosA = Math.cos(CHAIN_ANGLE);
const _sinA = Math.sin(CHAIN_ANGLE);

// Domain rotation to break grid-aligned saw-tooth cross patterns
const cosR = 0.8660254; // cos(30 deg)
const sinR = 0.5;       // sin(30 deg)
const ELEVATION_MULTIPLIER = 1.35;

export default {
    name: "Misty Mountains II",
    shoreName: "░ Mountain Shore II",
    getHeight(x, z, snoise) {
        const perpDist   = x * _cosA - (z - CHAIN_CENTER_Z) * _sinA;
        const alongChain = x * _sinA + (z - CHAIN_CENTER_Z) * _cosA;

        const spineW = 1100;
        const spineT = Math.max(0.0, 1.0 - (perpDist / spineW) * (perpDist / spineW));
        const spineFactor = spineT * spineT;

        // Rotate alongChain and perpDist coordinates to eliminate grid cross patterns
        const rx = alongChain * cosR - perpDist * sinR;
        const rz = alongChain * sinR + perpDist * cosR;

        const n1 = snoise(rx * 0.00075 + 50.0, rz * 0.00075 + 50.0);
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge * (3.0 - 2.0 * ridge); // Smoothstep curve for natural organic peaks

        const n2 = snoise(x * 0.003 + 50, z * 0.003 + 50);
        const n3 = snoise(x * 0.009 + 50, z * 0.009 + 50);

        const foothills = Math.max(8.0, snoise(x * 0.0015 + 50, z * 0.0015 + 50) * 32.0 + 18.0);
        const peaks = ridge * 210.0 * spineFactor + n2 * 18.0 + n3 * 6.0;

        return Math.max(6.0, (foothills + peaks) * ELEVATION_MULTIPLIER);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        // Natural organic variation and craggy chutes on grass, rock, and snow lines
        const nNoise = snoise(x * 0.008 + 50, z * 0.008 + 50) * 14.0 + snoise(x * 0.024 + 50, z * 0.024 + 50) * 7.0;
        const grassUpper = 50.0 + nNoise * 0.6;  // Foothills and valleys stay green
        const rockUpper = 100.0 + nNoise * 1.1;  // Slate rock dominates middle mountain crags
        const snowFull = 132.0 + nNoise * 0.8;   // Pure snowcaps on tall peaks

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 9.0) {
            // Shore sand fading into lush valley grass
            tempColor.lerpColors(colorSand, colorMountainGrassWarm, smoothstep(4.2, 9.0, h));
        } else if (h < grassUpper) {
            // Broad alpine green grass meadows across the mountain base and foothills
            const meadowVariation = snoise(x * 0.004 + 50.0, z * 0.004 + 50.0);
            tempColor.copy(colorMountainGrass);
            if (meadowVariation > 0.08) {
                tempColor.lerp(colorMountainGrassWarm, Math.min(1.0, (meadowVariation - 0.08) * 2.2));
            }
        } else if (h < rockUpper) {
            // Mid-mountain transition: alpine grass climbing into slate rock cliffs
            tempColor.lerpColors(colorMountainGrass, colorMountainRock, smoothstep(grassUpper, rockUpper, h));
        } else {
            // High-altitude transition: slate rock cliffs climbing into majestic snowcaps
            tempColor.lerpColors(colorMountainRock, colorSnow, smoothstep(rockUpper, snowFull, h));
        }
    }
};
