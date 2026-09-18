import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x0a061c);
const colorTwilightWater = new THREE.Color(0x2d0a42);
const colorVioletSand = new THREE.Color(0x501b45);
const colorMyceliumSoil = new THREE.Color(0x1a0f30);
const colorVeinPurple = new THREE.Color(0x7928ca);
const colorBiolumPink = new THREE.Color(0xd946ef);
const colorNightRock = new THREE.Color(0x130a24);
const colorAbyssDirt = new THREE.Color(0x07020d);

export default {
    name: "🍄 Mycelium Forest",
    shoreName: "░ Twilight Shore",
    getHeight(x, z, snoise) {
        // Rolling whimsical hills with mystical spore dunes and spires
        const wx = x + snoise(x * 0.0008 + 33.0, z * 0.0008 - 33.0) * 350.0;
        const wz = z + snoise(x * 0.0008 - 66.0, z * 0.0008 + 66.0) * 350.0;

        let y = snoise(wx * 0.0008, wz * 0.0008) * 38.0;
        y += snoise(wx * 0.0025 + 40.0, wz * 0.0025 - 40.0) * 16.0;
        y += Math.abs(snoise(x * 0.008, z * 0.008)) * 6.0;

        const hillNoise = snoise(x * 0.0005, z * 0.0005);
        if (hillNoise > 0.28) {
            y += Math.pow(hillNoise - 0.28, 2.0) * 75.0;
        }

        return Math.max(3.0, y + 16.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const veinNoise = snoise(x * 0.018 + 500, z * 0.018 + 500) * 0.5 + 0.5;

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorTwilightWater, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorVioletSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorVioletSand, colorMyceliumSoil, smoothstep(4.2, 6.2, h));
        } else if (h < 24.0) {
            tempColor.lerpColors(colorMyceliumSoil, colorVeinPurple, smoothstep(6.2, 24.0, h));
            if (veinNoise > 0.6) {
                tempColor.lerp(colorBiolumPink, (veinNoise - 0.6) * 1.8);
            }
        } else if (h < 38.0) {
            tempColor.lerpColors(colorVeinPurple, colorNightRock, smoothstep(24.0, 38.0, h));
        } else {
            tempColor.lerpColors(colorNightRock, colorAbyssDirt, smoothstep(38.0, 60.0, h));
        }
    }
};