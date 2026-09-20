import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { LOW_GFX, TERRAIN_SIZE } from './config.js';
import {
    worldLayout,
    getWorldHeight,
    getWorldColor,
    getBiomeAt,
    isTreeZone,
    setWorldSeed,
    _mapName,
    BIOME_CATALOG,
    WorldLayout
} from './world.js';
import {
    _mapEl,
    _mapCanvas,
    _mapCtx,
    _mapOpen,
    _setMapOpen,
    initMapUI,
    _mapView,
    _drawWorldMap
} from './map.js';
import {
    BiplaneEngineAudio,
    audioCtx,
    biplaneEngine,
    windGain,
    windFilter,
    initAudio,
    scheduleNotes
} from './audio.js';
import {
    keys,
    touchState,
    uiVisible,
    getInputState
} from './input.js';
import { initRenderer } from './renderer.js';
import { initLighting } from './lighting.js';
import { initSky, envConfigs } from './sky.js';
import { initGroundFog, initMist, initRain, initStarfield } from './weather.js';
import { initTerrain, initWater } from './terrain.js';
import { initDioramaProps } from './diorama.js';
import { setupToonCloudShader, initClouds } from './clouds.js';
import { CloudManager, getCloudFactoryParams } from './cloud-manager.js';
import { initTreesAndOctree } from './trees.js';
import { initPropsAndWildlife } from './props.js';
import { initPlayer } from './player.js';
import { initPostProcessingShaders } from './postprocessing.js';
import { initFlight } from './flight.js';
import { initSettingsPanels } from './ui-settings.js';

// ==========================================
// MAIN GAME INITIALIZATION & RENDER LOOP
// ==========================================

const container = document.getElementById('app');

let isWindOn = false;
let isRainOn = false;
let isWindTrailsOn = true;
let isShadowsOn = !LOW_GFX;
let isTreeShadowsOn = false;
let shadowDistMode = LOW_GFX ? 'Close' : 'Med';
let isBloomOn = !LOW_GFX;
let isHD = !LOW_GFX;
let terrainRes = LOW_GFX ? 128 : 256;
let currentWorldSeed = 1337;
let timePhase = 1; // 0: Day, 1: Dusk, 2: Deep Twilight
let currentFrame = 0;
let logicTimer = 0;
let isPrewarming = false;
let isInitializingGui = true;
window.isInitializingGui = true;
let terrainScale = 1.0;

const params = {
    trails: isWindTrailsOn,
    shadows: isShadowsOn,
    treeShadows: isTreeShadowsOn,
    shadowDist: shadowDistMode,
    bloom: isBloomOn,
    terrainRes: String(terrainRes),
    renderHD: isHD,
    treeColor0: '#ffffff',
    treeColor1: '#ddff88',
    treeColor2: '#88cc99',
    treeColor3: '#778855',
    treeColor4: '#aaffaa',
    treeColor5: '#bbdd99',
    treeColor6: '#669966',
    summerFilter: !LOW_GFX,
    modelVisible: true,
    wind: isWindOn,
    rain: isRainOn,
    fogPlane: true,
    fogPreset: 'Gentle Sea Mist',
    fogMistOpacity: 0.18,
    fogMistHeight: 5.5,
    fogMistLayers: 1,
    fogFarDist: 1400.0,
    fogNearDist: 220.0,
    godRays: !LOW_GFX,
    godRayIntensity: 0.60,
    godRayDensity: 0.50,
    godRayDecay: 0.92,
    godRayWeight: 0.85,
    lumMin: 0.85,
    lumMax: 0.98,
    rayColorInner: '#ffea9f',
    rayColorOuter: '#ff9933',
    sunAltitude: 1500,
    sunAzimuth: 0,
    lockSunToPlayer: true,
    sunDiscScale: 1.8,
    treeScale: 3.75,
    quality: LOW_GFX ? 'Low' : 'Regular',
    showTerrain: true,
    showWater: true,
    showTrees: true,
    showClouds: true,
    domeClouds: true,
    domeCloudCoverage: 0.45,
    domeCloudEdge: 0.08,
    domeCloudSpeed: 0.015,
    domeCloudOpacity: 0.95,
    cloudsLow: true,
    cloudsHigh: true,
    cloudsLowTower: true,
    cloudsGiant: true,
    cloudsLowBank: true,
    cloudsBillboard: true,
    cloudsLowCount: LOW_GFX ? 18 : 45,
    cloudsHighCount: LOW_GFX ? 0 : 10,
    cloudsLowTowerCount: LOW_GFX ? 0 : 5,
    cloudsGiantCount: LOW_GFX ? 0 : 10,
    cloudsLowBankCount: LOW_GFX ? 0 : 6,
    cloudsLowBankDensity: 0.55,
    cloudsBillboardCount: 10,
    cloudsLowSize: 1.0,
    cloudsHighSize: 3.0,
    cloudsLowTowerSize: 1.1,
    cloudsGiantSize: 3.0,
    cloudsLowBankSize: 1.1,
    cloudsBillboardSize: 1.0,
    cloudsLowOpacity: 1.0,
    cloudsHighOpacity: 0.98,
    cloudsLowTowerOpacity: 1.0,
    cloudsGiantOpacity: 1.0,
    cloudsLowBankOpacity: 1.0,
    cloudsBillboardOpacity: 1.0,
    cloudsNearSolid: 2000,
    cloudsFarHaze: 14000,
    cloudsLowBottomBlur: 0.45,
    cloudsHighBottomBlur: 0.55,
    cloudsLowTowerBottomBlur: 0.35,
    cloudsGiantBottomBlur: 0.64,
    cloudsLowBankBottomBlur: 0.40,
    cloudsLowAltitude: 150,
    cloudsLowDistance: 2200,
    cloudsHighAltitude: 250,
    cloudsHighDistance: 8000,
    cloudsLowTowerAltitude: -35,
    cloudsLowTowerDistance: 3200,
    cloudsGiantAltitude: 500,
    cloudsGiantDistance: 8975,
    cloudsLowBankAltitude: -5,
    cloudsLowBankDistance: 4400,
    cloudsBillboardAltitude: 1400,
    cloudsBillboardDistance: 5200,
    cloudWindBaseSpeed: 18.0,
    cloudWindReferenceDistance: 1200.0,
    cloudWindAttenuation: 0.60,
    cloudParallaxStrength: 0.35,
    cloudTerrainClearance: 120.0,
    cloudAvoidanceHeadingThreshold: 0.65,
    cloudAvoidanceStrength: 0.90,
    cloudAvoidanceRestoreTau: 2.5,
    cloudsLowColor: '#ffffff',
    cloudsHighColor: '#ffffff',
    cloudsLowTowerColor: '#ffffff',
    cloudsGiantColor: '#ffffff',
    cloudsLowBankColor: '#ffffff',
    cloudsBillboardColor: '#ffffff',
    cloudsMinDistance: 0,
    normalizeSun: false,
    showCloudDebug: false,
    cloudDebugTargetMode: 'visible',
    debugCloudTint: false,
    showFog: true,
    godMode: false,
    showGodModelMarker: true,
    cameraFov: 60,
    waterColor: '#1a4075',
    cloudsDayLitColor: '#fffdf6',
    cloudsDayShadowColor: '#9cb8db',
    cloudsNightLitColor: '#9ec7eb',
    cloudsNightShadowColor: '#1a3055',
    cloudsBillowSpeed: 0.35,
    cloudsBillowAmount: 1.0,
    cloudMistEffect: false,
    cloudImmersionFog: false,
    cloudExitHaze: false,
    cloudExitPuffs: true,
    cloudImmersionStrength: 0.85,
    cloudImmersionVignette: 0.55,
    cloudImmersionEnterSpeed: 3.5,
    cloudImmersionExitSpeed: 1.8,
    cloudExitMistDuration: 4.0,
    cloudExitHazeStrength: 0.35,
    cloudExitVignetteStrength: 0.22,
    cloudExitPuffCount: LOW_GFX ? 9 : 16,
    cloudExitPuffLife: 1.0,
    cloudExitPuffScale: 1.0,
    showBirds: true,
    showFogPlanes: true,
    showCrystals: true,
    showMap: true,
    showGUI: true,
    exposure: 1.8,
};
window.params = params;
const cloudManager = new CloudManager(params);
window.cloudManager = cloudManager;

// --- Lil-GUI Creation ---
const gui = new GUI({ title: 'Settings' });
window.gui = gui;

gui.add({
    saveAll: () => {
        const data = gui.save();
        localStorage.setItem('flightSettings', JSON.stringify(data));
        gui.title('Saved!');
        setTimeout(() => gui.title('Settings'), 1500);
    }
}, 'saveAll').name('💾 Save All Settings');

gui.add({
    saveSetting: () => {
        const menu = document.getElementById('top-save-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? '' : 'none';
            if (menu.style.display !== 'none') {
                const guiRect = gui.domElement.getBoundingClientRect();
                menu.style.left = `${Math.max(10, Math.round(guiRect.right + 8))}px`;
                menu.style.top = `${Math.round(guiRect.top)}px`;
            }
        }
    }
}, 'saveSetting').name('💾 Save Per-Biome');

const perfFolder = gui.addFolder('Performance');
perfFolder.add(params, 'quality', ['Regular', 'Low']).name('Quality').onChange(v => {
    localStorage.setItem('gfxQuality', v === 'Low' ? 'low' : 'regular');
    if (!isInitializingGui) location.reload();
});
perfFolder.add(params, 'renderHD').name('Render HD').onChange(v => {
    isHD = v;
    renderer.setPixelRatio(isHD ? Math.min(window.devicePixelRatio, 2) : 0.5);
});
perfFolder.add(params, 'exposure', 0.5, 4.0, 0.1).name('Global Brightness').onChange(v => {
    renderer.toneMappingExposure = v;
});
perfFolder.add(params, 'terrainRes', ['384', '256', '128', '64']).name('Terrain Res').onChange(v => {
    terrainRes = parseInt(v);
    setTerrainResolution(terrainRes);
});
perfFolder.add(params, 'shadows').name('Shadows').onChange(v => {
    isShadowsOn = v;
    dirLight.castShadow = isShadowsOn;
});
perfFolder.add(params, 'treeShadows').name('Tree Shadows').onChange(v => {
    isTreeShadowsOn = v;
    if (typeof treeMeshes !== 'undefined') treeMeshes.forEach(mesh => mesh.castShadow = isTreeShadowsOn);
});
perfFolder.add(params, 'shadowDist', ['Close', 'Med', 'Far']).name('Shadow Dist').onChange(v => {
    shadowDistMode = v;
    if (shadowDistMode === 'Close') { dirLight.shadow.mapSize.width = 1024; dirLight.shadow.mapSize.height = 1024; }
    else if (shadowDistMode === 'Med') { dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048; }
    else { dirLight.shadow.mapSize.width = 4096; dirLight.shadow.mapSize.height = 4096; }
    if (dirLight.shadow.map) { dirLight.shadow.map.dispose(); dirLight.shadow.map = null; }
});
perfFolder.add(params, 'bloom').name('Bloom').onChange(v => {
    isBloomOn = v;
    bloomPass.enabled = isBloomOn;
});

// GUI actions
const guiActions = {
    switchModel: () => _fmLoadAndActivate((flightModels.findIndex(m => m.name === window.currentModelName) + 1) % flightModels.length),
    openCrystalEditor: () => {
        const crystalEditor = document.getElementById('crystal-editor');
        if (crystalEditor) crystalEditor.style.display = crystalEditor.style.display === 'none' ? 'block' : 'none';
    },
    toggleMusic: () => {
        const b = document.getElementById('top-music-btn');
        if (b) b.click();
    },
    nextTrack: () => {
        const b = document.getElementById('track-toggle');
        if (b) b.click();
    },
    fullscreen: () => {
        const b = document.getElementById('fullscreen-toggle');
        if (b) b.click();
    }
};

const worldFolder = gui.addFolder('World');
const worldParams = {
    seed: currentWorldSeed,
    randomizeSeed: () => {
        const newSeed = Math.floor(Math.random() * 900000 + 100000);
        worldParams.seed = newSeed;
        currentWorldSeed = newSeed;
        worldLayout.generate(newSeed);
        window._bgMapCanvas = null;
        if (typeof playerGrp !== 'undefined') {
            const sp = worldLayout.spawnPosition;
            const groundY = getWorldHeight(sp.x, sp.z);
            playerGrp.position.set(sp.x, groundY + 640, sp.z);
        }
        window.lastTerrainGridX = -9999;
        window.lastTerrainGridZ = -9999;
        worldFolder.controllersRecursive().forEach(c => c.updateDisplay());
        _drawWorldMap(true);
    },
    runAcceptanceTests: () => {
        WorldLayout.runAcceptanceTests();
    }
};
worldFolder.add(worldParams, 'seed', 100000, 999999, 1).name('World Seed').onChange(v => {
    currentWorldSeed = v;
    worldLayout.generate(v);
    window._bgMapCanvas = null;
    window.lastTerrainGridX = -9999;
    window.lastTerrainGridZ = -9999;
    _drawWorldMap(true);
});
worldFolder.add(worldParams, 'randomizeSeed').name('Randomize Seed');

const biomeNamesList = BIOME_CATALOG.map(b => _mapName(b));
const navParams = { biome: biomeNamesList[0] };
const gameFolder = gui.addFolder('Game');
gameFolder.add(navParams, 'biome', biomeNamesList).name('Go To Biome').onChange(v => {
    const biomeDef = BIOME_CATALOG.find(b => _mapName(b) === v || b.name === v);
    if (!biomeDef) return;
    if (window.selectTreeEditorBiome) window.selectTreeEditorBiome(biomeDef.id);
    const targetIsland = worldLayout.islands.find(isl => isl.isMajor && isl.biomeId === biomeDef.id) || worldLayout.islands[0];
    if (targetIsland && typeof playerGrp !== 'undefined') {
        const groundY = getWorldHeight(targetIsland.centerX, targetIsland.centerZ);
        playerGrp.position.set(targetIsland.centerX, Math.max(90, groundY + 50), targetIsland.centerZ);
        window.lastTerrainGridX = -9999;
        window.lastTerrainGridZ = -9999;
    }
});

const topBiomeSel = document.getElementById('top-biome-select');
if (topBiomeSel) {
    biomeNamesList.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        topBiomeSel.appendChild(opt);
    });
    topBiomeSel.addEventListener('change', () => {
        navParams.biome = topBiomeSel.value;
        const biomeDef = BIOME_CATALOG.find(b => _mapName(b) === topBiomeSel.value || b.name === topBiomeSel.value);
        if (!biomeDef) return;
        if (window.selectTreeEditorBiome) window.selectTreeEditorBiome(biomeDef.id);
        const targetIsland = worldLayout.islands.find(isl => isl.isMajor && isl.biomeId === biomeDef.id) || worldLayout.islands[0];
        if (targetIsland && typeof playerGrp !== 'undefined') {
            const groundY = getWorldHeight(targetIsland.centerX, targetIsland.centerZ);
            playerGrp.position.set(targetIsland.centerX, Math.max(90, groundY + 50), targetIsland.centerZ);
            window.lastTerrainGridX = -9999;
            window.lastTerrainGridZ = -9999;
        }
    });
}

gameFolder.add(guiActions, 'switchModel').name('Switch Character');
gameFolder.add(guiActions, 'toggleMusic').name('Toggle Music');
gameFolder.add(guiActions, 'nextTrack').name('Next Track');
gameFolder.add(params, 'summerFilter').name('Summer Filter').onChange(() => {
    const btn = document.getElementById('summer-toggle');
    if (btn) btn.click();
});
gameFolder.add(params, 'modelVisible').name('Model Visible').onChange(() => {
    const btn = document.getElementById('invis-toggle');
    if (btn) btn.click();
});
gameFolder.add(guiActions, 'fullscreen').name('Fullscreen');

const envFolder = gui.addFolder('Weather');
envFolder.add(params, 'wind').name('Wind').onChange(v => {
    if (isWindOn !== v) {
        const btn = document.getElementById('wind-toggle');
        if (btn) btn.click();
    }
});
envFolder.add(params, 'rain').name('Rain').onChange(v => {
    isRainOn = v;
    if (typeof rainSystem !== 'undefined') rainSystem.visible = v;
});

let fogPresetCtrl, fogPlaneCtrl, fogOpacityCtrl, fogHeightCtrl, fogLayersCtrl, fogFarCtrl, fogNearCtrl;

function applyFogPreset(name) {
    if (name === 'Gentle Sea Mist') {
        params.fogPlane = true;
        params.fogMistOpacity = 0.18;
        params.fogMistHeight = 5.5;
        params.fogMistLayers = 1;
        params.fogFarDist = 1400.0;
        params.fogNearDist = 220.0;
        if (typeof scene !== 'undefined' && typeof defaultFog !== 'undefined' && defaultFog) scene.fog = defaultFog;
    } else if (name === 'Clean & Crisp') {
        params.fogPlane = false;
        params.fogMistOpacity = 0.0;
        params.fogMistHeight = 5.5;
        params.fogMistLayers = 1;
        params.fogFarDist = 1800.0;
        params.fogNearDist = 400.0;
        if (typeof scene !== 'undefined' && typeof defaultFog !== 'undefined' && defaultFog) scene.fog = defaultFog;
    } else if (name === 'Atmospheric') {
        params.fogPlane = true;
        params.fogMistOpacity = 0.32;
        params.fogMistHeight = 12.0;
        params.fogMistLayers = 2;
        params.fogFarDist = 950.0;
        params.fogNearDist = 120.0;
        if (typeof scene !== 'undefined' && typeof defaultFog !== 'undefined' && defaultFog) scene.fog = defaultFog;
    } else if (name === 'Off') {
        params.fogPlane = false;
        params.fogMistOpacity = 0.0;
        params.fogFarDist = 9000.0;
        params.fogNearDist = 7000.0;
        if (typeof scene !== 'undefined') scene.fog = null;
    } else if (name === 'Custom') {
        if (typeof scene !== 'undefined' && typeof defaultFog !== 'undefined' && defaultFog && !scene.fog) {
            scene.fog = defaultFog;
        }
    }
    params.fogPreset = name;
    params.showFogPlanes = params.fogPlane;
    if (typeof window.updateFogPlanes === 'function') window.updateFogPlanes();
    if (fogPlaneCtrl) fogPlaneCtrl.updateDisplay();
    if (fogOpacityCtrl) fogOpacityCtrl.updateDisplay();
    if (fogHeightCtrl) fogHeightCtrl.updateDisplay();
    if (fogLayersCtrl) fogLayersCtrl.updateDisplay();
    if (fogFarCtrl) fogFarCtrl.updateDisplay();
    if (fogNearCtrl) fogNearCtrl.updateDisplay();
    if (fogPresetCtrl) fogPresetCtrl.updateDisplay();
}
window.applyFogPreset = applyFogPreset;

function setCustomFogPreset() {
    if (params.fogPreset !== 'Custom') {
        params.fogPreset = 'Custom';
        if (typeof scene !== 'undefined' && typeof defaultFog !== 'undefined' && defaultFog && !scene.fog) {
            scene.fog = defaultFog;
        }
        if (fogPresetCtrl) fogPresetCtrl.updateDisplay();
    }
}

fogPresetCtrl = envFolder.add(params, 'fogPreset', [
    'Gentle Sea Mist',
    'Clean & Crisp',
    'Atmospheric',
    'Off',
    'Custom'
]).name('Fog Look').onChange(applyFogPreset);

fogPlaneCtrl = envFolder.add(params, 'fogPlane').name('Ground Mist').onChange(v => {
    setCustomFogPreset();
    params.showFogPlanes = v;
    if (typeof window.updateFogPlanes === 'function') window.updateFogPlanes();
});
fogOpacityCtrl = envFolder.add(params, 'fogMistOpacity', 0.0, 0.8, 0.02).name('Mist Opacity').onChange(() => {
    setCustomFogPreset();
    if (typeof window.updateFogPlanes === 'function') window.updateFogPlanes();
});
fogHeightCtrl = envFolder.add(params, 'fogMistHeight', 3.0, 35.0, 0.5).name('Mist Height').onChange(() => {
    setCustomFogPreset();
    if (typeof window.updateFogPlanes === 'function') window.updateFogPlanes();
});
fogLayersCtrl = envFolder.add(params, 'fogMistLayers', [1, 2, 3]).name('Mist Layers').onChange(v => {
    params.fogMistLayers = parseInt(v);
    setCustomFogPreset();
    if (typeof window.updateFogPlanes === 'function') window.updateFogPlanes();
});
fogFarCtrl = envFolder.add(params, 'fogFarDist', 400.0, 3000.0, 50.0).name('View Distance').onChange(() => setCustomFogPreset());
fogNearCtrl = envFolder.add(params, 'fogNearDist', 20.0, 800.0, 20.0).name('Fog Start').onChange(() => setCustomFogPreset());

envFolder.add(params, 'trails').name('Wind Trails').onChange(v => isWindTrailsOn = v);

function toggleGUI(show) {
    const isVisible = typeof show === 'boolean' ? show : (gui.domElement.style.display === 'none');
    gui.domElement.style.display = isVisible ? '' : 'none';
    const mapFrame = document.getElementById('map-frame');
    const mapEl = document.getElementById('world-map');
    if (mapFrame) mapFrame.style.display = isVisible ? '' : 'none';
    if (mapEl) mapEl.classList.toggle('map-no-compass', !isVisible);
    const boostBtn = document.getElementById('boost-btn');
    if (boostBtn) boostBtn.style.right = isVisible ? '275px' : '20px';
    params.showGUI = isVisible;
    params.showMap = isVisible;
}
window.toggleGUI = toggleGUI;

const guiToggleBtn = document.getElementById('gui-toggle-btn');
if (guiToggleBtn) {
    guiToggleBtn.addEventListener('click', () => toggleGUI());
}

// Top Bar Button Listeners
const windToggleBtn = document.getElementById('wind-toggle');
if (windToggleBtn) {
    windToggleBtn.addEventListener('click', () => {
        isWindOn = !isWindOn;
        windToggleBtn.innerText = `Wind: ${isWindOn ? 'ON' : 'OFF'}`;
        params.wind = isWindOn;
    });
}
const trailsToggleBtn = document.getElementById('trails-toggle');
if (trailsToggleBtn) {
    trailsToggleBtn.addEventListener('click', () => {
        isWindTrailsOn = !isWindTrailsOn;
        trailsToggleBtn.innerText = `Wind Trails: ${isWindTrailsOn ? 'ON' : 'OFF'}`;
    });
}
const timeToggleBtn = document.getElementById('time-toggle');
if (timeToggleBtn) {
    timeToggleBtn.title = 'Cycle Time of Day (Sunset)';
    timeToggleBtn.addEventListener('click', () => {
        timePhase = (timePhase + 1) % 3;
        const phaseNames = ['Day', 'Sunset', 'Night'];
        timeToggleBtn.title = `Cycle Time of Day (${phaseNames[timePhase]})`;
    });
}

// ==========================================
// INITIALIZE SYSTEM MODULES
// ==========================================

// 1. Core Scene & Renderer
const {
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
    isGodMode
} = initRenderer(container, params, LOW_GFX);

// 2. Player Model Rig
const {
    playerGrp,
    playerVisuals,
    modelLightingParams,
    flightModels,
    _fmLoadAndActivate,
    updateModelVisibility
} = initPlayer(scene, worldLayout, gltfLoader, gradientMap, params);
window.playerGrp = playerGrp;

const godModelHudMarker = document.getElementById('god-model-hud-marker');
const godModelHudHeading = godModelHudMarker?.querySelector('.god-marker-heading');
const _scratchGodMarkerPos = new THREE.Vector3();
const _scratchGodMarkerForward = new THREE.Vector3();
const _scratchGodMarkerHeading = new THREE.Vector3();

// Model selector dropdown & events
const topModelSel = document.getElementById('top-model-select');
if (topModelSel) {
    topModelSel.addEventListener('change', (e) => {
        _fmLoadAndActivate(parseInt(e.target.value));
    });
}
window.addEventListener('flight-model-changed', (e) => {
    if (topModelSel) topModelSel.value = String(e.detail.index);
    const engineBtn = document.getElementById('top-engine-btn');
    const isPlane = !!e.detail.config.isPlane;
    if (engineBtn) engineBtn.style.display = isPlane ? 'inline-flex' : 'none';
    if (biplaneEngine) biplaneEngine.setActive(isPlane);
});

// 3. Lighting & Celestial Systems
const {
    ambientLight,
    dirLight,
    lensflare,
    staticSun,
    sunMesh,
    staticMoon,
    moonMesh,
    moonHalo,
    setNormalizeSun
} = initLighting(scene, params);
window.ambientLight = ambientLight;
window.dirLight = dirLight;
window.staticSun = staticSun;
window.staticMoon = staticMoon;

// 4. Procedural Sky Dome
const {
    skyUniforms,
    skyMaterial,
    skyDome,
    updateSky
} = initSky(scene, params);


// 5. Weather & Atmospheric Systems
const { fogGroup, fogPlanes, fogUniforms, fogMat } = initGroundFog(scene, params);
const {
    instMist,
    mistPool,
    fogOverlayCanvas,
    fogOverlayCtx,
    fogBlobs,
    fogBlobSprite,
    FOG_BLOB_COUNT,
    MIST_COUNT,
    MIST_EXIT_DURATION
} = initMist(scene, LOW_GFX);
const { rainSystem, rainGeoAttr, rainVelocities, RAIN_COUNT } = initRain(scene);
const { starField, starMaterial } = initStarfield(scene, LOW_GFX);

// 6. Terrain & Water
const {
    matRock,
    matBush,
    matFlower,
    matCloud,
    matWispyCloud,
    terrainMat,
    terrainGeo,
    terrain,
    treeUniforms,
    matTree,
    matTreeNear,
    updateTerrainGeometry,
    setTerrainResolution,
    getMeshHeight,
    getMeshSlope,
    getPathStrength
} = initTerrain(scene, params, TERRAIN_SIZE, gradientMap, worldLayout);
const { waterMesh, waterMat, waterUniforms } = initWater(scene, LOW_GFX);

// 7. Diorama Props, Instanced Foliage & Trails
const spawnX = worldLayout.spawnPosition ? worldLayout.spawnPosition.x : 0;
const spawnZ = worldLayout.spawnPosition ? worldLayout.spawnPosition.z : 0;
const {
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
} = initDioramaProps(scene, params, LOW_GFX, matRock, matBush, matFlower, matTree, matTreeNear, spawnX, spawnZ, gradientMap);

treeMeshes.forEach(mesh => {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
});
[instRocks, instBushes, instFlowers].forEach(mesh => {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
});

// 8. 3D Clouds Generator & Shaders
const {
    instClouds,
    instHighClouds,
    instMegaClouds,
    instLowTowerClouds,
    instLowBankClouds,
    instBillboardClouds,
    highMeshes,
    megaMeshes,
    lowTowerMeshes,
    lowBankMeshes,
    cirroMeshes,
    highCloudMat,
    megaCloudMat,
    lowTowerCloudMat,
    cirroCloudMat,
    lowBankCloudMat,
    lowBankCloudBaseScale,
    MEGA_CLOUD_COUNT,
    MEGA_VARIANTS,
    cloudAltitudeOffsets,
    highAltitudeOffsets,
    lowTowerAltitudeOffsets,
    redistributeLowClouds,
    updateLowCloudAltitude,
    setCloudSize,
    setCloudCount,
    setMaterialOpacity,
    setCloudDebugMode,
    updateCloudDebugTints,
    renderCloudDebugOverlays,
    updateClouds
} = initClouds(scene, params, LOW_GFX, spawnX, spawnZ, camera, null, matCloud, matWispyCloud);

instFlowers.receiveShadow = false;
instFlowers.castShadow = false;
scene.add(instFlowers);

// Clear dummy instances
const dummyMatrix = new THREE.Matrix4();
dummyMatrix.setPosition(0, -1000, 0);
[...treeMeshes, instRocks, instBushes, instClouds, instFlowers].forEach(mesh => {
    for (let i = 0; i < mesh.count; i++) {
        mesh.setMatrixAt(i, dummyMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
});

// 9. Trees & Octree Streaming
const { updateInstances, applyGLBPineTree } = initTreesAndOctree({
    scene,
    gltfLoader,
    params,
    LOW_GFX,
    camera,
    treeMeshes,
    treeNearMeshes,
    updateTreeLOD,
    compactTreeInstances,
    treeGreenVariations,
    tempTreeColor,
    instRocks,
    instBushes,
    instFlowers,
    flowerColors,
    ROCK_COUNT,
    BUSH_COUNT,
    FLOWER_COUNT,
    getMeshHeight,
    getPathStrength,
    getMeshSlope,
    instTree1,
    instTree2,
    instTree3,
    instTree4,
    matTree
});
window.updateTreeLOD = updateTreeLOD;

// 10. Props & Wildlife (Crystals, Capybaras)
const {
    instCrystals,
    matCrystal,
    updateCrystals,
    capybaraSpawns,
    updateCapybaras,
    updateGroundCrystalColors
} = initPropsAndWildlife(scene, gltfLoader, params, LOW_GFX, gradientMap);

// 11. Post-Processing Shaders (God Rays & Summer Filter)
const {
    GodRaysShader,
    GhibliSummerShader,
    godRaysPass,
    summerPass
} = initPostProcessingShaders(composer, params, LOW_GFX);
window.godRaysPass = godRaysPass;

// 12. Flight Controls & Camera Rig
const {
    cameraBase,
    cameraPivot,
    tickMovement,
    updateFlight,
    setFlightHeading,
    getVelocity,
    getCurrentYaw,
    isPaused
} = initFlight(scene, camera, renderer, playerGrp, playerVisuals, starField, params);

// 13. Map UI
initMapUI(params, playerGrp, worldLayout, getWorldHeight, setFlightHeading);

// 14. Settings Panels (lil-gui custom menus & cloud sliders)
initSettingsPanels({
    gui,
    params,
    cloudManager,
    envConfigs,
    timePhase,
    waterUniforms,
    modelLightingParams,
    instClouds,
    instHighClouds,
    instMegaClouds,
    instLowTowerClouds,
    instLowBankClouds,
    instBillboardClouds,
    highMeshes,
    megaMeshes,
    lowTowerMeshes,
    lowBankMeshes,
    cirroMeshes,
    setCloudSize,
    setCloudCount,
    setMaterialOpacity,
    setCloudDebugMode,
    updateCloudDebugTints,
    toggleGUI,
    skyDome,
    skyUniforms,
    godRaysPass,
    staticSun,
    setNormalizeSun,
    camera,
    godCamera,
    setGodMode,
    terrain,
    waterMesh,
    treeMeshes,
    treeNearMeshes,
    treeGreenVariations,
    instCrystals,
    setAllFogEnabled,
    instBirds,
    playerGrp,
    matCloud,
    highCloudMat,
    lowTowerCloudMat,
    megaCloudMat,
    cirroCloudMat,
    lowBankCloudMat,
    lowBankCloudBaseScale,
    MEGA_CLOUD_COUNT,
    MEGA_VARIANTS,
    cloudAltitudeOffsets,
    highAltitudeOffsets,
    lowTowerAltitudeOffsets,
    redistributeLowClouds,
    updateLowCloudAltitude,
    worldParams,
    getBiomeAt,
    updateModelVisibility,
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'h' || e.key === 'H') toggleGUI();
    if (e.key === 'g' || e.key === 'G') setGodMode(!params.godMode, playerGrp, cameraBase);
    if (e.key === 'u' || e.key === 'U') setCloudDebugMode(!params.showCloudDebug);
});

// Load default flight model (Kiki)
_fmLoadAndActivate(0);

// Pre-warm the world so terrain & foliage are instantly visible
updateTerrainGeometry(playerGrp.position.x, playerGrp.position.z);
isPrewarming = true;
for (let pre = 0; pre < 10; pre++) {
    currentFrame = pre;
    logicTimer = 1.0;
    updateInstances(playerGrp.position.x, playerGrp.position.z, 0, 1.0 / 60.0, 0);
}
isPrewarming = false;
currentFrame = 0;
logicTimer = 0;

// ==========================================
// RENDER LOOP & FRAME ANIMATION
// ==========================================

const clock = new THREE.Clock();
const _scratchBgColor = new THREE.Color();
const _scratchFogColor = new THREE.Color();
const _scratchAmbColor = new THREE.Color();
const _scratchDirColor = new THREE.Color();
const _scratchCloudColor = new THREE.Color();
const _scratchCloudTint = new THREE.Color();
const _scratchSunForward = new THREE.Vector3();
const _scratchMoonOffset = new THREE.Vector3();
const _scratchAxisY = new THREE.Vector3(0, 1, 0);
const _scratchSunWorldPos = new THREE.Vector3();
const _scratchToLight = new THREE.Vector3();
const _mistColor = new THREE.Color();
const _scratchMistWingL = new THREE.Vector3();
const _scratchMistWingR = new THREE.Vector3();
const _scratchMistNose = new THREE.Vector3();
const _scratchMistBody = new THREE.Vector3();
const _mMist = new THREE.Matrix4();
const dummy = new THREE.Object3D();
const mistDummy = new THREE.Object3D();
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let cloudImmersion = 0.0;
let cloudExitMistTimer = 0.0;
let wasInsideCloud = false;
let wasInsideCloudLastFrame = false;
let mistSpawnIndex = 0;
let lastCloudPuffAt = -Infinity;
let currentSunY = 1500;
let currentMoonY = -1500;
let currentFps = 60;
let lastRecordedCalls = 0;
let lastRecordedTris = 0;
let lastFpsTime = performance.now();
let framesThisSecond = 0;

// Wind trails data buffer
const trailsData = new Float32Array(100 * 4);
for (let i = 0; i < 100; i++) {
    trailsData[i * 4] = (Math.random() - 0.5) * 80;
    trailsData[i * 4 + 1] = (Math.random() - 0.5) * 60;
    trailsData[i * 4 + 2] = (Math.random() - 0.5) * 100;
    trailsData[i * 4 + 3] = Math.random();
}

// A small, world-space wake left behind when the model clears a cloud. It uses the
// existing mist pool so the effect stays light even when a player exits several clouds.
function spawnCloudExitPuff(time) {
    if (!params.cloudMistEffect || !params.cloudExitPuffs || !instMist || time - lastCloudPuffAt < 0.35) return;

    lastCloudPuffAt = time;
    _scratchMistNose.set(0, 0, -1).applyQuaternion(playerGrp.quaternion).normalize();
    _scratchMistWingR.set(1, 0, 0).applyQuaternion(playerGrp.quaternion).normalize();
    _scratchMistBody.copy(playerGrp.position);

    const requestedPuffCount = Math.round(params.cloudExitPuffCount ?? (LOW_GFX ? 9 : 16));
    const puffCount = prefersReducedMotion ? Math.min(7, requestedPuffCount) : requestedPuffCount;
    for (let i = 0; i < puffCount; i++) {
        const particle = mistPool[mistSpawnIndex];
        mistSpawnIndex = (mistSpawnIndex + 1) % MIST_COUNT;

        const lateral = (Math.random() - 0.5) * 2.0;
        const vertical = (Math.random() - 0.35) * 2.0;
        particle.pos.copy(_scratchMistBody)
            .addScaledVector(_scratchMistNose, -3.5 - Math.random() * 8.0)
            .addScaledVector(_scratchMistWingR, lateral * 8.0);
        particle.pos.y += vertical * 5.0;

        particle.vel.copy(_scratchMistNose).multiplyScalar(-4.0 - Math.random() * 5.0);
        particle.vel.addScaledVector(_scratchMistWingR, lateral * 3.5);
        particle.vel.y = 2.5 + Math.random() * 4.0 + vertical;
        particle.life = 0.0001;
        particle.maxLife = (0.82 + Math.random() * 0.30) * (params.cloudExitPuffLife ?? 1.0);
        particle.scale = (13.0 + Math.random() * 13.0) * (params.cloudExitPuffScale ?? 1.0);
        particle.rot = Math.random() * Math.PI * 2.0;
    }
}

function updateCloudExitPuffs(dt) {
    if (!instMist) return;
    instMist.visible = !!params.cloudMistEffect && !!params.cloudExitPuffs;
    if (!params.cloudMistEffect || !params.cloudExitPuffs) return;

    let needsMatrixUpdate = false;
    let needsColorUpdate = false;
    for (let i = 0; i < MIST_COUNT; i++) {
        const particle = mistPool[i];
        if (particle.life <= 0.0) continue;

        particle.life += dt;
        if (particle.life >= particle.maxLife) {
            particle.life = 0.0;
            mistDummy.position.set(0, -9999, 0);
            mistDummy.scale.setScalar(0.01);
            mistDummy.updateMatrix();
            instMist.setMatrixAt(i, mistDummy.matrix);
            _mistColor.setRGB(0, 0, 0);
            instMist.setColorAt(i, _mistColor);
            needsMatrixUpdate = true;
            needsColorUpdate = true;
            continue;
        }

        const progress = particle.life / particle.maxLife;
        const fade = Math.pow(1.0 - progress, 1.7);
        particle.pos.addScaledVector(particle.vel, dt);
        particle.vel.y += 0.75 * dt;
        particle.rot += dt * 0.45;

        mistDummy.position.copy(particle.pos);
        mistDummy.quaternion.copy(camera.quaternion);
        mistDummy.rotateZ(particle.rot);
        const size = particle.scale * (0.72 + progress * 1.35);
        mistDummy.scale.set(size, size, 1);
        mistDummy.updateMatrix();
        instMist.setMatrixAt(i, mistDummy.matrix);
        _mistColor.setRGB(fade, fade * 0.98, fade * 0.95);
        instMist.setColorAt(i, _mistColor);
        needsMatrixUpdate = true;
        needsColorUpdate = true;
    }
    if (needsMatrixUpdate) instMist.instanceMatrix.needsUpdate = true;
    if (needsColorUpdate && instMist.instanceColor) instMist.instanceColor.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);
    if (params.showMap) _drawWorldMap();
    let dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    waterUniforms.uTime.value = time;
    waterUniforms.uPlayerPos.value.copy(playerGrp.position);
    if (typeof treeUniforms !== 'undefined') {
        treeUniforms.uPlayerPos.value.copy(playerGrp.position);
    }

    currentFrame++;
    framesThisSecond++;
    const currentGroundY = getWorldHeight(playerGrp.position.x, playerGrp.position.z);
    const currentAlt = Math.max(0, Math.round(playerGrp.position.y - currentGroundY));

    const now = performance.now();
    if (now - lastFpsTime >= 500) {
        currentFps = Math.round((framesThisSecond * 1000) / (now - lastFpsTime));
        framesThisSecond = 0;
        lastFpsTime = now;
        const fpsEl = document.getElementById('fps-counter');
        if (fpsEl) {
            fpsEl.innerText = `${currentFps} FPS | ALT: ${currentAlt}m`;
        }
        const locEl = document.getElementById('bottom-location') || document.getElementById('biome-label');
        if (locEl) {
            const curB = getBiomeAt(playerGrp.position.x, playerGrp.position.z);
            const locName = curB && curB.name ? _mapName(curB) : '';
            locEl.innerText = locName || 'Open Sea';
        }
    }

    // 3-Stage Lighting Engine Lerp
    const target = envConfigs[timePhase];

    if (scene.background) scene.background.lerp(_scratchBgColor.set(target.bg), dt * 2);
    if (scene.fog) scene.fog.color.lerp(_scratchFogColor.set(target.skyHorizon), dt * 2);

    updateSky(dt, timePhase, dirLight, playerGrp, camera);

    // Light source colors & intensity lerp
    ambientLight.color.lerp(_scratchAmbColor.set(target.amb), dt * 2);
    ambientLight.intensity += (target.ambI - ambientLight.intensity) * dt * 2;
    dirLight.color.lerp(_scratchDirColor.set(target.dir), dt * 2);
    dirLight.intensity += (target.dirI - dirLight.intensity) * dt * 2;

    // Flight input & movement update
    const isBraking = keys.space || touchState.brake;
    const isBoosting = keys.shift || touchState.boost;
    const inputState = {
        forward: true,
        up: keys.w || touchState.y < -0.1,
        down: keys.s || touchState.y > 0.1,
        left: keys.a || touchState.x < -0.1,
        right: keys.d || touchState.x > 0.1
    };

    const flightState = updateFlight(dt, inputState, isWindOn, isBoosting, isBraking);
    const velocity = flightState.velocity;
    const currentYaw = flightState.currentYaw;

    const highAlt = playerGrp.position.y > 600;
    terrain.visible = params.showTerrain;
    waterMesh.visible = params.showWater !== false;
    dirLight.castShadow = params.shadows && !highAlt;
    if (params.showTerrain) updateTerrainGeometry(playerGrp.position.x, playerGrp.position.z);
    waterMesh.position.x = playerGrp.position.x;
    waterMesh.position.z = playerGrp.position.z;

    if (typeof window.fogGroup !== 'undefined' && window.fogGroup.visible) {
        fogUniforms.uTime.value = time;
        window.fogGroup.position.x = playerGrp.position.x;
        window.fogGroup.position.z = playerGrp.position.z;
        const currentFogMat = window.fogGroup.children[0] ? window.fogGroup.children[0].material : null;
        if (currentFogMat && currentFogMat.color) {
            const targetFogCol = scene.fog ? scene.fog.color : _scratchFogColor.set(target.skyHorizon);
            currentFogMat.color.lerp(targetFogCol, 0.01);
        }
    }

    // Celestial positioning
    const targetSunY = (params.sunAltitude !== undefined && params.sunAltitude !== null) ? params.sunAltitude : target.sunY;
    currentSunY += (targetSunY - currentSunY) * dt * 2.0;
    currentMoonY += (target.moonY - currentMoonY) * dt * 2.0;

    const azimuthRad = THREE.MathUtils.degToRad(params.sunAzimuth !== undefined ? params.sunAzimuth : 0);
    const sunDist = 20000;
    _scratchSunForward.set(
        Math.sin(azimuthRad) * sunDist,
        0,
        -Math.cos(azimuthRad) * sunDist
    );
    if (params.lockSunToPlayer !== false) {
        _scratchSunForward.applyQuaternion(playerGrp.quaternion);
    }

    staticSun.position.copy(playerGrp.position).add(_scratchSunForward);
    staticSun.position.y = (params.sunAltitude !== undefined && params.sunAltitude !== null)
        ? (playerGrp.position.y * 0.45 + params.sunAltitude)
        : (playerGrp.position.y * 0.45 + currentSunY);
    if (params.sunDiscScale && staticSun.scale.x !== params.sunDiscScale) {
        staticSun.scale.setScalar(params.sunDiscScale);
    }
    staticSun.visible = (timePhase !== 2);

    _scratchMoonOffset.copy(_scratchSunForward).applyAxisAngle(_scratchAxisY, Math.PI * 0.35);
    staticMoon.position.copy(playerGrp.position).add(_scratchMoonOffset);
    staticMoon.position.y = playerGrp.position.y * 0.45 + currentMoonY;
    staticMoon.visible = (timePhase === 2);

    const activeLightTarget = (timePhase === 2) ? staticMoon : staticSun;
    _scratchToLight.copy(activeLightTarget.position).sub(playerGrp.position).normalize();
    dirLight.position.copy(playerGrp.position).addScaledVector(_scratchToLight, 2000);
    dirLight.target.position.copy(playerGrp.position);
    dirLight.target.updateMatrixWorld();

    // Cloud uniforms & lighting lerping
    if (window.cloudShaderUniformsList) {
        window.cloudShaderUniformsList.forEach(u => {
            if (!u) return;
            if (u.uTime) u.uTime.value = time;
            if (u.uBillowSpeed) u.uBillowSpeed.value = params.cloudsBillowSpeed;
            if (u.uBillowAmount) u.uBillowAmount.value = params.cloudsBillowAmount;
            if (u.uSunDir) u.uSunDir.value.copy(_scratchToLight);
            if (u.uHorizonColor) u.uHorizonColor.value.copy(scene.fog ? scene.fog.color : _scratchFogColor.set(target.skyHorizon));
            if (u.uSunLitColor) {
                if (timePhase === 0) u.uSunLitColor.value.lerp(_scratchCloudColor.set(params.cloudsDayLitColor || '#fffdf6'), dt * 2);
                else if (timePhase === 1) u.uSunLitColor.value.lerp(_scratchCloudColor.set(0xffd5a0), dt * 2);
                else u.uSunLitColor.value.lerp(_scratchCloudColor.set(params.cloudsNightLitColor || '#9ec7eb'), dt * 2);
            }
            if (u.uSkyShadowColor) {
                if (timePhase === 0) u.uSkyShadowColor.value.lerp(_scratchCloudColor.set(params.cloudsDayShadowColor || '#9cb8db'), dt * 2);
                else if (timePhase === 1) u.uSkyShadowColor.value.lerp(_scratchCloudColor.set(0x8a7098), dt * 2);
                else u.uSkyShadowColor.value.lerp(_scratchCloudColor.set(params.cloudsNightShadowColor || '#1a3055'), dt * 2);
            }
        });
    }

    if (typeof matCloud !== 'undefined') {
        matCloud.color.lerp(_scratchCloudColor.set(target.cloudCol).multiply(_scratchCloudTint.set(params.cloudsLowColor)), dt * 2);
        if (matCloud.userData && matCloud.userData.shader && matCloud.userData.shader.uniforms.uCloudTint) {
            matCloud.userData.shader.uniforms.uCloudTint.value.set(params.cloudsLowColor);
        }
    }
    if (typeof highCloudMat !== 'undefined') {
        highCloudMat.color.lerp(_scratchCloudColor.set(target.cloudCol).multiply(_scratchCloudTint.set(params.cloudsHighColor)), dt * 2);
        if (highCloudMat.userData && highCloudMat.userData.shader && highCloudMat.userData.shader.uniforms.uCloudTint) {
            highCloudMat.userData.shader.uniforms.uCloudTint.value.set(params.cloudsHighColor);
        }
    }
    if (typeof lowTowerCloudMat !== 'undefined') {
        lowTowerCloudMat.color.lerp(_scratchCloudColor.set(target.cloudCol).multiply(_scratchCloudTint.set(params.cloudsLowTowerColor)), dt * 2);
        if (lowTowerCloudMat.userData && lowTowerCloudMat.userData.shader && lowTowerCloudMat.userData.shader.uniforms.uCloudTint) {
            lowTowerCloudMat.userData.shader.uniforms.uCloudTint.value.set(params.cloudsLowTowerColor);
        }
    }
    if (typeof megaCloudMat !== 'undefined') {
        megaCloudMat.color.lerp(_scratchCloudColor.set(target.cloudCol).multiply(_scratchCloudTint.set(params.cloudsGiantColor)), dt * 2);
        if (megaCloudMat.userData && megaCloudMat.userData.shader && megaCloudMat.userData.shader.uniforms.uCloudTint) {
            megaCloudMat.userData.shader.uniforms.uCloudTint.value.set(params.cloudsGiantColor);
        }
    }
    if (typeof matWispyCloud !== 'undefined') {
        matWispyCloud.color.lerp(_scratchCloudColor.set(target.cloudCol), dt * 2);
    }

    // Dynamic high-altitude landscape scaling
    terrainScale = 1.0 + Math.min(1.0, Math.max(0.0, (playerGrp.position.y - 300.0) / 11700.0)) * 9.0;
    waterMesh.scale.set(terrainScale, 1.0, terrainScale);

    const baseFar = (typeof params.fogFarDist === 'number') ? params.fogFarDist : 1400.0;
    const baseNear = (typeof params.fogNearDist === 'number') ? params.fogNearDist : 220.0;
    const dynamicFar = baseFar + Math.max(0, playerGrp.position.y - 300.0) * 2.2;
    const dynamicNear = baseNear + Math.max(0, playerGrp.position.y - 300.0) * 0.4;

    if (scene.fog) {
        scene.fog.far += (dynamicFar - scene.fog.far) * dt * 2.0;
        scene.fog.near += (dynamicNear - scene.fog.near) * dt * 2.0;
    }

    // Rain update
    if (isRainOn) {
        rainSystem.visible = true;
        rainSystem.position.copy(playerGrp.position);
        const rp = rainGeoAttr.attributes.position.array;
        for (let i = 0; i < RAIN_COUNT; i++) {
            rp[i * 3 + 1] -= rainVelocities[i] * dt;
            if (rp[i * 3 + 1] < -120) {
                rp[i * 3 + 0] = (Math.random() - 0.5) * 320;
                rp[i * 3 + 1] = 180 + Math.random() * 40;
                rp[i * 3 + 2] = (Math.random() - 0.5) * 320;
            }
        }
        rainGeoAttr.attributes.position.needsUpdate = true;
    } else {
        rainSystem.visible = false;
    }

    // Clouds, foliage, birds and capybaras
    if (typeof updateClouds === 'function') {
        updateClouds(playerGrp.position.x, playerGrp.position.y, playerGrp.position.z, dt, currentYaw);
    }
    updateInstances(playerGrp.position.x, playerGrp.position.z, time, dt, currentYaw);
    if (typeof updateCrystals === 'function') {
        updateCrystals(playerGrp.position, time);
    }
    if (currentFrame % 4 === 0 && typeof updateTreeLOD === 'function') updateTreeLOD(playerGrp.position.x, playerGrp.position.z);
    updateBirds(playerGrp.position.x, playerGrp.position.y, playerGrp.position.z, time, dt);
    if (typeof updateCapybaras === 'function') {
        updateCapybaras(playerGrp.position, dt, time);
    }
    if (window.fmCurrentMixer) window.fmCurrentMixer.update(dt);

    // Wind trails
    if (isWindTrailsOn && isWindOn) {
        instTrails.visible = true;
        const trailOpacity = isBoosting ? 0.22 : 0.08;
        if (instTrails.material) instTrails.material.opacity = trailOpacity;
        for (let i = 0; i < 100; i++) {
            let z = trailsData[i * 4 + 2];
            z += velocity * 3.0 * dt;
            if (z > 50) {
                z -= 100;
                trailsData[i * 4] = (Math.random() - 0.5) * 80;
                trailsData[i * 4 + 1] = (Math.random() - 0.5) * 60;
            }
            trailsData[i * 4 + 2] = z;

            dummy.position.set(trailsData[i * 4], trailsData[i * 4 + 1], z);
            dummy.position.x += Math.sin(time * 3.0 + trailsData[i * 4 + 3] * 10) * 0.5;
            dummy.position.y += Math.cos(time * 3.0 + trailsData[i * 4 + 3] * 10) * 0.5;
            dummy.scale.set(1.0, 1.0, isBoosting ? 2.5 : 1.0);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            instTrails.setMatrixAt(i, dummy.matrix);
        }
        instTrails.position.copy(playerGrp.position);
        instTrails.rotation.copy(playerGrp.rotation);
        instTrails.instanceMatrix.needsUpdate = true;
    } else {
        instTrails.visible = false;
    }

    // Cloud immersion and condensation mist
    let isInsideCloud = false;
    const px = playerGrp.position.x;
    const py = playerGrp.position.y;
    const pz = playerGrp.position.z;

    if (params.showClouds && instClouds && instClouds.visible && typeof instClouds.getMatrixAt === 'function') {
        const count = instClouds.count || (instClouds.instanceMatrix ? instClouds.instanceMatrix.count : 0);
        // Use the full puffy volume for immersion, not only a tiny sphere at each cloud's center.
        // Match immersion bounds to the nearby layer's visual coverage multiplier in clouds.js.
        const rLow = 125 * (params.cloudsLowSize || 1.0) * 2.25;
        const rLowSq = rLow * rLow;
        for (let i = 0; i < count; i++) {
            instClouds.getMatrixAt(i, _mMist);
            const cx = _mMist.elements[12], cy = _mMist.elements[13], cz = _mMist.elements[14];
            const dx = px - cx, dy = (py - cy) * 1.8, dz = pz - cz;
            if (dx * dx + dy * dy + dz * dz < rLowSq) {
                isInsideCloud = true;
                break;
            }
        }
    }

    if (!isInsideCloud && params.cloudsHigh && highMeshes && highMeshes.length > 0) {
        const rHigh = 160 * (params.cloudsHighSize || 1.0);
        const rHighSq = rHigh * rHigh;
        for (let m = 0; m < highMeshes.length; m++) {
            const hMesh = highMeshes[m];
            if (!hMesh || !hMesh.visible) continue;
            const hCount = hMesh.count || (hMesh.instanceMatrix ? hMesh.instanceMatrix.count : 0);
            for (let i = 0; i < hCount; i++) {
                hMesh.getMatrixAt(i, _mMist);
                const cx = _mMist.elements[12], cy = _mMist.elements[13], cz = _mMist.elements[14];
                const dx = px - cx, dy = (py - cy) * 1.2, dz = pz - cz;
                if (dx * dx + dy * dy + dz * dz < rHighSq) {
                    isInsideCloud = true;
                    break;
                }
            }
            if (isInsideCloud) break;
        }
    }

    const justExitedCloud = wasInsideCloudLastFrame && !isInsideCloud;
    if (justExitedCloud) spawnCloudExitPuff(time);
    wasInsideCloudLastFrame = isInsideCloud;

    if (isInsideCloud) {
        cloudImmersion = Math.min(1.0, cloudImmersion + dt * (params.cloudImmersionEnterSpeed ?? 3.5));
        wasInsideCloud = true;
        cloudExitMistTimer = params.cloudExitMistDuration ?? MIST_EXIT_DURATION;
    } else {
        cloudImmersion = Math.max(0.0, cloudImmersion - dt * (params.cloudImmersionExitSpeed ?? 1.8));
        if (wasInsideCloud) {
            cloudExitMistTimer -= dt;
            if (cloudExitMistTimer <= 0) {
                cloudExitMistTimer = 0;
                wasInsideCloud = false;
            }
        }
    }

    updateCloudExitPuffs(dt);

    const mistOverlay = document.getElementById('cloud-mist-overlay');
    if (params.cloudMistEffect) {
        const exitDuration = Math.max(0.1, params.cloudExitMistDuration ?? MIST_EXIT_DURATION);
        const immersionFog = params.cloudImmersionFog ? cloudImmersion * (params.cloudImmersionStrength ?? 0.85) : 0.0;
        const exitHaze = params.cloudExitHaze && cloudExitMistTimer > 0 ? (cloudExitMistTimer / exitDuration) * (params.cloudExitHazeStrength ?? 0.35) : 0.0;
        const fogAlpha = immersionFog + exitHaze;
        if (fogOverlayCtx && fogOverlayCanvas) {
            if (fogAlpha > 0.01) {
                fogOverlayCanvas.style.opacity = '1';
                const cw = fogOverlayCanvas.width;
                const ch = fogOverlayCanvas.height;
                fogOverlayCtx.clearRect(0, 0, cw, ch);
                for (const blob of fogBlobs) {
                    blob.x += blob.driftX * dt;
                    blob.y += blob.driftY * dt;
                    blob.phase += dt * 0.5;
                    if (blob.x < -0.35) blob.x = 1.35;
                    if (blob.x > 1.35) blob.x = -0.35;
                    if (blob.y < -0.35) blob.y = 1.35;
                    if (blob.y > 1.35) blob.y = -0.35;
                    const wobbleX = Math.sin(blob.phase) * 0.025;
                    const wobbleY = Math.cos(blob.phase * 0.7) * 0.018;
                    const bx = (blob.x + wobbleX) * cw;
                    const by = (blob.y + wobbleY) * ch;
                    const size = blob.radius * Math.max(cw, ch) * 2;
                    fogOverlayCtx.globalAlpha = Math.min(1.0, fogAlpha) * blob.opacity;
                    fogOverlayCtx.drawImage(fogBlobSprite, bx - size * 0.5, by - size * 0.5, size, size);
                }
            } else {
                fogOverlayCanvas.style.opacity = '0';
            }
        }
        if (mistOverlay) {
            const immersionVignette = params.cloudImmersionFog ? cloudImmersion * (params.cloudImmersionVignette ?? 0.55) : 0.0;
            const exitVignette = params.cloudExitHaze && cloudExitMistTimer > 0 ? (cloudExitMistTimer / exitDuration) * (params.cloudExitVignetteStrength ?? 0.22) : 0.0;
            const vignetteAlpha = immersionVignette + exitVignette;
            mistOverlay.style.opacity = Math.min(1.0, vignetteAlpha).toFixed(3);
        }
    } else {
        if (mistOverlay) mistOverlay.style.opacity = '0';
        if (fogOverlayCanvas) fogOverlayCanvas.style.opacity = '0';
    }

    // Audio & Engine update
    if (audioCtx && audioCtx.state === 'running' && windGain && windFilter) {
        if (!isWindOn || !isBoosting) {
            windGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
        } else {
            const speedFactor = Math.max(0, Math.min(1, (velocity - 15) / 30));
            const targetVolume = 0.25 + speedFactor * 0.35;
            windGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.1);
            const targetFreq = 400 + Math.sin(time) * 100 + speedFactor * 800;
            windFilter.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
        }
    }
    if (biplaneEngine) {
        biplaneEngine.update(dt, isBoosting, isBraking, isPaused(), velocity, camera.position.length());
    }

    // God Rays Screen Projection
    if (godRaysPass.enabled && staticSun) {
        _scratchSunWorldPos.copy(staticSun.position);
        _scratchSunWorldPos.project(camera);
        const sunScreenX = (_scratchSunWorldPos.x + 1.0) * 0.5;
        const sunScreenY = (_scratchSunWorldPos.y + 1.0) * 0.5;
        godRaysPass.uniforms.uSunScreenPos.value.set(sunScreenX, sunScreenY);
        const behindCamera = _scratchSunWorldPos.z > 1.0 ? 0.0 : 1.0;
        const offScreen = Math.max(Math.abs(sunScreenX - 0.5), Math.abs(sunScreenY - 0.5));
        const screenFade = 1.0 - Math.min(1.0, Math.max(0.0, (offScreen - 0.5) * 1.5));
        const twilightFade = timePhase === 2 ? 0.0 : 1.0;
        godRaysPass.uniforms.uSunVisible.value = behindCamera * screenFade * twilightFade;
    }

    // God mode spectator update
    if (isGodMode()) {
        updateGodMode(dt, playerGrp);
    }

    // God Mode uses a screen-space marker, so Kiki remains findable even behind the free camera
    // or hidden by terrain/clouds. The marker hugs the screen edge and points toward her offscreen.
    const godMarkerCamera = window.camera;
    const showGodModelMarker = isGodMode() && params.showGodModelMarker !== false && godMarkerCamera && godModelHudMarker;
    godModelHudMarker?.classList.toggle('is-visible', !!showGodModelMarker);
    if (showGodModelMarker) {
        const markerDistance = godMarkerCamera.position.distanceTo(playerGrp.position);
        _scratchGodMarkerPos.copy(playerGrp.position).project(godMarkerCamera);
        const isOnScreen = _scratchGodMarkerPos.z >= -1 && _scratchGodMarkerPos.z <= 1 && Math.abs(_scratchGodMarkerPos.x) <= 1 && Math.abs(_scratchGodMarkerPos.y) <= 1;
        const x = isOnScreen ? _scratchGodMarkerPos.x : THREE.MathUtils.clamp(_scratchGodMarkerPos.x, -0.86, 0.86);
        const y = isOnScreen ? _scratchGodMarkerPos.y : THREE.MathUtils.clamp(_scratchGodMarkerPos.y, -0.78, 0.78);
        godModelHudMarker.style.left = `${(x * 0.5 + 0.5) * 100}%`;
        godModelHudMarker.style.top = `${(-y * 0.5 + 0.5) * 100}%`;
        godModelHudMarker.classList.toggle('is-offscreen', !isOnScreen);
        if (godModelHudHeading) {
            _scratchGodMarkerForward.set(0, 0, -1).applyQuaternion(playerGrp.quaternion);
            _scratchGodMarkerHeading.copy(playerGrp.position).addScaledVector(_scratchGodMarkerForward, 80).project(godMarkerCamera);
            const headingAngle = Math.atan2(-(_scratchGodMarkerHeading.y - _scratchGodMarkerPos.y), _scratchGodMarkerHeading.x - _scratchGodMarkerPos.x) + Math.PI * 0.5;
            godModelHudHeading.style.transform = `rotate(${headingAngle}rad)`;
        }
    }

    renderer.info.reset();
    composer.render();
    if (renderer.info) {
        lastRecordedCalls = renderer.info.render.calls;
        lastRecordedTris = Math.round(renderer.info.render.triangles / 1000);
    }
    if (typeof renderCloudDebugOverlays === 'function') renderCloudDebugOverlays();
}

animate();
