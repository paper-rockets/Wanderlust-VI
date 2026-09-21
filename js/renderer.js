import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { getWorldHeight } from './world.js';

// ==========================================
// CORE THREE.JS SETUP, RENDERER & GOD MODE
// ==========================================

export function initRenderer(container, params, LOW_GFX) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8cbce6);
    scene.fog = new THREE.Fog(0x8cbce6, 100, 1800);
    const defaultFog = scene.fog;

    function setAllFogEnabled(enabled) {
        params.showFog = enabled;
        params.showFogPlanes = enabled;
        params.fogPlane = enabled;
        scene.fog = enabled ? defaultFog : null;
        if (typeof window.updateFogPlanes === 'function') {
            window.updateFogPlanes();
        } else if (typeof window.fogGroup !== 'undefined') {
            window.fogGroup.visible = enabled;
        }
        if (typeof window.gui !== 'undefined' && window.gui && typeof window.gui.controllersRecursive === 'function') {
            window.gui.controllersRecursive().forEach(c => {
                if (c.property === 'showFog' || c.property === 'showFogPlanes' || c.property === 'fogPlane') {
                    c.updateDisplay();
                }
            });
        }
    }
    window.setAllFogEnabled = setAllFogEnabled;
    window.setFogVisibility = setAllFogEnabled;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 2.0, 30000);
    camera.position.set(0, 9, 26);

    const renderer = new THREE.WebGLRenderer({
        antialias: !LOW_GFX,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(LOW_GFX ? 0.5 : Math.min(window.devicePixelRatio, 1.25));
    renderer.shadowMap.enabled = !LOW_GFX;
    renderer.shadowMap.type = LOW_GFX ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = params.exposure || 1.8;
    renderer.info.autoReset = false;
    container.appendChild(renderer.domElement);

    window.camera = camera;
    window.scene = scene;
    window.renderer = renderer;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomRes = new THREE.Vector2(
        Math.min(window.innerWidth * 0.5, 960),
        Math.min(window.innerHeight * 0.5, 540)
    );
    const bloomPass = new UnrealBloomPass(bloomRes, 0.8, 0.4, 1.5);
    bloomPass.enabled = !LOW_GFX;
    composer.addPass(bloomPass);

    // ==========================================
    // TOON GRADIENT MAP & GLTF LOADERS SETUP
    // ==========================================
    const gradientColors = new Uint8Array([
        160, 160, 165, 255,
        195, 195, 200, 255,
        235, 235, 240, 255,
        255, 255, 255, 255
    ]);
    const gradientMap = new THREE.DataTexture(gradientColors, 4, 1, THREE.RGBAFormat);
    gradientMap.needsUpdate = true;
    gradientMap.minFilter = THREE.LinearFilter;
    gradientMap.magFilter = THREE.LinearFilter;
    gradientMap.generateMipmaps = false;

    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/basis/')
        .detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    // ==========================================
    // GOD MODE FREE-CAM (DEV ORTHO / SPECTATOR)
    // ==========================================
    let godCamera = null;
    let godControls = null;
    let isGodMode = false;
    const _prevGodPlayerPos = new THREE.Vector3();

    function setupGodMode() {
        if (godCamera && godControls) return;
        godCamera = new THREE.PerspectiveCamera(params.cameraFov || 60, window.innerWidth / window.innerHeight, 0.01, 10000000);
        godCamera.position.set(0, 150, 400);
        scene.add(godCamera);

        godControls = new OrbitControls(godCamera, renderer.domElement);
        godControls.minDistance = 0.001;
        godControls.maxDistance = 10000000;
        godControls.minPolarAngle = 0.0001;
        godControls.maxPolarAngle = Math.PI - 0.0001;
        godControls.zoomSpeed = 1.6;
        godControls.panSpeed = 1.6;
        godControls.rotateSpeed = 1.0;
        godControls.enableDamping = true;
        godControls.dampingFactor = 0.08;
        godControls.screenSpacePanning = true;
        godControls.zoomToCursor = true;
        godControls.enabled = false;

        godControls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        godControls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        const domElem = renderer.domElement;
        if (domElem) {
            domElem.addEventListener('wheel', (e) => {
                if (!godControls || !godControls.enabled) return;
                if (e.shiftKey) {
                    godControls.zoomSpeed = 4.5;
                } else if (e.altKey || e.ctrlKey) {
                    godControls.zoomSpeed = 0.4;
                } else {
                    godControls.zoomSpeed = 1.6;
                }
            }, { passive: true, capture: true });

            const _raycaster = new THREE.Raycaster();
            const _mouseVec = new THREE.Vector2();
            domElem.addEventListener('dblclick', (e) => {
                if (!godControls || !godControls.enabled) return;
                const rect = domElem.getBoundingClientRect();
                _mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                _mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                _raycaster.setFromCamera(_mouseVec, godCamera);

                const curDist = godCamera.position.distanceTo(godControls.target);
                const zoomInStep = Math.max(2.0, curDist * 0.5);
                godCamera.position.addScaledVector(_raycaster.ray.direction, zoomInStep);
                godControls.target.addScaledVector(_raycaster.ray.direction, zoomInStep * 0.5);
                godControls.update();
            });
        }

        if (typeof window.playerGrp !== 'undefined' && window.playerGrp) {
            godControls.target.copy(window.playerGrp.position);
        }
        godControls.update();
    }

    function clampGodCameraAboveTerrainAndWater(controls, gCam, waterLevel = 2.4) {
        const effWaterY = (waterLevel !== undefined && waterLevel !== null) ? waterLevel : 2.4;
        const minWaterClearance = 0.05;
        const minTerrainClearance = 0.05;

        if (controls && controls.target) {
            const targetTerrainH = getWorldHeight(controls.target.x, controls.target.z);
            const minTargetY = Math.max(targetTerrainH + 0.02, effWaterY + 0.02);
            if (controls.target.y < minTargetY) {
                controls.target.y = minTargetY;
            }
        }

        if (gCam) {
            const camTerrainH = getWorldHeight(gCam.position.x, gCam.position.z);
            const minCamY = Math.max(camTerrainH + minTerrainClearance, effWaterY + minWaterClearance);
            if (gCam.position.y < minCamY) {
                gCam.position.y = minCamY;
            }
            gCam.updateMatrixWorld(true);
        }
    }

    function setGodMode(enabled, playerGrp, cameraBase) {
        if (typeof enabled === 'boolean') {
            isGodMode = enabled;
        } else {
            isGodMode = !isGodMode;
        }
        params.godMode = isGodMode;

        if (!godCamera || !godControls) {
            setupGodMode();
        }

        if (isGodMode) {
            camera.getWorldPosition(godCamera.position);
            camera.getWorldQuaternion(godCamera.quaternion);

            godCamera.near = 0.01;
            godCamera.far = 10000000;
            godCamera.fov = params.cameraFov || 60;
            godCamera.updateProjectionMatrix();

            godControls.enabled = true;
            const p = playerGrp || window.playerGrp;
            if (p) {
                godControls.target.copy(p.position);
                _prevGodPlayerPos.copy(p.position);
            }
            clampGodCameraAboveTerrainAndWater(godControls, godCamera, 2.4);
            godControls.update();

            renderPass.camera = godCamera;
            window.camera = godCamera;
        } else {
            godControls.enabled = false;
            const p = playerGrp || window.playerGrp;
            if (p && cameraBase) {
                cameraBase.position.copy(p.position);
            }
            renderPass.camera = camera;
            window.camera = camera;
        }

        if (typeof window.gui !== 'undefined' && window.gui && typeof window.gui.controllersRecursive === 'function') {
            window.gui.controllersRecursive().forEach(c => {
                if (c.property === 'godMode') c.updateDisplay();
            });
        }
    }
    window.setGodMode = setGodMode;

    function updateGodMode(dt, playerGrp) {
        if (!godControls || !godControls.enabled) return;
        const p = playerGrp || window.playerGrp;
        if (p) {
            const dx = p.position.x - _prevGodPlayerPos.x;
            const dy = p.position.y - _prevGodPlayerPos.y;
            const dz = p.position.z - _prevGodPlayerPos.z;
            godCamera.position.x += dx;
            godCamera.position.y += dy;
            godCamera.position.z += dz;
            godControls.target.copy(p.position);
            _prevGodPlayerPos.copy(p.position);
        }
        clampGodCameraAboveTerrainAndWater(godControls, godCamera, 2.4);
        godControls.update();
    }

    // ==========================================
    // PHOTO MODE & SCREENSHOT CAPTURE
    // ==========================================
    let photoControls = null;
    let isPhotoMode = false;
    window.isPhotoMode = false;

    const photoExitBtn = document.getElementById('photo-exit');
    if (photoExitBtn) {
        photoExitBtn.addEventListener('click', () => {
            isPhotoMode = false;
            window.isPhotoMode = false;
            const sc = document.getElementById('settings-controls');
            if (sc) sc.style.display = 'flex';
            const tc = document.getElementById('touch-controls');
            if (tc) tc.style.display = '';
            const tt = document.getElementById('time-toggle');
            if (tt) tt.style.display = 'block';
            const pm = document.getElementById('photo-mode-ui');
            if (pm) pm.style.display = 'none';
            camera.fov = 60;
            camera.position.set(0, 4, 14);
            camera.up.set(0, 1, 0);
            camera.rotation.set(0, 0, 0);
            camera.updateProjectionMatrix();
            if (photoControls) photoControls.enabled = false;
        });
    }

    const photoCaptureBtn = document.getElementById('photo-capture');
    if (photoCaptureBtn) {
        photoCaptureBtn.addEventListener('click', () => {
            document.getElementById('photo-mode-ui').style.display = 'none';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    composer.render();
                    const dataURL = renderer.domElement.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = 'GhibliFlight_Screenshot.png';
                    link.href = dataURL;
                    link.click();
                    document.getElementById('photo-mode-ui').style.display = 'flex';
                });
            });
        });
    }

    // Fullscreen listeners
    const fsToggle = document.getElementById('fullscreen-toggle');
    if (fsToggle) {
        fsToggle.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.warn(`Fullscreen error: ${err.message}`));
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }
    document.addEventListener('fullscreenchange', () => {
        const isFS = !!document.fullscreenElement;
        document.querySelectorAll('.top-bar-left, #top-model-select, #top-tree-btn, #top-engine-btn, #time-toggle, #fullscreen-toggle, #gui-toggle-btn').forEach(el => {
            el.style.display = isFS ? 'none' : '';
        });
        const lil = document.querySelector('.lil-gui.root');
        if (lil && isFS) lil.style.display = 'none';
        const mapEl = document.getElementById('world-map');
        if (mapEl) mapEl.style.display = isFS ? 'none' : '';
    });

    // Window Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        if (godCamera) {
            godCamera.aspect = window.innerWidth / window.innerHeight;
            godCamera.updateProjectionMatrix();
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        const cloudCvs = document.getElementById('cloud-debug-canvas');
        if (cloudCvs && params.showCloudDebug) {
            cloudCvs.width = window.innerWidth;
            cloudCvs.height = window.innerHeight;
        }
        const fogOverlayCanvas = document.getElementById('fog-canvas');
        if (fogOverlayCanvas) {
            fogOverlayCanvas.width = Math.ceil(window.innerWidth / 2);
            fogOverlayCanvas.height = Math.ceil(window.innerHeight / 2);
        }
    });

    return {
        scene,
        camera,
        renderer,
        composer,
        renderPass,
        bloomPass,
        defaultFog,
        setAllFogEnabled,
        gradientMap,
        gltfLoader,
        godCamera,
        godControls,
        setGodMode,
        updateGodMode,
        isGodMode: () => isGodMode
    };
}
