import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getWorldHeight, getBiomeAt, worldLayout } from './world.js';

// ============================================================================
// SCENIC GHIBLI ROCKS & BOULDERS
// Powered by authentic Ghibli 3D models with hand-painted textures:
//   1. Ghibli Boulder Cluster (ghibli-esque_rocks.glb) - Shorelines & beaches
//   2. Ghibli Scenic Monolith (ghibli_rock.glb) - Valley landmarks
//   3. Ghibli Tiered Cliff Boulder (ghiblianime_style_rocks_smart_material.glb) - Meadow formations
//
// Strict Placement Rules:
//   - ZERO on mountain tops or snowy peaks (100% rock-free)
//   - ZERO on steep slopes/cliffs (strict slope check prevents awkward floating)
//   - Partial ground sinking so bases root naturally into sand/grass
//   - Subtle natural stone color tints (warm limestone, cool slate, sage)
// ============================================================================

export let rocksGroup = null;
export let instancedRockMeshes = [];

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Slope check helper: returns maximum height delta around (x, z)
function getSlopeDelta(x, z, step = 2.5) {
    const c = getWorldHeight(x, z);
    const d1 = Math.abs(getWorldHeight(x + step, z) - c);
    const d2 = Math.abs(getWorldHeight(x - step, z) - c);
    const d3 = Math.abs(getWorldHeight(x, z + step) - c);
    const d4 = Math.abs(getWorldHeight(x, z - step) - c);
    return Math.max(d1, d2, d3, d4);
}

// Normalize geometry so center is at (0, 0) on XZ, min.y = 0, and height = 1.0
function normalizeGeometry(mesh) {
    const geo = mesh.geometry.clone();
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const sizeY = (bb.max.y - bb.min.y) || 1.0;
    const centerX = (bb.max.x + bb.min.x) * 0.5;
    const centerZ = (bb.max.z + bb.min.z) * 0.5;
    const minY = bb.min.y;

    // Shift to center on XZ, base at Y=0
    geo.translate(-centerX, -minY, -centerZ);
    // Scale so height = 1.0
    const scaleFactor = 1.0 / sizeY;
    geo.scale(scaleFactor, scaleFactor, scaleFactor);
    geo.computeVertexNormals();
    return geo;
}

// Subtle natural stone tints for per-instance color variation
const TINTS = [
    new THREE.Color(1.00, 1.00, 1.00), // Neutral
    new THREE.Color(1.04, 1.01, 0.95), // Warm sandy limestone
    new THREE.Color(0.95, 0.98, 1.03), // Cool slate
    new THREE.Color(0.98, 1.03, 0.96), // Subtle mossy green
    new THREE.Color(1.05, 0.98, 0.92), // Warm terracotta
    new THREE.Color(0.97, 0.97, 0.99), // Pale granite
];

export function initProceduralRocks(scene) {
    if (rocksGroup) scene.remove(rocksGroup);
    rocksGroup = new THREE.Group();
    rocksGroup.name = 'ProceduralRocks';
    instancedRockMeshes = [];

    // Pre-create hide matrix (deep underground)
    const hideMatrix = new THREE.Matrix4().makeTranslation(0, -9999, 0);

    // Instance capacities
    const COUNT_COAST_CLUSTER = 60; // Ghibli rounded boulder clusters
    const COUNT_MONOLITH      = 16; // Scenic landmark monoliths
    const COUNT_TIERED        = 24; // Tiered meadow boulders

    // Placeholder meshes while GLTFs load asynchronously
    const dummyGeo = new THREE.BufferGeometry();
    const dummyMat = new THREE.MeshBasicMaterial({ visible: false });

    const meshCluster  = new THREE.InstancedMesh(dummyGeo, dummyMat, COUNT_COAST_CLUSTER);
    const meshMonolith = new THREE.InstancedMesh(dummyGeo, dummyMat, COUNT_MONOLITH);
    const meshTiered   = new THREE.InstancedMesh(dummyGeo, dummyMat, COUNT_TIERED);

    [meshCluster, meshMonolith, meshTiered].forEach(m => {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false; // CRITICAL: prevent Three.js from culling instances based on (0,0,0) origin!
        m.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.count * 3).fill(1), 3);
        for (let i = 0; i < m.count; i++) m.setMatrixAt(i, hideMatrix);
        m.instanceMatrix.needsUpdate = true;
        rocksGroup.add(m);
        instancedRockMeshes.push(m);
    });

    scene.add(rocksGroup);

    // Textures for Model 1 (extracted from the user's GLB)
    const clusterDiffuse = textureLoader.load('assets/textures/procedural_rocks/ghibli_rock_color.png');
    clusterDiffuse.colorSpace = THREE.SRGBColorSpace;
    clusterDiffuse.flipY = false;

    const clusterNormal = textureLoader.load('assets/textures/procedural_rocks/ghibli_rock_normal.png');
    clusterNormal.flipY = false;

    // Load all 3 models asynchronously and reliably
    Promise.all([
        gltfLoader.loadAsync('assets/models/rocks/ghibli-esque_rocks.glb'),
        gltfLoader.loadAsync('assets/models/rocks/ghibli_rock.glb'),
        gltfLoader.loadAsync('assets/models/rocks/ghiblianime_style_rocks_smart_material.glb')
    ]).then(([gltfCluster, gltfMonolith, gltfTiered]) => {
        // 1. Setup Boulder Cluster
        let rawCluster = null;
        gltfCluster.scene.traverse(c => { if (c.isMesh && !rawCluster) rawCluster = c; });
        if (rawCluster) {
            meshCluster.geometry.dispose();
            meshCluster.geometry = normalizeGeometry(rawCluster);
            meshCluster.material = new THREE.MeshStandardMaterial({
                map: clusterDiffuse,
                normalMap: clusterNormal,
                normalScale: new THREE.Vector2(0.5, 0.5),
                roughness: 0.90,
                metalness: 0.02,
                fog: true
            });
        }

        // 2. Setup Landmark Monolith
        let rawMonolith = null;
        gltfMonolith.scene.traverse(c => { if (c.isMesh && !rawMonolith) rawMonolith = c; });
        if (rawMonolith) {
            meshMonolith.geometry.dispose();
            meshMonolith.geometry = normalizeGeometry(rawMonolith);
            const origMat = rawMonolith.material;
            const mat = new THREE.MeshStandardMaterial({
                map: origMat.map || null,
                roughness: 0.88,
                metalness: 0.00,
                emissive: new THREE.Color(0x000000), // Zero out white emissive blowout
                fog: true
            });
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            meshMonolith.material = mat;
        }

        // 3. Setup Tiered Boulder
        let rawTiered = null;
        gltfTiered.scene.traverse(c => { if (c.isMesh && !rawTiered) rawTiered = c; });
        if (rawTiered) {
            meshTiered.geometry.dispose();
            meshTiered.geometry = normalizeGeometry(rawTiered);
            const origMat = rawTiered.material;
            const mat = new THREE.MeshStandardMaterial({
                map: origMat.map || null,
                roughness: 0.92,
                metalness: 0.00,
                fog: true
            });
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            meshTiered.material = mat;
        }

        // Populate instances across all islands
        populateInstances();
    }).catch(err => {
        console.warn('[ProceduralRocks] Failed to load rock models:', err);
    });

    function populateInstances() {
        const dummy = new THREE.Object3D();
        let idxCluster = 0;
        let idxMonolith = 0;
        let idxTiered = 0;

        const islands = (worldLayout && worldLayout.islands && worldLayout.islands.length > 0)
            ? worldLayout.islands
            : [{ centerX: 11380, centerZ: -1560, maxRadius: 800, biomeId: 'archipelago' }];

        let seed = 42191;
        function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        function pickTint() { return TINTS[Math.floor(rand() * TINTS.length)].clone(); }

        for (let islIdx = 0; islIdx < islands.length; islIdx++) {
            const isl = islands[islIdx];
            const cx = isl.centerX !== undefined ? isl.centerX : 0;
            const cz = isl.centerZ !== undefined ? isl.centerZ : 0;
            const radius = Math.min(isl.maxRadius !== undefined ? isl.maxRadius : 650, 1100);
            const biomeId = isl.biomeId || 'archipelago';

            // STRICT RULE 1: ABSOLUTELY ZERO ROCKS ON MOUNTAINS OR HIGH PEAKS!
            if (biomeId.includes('mountain')) continue;

            // -------------------------------------------------------------
            // PART A: COASTLINES & BEACHES (Primary Location: 70% of rocks)
            // Beautiful Ghibli rounded boulder clusters resting in sand / shallow surf
            // Height: 0.4m to 3.8m only!
            // -------------------------------------------------------------
            const numCoastClusters = 7;
            for (let c = 0; c < numCoastClusters; c++) {
                let bx = 0, bz = 0, bh = 0, found = false;
                for (let att = 0; att < 50; att++) {
                    const ang = rand() * Math.PI * 2;
                    const dist = (0.62 + rand() * 0.32) * radius;
                    const tx = cx + Math.cos(ang) * dist;
                    const tz = cz + Math.sin(ang) * dist;
                    const th = getWorldHeight(tx, tz);

                    // Must be at beach waterline (0.4m - 3.8m)
                    if (th >= 0.4 && th <= 3.8) {
                        // STRICT RULE 2: GENTLE SLOPE ONLY! NEVER ON A STEEP CLIFF!
                        const slope = getSlopeDelta(tx, tz, 2.5);
                        if (slope <= 1.0) { // Less than ~22 degree slope
                            bx = tx; bz = tz; bh = th;
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) continue;

                // Place main boulder cluster
                if (idxCluster < meshCluster.count) {
                    const i = idxCluster++;
                    const height = 2.4 + rand() * 2.8; // 2.4m to 5.2m tall
                    const sink = height * 0.28; // Root into sand/water

                    dummy.position.set(bx, bh - sink, bz);
                    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                    dummy.scale.set(height * (0.95 + rand() * 0.15), height, height * (0.95 + rand() * 0.15));
                    dummy.updateMatrix();
                    meshCluster.setMatrixAt(i, dummy.matrix);
                    meshCluster.setColorAt(i, pickTint());
                }

                // Companion tiered stone nearby
                if (rand() > 0.45 && idxTiered < meshTiered.count) {
                    const ti = idxTiered++;
                    const offAng = rand() * Math.PI * 2;
                    const offDist = 3.5 + rand() * 4.0;
                    const tx = bx + Math.cos(offAng) * offDist;
                    const tz = bz + Math.sin(offAng) * offDist;
                    const th = getWorldHeight(tx, tz);
                    if (th >= 0.3 && th <= 4.5 && getSlopeDelta(tx, tz, 2.0) <= 1.0) {
                        const h = 1.8 + rand() * 2.2;
                        dummy.position.set(tx, th - h * 0.25, tz);
                        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                        dummy.scale.set(h, h * 0.85, h);
                        dummy.updateMatrix();
                        meshTiered.setMatrixAt(ti, dummy.matrix);
                        meshTiered.setColorAt(ti, pickTint());
                    }
                }
            }

            // -------------------------------------------------------------
            // PART B: SCENIC VALLEY MONOLITH (Landmark, 1 per island max)
            // Grand, weathered, mossy Ghibli rock in a low valley meadow
            // Height: 8m to 24m only (NEVER on ridgelines or mountaintops)
            // -------------------------------------------------------------
            let lmX = 0, lmZ = 0, lmH = 0, foundLm = false;
            for (let att = 0; att < 40; att++) {
                const ang = rand() * Math.PI * 2;
                const dist = (0.20 + rand() * 0.38) * radius;
                const tx = cx + Math.cos(ang) * dist;
                const tz = cz + Math.sin(ang) * dist;
                const th = getWorldHeight(tx, tz);

                // Low flat ground only: 8m to 24m
                if (th >= 8.0 && th <= 24.0) {
                    const slope = getSlopeDelta(tx, tz, 4.0);
                    if (slope <= 1.2) { // Nice flat clearing
                        lmX = tx; lmZ = tz; lmH = th;
                        foundLm = true;
                        break;
                    }
                }
            }

            if (foundLm && idxMonolith < meshMonolith.count) {
                const mi = idxMonolith++;
                const landmarkHeight = 8.0 + rand() * 6.0; // 8m to 14m majestic height
                const sink = landmarkHeight * 0.22;

                dummy.position.set(lmX, lmH - sink, lmZ);
                dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                dummy.scale.set(landmarkHeight, landmarkHeight, landmarkHeight);
                dummy.updateMatrix();
                meshMonolith.setMatrixAt(mi, dummy.matrix);
                meshMonolith.setColorAt(mi, pickTint());

                // Companion boulder nestling against the base of the monolith
                if (idxCluster < meshCluster.count) {
                    const ci = idxCluster++;
                    const ch = 3.0 + rand() * 2.0;
                    const cAng = rand() * Math.PI * 2;
                    const cDist = landmarkHeight * 0.45;
                    dummy.position.set(
                        lmX + Math.cos(cAng) * cDist,
                        lmH - ch * 0.26,
                        lmZ + Math.sin(cAng) * cDist
                    );
                    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                    dummy.scale.set(ch, ch, ch);
                    dummy.updateMatrix();
                    meshCluster.setMatrixAt(ci, dummy.matrix);
                    meshCluster.setColorAt(ci, pickTint());
                }
            }

            // -------------------------------------------------------------
            // PART C: SUBTLE MEADOW CLUSTER (1 per island, low grassy hollow)
            // -------------------------------------------------------------
            let mx = 0, mz = 0, mh = 0, foundM = false;
            for (let att = 0; att < 30; att++) {
                const ang = rand() * Math.PI * 2;
                const dist = (0.25 + rand() * 0.35) * radius;
                const tx = cx + Math.cos(ang) * dist;
                const tz = cz + Math.sin(ang) * dist;
                const th = getWorldHeight(tx, tz);
                if (th >= 10.0 && th <= 25.0 && getSlopeDelta(tx, tz, 3.0) <= 1.1) {
                    mx = tx; mz = tz; mh = th;
                    foundM = true;
                    break;
                }
            }

            if (foundM) {
                if (idxCluster < meshCluster.count) {
                    const ci = idxCluster++;
                    const h = 3.2 + rand() * 2.2;
                    dummy.position.set(mx, mh - h * 0.28, mz);
                    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                    dummy.scale.set(h, h, h);
                    dummy.updateMatrix();
                    meshCluster.setMatrixAt(ci, dummy.matrix);
                    meshCluster.setColorAt(ci, pickTint());
                }
                if (idxTiered < meshTiered.count) {
                    const ti = idxTiered++;
                    const h = 2.5 + rand() * 2.0;
                    dummy.position.set(mx + 4.0, mh - h * 0.25, mz + 2.5);
                    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
                    dummy.scale.set(h, h, h);
                    dummy.updateMatrix();
                    meshTiered.setMatrixAt(ti, dummy.matrix);
                    meshTiered.setColorAt(ti, pickTint());
                }
            }
        }

        // Hide remaining unused slots underground
        for (let i = idxCluster; i < meshCluster.count; i++) meshCluster.setMatrixAt(i, hideMatrix);
        for (let i = idxMonolith; i < meshMonolith.count; i++) meshMonolith.setMatrixAt(i, hideMatrix);
        for (let i = idxTiered; i < meshTiered.count; i++) meshTiered.setMatrixAt(i, hideMatrix);

        meshCluster.instanceMatrix.needsUpdate = true;
        meshMonolith.instanceMatrix.needsUpdate = true;
        meshTiered.instanceMatrix.needsUpdate = true;

        if (meshCluster.instanceColor) meshCluster.instanceColor.needsUpdate = true;
        if (meshMonolith.instanceColor) meshMonolith.instanceColor.needsUpdate = true;
        if (meshTiered.instanceColor) meshTiered.instanceColor.needsUpdate = true;

        console.log('[ProceduralRocks] Placed: ' + idxCluster + ' clusters, ' + idxMonolith + ' landmarks, ' + idxTiered + ' tiered rocks.');
    }

    return {
        rocksGroup,
        instancedRockMeshes,
        updateRocks: () => {},
        setRocksVisible: (v) => { rocksGroup.visible = v; }
    };
}

export function updateRocks() {}
