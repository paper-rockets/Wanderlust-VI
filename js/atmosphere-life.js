import * as THREE from 'three';
import { getWorldHeight } from './world.js';

// ============================================================================
// LIVING WORLD: AMBIENT GLIDING SEABIRD FLOCKS & FLOATING BREEZE PETALS
// 100% Instanced with zero heap allocations in the main render loop
// ============================================================================

export function initAtmosphereLife(scene, playerGrp, params, LOW_GFX, spawnX = 0, spawnZ = 0) {
    // ------------------------------------------------------------------------
    // 1. PROCEDURAL LOW-POLY SEABIRD GEOMETRY (Origami / V-Wing)
    // ------------------------------------------------------------------------
    // A stylized 4-triangle bird that looks gorgeous from afar or up close
    const birdGeo = new THREE.BufferGeometry();
    const birdVerts = new Float32Array([
        // Left Wing
        0.0,  0.0,  0.5,   // 0: Head
       -1.3,  0.15, 0.0,   // 1: Left Wing Tip
        0.0, -0.05,-0.5,   // 2: Tail
        // Right Wing
        0.0,  0.0,  0.5,   // 3: Head
        0.0, -0.05,-0.5,   // 4: Tail
        1.3,  0.15, 0.0,   // 5: Right Wing Tip
    ]);
    birdGeo.setAttribute('position', new THREE.BufferAttribute(birdVerts, 3));
    birdGeo.computeVertexNormals();

    const birdMat = new THREE.MeshBasicMaterial({
        color: 0x3e4c59,
        side: THREE.DoubleSide
    });

    const BIRD_COUNT = LOW_GFX ? 24 : 42;
    const instBirds = new THREE.InstancedMesh(birdGeo, birdMat, BIRD_COUNT);
    instBirds.frustumCulled = false;
    instBirds.renderOrder = 180;
    scene.add(instBirds);

    // Flocks: 4 distinct clusters circling warm thermal drafts around active islands
    const FLOCK_OFFSETS = [
        { x: 30,    z: -160,  alt: 630, radius: 140, speed: 0.22, dir: 1 },
        { x: -320,  z: 220,   alt: 480, radius: 160, speed: 0.18, dir: -1 },
        { x: 420,   z: 320,   alt: 560, radius: 130, speed: 0.20, dir: 1 },
        { x: -180,  z: -480,  alt: 350, radius: 170, speed: 0.15, dir: 1 },
    ];

    const flockCenters = FLOCK_OFFSETS.map(off => ({
        x: spawnX + off.x,
        z: spawnZ + off.z,
        alt: off.alt,
        radius: off.radius,
        speed: off.speed,
        dir: off.dir
    }));

    const birdData = [];
    const _dummyBird = new THREE.Object3D();
    const _flockPos = new THREE.Vector3();

    for (let i = 0; i < BIRD_COUNT; i++) {
        const flockIdx = i % flockCenters.length;
        const flk = flockCenters[flockIdx];
        const angleOffset = (i / (BIRD_COUNT / flockCenters.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const radialOffset = (Math.random() - 0.5) * 45;
        const altOffset = (Math.random() - 0.5) * 35;
        const scale = 2.4 + Math.random() * 1.2;

        birdData.push({
            flockIdx,
            angle: angleOffset,
            radius: flk.radius + radialOffset,
            altOffset,
            scale,
            flapPhase: Math.random() * Math.PI * 2,
            flapTimer: Math.random() * 8.0,
            isFlapping: Math.random() > 0.4
        });
    }

    // ------------------------------------------------------------------------
    // 2. FLOATING BREEZE PETALS / DRIFTING SEEDS
    // ------------------------------------------------------------------------
    const PETAL_COUNT = LOW_GFX ? 20 : 45;
    const petalCanvas = document.createElement('canvas');
    petalCanvas.width = 64;
    petalCanvas.height = 64;
    const pCtx = petalCanvas.getContext('2d');
    pCtx.fillStyle = '#ffc0cb';
    pCtx.beginPath();
    pCtx.ellipse(32, 32, 24, 13, Math.PI / 4, 0, Math.PI * 2);
    pCtx.fill();

    const petalTex = new THREE.CanvasTexture(petalCanvas);
    const petalGeo = new THREE.PlaneGeometry(0.85, 0.55);
    const petalMat = new THREE.MeshBasicMaterial({
        map: petalTex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const instPetals = new THREE.InstancedMesh(petalGeo, petalMat, PETAL_COUNT);
    instPetals.frustumCulled = false;
    instPetals.renderOrder = 190;
    scene.add(instPetals);

    const petalData = [];
    const _dummyPetal = new THREE.Object3D();

    for (let i = 0; i < PETAL_COUNT; i++) {
        petalData.push({
            relX: (Math.random() - 0.5) * 110,
            relY: (Math.random() - 0.5) * 30,
            relZ: (Math.random() - 0.5) * 110,
            rotX: Math.random() * Math.PI * 2,
            rotY: Math.random() * Math.PI * 2,
            rotZ: Math.random() * Math.PI * 2,
            spinX: (Math.random() - 0.5) * 1.5,
            spinY: (Math.random() - 0.5) * 2.0,
            spinZ: (Math.random() - 0.5) * 1.2,
            driftSpeed: 3.5 + Math.random() * 3.0,
            bobSpeed: 1.2 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
        });
    }

    // ------------------------------------------------------------------------
    // UPDATE LOOP
    // ------------------------------------------------------------------------
    function update(dt, time, playerPos) {
        if (!playerPos) return;

        // --- 1. Update Seabird Flocks ---
        const birdsEnabled = params.enableSeabirds !== false;
        instBirds.visible = birdsEnabled;

        if (birdsEnabled) {
            // Re-anchor any flock that drifts too far (> 1800m) from the player
            for (let f = 0; f < flockCenters.length; f++) {
                const flk = flockCenters[f];
                const dx = flk.x - playerPos.x;
                const dz = flk.z - playerPos.z;
                if (dx * dx + dz * dz > 1800 * 1800) {
                    const off = FLOCK_OFFSETS[f];
                    flk.x = playerPos.x + off.x;
                    flk.z = playerPos.z + off.z;
                }
            }

            for (let i = 0; i < BIRD_COUNT; i++) {
                const b = birdData[i];
                const flk = flockCenters[b.flockIdx];

                // Advance orbit angle
                b.angle += flk.speed * flk.dir * dt;

                const bx = flk.x + Math.cos(b.angle) * b.radius;
                const bz = flk.z + Math.sin(b.angle) * b.radius;
                const by = flk.alt + b.altOffset + Math.sin(time * 0.8 + b.flapPhase) * 4.0;

                _dummyBird.position.set(bx, by, bz);

                // Heading tangent to circle
                const heading = b.angle + (flk.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
                const bankAngle = (flk.speed * 1.2) * (flk.dir > 0 ? 0.35 : -0.35);

                // Flap vs Glide cycle
                b.flapTimer -= dt;
                if (b.flapTimer <= 0) {
                    b.isFlapping = !b.isFlapping;
                    b.flapTimer = b.isFlapping ? (1.5 + Math.random() * 2.0) : (3.5 + Math.random() * 4.0);
                }

                const wingRoll = b.isFlapping ? Math.sin(time * 12.0 + b.flapPhase) * 0.25 : 0.0;
                _dummyBird.rotation.set(0, heading, bankAngle + wingRoll, 'YXZ');
                _dummyBird.scale.setScalar(b.scale);

                _dummyBird.updateMatrix();
                instBirds.setMatrixAt(i, _dummyBird.matrix);
            }
            instBirds.instanceMatrix.needsUpdate = true;
        }

        // --- 2. Update Drifting Breeze Petals ---
        const petalsEnabled = params.enableDriftingPetals !== false;
        instPetals.visible = petalsEnabled;

        if (petalsEnabled) {
            // Check terrain proximity: petals are most abundant when flying within 250m of ground
            const groundY = getWorldHeight(playerPos.x, playerPos.z);
            const heightAboveGround = playerPos.y - groundY;
            const nearLandFactor = Math.max(0.0, Math.min(1.0, (280.0 - heightAboveGround) / 200.0));

            petalMat.opacity = 0.75 * nearLandFactor;

            if (nearLandFactor > 0.02) {
                for (let i = 0; i < PETAL_COUNT; i++) {
                    const p = petalData[i];

                    // Drift along wind vector
                    p.relX += p.driftSpeed * dt;
                    p.relZ += p.driftSpeed * 0.4 * dt;
                    p.relY += Math.sin(time * p.bobSpeed + p.phase) * dt * 0.8 - (0.4 * dt); // gentle downward glide

                    // Spin
                    p.rotX += p.spinX * dt;
                    p.rotY += p.spinY * dt;
                    p.rotZ += p.spinZ * dt;

                    // Wrap within player relative cylinder
                    if (p.relX > 55) p.relX = -55;
                    if (p.relX < -55) p.relX = 55;
                    if (p.relZ > 55) p.relZ = -55;
                    if (p.relZ < -55) p.relZ = 55;
                    if (p.relY < -20) p.relY = 20;
                    if (p.relY > 25) p.relY = -15;

                    _dummyPetal.position.set(
                        playerPos.x + p.relX,
                        playerPos.y + p.relY,
                        playerPos.z + p.relZ
                    );
                    _dummyPetal.rotation.set(p.rotX, p.rotY, p.rotZ);
                    _dummyPetal.scale.setScalar(1.0);

                    _dummyPetal.updateMatrix();
                    instPetals.setMatrixAt(i, _dummyPetal.matrix);
                }
                instPetals.instanceMatrix.needsUpdate = true;
            }
        }
    }

    return {
        update,
        instBirds,
        instPetals
    };
}
