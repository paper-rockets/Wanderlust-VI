import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x23142e);
const colorPastelWater = new THREE.Color(0x6b21a8);
const colorBlossomSand = new THREE.Color(0xfce7f3);
const colorWhiteEarth = new THREE.Color(0xfdf2f8);
const colorPetalPink = new THREE.Color(0xf472b6);
const colorCoralBlush = new THREE.Color(0xfb7185);
const colorRoseRock = new THREE.Color(0x9f1239);
const colorDeepLoam = new THREE.Color(0x4c0519);

export default {
    name: "🌸 Sakura Realm",
    shoreName: "░ Blossom Shore",
    getHeight(x, z, snoise) {
        // Gentle terraced rolling hills and soft cherry mounds
        const wx = x + snoise(x * 0.0007 + 88.0, z * 0.0007 + 88.0) * 320.0;
        const wz = z + snoise(x * 0.0007 - 44.0, z * 0.0007 + 44.0) * 320.0;

        let y = snoise(wx * 0.00065, wz * 0.00065) * 42.0;
        y += snoise(wx * 0.0019 + 20.0, wz * 0.0019 - 20.0) * 14.0;
        y += Math.abs(snoise(x * 0.006, z * 0.006)) * 4.0;

        const bluff = snoise(x * 0.003, z * 0.003);
        if (bluff > 0.2) {
            y += Math.pow(bluff - 0.2, 1.8) * 45.0;
        }

        return Math.max(3.0, y + 18.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const petalScatter = snoise(x * 0.015 + 800, z * 0.015 + 800) * 0.5 + 0.5;

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorPastelWater, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorBlossomSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorBlossomSand, colorWhiteEarth, smoothstep(4.2, 6.2, h));
        } else if (h < 26.0) {
            tempColor.lerpColors(colorWhiteEarth, colorPetalPink, smoothstep(6.2, 26.0, h));
            if (petalScatter > 0.62) {
                tempColor.lerp(colorCoralBlush, (petalScatter - 0.62) * 2.0);
            }
        } else if (h < 42.0) {
            tempColor.lerpColors(colorPetalPink, colorRoseRock, smoothstep(26.0, 42.0, h));
        } else {
            tempColor.lerpColors(colorRoseRock, colorDeepLoam, smoothstep(42.0, 65.0, h));
        }
    }
};