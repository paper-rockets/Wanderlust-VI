import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorMountainGrass = new THREE.Color(0x52913e);     // Lush alpine meadow green
const colorMountainGrassWarm = new THREE.Color(0x6ba848); // Warm sunlit grass for low meadows
const colorMountainRock = new THREE.Color(0x5a5e6b);      // Slate grey rock
const colorSnow = new THREE.Color(0xf5f6fa);              // Crisp snow white

// Domain rotation matrix to eliminate grid-aligned saw-tooth cross patterns
const cosR = 0.8660254; // cos(30 deg)
const sinR = 0.5;       // sin(30 deg)

export default {
    name: "Misty Mountains",
    shoreName: "░ Mountain Shore",
    getHeight(x, z, snoise) {
        // Domain rotation breaks grid axis alignment and removes artificial cross-hatch staircases
        const rx = x * cosR - z * sinR;
        const rz = x * sinR + z * cosR;

        const n1 = snoise(rx * 0.0008, rz * 0.0008);
        const n2 = snoise(x * 0.0035 + 17.0, z * 0.0035 + 17.0);
        const n3 = snoise(rx * 0.008, rz * 0.008);

        // Smooth organic ridge shape
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge * (3.0 - 2.0 * ridge); // Smoothstep curve eliminates sharp crease artifacts

        const h = ridge * 165.0 + n2 * 22.0 + n3 * 6.0 + 8.0;
        return Math.max(6.0, h);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        // Natural organic variation and craggy chutes on grass, rock, and snow lines
        const nNoise = snoise(x * 0.008, z * 0.008) * 12.0 + snoise(x * 0.024, z * 0.024) * 6.0;
        const grassUpper = 44.0 + nNoise * 0.6; // Foothills and valleys stay green
        const rockUpper = 84.0 + nNoise * 1.1;  // Slate rock dominates middle slopes
        const snowFull = 108.0 + nNoise * 0.8;  // Pure snowcaps on peaks

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
            const meadowVariation = snoise(x * 0.004 + 10.0, z * 0.004 + 10.0);
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
