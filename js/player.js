import * as THREE from 'three';
import { getWorldHeight } from './world.js';

// ==========================================
// PLAYER ENTITY & FLIGHT MODEL LOADING
// ==========================================

export function initPlayer(scene, worldLayout, gltfLoader, gradientMap, params) {
        // ==========================================
        // PLAYER ENTITY INITIALIZATION
        // ==========================================
        const playerGrp = new THREE.Group();
        const spawnX = worldLayout.spawnPosition.x;
        const spawnZ = worldLayout.spawnPosition.z;
        const spawnGroundY = getWorldHeight(spawnX, spawnZ);
        playerGrp.position.set(spawnX, spawnGroundY + 640, spawnZ);
        scene.add(playerGrp);
        window.playerGrp = playerGrp;
    
        const playerVisuals = new THREE.Group();
        playerGrp.add(playerVisuals);
    
        const proxyGeo = new THREE.BoxGeometry(1.5, 0.5, 3);
        const proxyMat = new THREE.MeshToonMaterial({ color: 0xcc4444, gradientMap });
        const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
        proxyMesh.castShadow = true;
        playerVisuals.add(proxyMesh);
    
        // Dedicated 5-Point Hero Lighting Rig for Player Flight Models
        // All lights have a short cutoff (3.5 - 5.0m) so they NEVER reach the landscape/hills/clouds
        const modelLightingParams = {
            brightness: 1.0,
            backPower: 2.2,
            bouncePower: 1.2,
            rimPower: 1.2,
            nightBoost: 1.0
        };
    
        // 1. Back/Fill Light: Sits directly behind the model facing the camera
        const modelBackLight = new THREE.PointLight(0xf4f8ff, 2.2, 5.0, 1.5);
        modelBackLight.position.set(0, 1.2, 3.2);
        playerVisuals.add(modelBackLight);
    
        // 2. Bounce Light: Shines upward from beneath the model to light belly, broom, and wing undersides
        const modelBounceLight = new THREE.PointLight(0xfff5e6, 1.2, 4.0, 1.6);
        modelBounceLight.position.set(0, -1.8, 0.4);
        playerVisuals.add(modelBounceLight);
    
        // 3. Front Key Light: Provides subtle front illumination
        const modelFrontLight = new THREE.PointLight(0xfffaec, 1.3, 4.5, 1.5);
        modelFrontLight.position.set(0, 1.5, -2.8);
        playerVisuals.add(modelFrontLight);
    
        // 4. Left Rim Light
        const modelLeftLight = new THREE.PointLight(0xf0f6ff, 1.0, 4.0, 1.6);
        modelLeftLight.position.set(-2.2, 0.6, 0.2);
        playerVisuals.add(modelLeftLight);
    
        // 5. Right Rim Light
        const modelRightLight = new THREE.PointLight(0xf0f6ff, 1.0, 4.0, 1.6);
        modelRightLight.position.set(2.2, 0.6, 0.2);
        playerVisuals.add(modelRightLight);
    
        // Compatibility aliases for GUI references
        const kikiLeftLight = modelLeftLight;
        const kikiRightLight = modelRightLight;
    
        // ─── Flight Model Manager ────────────────────────────────────────────────
        const FLIGHT_MODELS = [
            { id: 'kiki',          name: 'Kiki',      file: 'flight_models/kiki-draco.glb',                                    rotY: 180, scale: 1.3, anim: null },
            { id: 'whale',         name: 'Whale',     file: 'flight_models/Princess.glb',                                      rotY: 180, scale: 2.8, anim: null },
            { id: 'savoia',        name: 'Savoia',    file: 'flight_models/psx_saviola_s21.glb',                               rotY: 180, scale: 2.2, anim: 'Saviola flight', isPlane: true },
            { id: 'mitsubishi',    name: 'B2M2',      file: 'flight_models/mitsubishi_b2m2_-_game_art_1_stylized_plane.glb',   rotY: 180, scale: 2.2, anim: 'Flying', isPlane: true },
            { id: 'sopwith',       name: 'Sopwith',   file: 'flight_models/sopwith_pup_stylized_-_cupido.glb',                 rotY: 0,   scale: 2.2, anim: 'Take 001', isPlane: true },
            { id: 'sikorsky',      name: 'Sikorsky',  file: 'flight_models/sikorski_s-16__flying_circus_dae_assignment.glb',   rotY: 180, scale: 2.2, anim: 'Scene', isPlane: true },
            { id: 'robin',         name: 'Robin',     file: 'flight_models/american_robin_-_in_flight.glb',                   rotY: 180, scale: 0.7, anim: 'Wings Flapping' },
            { id: 'pewee',         name: 'Pewee',     file: 'flight_models/eastern_wood-pewee_-_in_flight.glb',                rotY: 180, scale: 0.7, anim: 'Wings Flapping' },
            { id: 'bittern',       name: 'Bittern',   file: 'flight_models/american_bittern_-_in_flight.glb',                 rotY: 180, scale: 0.8, anim: 'Wing Flapping' },
            { id: 'macaw',         name: 'Macaw',     file: 'flight_models/animated_parrot.glb',                              rotY: 180, scale: 0.8, anim: '02-flying' },
            { id: 'flock',         name: 'Flock',     file: 'flight_models/birds.glb',                                        rotY: 0,   scale: 0.9, anim: 'Scene' },
            { id: 'butterfly',     name: 'Morpho',    file: 'flight_models/borboleta_azul_-_butterfly.glb',                   rotY: 270, scale: 0.5, anim: 'ArmatureAction.001' },
            { id: 'monarch',       name: 'Monarch',   file: 'flight_models/idl_flight_on_spot.glb',                           rotY: 0,   scale: 0.5, anim: 'Take 001', offsetY: 2.5 },
            { id: 'charizard',     name: 'Charizard', file: 'flight_models/charizard_flying_animation.glb',                   rotY: 180, scale: 1.8, anim: 'Flying' },
        ];
    
        let fmCurrentIndex = 0;
        let fmRequestedIndex = 0;
        let fmCurrentWrapper = null;
        let fmCurrentMixer = null;
        const fmCache = new Map(); // id → { wrapper, mixer }
        let isModelVisible = true;
    
        function _fmNameBtn(el) {
            if (el) el.innerText = FLIGHT_MODELS[fmCurrentIndex].name;
        }
    
        function _fmLoadAndActivate(index, onDone) {
            // GLB files finish loading at different times. Record the latest choice immediately
            // so a slower earlier load can never overwrite a model the player has just selected.
            fmRequestedIndex = index;
            const cfg = FLIGHT_MODELS[index];
            if (fmCache.has(cfg.id)) {
                _fmActivate(index); if (onDone) onDone(); return;
            }
            gltfLoader.load(cfg.file, (gltf) => {
                const root = gltf.scene;
    
                // Single pass: hide flat shadow-catcher meshes AND build clean bbox from the rest
                const rawBox = new THREE.Box3();
                root.traverse(c => {
                    if (!c.isMesh) return;
                    const mb = new THREE.Box3().setFromObject(c);
                    const ms = new THREE.Vector3(); mb.getSize(ms);
                    const maxXZ = Math.max(ms.x, ms.z);
                    if (maxXZ > 0.3 && ms.y < 0.03 * maxXZ) {
                        c.visible = false; // shadow-catcher ground plane — exclude from sizing
                    } else {
                        rawBox.union(mb);
                        c.castShadow = true;
                        c.receiveShadow = false; // prevents low-res sun shadow map from casting dark patches on character
                        c.frustumCulled = false;
                        if (c.material) {
                            const mats = Array.isArray(c.material) ? c.material : [c.material];
                            mats.forEach(m => {
                                if (m) {
                                    if (m.map && !m.emissiveMap) {
                                        m.emissiveMap = m.map;
                                        m.emissive = new THREE.Color(0xffffff);
                                        m.emissiveIntensity = 0.10;
                                    }
                                    m.needsUpdate = true;
                                }
                            });
                        }
                    }
                });
                if (rawBox.isEmpty()) rawBox.set(new THREE.Vector3(-1,-1,-1), new THREE.Vector3(1,1,1));
                const rawSize = new THREE.Vector3(); rawBox.getSize(rawSize);
                const rawCenter = new THREE.Vector3(); rawBox.getCenter(rawCenter);
                const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
                const baseScale = maxDim > 0 ? (2.0 / maxDim) : 1.0;
                const finalScale = baseScale * (cfg.scale || 1.0);
    
                const inner = new THREE.Group();
                root.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
                inner.rotation.y = (cfg.rotY || 0) * Math.PI / 180;
                inner.add(root);
    
                const wrapper = new THREE.Group();
                wrapper.add(inner);
                wrapper.scale.setScalar(finalScale);
                wrapper.position.y = cfg.offsetY || 0;
                wrapper.visible = false;
    
                let mixer = null;
                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(root);
                    const clip = cfg.anim ? (gltf.animations.find(a => a.name === cfg.anim) || gltf.animations[0]) : gltf.animations[0];
                    if (clip) mixer.clipAction(clip).play();
                }
    
                fmCache.set(cfg.id, { wrapper, mixer });
                playerVisuals.add(wrapper);
                proxyMesh.visible = false;
                if (index === fmRequestedIndex) _fmActivate(index);
                if (onDone) onDone();
            }, undefined, (err) => console.warn(`[FlightModel] Failed: ${cfg.file}`, err));
        }
    
        function _fmActivate(index) {
            if (fmCurrentWrapper) fmCurrentWrapper.visible = false;
            fmCurrentIndex = index;
            const cfg = FLIGHT_MODELS[index];
            const { wrapper, mixer } = fmCache.get(cfg.id);
            fmCurrentWrapper = wrapper;
            fmCurrentMixer = mixer;
            // The main animation loop updates the active mixer through window. Keep that
            // reference synchronized whenever the player switches flight models.
            window.fmCurrentMixer = mixer || null;
            fmCurrentWrapper.visible = isModelVisible;
            _fmNameBtn(document.getElementById('char-name'));
            window.dispatchEvent(new CustomEvent('flight-model-changed', { detail: { index, config: cfg } }));
        }
    
        function fmNext() {
            const next = (fmCurrentIndex + 1) % FLIGHT_MODELS.length;
            _fmLoadAndActivate(next);
        }
        function fmPrev() {
            const prev = (fmCurrentIndex - 1 + FLIGHT_MODELS.length) % FLIGHT_MODELS.length;
            _fmLoadAndActivate(prev);
        }
    
        function updateModelVisibility() {
            if (fmCurrentWrapper) fmCurrentWrapper.visible = isModelVisible;
            const btn = document.getElementById('invis-toggle');
            if (btn) btn.innerText = isModelVisible ? 'Model: VISIBLE' : 'Model: INVISIBLE';
        }
    
        document.getElementById('invis-toggle')?.addEventListener('click', () => {
            isModelVisible = !isModelVisible;
            updateModelVisibility();
            if (typeof params !== 'undefined') params.modelVisible = isModelVisible;
        });
        document.getElementById('char-next')?.addEventListener('click', fmNext);
        document.getElementById('char-prev')?.addEventListener('click', fmPrev);


    return {
        playerGrp,
        playerVisuals,
        modelLightingParams,
        flightModels: FLIGHT_MODELS,
        _fmLoadAndActivate,
        updateModelVisibility
    };
}
