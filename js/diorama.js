import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getWorldHeight, getBiomeAt, isTreeZone } from './world.js';
import { snoise } from './noise.js';

// ==========================================
// INSTANCED DIORAMA PROPS, BOIDS & TRAILS
// ==========================================

export function initDioramaProps(scene, params, LOW_GFX, matRock, matBush, matFlower, matTree, matTreeNear, spawnX, spawnZ, gradientMap) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const ROCK_COUNT = 0;
    const BUSH_COUNT = 0;
    const FLOWER_COUNT = 0;

    const geoRock = new THREE.DodecahedronGeometry(2.5, 0);
    const geoBush = new THREE.IcosahedronGeometry(2, 0);
    const geoFlowerStem = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 3);
    geoFlowerStem.translate(0, 0.2, 0);
    const geoFlowerHead = new THREE.OctahedronGeometry(0.35, 0);
    geoFlowerHead.translate(0, 0.5, 0);
    geoFlowerHead.scale(1, 0.5, 1);
    const geoFlower = BufferGeometryUtils.mergeGeometries([geoFlowerStem.toNonIndexed(), geoFlowerHead.toNonIndexed()]);

    const instRocks = new THREE.InstancedMesh(geoRock, matRock, ROCK_COUNT);
    const instBushes = new THREE.InstancedMesh(geoBush, matBush, BUSH_COUNT);
    const instFlowers = new THREE.InstancedMesh(geoFlower, matFlower, FLOWER_COUNT);

    // Legacy procedural trees completely removed (replaced by GLB Tree Loader)
    const treeMeshes = [];
    const treeNearMeshes = [];
    const instTree1 = null;
    const instTree2 = null;
    const instTree3 = null;
    const instTree4 = null;
    const treeGreenVariations = [];
    const tempTreeColor = new THREE.Color();
    function updateTreeLOD(px, pz) {}
    function compactTreeInstances(mesh) {}

    const rockColors = [0xe5d4ba, 0xcbb192, 0xd8c8b8, 0x8a7b69, 0xd2c0a3];
    const tempRockColor = new THREE.Color();
    for (let i = 0; i < ROCK_COUNT; i++) {
        tempRockColor.setHex(rockColors[Math.floor(Math.random() * rockColors.length)]);
        instRocks.setColorAt(i, tempRockColor);
    }

    const flowerColors = [0xffffff, 0xffd700, 0xffa8d1, 0x4da9e8, 0xff6b6b];
    const tempFlowerColor = new THREE.Color();
    for (let i = 0; i < FLOWER_COUNT; i++) {
        tempFlowerColor.setHex(flowerColors[Math.floor(Math.random() * flowerColors.length)]);
        instFlowers.setColorAt(i, tempFlowerColor);
    }

    // ==========================================
    // 6.5 BOIDS (BIRDS)
    // ==========================================
    const BIRD_COUNT = LOW_GFX ? 12 : 40;
    const geoBird = new THREE.BufferGeometry();
    const s = 0.8;
    const bVerts = new Float32Array([
        // Head / Body spine
        0, 0.1*s, 1.8*s,    -0.2*s, 0, 0.4*s,      0.2*s, 0, 0.4*s,
        -0.2*s, 0, 0.4*s,   -0.15*s, 0.05*s, -1.2*s,  0.2*s, 0, 0.4*s,
        0.2*s, 0, 0.4*s,    -0.15*s, 0.05*s, -1.2*s,  0.15*s, 0.05*s, -1.2*s,
        // Tail feathers
        -0.15*s, 0.05*s, -1.2*s,  -0.5*s, 0.1*s, -2.0*s,  0.15*s, 0.05*s, -1.2*s,
        0.15*s, 0.05*s, -1.2*s,   -0.5*s, 0.1*s, -2.0*s,  0.5*s, 0.1*s, -2.0*s,
        // Left Wing Inner
        -0.2*s, 0, 0.6*s,   -1.6*s, 0.1*s, 0.1*s,  -0.2*s, 0, -0.6*s,
        // Left Wing Outer Tip
        -1.6*s, 0.1*s, 0.1*s, -3.2*s, 0.2*s, -0.5*s, -1.4*s, 0.05*s, -0.5*s,
        // Right Wing Inner
        0.2*s, 0, 0.6*s,    0.2*s, 0, -0.6*s,      1.6*s, 0.1*s, 0.1*s,
        // Right Wing Outer Tip
        1.6*s, 0.1*s, 0.1*s,  1.4*s, 0.05*s, -0.5*s,  3.2*s, 0.2*s, -0.5*s
    ]);
    geoBird.setAttribute('position', new THREE.BufferAttribute(bVerts, 3));
    geoBird.computeVertexNormals();

    const matBird = new THREE.MeshToonMaterial({ color: 0xd6e5f5, side: THREE.DoubleSide, gradientMap });

    matBird.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = `uniform float time;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `
            vec3 transformed = vec3( position );
            float wingDist = abs(position.x);
            if (wingDist > 0.3) {
                transformed.y += sin(time * 9.0 + wingDist * 0.5) * wingDist * 0.35;
            }
            `
        );
        matBird.userData.shader = shader;
    };

    const instBirds = new THREE.InstancedMesh(geoBird, matBird, BIRD_COUNT);
    instBirds.castShadow = true;
    instBirds.frustumCulled = false;
    scene.add(instBirds);

    const birdData = new Float32Array(BIRD_COUNT * 6);
    for (let i = 0; i < BIRD_COUNT; i++) {
        birdData[i * 6 + 0] = (Math.random() - 0.5) * 600;
        birdData[i * 6 + 1] = 60 + Math.random() * 80;
        birdData[i * 6 + 2] = (Math.random() - 0.5) * 600;
        birdData[i * 6 + 3] = (Math.random() - 0.5) * 10;
        birdData[i * 6 + 4] = (Math.random() - 0.5) * 2;
        birdData[i * 6 + 5] = (Math.random() - 0.5) * 10;
    }

    const HIGH_BIRD_COUNT = 0;
    const instHighBirds = new THREE.InstancedMesh(geoBird, matBird, HIGH_BIRD_COUNT);
    instHighBirds.castShadow = true;
    instHighBirds.frustumCulled = false;
    scene.add(instHighBirds);

    const highBirdData = new Float32Array(HIGH_BIRD_COUNT * 6);
    for (let i = 0; i < HIGH_BIRD_COUNT; i++) {
        highBirdData[i * 6 + 0] = (Math.random() - 0.5) * 1200;
        highBirdData[i * 6 + 1] = 300 + Math.random() * 200;
        highBirdData[i * 6 + 2] = (Math.random() - 0.5) * 1200;
        highBirdData[i * 6 + 3] = (Math.random() - 0.5) * 10;
        highBirdData[i * 6 + 4] = (Math.random() - 0.5) * 2;
        highBirdData[i * 6 + 5] = (Math.random() - 0.5) * 10;
    }

    // ==========================================
    // WIND TRAILS
    // ==========================================
    const trailGeo = new THREE.BoxGeometry(0.1, 0.1, 10.0);
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    const instTrails = new THREE.InstancedMesh(trailGeo, trailMat, 100);
    instTrails.frustumCulled = false;
    scene.add(instTrails);

    const trailsData = new Float32Array(100 * 4);
    for(let i=0; i<100; i++) {
       trailsData[i*4] = (Math.random() - 0.5) * 80;
       trailsData[i*4+1] = (Math.random() - 0.5) * 60;
       trailsData[i*4+2] = (Math.random() - 0.5) * 100;
       trailsData[i*4+3] = Math.random();
    }

    function updateBirdsGen(data, inst, count, tX, tY, tZ, time, dt, centerPull) {
        for (let i = 0; i < count; i++) {
            let px = data[i * 6 + 0], py = data[i * 6 + 1], pz = data[i * 6 + 2];
            let vx = data[i * 6 + 3], vy = data[i * 6 + 4], vz = data[i * 6 + 5];

            let cx = 0, cy = 0, cz = 0;
            let sx = 0, sy = 0, sz = 0;
            let ax = 0, ay = 0, az = 0;
            let n = 0;

            for (let j = 0; j < count; j++) {
                if (i === j) continue;
                let dx = px - data[j * 6 + 0], dy = py - data[j * 6 + 1], dz = pz - data[j * 6 + 2];
                let distSq = dx*dx + dy*dy + dz*dz;

                if (distSq < 1200) {
                    cx += data[j * 6 + 0]; cy += data[j * 6 + 1]; cz += data[j * 6 + 2];
                    ax += data[j * 6 + 3]; ay += data[j * 6 + 4]; az += data[j * 6 + 5];
                    n++;
                }
                if (distSq < 400) {
                    sx += dx; sy += dy; sz += dz;
                }
            }

            if (n > 0) {
                cx /= n; cy /= n; cz /= n;
                ax /= n; ay /= n; az /= n;
                vx += (cx - px) * 0.4 * dt;
                vy += (cy - py) * 0.4 * dt;
                vz += (cz - pz) * 0.4 * dt;
                vx += (ax - vx) * 0.1 * dt;
                vy += (ay - vy) * 0.1 * dt;
                vz += (az - vz) * 0.1 * dt;
            }

            vx += sx * 1.8 * dt; vy += sy * 1.8 * dt; vz += sz * 1.8 * dt;

            let formAngle = (i / count) * Math.PI * 2.0;
            let formRadius = 22 + (i % 6) * 9;
            let targetX = tX + Math.cos(formAngle) * formRadius;
            let targetY = tY + ((i % 5) - 2) * 3.5;
            let targetZ = tZ + Math.sin(formAngle) * formRadius;

            let tx = targetX - px, ty = targetY - py, tz = targetZ - pz;
            let dToT = Math.sqrt(tx*tx + ty*ty + tz*tz);
            if (dToT > 3) {
                let pullFactor = (dToT > 100) ? centerPull * 4.0 : centerPull * 1.2;
                vx += (tx / dToT) * pullFactor * dt;
                vy += (ty / dToT) * pullFactor * dt;
                vz += (tz / dToT) * pullFactor * dt;
            }

            let maxSpd = (centerPull > 3.0 && typeof velocity !== 'undefined') ? Math.max(40, velocity * 1.2) : 35;
            let spd = Math.sqrt(vx*vx + vy*vy + vz*vz);
            if (spd > maxSpd) { vx *= maxSpd/spd; vy *= maxSpd/spd; vz *= maxSpd/spd; }
            if (spd < 15) { vx *= 15/spd; vy *= 15/spd; vz *= 15/spd; }

            px += vx * dt; py += vy * dt; pz += vz * dt;
            data[i * 6 + 0] = px; data[i * 6 + 1] = py; data[i * 6 + 2] = pz;
            data[i * 6 + 3] = vx; data[i * 6 + 4] = vy; data[i * 6 + 5] = vz;

            dummy.position.set(px, py, pz);
            let targetYaw = Math.atan2(vx, vz);
            let roll = Math.max(-0.6, Math.min(0.6, sx * 0.05));
            dummy.rotation.set(roll, targetYaw, Math.sin(time * 12 + i) * 0.35);
            dummy.scale.setScalar(0.42);
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
    }

    function updateBirds(playerX, playerY, playerZ, time, dt) {
        if (matBird.userData.shader) matBird.userData.shader.uniforms.time.value = time;
        updateBirdsGen(birdData, instBirds, BIRD_COUNT, playerX, playerY + 14, playerZ, time, dt, 5.0);
        updateBirdsGen(highBirdData, instHighBirds, HIGH_BIRD_COUNT, 0, 400, 0, time, dt, 2.0);
    }

    const dummy = new THREE.Object3D();

    return {
        instRocks,
        instBushes,
        instFlowers,
        instBirds,
        instTrails,
        treeMeshes,
        treeNearMeshes,
        instTree1,
        instTree2,
        instTree3,
        instTree4,
        updateBirds,
        updateTreeLOD,
        compactTreeInstances,
        treeGreenVariations,
        tempTreeColor,
        flowerColors,
        ROCK_COUNT,
        BUSH_COUNT,
        FLOWER_COUNT
    };
}
