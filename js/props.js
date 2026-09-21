import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { worldLayout, getWorldHeight, getBiomeAt } from './world.js';

// ==========================================
// PROPS: GIANT CRYSTALS & ANIMATED CAPYBARAS
// ==========================================
export function initPropsAndWildlife(scene, gltfLoader, params, LOW_GFX, gradientMap) {
        // ==========================================
        // GIANT FLOATING CRYSTALS (Instanced)
        // ==========================================
        const CRYSTAL_COUNT = 10;
        const geoCrystal = new THREE.OctahedronGeometry(1, 1).toNonIndexed();
        geoCrystal.scale(1, 3, 1);
        geoCrystal.computeVertexNormals();
    
        const matCrystal = new THREE.MeshPhysicalMaterial({
            roughness: 0.08,
            metalness: 0.15,
            transparent: true,
            opacity: 0.82,
            transmission: 0.0,
            thickness: 10.0,
            ior: 2.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            sheen: 1.0,
            sheenRoughness: 0.3,
            sheenColor: new THREE.Color(0xffffff),
            envMapIntensity: 1.5,
            depthWrite: true,
            depthTest: true,
            fog: true,
            side: THREE.DoubleSide
        });
    
        matCrystal.onBeforeCompile = (shader) => {
            shader.uniforms.crystalGlow = { value: 0.0 };
            shader.uniforms.baseGlow = { value: 1.8 };
            shader.uniforms.nightGlowMult = { value: 1.5 };
            shader.uniforms.uCustomColors = { value: [
                new THREE.Color('#6a00ff'), new THREE.Color('#ff0066'),
                new THREE.Color('#ff6600'), new THREE.Color('#ffcc00'),
                new THREE.Color('#00ffaa'), new THREE.Color('#00aaff')
            ]};
            shader.uniforms.flyHue = { value: 0.0 };
            shader.uniforms.flyContrast = { value: 1.0 };
            shader.uniforms.uTime = { value: 0.0 };
            matCrystal.userData.shader = shader;
    
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                 varying vec3 vPositionC;
                 varying vec3 vWorldNormalC;
                 varying vec3 vWorldPosC;`
            ).replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 vPositionC = position;`
            ).replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                 #if defined( USE_INSTANCING )
                     vWorldPosC = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                     vWorldNormalC = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
                 #else
                     vWorldPosC = (modelMatrix * vec4(transformed, 1.0)).xyz;
                     vWorldNormalC = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                 #endif`
            );
    
            shader.fragmentShader = `
                uniform float crystalGlow;
                uniform float baseGlow;
                uniform float nightGlowMult;
                uniform float flyHue;
                uniform float flyContrast;
                uniform float uTime;
                uniform vec3 uCustomColors[6];
                ${shader.fragmentShader}
            `.replace(
                '#include <common>',
                `#include <common>
                 varying vec3 vPositionC;
                 varying vec3 vWorldNormalC;
                 varying vec3 vWorldPosC;
                 vec3 rgb2hsv(vec3 c) {
                     vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                     vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                     vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                     float d = q.x - min(q.w, q.y);
                     float e = 1.0e-10;
                     return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
                 }
                 vec3 hsv2rgb(vec3 c) {
                     vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                     vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                     return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                 }`
            ).replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                 float tC = clamp((vPositionC.y + 3.0) / 6.0, 0.0, 1.0);
    
                 // Smooth cubic interpolation through 6 color stops
                 float segment = tC * 5.0;
                 int idx = int(floor(segment));
                 float frac = fract(segment);
                 float t = frac * frac * (3.0 - 2.0 * frac); // smoothstep
    
                 vec3 gradientColor;
                 if (idx == 0) gradientColor = mix(uCustomColors[0], uCustomColors[1], t);
                 else if (idx == 1) gradientColor = mix(uCustomColors[1], uCustomColors[2], t);
                 else if (idx == 2) gradientColor = mix(uCustomColors[2], uCustomColors[3], t);
                 else if (idx == 3) gradientColor = mix(uCustomColors[3], uCustomColors[4], t);
                 else gradientColor = mix(uCustomColors[4], uCustomColors[5], t);
    
                 // Hue Shift
                 if (flyHue > 0.0) {
                     vec3 hsv = rgb2hsv(gradientColor);
                     hsv.x = fract(hsv.x + flyHue);
                     gradientColor = hsv2rgb(hsv);
                 }
    
                 // Contrast
                 if (flyContrast != 1.0) {
                     gradientColor = pow(gradientColor, vec3(1.0 / flyContrast));
                 }
    
                 // Fresnel rim glow
                 vec3 viewDir = normalize(cameraPosition - vWorldPosC);
                 float fresnel = 1.0 - abs(dot(viewDir, vWorldNormalC));
                 fresnel = pow(fresnel, 3.0);
                 vec3 rimColor = mix(gradientColor, vec3(1.0), 0.6);
                 gradientColor = mix(gradientColor, rimColor, fresnel * 0.7);
    
                 // Vibrance boost
                 vec3 hsvFinal = rgb2hsv(gradientColor);
                 hsvFinal.y = min(hsvFinal.y * 1.4, 1.0);
                 hsvFinal.z = min(hsvFinal.z * 1.15, 1.0);
                 gradientColor = hsv2rgb(hsvFinal);
    
                 diffuseColor.rgb = gradientColor;
                `
            ).replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                 float innerGlow = fresnel * 0.4 + 0.15;
                 totalEmissiveRadiance += diffuseColor.rgb * (baseGlow * innerGlow + crystalGlow * nightGlowMult);
                `
            );
        };
    
        const instCrystals = new THREE.InstancedMesh(geoCrystal, matCrystal, CRYSTAL_COUNT);
        instCrystals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instCrystals.frustumCulled = false; // Prevent crystals from vanishing when looking away from origin
        // The instance buffer is a reusable pool.  Only the compacted in-range
        // entries below are included in the draw call via `count`.
        instCrystals.count = 0;
        scene.add(instCrystals);
    
        // Position crystals across Crystal Land and Magical Sanctuary, anchored to terrain.
        const crystalData = [];
        const crystalIslands = worldLayout.islands.filter(isl => isl.biomeId === 'crystal_land' || isl.biomeId === 'magical_sanctuary');
        const primaryCrystalIsl = crystalIslands.find(isl => isl.biomeId === 'crystal_land') || crystalIslands[0] || { centerX: 1800, centerZ: 1400, radiusX: 1800, radiusZ: 1800 };
    
        const dummyC = new THREE.Object3D();
        for(let i=0; i<CRYSTAL_COUNT; i++) {
            const isl = (i % 6 === 0 && crystalIslands.length > 1) ? (crystalIslands.find(isl => isl.biomeId === 'magical_sanctuary') || primaryCrystalIsl) : primaryCrystalIsl;
            const angle = (i / CRYSTAL_COUNT) * Math.PI * 2 * 3.7 + (i * 0.43);
            const radFrac = 0.08 + ((i * 17) % 42) / 100.0;
            const rX = isl.radiusX ? isl.radiusX * radFrac : 1200 * radFrac;
            const rZ = isl.radiusZ ? isl.radiusZ * radFrac : 1200 * radFrac;
            const cx = isl.centerX + Math.cos(angle) * rX;
            const cz = isl.centerZ + Math.sin(angle) * rZ;
            const groundH = Math.max(2.0, getWorldHeight(cx, cz));
    
            const s = 28 + (i % 7) * 10;
            const scaleY = s * 1.19; // Shorter by 30% (from 1.7)
            // The octahedron geometry is stretched 3× vertically. Lift its centre by
            // its half-height so the crystal's base meets the ground instead of floating.
            const baseY = groundH + scaleY * 3;
    
            crystalData.push({
                x: cx,
                z: cz,
                baseY: baseY,
                groundH: groundH,
                scaleX: s * 0.66, // Thicker by 20% (from 0.55)
                scaleY,
                scaleZ: s * 0.66, // Thicker by 20% (from 0.55)
                rotSpeedY: 0.003 + (i % 4) * 0.002,
                bobSpeed: 0.4 + (i % 5) * 0.15,
                bobAmp: 0,
                driftSpeedX: 0,
                driftSpeedZ: 0,
                driftAmpX: 0,
                driftAmpZ: 0,
                rotationY: angle,
                phase: (i * 1.37)
            });
        }

        const CRYSTAL_RENDER_RADIUS = 1800;
        const CRYSTAL_RENDER_RADIUS_SQ = CRYSTAL_RENDER_RADIUS * CRYSTAL_RENDER_RADIUS;

        // Stream the instanced pool around the player.  `count` is important
        // here: writing distant crystals to a zero-scale matrix would still
        // make the renderer submit every instance.
        function updateCrystals(playerPos, time = 0) {
            if (!playerPos) return;

            let visibleCount = 0;
            for (const crystal of crystalData) {
                const dx = crystal.x - playerPos.x;
                const dz = crystal.z - playerPos.z;
                if (dx * dx + dz * dz > CRYSTAL_RENDER_RADIUS_SQ) continue;

                const driftX = Math.sin(time * crystal.driftSpeedX + crystal.phase) * crystal.driftAmpX;
                const driftZ = Math.cos(time * crystal.driftSpeedZ + crystal.phase) * crystal.driftAmpZ;
                const y = crystal.baseY + Math.sin(time * crystal.bobSpeed + crystal.phase) * crystal.bobAmp;

                dummyC.position.set(crystal.x + driftX, y, crystal.z + driftZ);
                dummyC.scale.set(crystal.scaleX, crystal.scaleY, crystal.scaleZ);
                dummyC.rotation.set(0, crystal.rotationY + time * crystal.rotSpeedY, 0);
                dummyC.updateMatrix();
                instCrystals.setMatrixAt(visibleCount++, dummyC.matrix);
            }

            if (instCrystals.count !== visibleCount) instCrystals.count = visibleCount;
            instCrystals.instanceMatrix.needsUpdate = visibleCount > 0;
        }
    
        // Crystal Editor UI Hooks
        const getElem = (id) => document.getElementById(id);
        if (getElem('c-close')) {
            getElem('c-close').addEventListener('click', () => {
                const ce = getElem('crystal-editor');
                if (ce) ce.style.display = 'none';
            });
        }
        if (getElem('crystal-edit-toggle')) {
            getElem('crystal-edit-toggle').addEventListener('click', () => {
                const ce = getElem('crystal-editor');
                if (ce) ce.style.display = ce.style.display === 'none' ? 'block' : 'none';
            });
        }
        if (getElem('c-roughness')) getElem('c-roughness').addEventListener('input', (e) => matCrystal.roughness = parseFloat(e.target.value));
        if (getElem('c-metalness')) getElem('c-metalness').addEventListener('input', (e) => matCrystal.metalness = parseFloat(e.target.value));
        if (getElem('c-transmission')) getElem('c-transmission').addEventListener('input', (e) => matCrystal.transmission = parseFloat(e.target.value));
        if (getElem('c-thickness')) getElem('c-thickness').addEventListener('input', (e) => matCrystal.thickness = parseFloat(e.target.value));
        if (getElem('c-fly-opacity')) getElem('c-fly-opacity').addEventListener('input', (e) => matCrystal.opacity = parseFloat(e.target.value));

        if (getElem('c-fly-hue')) {
            getElem('c-fly-hue').addEventListener('input', (e) => {
                if(matCrystal.userData.shader) matCrystal.userData.shader.uniforms.flyHue.value = parseFloat(e.target.value);
            });
        }
        if (getElem('c-fly-contrast')) {
            getElem('c-fly-contrast').addEventListener('input', (e) => {
                if(matCrystal.userData.shader) matCrystal.userData.shader.uniforms.flyContrast.value = parseFloat(e.target.value);
            });
        }
        if (getElem('c-baseGlow')) {
            getElem('c-baseGlow').addEventListener('input', (e) => {
                if(matCrystal.userData.shader) matCrystal.userData.shader.uniforms.baseGlow.value = parseFloat(e.target.value);
            });
        }
        if (getElem('c-nightGlow')) {
            getElem('c-nightGlow').addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (typeof terrainCrystal !== 'undefined' && terrainCrystal) {
                    if (typeof terrainCrystal.setNightGlowMult === 'function') {
                        terrainCrystal.setNightGlowMult(val);
                    } else {
                        terrainCrystal.nightGlowMult = val;
                    }
                }
            });
        }

        function updateCrystalColors() {
            if (matCrystal.userData.shader && matCrystal.userData.shader.uniforms.uCustomColors) {
                const flyColors = [
                    getElem('c-f-col0')?.value, getElem('c-f-col1')?.value,
                    getElem('c-f-col2')?.value, getElem('c-f-col3')?.value,
                    getElem('c-f-col4')?.value, getElem('c-f-col5')?.value
                ];
                for(let i=0; i<6; i++) {
                    if (flyColors[i]) matCrystal.userData.shader.uniforms.uCustomColors.value[i].set(flyColors[i]);
                }
            }
        }
        for(let i=0; i<6; i++) {
            if(getElem('c-f-col'+i)) getElem('c-f-col'+i).addEventListener('input', updateCrystalColors);
        }

        function updateGroundCrystalColors() {
            const groundColors = [
                getElem('c-col0')?.value, getElem('c-col1')?.value,
                getElem('c-col2')?.value, getElem('c-col3')?.value,
                getElem('c-col4')?.value, getElem('c-col5')?.value
            ];
            if (typeof terrainCrystal !== 'undefined' && terrainCrystal && terrainCrystal.setGroundColors) {
                terrainCrystal.setGroundColors(groundColors);
                if (typeof lastTerrainGridX !== 'undefined') lastTerrainGridX = -9999;
                if (typeof lastTerrainGridZ !== 'undefined') lastTerrainGridZ = -9999;
            }
        }
        for(let i=0; i<6; i++) {
            if(getElem('c-col'+i)) getElem('c-col'+i).addEventListener('input', updateGroundCrystalColors);
        }

    
    
    
        // ==========================================
        // 3D ANIMATED CAPYBARA ENTITY SYSTEM (GLTF)
        // ==========================================
        const capybaraSpawns = [];
        const CAPYBARA_COUNT = 32;
        const CAPYBARA_DESPAWN_RADIUS = 1600;
        const CAPYBARA_ANIM_RADIUS = 220; // Only animate bones when close enough to see leg motion
        let capyFlyTarget = null;
        let capybaraTemplate = null;
        let capybaraAnimations = [];
    
        gltfLoader.load('models/capybara_animated.glb', (gltf) => {
            capybaraTemplate = gltf.scene;
            capybaraAnimations = gltf.animations;
            capybaraTemplate.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
    
            for (let i = 0; i < CAPYBARA_COUNT; i++) {
                const capy = SkeletonUtils.clone(capybaraTemplate);
                const s = 18 + Math.random() * 12;
                capy.scale.set(s, s, s);
                capy.visible = false;
                scene.add(capy);
    
                const mixer = new THREE.AnimationMixer(capy);
                const actions = {};
                for (const clip of capybaraAnimations) {
                    const shortName = clip.name.split('|').pop();
                    actions[shortName] = mixer.clipAction(clip);
                    actions[shortName].setLoop(THREE.LoopRepeat);
                }
                if (actions['idle']) {
                    actions['idle'].play();
                    mixer.update(Math.random() * 3);
                }
    
                capybaraSpawns.push({
                    mesh: capy, mixer, actions,
                    placed: false, state: 'idle',
                    stateTimer: 2 + Math.random() * 8,
                    walkTarget: null, groupId: -1
                });
            }
        }, undefined, (err) => console.warn('Capybara GLB not available:', err.message));
    
        function findFlatSpot(cx, cz, minDist, maxDist, minSep) {
            for (let attempt = 0; attempt < 6; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                const r = minDist + Math.random() * (maxDist - minDist);
                const tx = cx + Math.cos(angle) * r;
                const tz = cz + Math.sin(angle) * r;
                const groundY = getWorldHeight(tx, tz);
                if (groundY < 3.2 || groundY > 38.0) continue;
    
                const b = getBiomeAt(tx, tz);
                // Capybaras thrive in Archipelago, Ghibli Land, and lush coastal plains
                if (b && (b.id === 'crystal_land' || b.id === 'magical_sanctuary' || b.id === 'misty_mountains' || b.id === 'misty_mountains_2')) {
                    continue;
                }
    
                const slopeX = Math.abs(getWorldHeight(tx + 3, tz) - groundY);
                const slopeZ = Math.abs(getWorldHeight(tx, tz + 3) - groundY);
                if (slopeX > 1.2 || slopeZ > 1.2) continue;
    
                // Sample 8 directions at r=60 to ensure we are on open island ground
                let landCount = 0;
                for (let d = 0; d < 8; d++) {
                    const a = (d / 8) * Math.PI * 2;
                    if (getWorldHeight(tx + Math.cos(a) * 60, tz + Math.sin(a) * 60) > 3.0) landCount++;
                }
                if (landCount < 6) continue;
    
                let tooClose = false;
                for (const other of capybaraSpawns) {
                    if (other.placed && Math.hypot(tx - other.mesh.position.x, tz - other.mesh.position.z) < minSep) {
                        tooClose = true; break;
                    }
                }
                if (tooClose) continue;
                return { x: tx, y: groundY, z: tz };
            }
            return null;
        }
    
        function switchCapyAction(capy, newState) {
            const oldAction = capy.actions[capy.state];
            const newAction = capy.actions[newState];
            if (!newAction) return;
            if (oldAction && oldAction !== newAction) oldAction.fadeOut(0.35);
            newAction.reset().fadeIn(0.35).play();
            capy.state = newState;
        }
    
        const capyRaycaster = new THREE.Raycaster();
        const capyPointer = new THREE.Vector2();
    
        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (window.editorState && window.editorState.isEditorMode) return;
            capyPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
            capyPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
            capyRaycaster.setFromCamera(capyPointer, camera);
            const capyMeshes = capybaraSpawns.filter(c => c.placed).map(c => c.mesh);
            const allChildren = [];
            capyMeshes.forEach(m => m.traverse(child => { if (child.isMesh) allChildren.push(child); }));
            const hits = capyRaycaster.intersectObjects(allChildren, false);
            if (hits.length > 0) {
                let hitObj = hits[0].object;
                while (hitObj.parent && !capyMeshes.includes(hitObj)) hitObj = hitObj.parent;
                const target = capybaraSpawns.find(c => c.mesh === hitObj);
                if (target) {
                    capyFlyTarget = target;
                }
            }
        });
    
        function updateCapybaras(playerPos, dt) {
            let placedThisFrame = false;
            capybaraSpawns.forEach(capy => {
                if (!capy.placed) {
                    if (placedThisFrame) return;
                    const isGrouped = Math.random() < 0.75;
                    let spot;
                    if (isGrouped) {
                        const nearby = capybaraSpawns.find(c => c.placed &&
                            Math.hypot(playerPos.x - c.mesh.position.x, playerPos.z - c.mesh.position.z) < 500);
                        if (nearby) {
                            spot = findFlatSpot(nearby.mesh.position.x, nearby.mesh.position.z, 20, 90, 18);
                        }
                    }
                    if (!spot) {
                        spot = findFlatSpot(playerPos.x, playerPos.z, 70, 550, 20);
                    }
                    if (spot) {
                        capy.mesh.position.set(spot.x, spot.y, spot.z);
                        capy.mesh.rotation.y = Math.random() * Math.PI * 2;
                        capy.mesh.visible = true;
                        capy.placed = true;
                        placedThisFrame = true;
                        capy.state = 'idle';
                        capy.stateTimer = 3 + Math.random() * 6;
                        if (capy.actions['idle']) {
                            Object.values(capy.actions).forEach(a => a.stop());
                            capy.actions['idle'].reset().play();
                        }
                    }
                } else {
                    const dist = Math.hypot(
                        playerPos.x - capy.mesh.position.x,
                        playerPos.z - capy.mesh.position.z
                    );
                    if (dist > CAPYBARA_DESPAWN_RADIUS) {
                        capy.placed = false;
                        capy.mesh.visible = false;
                        if (capyFlyTarget === capy) capyFlyTarget = null;
                        return;
                    }
    
                    capy.stateTimer -= dt;
                    if (capy.stateTimer <= 0) {
                        if (capy.state === 'idle') {
                            const walkAngle = Math.random() * Math.PI * 2;
                            const walkDist = 6 + Math.random() * 15;
                            capy.walkTarget = new THREE.Vector3(
                                capy.mesh.position.x + Math.cos(walkAngle) * walkDist, 0,
                                capy.mesh.position.z + Math.sin(walkAngle) * walkDist
                            );
                            switchCapyAction(capy, 'walk');
                            capy.stateTimer = 3 + Math.random() * 5;
                        } else {
                            capy.walkTarget = null;
                            switchCapyAction(capy, 'idle');
                            capy.stateTimer = 4 + Math.random() * 7;
                        }
                    }
    
                    if (capy.state === 'walk' && capy.walkTarget) {
                        const dx = capy.walkTarget.x - capy.mesh.position.x;
                        const dz = capy.walkTarget.z - capy.mesh.position.z;
                        const distToTarget = Math.sqrt(dx * dx + dz * dz);
                        if (distToTarget > 0.5) {
                            const speed = 2.8;
                            const nx = capy.mesh.position.x + (dx / distToTarget) * speed * dt;
                            const nz = capy.mesh.position.z + (dz / distToTarget) * speed * dt;
                            const groundY = getWorldHeight(nx, nz);
                            if (groundY > 3.0 && groundY < 40.0) {
                                capy.mesh.position.set(nx, groundY, nz);
                                capy.mesh.rotation.y = Math.atan2(dx, dz);
                            } else {
                                capy.walkTarget = null;
                                switchCapyAction(capy, 'idle');
                                capy.stateTimer = 3 + Math.random() * 5;
                            }
                        } else {
                            capy.walkTarget = null;
                            switchCapyAction(capy, 'idle');
                            capy.stateTimer = 4 + Math.random() * 6;
                        }
                    }
    
                    if (dist < CAPYBARA_ANIM_RADIUS) {
                        capy.mixer.update(dt);
                    }
                }
            });
        }
    

    return {
        instCrystals,
        matCrystal,
        updateCrystals,
        capybaraSpawns,
        updateCapybaras,
        updateGroundCrystalColors
    };
}
