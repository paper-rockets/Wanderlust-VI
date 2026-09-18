import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x042f2e);
const colorAquaWater = new THREE.Color(0x0d9488);
const colorJadeSand = new THREE.Color(0xccfbf1);
const colorEmeraldMoss = new THREE.Color(0x10b981);
const colorCyanLotus = new THREE.Color(0x2dd4bf);
const colorAquaRock = new THREE.Color(0x115e59);
const colorPeatMud = new THREE.Color(0x022c22);

export default {
    name: "🪷 Lotus Grove",
    shoreName: "░ Tranquil Waterway",
    getHeight(x, z, snoise) {
        // Low-profile aquatic wetlands, shallow lagoons, and stepping mounds
        const wx = x + snoise(x * 0.0009 - 25.0, z * 0.0009 + 25.0) * 360.0;
        const wz = z + snoise(x * 0.0009 + 75.0, z * 0.0009 - 75.0) * 360.0;

        let y = snoise(wx * 0.0007, wz * 0.0007) * 26.0;
        y += snoise(wx * 0.0022 + 60.0, wz * 0.0022 - 60.0) * 10.0;
        y += snoise(x * 0.007, z * 0.007) * 4.0;

        const pool = snoise(wx * 0.003 + 200.0, wz * 0.003 - 200.0);
        if (pool < -0.15) {
            y -= Math.abs(pool + 0.15) * 12.0;
        }

        return Math.max(3.0, y + 14.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const mossNoise = snoise(x * 0.012 + 300, z * 0.012 - 300) * 0.5 + 0.5;

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorAquaWater, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorJadeSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorJadeSand, colorEmeraldMoss, smoothstep(4.2, 6.2, h));
        } else if (h < 22.0) {
            tempColor.lerpColors(colorEmeraldMoss, colorCyanLotus, smoothstep(6.2, 22.0, h));
            if (mossNoise > 0.58) {
                tempColor.lerp(colorJadeSand, (mossNoise - 0.58) * 1.5);
            }
        } else if (h < 35.0) {
            tempColor.lerpColors(colorCyanLotus, colorAquaRock, smoothstep(22.0, 35.0, h));
        } else {
            tempColor.lerpColors(colorAquaRock, colorPeatMud, smoothstep(35.0, 50.0, h));
        }
    }
};