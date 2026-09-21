import {
    TREE_CATEGORIES,
    ALL_TREE_MODELS,
    DEFAULT_BIOME_TREE_CONFIGS,
    getBiomeTreeConfig,
    setBiomeTreeConfig,
    saveBiomeTreeSettings,
    refreshAllTrees,
    refreshBiomeColors
} from './trees.js';
import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { LOW_GFX } from './config.js';
import { initMatcapBank } from './matcap-bank.js';
import { roystanParams, syncRoystanUniforms } from './shaders/roystanToon.js';

// ==========================================
// SETTINGS PANELS & BIOME PERSISTENCE (lil-gui)
// ==========================================

export function initSettingsPanels(context) {
    initMatcapBank();
    const {
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
        flockGrp,
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
        lowTowerAltitudeOffsets = [0],
        redistributeLowClouds,
        updateLowCloudAltitude,
        worldParams,
        currentBiome,
        getBiomeAt,
        updateModelVisibility
    } = context;
    let isModelVisible = context.isModelVisible ?? true;

        // Atmosphere Editor (Appended to lil-gui)
        if (typeof gui !== 'undefined') {
            const atmoParams = {
                skyColor: '#' + envConfigs[timePhase].bg.toString(16).padStart(6, '0'),
                skyMid: '#' + envConfigs[timePhase].skyMid.toString(16).padStart(6, '0'),
                skyHorizon: '#' + envConfigs[timePhase].skyHorizon.toString(16).padStart(6, '0'),
                horizonGlow: envConfigs[timePhase].horizonGlow,
                gradientEnabled: true,
                gradientPower: 0.7,
                gradientMidOffset: 0.08,
                ambColor: '#' + envConfigs[timePhase].amb.toString(16).padStart(6, '0'),
                dirColor: '#' + envConfigs[timePhase].dir.toString(16).padStart(6, '0'),
                ambI: envConfigs[timePhase].ambI,
                dirI: envConfigs[timePhase].dirI,
                waterColor: '#' + (envConfigs[timePhase].waterColor !== undefined ? envConfigs[timePhase].waterColor.toString(16).padStart(6, '0') : '1a4075'),
                glintCol: '#' + envConfigs[timePhase].glintCol.toString(16).padStart(6, '0')
            };
    
            function updateAtmoParamsFromPhase() {
                const cur = envConfigs[timePhase];
                atmoParams.skyColor = '#' + cur.bg.toString(16).padStart(6, '0');
                atmoParams.skyMid = '#' + cur.skyMid.toString(16).padStart(6, '0');
                atmoParams.skyHorizon = '#' + cur.skyHorizon.toString(16).padStart(6, '0');
                atmoParams.horizonGlow = cur.horizonGlow;
                atmoParams.ambColor = '#' + cur.amb.toString(16).padStart(6, '0');
                atmoParams.dirColor = '#' + cur.dir.toString(16).padStart(6, '0');
                atmoParams.ambI = cur.ambI;
                atmoParams.dirI = cur.dirI;
                if (cur.waterColor !== undefined) atmoParams.waterColor = '#' + cur.waterColor.toString(16).padStart(6, '0');
                atmoParams.glintCol = '#' + cur.glintCol.toString(16).padStart(6, '0');
                params.sunAltitude = cur.sunY;
                // Refresh GUI display without triggering onChange
                if (atmoFolder) {
                    atmoFolder.controllersRecursive().forEach(c => c.updateDisplay());
                }
                if (window.sunGodRaysFolder) {
                    window.sunGodRaysFolder.controllersRecursive().forEach(c => c.updateDisplay());
                }
            }
    
            // Listen to phase changes
            const oldTimeToggle = document.getElementById('time-toggle').onclick;
            document.getElementById('time-toggle').addEventListener('click', () => {
                setTimeout(updateAtmoParamsFromPhase, 50);
            });

            // Flight Feel & World Life Folder
            const lifeFolder = gui.addFolder('✈️ Flight Feel & Life');
            lifeFolder.add(params, 'enableFlightBob').name('Floating Bob & Sway').listen();
            lifeFolder.add(params, 'enableGlidePhysics').name('Dive & Glide Physics').listen();
            lifeFolder.add(params, 'enableVaporTrails').name('Wingtip Vapor Trails').listen();
            lifeFolder.add(params, 'enableSpeedStreaks').name('Speed Wind Streaks').listen();
            lifeFolder.add(params, 'enableSeabirds').name('Distant Seabird Flocks').listen();
            lifeFolder.add(params, 'enableDriftingPetals').name('Drifting Breeze Petals').listen();

            const atmoFolder = gui.addFolder('Sky & Light');
    
            // Sun & God Rays (moved here from Weather)
            const sunGodRaysFolder = atmoFolder.addFolder('Sun & God Rays');
            window.sunGodRaysFolder = sunGodRaysFolder;
            sunGodRaysFolder.add(params, 'sunAltitude', -8000, 15000, 50).name('Sun Height').onChange(v => {
                params.sunAltitude = v;
                if (typeof envConfigs !== 'undefined' && envConfigs[timePhase]) {
                    envConfigs[timePhase].sunY = v;
                }
            });
            sunGodRaysFolder.add(params, 'sunAzimuth', -180, 180, 1).name('Sun Angle').onChange(v => {
                params.sunAzimuth = v;
            });
            sunGodRaysFolder.add(params, 'lockSunToPlayer').name('Lock Sun to Player');
            sunGodRaysFolder.add(params, 'normalizeSun').name('Normalize Sun').listen().onChange(v => setNormalizeSun(v));
            sunGodRaysFolder.add(params, 'sunDiscScale', 0.5, 5.0, 0.1).name('Sun Disc Size').onChange(v => {
                params.sunDiscScale = v;
                if (typeof staticSun !== 'undefined' && staticSun) staticSun.scale.setScalar(v);
            });
            sunGodRaysFolder.add(params, 'godRays').name('God Rays').onChange(v => {
                godRaysPass.enabled = v;
            });
            sunGodRaysFolder.add(params, 'godRayIntensity', 0, 2.5, 0.05).name('Ray Intensity').onChange(v => {
                godRaysPass.uniforms.uIntensity.value = v;
            });
            sunGodRaysFolder.add(params, 'godRayDensity', 0.1, 1.5, 0.05).name('Ray Density').onChange(v => {
                godRaysPass.uniforms.uDensity.value = v;
            });
            sunGodRaysFolder.add(params, 'godRayDecay', 0.80, 0.995, 0.005).name('Ray Decay').onChange(v => {
                godRaysPass.uniforms.uDecay.value = v;
            });
            sunGodRaysFolder.add(params, 'godRayWeight', 0.1, 1.5, 0.05).name('Ray Weight').onChange(v => {
                godRaysPass.uniforms.uWeight.value = v;
            });
            sunGodRaysFolder.add(params, 'lumMin', 0.0, 1.0, 0.01).name('Lum Gate Min').onChange(v => {
                godRaysPass.uniforms.uLumMin.value = v;
            });
            sunGodRaysFolder.add(params, 'lumMax', 0.0, 1.0, 0.01).name('Lum Gate Max').onChange(v => {
                godRaysPass.uniforms.uLumMax.value = v;
            });
            sunGodRaysFolder.addColor(params, 'rayColorInner').name('Ray Color (Inner)').onChange(v => {
                godRaysPass.uniforms.uRayColorInner.value.set(v);
            });
            sunGodRaysFolder.addColor(params, 'rayColorOuter').name('Ray Color (Outer)').onChange(v => {
                godRaysPass.uniforms.uRayColorOuter.value.set(v);
            });
    
            // Sky & Gradients
            const gradientSkyFolder = atmoFolder.addFolder('Sky & Gradients');
            const hexOf = (v) => parseInt(v.replace('#', ''), 16);
            const applySkyPreset = (phase, zenith, mid, horizon, power, midOffset) => {
                Object.assign(envConfigs[phase], { bg: zenith, skyMid: mid, skyHorizon: horizon });
                skyUniforms.uGradientPower.value = atmoParams.gradientPower = power;
                skyUniforms.uGradientMidOffset.value = atmoParams.gradientMidOffset = midOffset;
                updateAtmoParamsFromPhase();
            };
            gradientSkyFolder.add(skyDome, 'visible').name('Gradient Sky Dome');
            gradientSkyFolder.add(atmoParams, 'gradientEnabled').name('Enable Gradient Curve').onChange(v => skyUniforms.uGradientSkyEnabled.value = v ? 1.0 : 0.0);
            gradientSkyFolder.addColor(atmoParams, 'skyColor').name('Zenith Color').onChange(v => envConfigs[timePhase].bg = hexOf(v));
            gradientSkyFolder.addColor(atmoParams, 'skyMid').name('Mid-Sky Color').onChange(v => envConfigs[timePhase].skyMid = hexOf(v));
            gradientSkyFolder.addColor(atmoParams, 'skyHorizon').name('Horizon Color (+ Fog)').onChange(v => envConfigs[timePhase].skyHorizon = hexOf(v));
            gradientSkyFolder.add(atmoParams, 'gradientPower', 0.2, 3.0, 0.05).name('Gradient Curve (Power)').onChange(v => skyUniforms.uGradientPower.value = v);
            gradientSkyFolder.add(atmoParams, 'gradientMidOffset', 0.05, 0.8, 0.01).name('Mid-Height Offset').onChange(v => skyUniforms.uGradientMidOffset.value = v);
            gradientSkyFolder.add(atmoParams, 'horizonGlow', 0.0, 1.5, 0.05).name('Horizon Band Glow').onChange(v => envConfigs[timePhase].horizonGlow = v);
            gradientSkyFolder.add({ sunset: () => applySkyPreset(1, 0x2a5090, 0xc85078, 0xffa07a, 0.7, 0.08) }, 'sunset').name('Preset: Sunset Look');
            gradientSkyFolder.add({ day: () => applySkyPreset(0, 0x4a90d9, 0x7ab4e6, 0xc8dce8, 0.7, 0.08) }, 'day').name('Preset: Day Sky Look');
    
            atmoFolder.addColor(atmoParams, 'ambColor').name('Ambient Light').onChange(v => envConfigs[timePhase].amb = parseInt(v.replace('#',''), 16));
            atmoFolder.addColor(atmoParams, 'dirColor').name('Sun Light').onChange(v => envConfigs[timePhase].dir = parseInt(v.replace('#',''), 16));
            atmoFolder.add(atmoParams, 'ambI', 0, 3).name('Amb Intensity').onChange(v => envConfigs[timePhase].ambI = v);
            atmoFolder.add(atmoParams, 'dirI', 0, 5).name('Sun Intensity').onChange(v => envConfigs[timePhase].dirI = v);
            atmoFolder.addColor(atmoParams, 'waterColor').name('Water Color').onChange(v => {
                const col = parseInt(v.replace('#',''), 16);
                envConfigs[timePhase].waterColor = col;
                if (typeof waterUniforms !== 'undefined' && waterUniforms.uWaterColor) {
                    waterUniforms.uWaterColor.value.set(col);
                }
            });
            atmoFolder.addColor(atmoParams, 'glintCol').name('Water Glint').onChange(v => envConfigs[timePhase].glintCol = parseInt(v.replace('#',''), 16));

    
            // Character Glow (merged from old top-level "Kiki Warm Side Glow")
            const glowFolder = atmoFolder.addFolder('Model Illumination');
            glowFolder.add(modelLightingParams, 'brightness', 0.2, 3.0, 0.05).name('Overall Brightness');
            glowFolder.add(modelLightingParams, 'backPower', 0.5, 6.0, 0.1).name('Back/Fill Light');
            glowFolder.add(modelLightingParams, 'bouncePower', 0.2, 4.0, 0.1).name('Ground Bounce');
            glowFolder.add(modelLightingParams, 'rimPower', 0.2, 3.5, 0.1).name('Side & Front Rim');
            glowFolder.add(modelLightingParams, 'nightBoost', 0.5, 2.5, 0.05).name('Night Clarity');

            // ==========================================
            // 🌊 CARTOON OCEAN & SHORES EDITOR
            // ==========================================
            const oceanFolder = gui.addFolder('🌊 Cartoon Ocean & Shores');
            oceanFolder.close();

            if (typeof waterUniforms !== 'undefined' && waterUniforms.waveHeight) {
                const oceanParams = {
                    deepColor: '#' + waterUniforms.waveColor.value.getHexString(),
                    shallowColor: '#' + waterUniforms.uShallowColor.value.getHexString(),
                    highlightColor: '#' + waterUniforms.waterHighlight.value.getHexString(),
                    foamColor: '#' + waterUniforms.uFoamColor.value.getHexString(),
                    waterLevel: waterUniforms.uWaterLevel ? waterUniforms.uWaterLevel.value : 2.4,
                    waterScale: (waterUniforms.waterScale && waterUniforms.waterScale.value) ? waterUniforms.waterScale.value.x : 0.035,
                    waterScaleX: (waterUniforms.waterScale && waterUniforms.waterScale.value) ? waterUniforms.waterScale.value.x : 0.035,
                    waterScaleZ: (waterUniforms.waterScale && waterUniforms.waterScale.value) ? waterUniforms.waterScale.value.y : 0.035,
                    displacementScale: (waterUniforms.waterDisplacementScale && waterUniforms.waterDisplacementScale.value) ? waterUniforms.waterDisplacementScale.value.x : 0.018,
                    specularScale: (waterUniforms.specularScale && waterUniforms.specularScale.value !== undefined) ? waterUniforms.specularScale.value : 0.032,
                    foamScale: (waterUniforms.uFoamScale && waterUniforms.uFoamScale.value !== undefined) ? waterUniforms.uFoamScale.value : 0.045,
                    resetDefaults: () => {
                        waterUniforms.waveHeight.value = 2.8;
                        waterUniforms.waveSpeed.value = 0.45;
                        waterUniforms.waveFrequency.value = 0.75;
                        waterUniforms.waveSharpness.value = 0.78;
                        waterUniforms.uShoreFoamWidth.value = 3.5;
                        waterUniforms.uShoreWaveSpeed.value = 1.1;
                        waterUniforms.uShoreWaveFreq.value = 1.2;
                        waterUniforms.uShoreSurge.value = 0.8;
                        waterUniforms.contrast.value = 22.0;
                        waterUniforms.brightness.value = 1.65;
                        waterUniforms.offset.value = 0.042;
                        waterUniforms.specularBrightness.value = 2.5;
                        waterUniforms.specularPop.value = 0.78;
                        waterUniforms.displacementHeight.value = 0.28;
                        waterUniforms.waveColor.value.set('#00aaff');
                        waterUniforms.waterColorTint.value.set('#00aaff');
                        waterUniforms.uShallowColor.value.set('#2eebe0');
                        waterUniforms.waterHighlight.value.set('#ffffff');
                        waterUniforms.uFoamColor.value.set('#ffffff');
                        waterUniforms.uWaterLevel.value = 2.4;
                        if (waterUniforms.waterScale) waterUniforms.waterScale.value.set(0.035, 0.035);
                        if (waterUniforms.waterDisplacementScale) waterUniforms.waterDisplacementScale.value.set(0.018, 0.018);
                        if (waterUniforms.specularScale) waterUniforms.specularScale.value = 0.032;
                        if (waterUniforms.uFoamScale) waterUniforms.uFoamScale.value = 0.045;
                        if (waterMesh) {
                            waterMesh.position.y = 2.4;
                            if (waterMesh.material) {
                                waterMesh.material.roughness = 0.0;
                                waterMesh.material.metalness = 0.15;
                            }
                        }
                        oceanParams.deepColor = '#00aaff';
                        oceanParams.shallowColor = '#2eebe0';
                        oceanParams.highlightColor = '#ffffff';
                        oceanParams.foamColor = '#ffffff';
                        oceanParams.waterLevel = 2.4;
                        oceanParams.waterScale = 0.035;
                        oceanParams.waterScaleX = 0.035;
                        oceanParams.waterScaleZ = 0.035;
                        oceanParams.displacementScale = 0.018;
                        oceanParams.specularScale = 0.032;
                        oceanParams.foamScale = 0.045;
                        oceanFolder.controllersRecursive().forEach(c => c.updateDisplay());
                    }
                };

                // 1. Water Shader Scales & Patterns
                const scaleSub = oceanFolder.addFolder('Shader Scales & Patterns');
                const ctrlScale = scaleSub.add(oceanParams, 'waterScale', 0.002, 0.200, 0.001).name('Water Pattern Scale').onChange(v => {
                    if (waterUniforms.waterScale) waterUniforms.waterScale.value.set(v, v);
                    oceanParams.waterScaleX = v;
                    oceanParams.waterScaleZ = v;
                    ctrlScaleX.updateDisplay();
                    ctrlScaleZ.updateDisplay();
                }).listen();
                const ctrlScaleX = scaleSub.add(oceanParams, 'waterScaleX', 0.002, 0.200, 0.001).name('Pattern Scale X').onChange(v => {
                    if (waterUniforms.waterScale) waterUniforms.waterScale.value.x = v;
                }).listen();
                const ctrlScaleZ = scaleSub.add(oceanParams, 'waterScaleZ', 0.002, 0.200, 0.001).name('Pattern Scale Z').onChange(v => {
                    if (waterUniforms.waterScale) waterUniforms.waterScale.value.y = v;
                }).listen();
                scaleSub.add(oceanParams, 'displacementScale', 0.001, 0.100, 0.001).name('Wave Ripple Scale').onChange(v => {
                    if (waterUniforms.waterDisplacementScale) waterUniforms.waterDisplacementScale.value.set(v, v);
                }).listen();
                scaleSub.add(oceanParams, 'specularScale', 0.002, 0.150, 0.001).name('Sparkle / Caustics Scale').onChange(v => {
                    if (waterUniforms.specularScale) waterUniforms.specularScale.value = v;
                }).listen();
                scaleSub.add(oceanParams, 'foamScale', 0.005, 0.200, 0.001).name('Shore Foam Pattern Scale').onChange(v => {
                    if (waterUniforms.uFoamScale) waterUniforms.uFoamScale.value = v;
                }).listen();
                scaleSub.add(waterUniforms.waveFrequency, 'value', 0.05, 2.0, 0.02).name('Wave Length / Frequency').listen();

                // Shoreline & Breaking Foam
                const shoreSub = oceanFolder.addFolder('Shoreline & Foam');
                shoreSub.add(waterUniforms.uShoreFoamWidth, 'value', 0.2, 12.0, 0.1).name('Shore Foam Width');
                shoreSub.add(waterUniforms.uShoreWaveSpeed, 'value', 0.1, 3.0, 0.05).name('Shore Wave Speed');
                shoreSub.add(waterUniforms.uShoreWaveFreq, 'value', 0.2, 3.0, 0.05).name('Shore Wave Frequency');
                shoreSub.add(waterUniforms.uShoreSurge, 'value', 0.0, 3.0, 0.05).name('Shore Wave Surge');
                shoreSub.add(oceanParams, 'foamScale', 0.005, 0.200, 0.001).name('Foam Pattern Scale').onChange(v => {
                    if (waterUniforms.uFoamScale) waterUniforms.uFoamScale.value = v;
                }).listen();
                shoreSub.addColor(oceanParams, 'foamColor').name('Shore Foam Color').onChange(v => waterUniforms.uFoamColor.value.set(v));

                // Ocean Waves & Swells
                const waveSub = oceanFolder.addFolder('Ocean Waves & Physics');
                waveSub.add(waterUniforms.waveHeight, 'value', 0.0, 6.0, 0.1).name('Wave Height');
                waveSub.add(waterUniforms.waveSpeed, 'value', 0.0, 2.0, 0.02).name('Wave Speed');
                waveSub.add(waterUniforms.waveFrequency, 'value', 0.05, 2.0, 0.02).name('Wave Frequency').listen();
                waveSub.add(waterUniforms.waveSharpness, 'value', 0.0, 2.0, 0.02).name('Wave Sharpness');

                // Colors & Depth
                const colorSub = oceanFolder.addFolder('Colors & Water Depth');
                colorSub.addColor(oceanParams, 'deepColor').name('Deep Ocean Color').onChange(v => {
                    waterUniforms.waveColor.value.set(v);
                    waterUniforms.waterColorTint.value.set(v);
                });
                colorSub.addColor(oceanParams, 'shallowColor').name('Shallow Coast Color').onChange(v => waterUniforms.uShallowColor.value.set(v));
                colorSub.addColor(oceanParams, 'highlightColor').name('Wave Crest Color').onChange(v => waterUniforms.waterHighlight.value.set(v));
                colorSub.add(waterUniforms.contrast, 'value', 1.0, 40.0, 0.5).name('Crest Contrast');
                colorSub.add(waterUniforms.brightness, 'value', 0.5, 3.5, 0.05).name('Water Brightness');
                colorSub.add(waterUniforms.offset, 'value', -0.1, 0.2, 0.005).name('Crest Foam Offset');

                // Caustic Sparkles & Reflections
                const sparkSub = oceanFolder.addFolder('Caustics & Sun Glints');
                sparkSub.add(waterUniforms.specularBrightness, 'value', 0.0, 8.0, 0.1).name('Sparkle Brightness');
                sparkSub.add(waterUniforms.specularPop, 'value', 0.1, 2.0, 0.02).name('Sparkle Threshold');
                sparkSub.add(waterUniforms.displacementHeight, 'value', 0.0, 1.0, 0.02).name('Caustic Distortion');
                sparkSub.add(oceanParams, 'specularScale', 0.002, 0.150, 0.001).name('Sparkle Scale').onChange(v => {
                    if (waterUniforms.specularScale) waterUniforms.specularScale.value = v;
                }).listen();

                // Water Height & Surface
                const levelSub = oceanFolder.addFolder('Water Height & Surface');
                levelSub.add(oceanParams, 'waterLevel', 0.0, 10.0, 0.1).name('Water Level (Y)').onChange(v => {
                    waterUniforms.uWaterLevel.value = v;
                    if (waterMesh) waterMesh.position.y = v;
                });
                if (waterMesh && waterMesh.material) {
                    levelSub.add(waterMesh.material, 'roughness', 0.0, 1.0, 0.02).name('Surface Roughness');
                    levelSub.add(waterMesh.material, 'metalness', 0.0, 1.0, 0.02).name('Surface Metalness');
                }

                oceanFolder.add(oceanParams, 'resetDefaults').name('Reset Ocean Defaults');
            }
    
            // Zelda / Roystan Toon Shading (Optional Mode)
            const toonFolder = gui.addFolder('🎨 Zelda / Roystan Toon');
            toonFolder.close();

            // Store baseline settings to revert back to when Toon Mode is turned off
            const DEFAULT_SUN_SETTINGS = {
                sunAltitude: 160,
                sunAzimuth: 0,
                lockSunToPlayer: false,
                normalizeSun: false,
                sunDiscScale: 1.8,
                godRays: true,
                godRayIntensity: 0.6,
                godRayDensity: 0.15,
                godRayDecay: 0.8,
                godRayWeight: 0.85,
                lumMin: 0.85,
                lumMax: 0.98,
                rayColorInner: '#ffea9f',
                rayColorOuter: '#ff9933',
                ambColor: '#ffffff',
                dirColor: '#f09e9e',
                ambI: 1.833,
                dirI: 4.92,
                waterColor: '#1a4075',
                glintCol: '#ffaa00'
            };
            let savedSunSettings = { ...DEFAULT_SUN_SETTINGS };

            // Target Sun & Sky settings from user screenshot
            const TOON_SUN_PRESET = {
                sunAltitude: 160,
                sunAzimuth: 0,
                lockSunToPlayer: true,
                normalizeSun: false,
                sunDiscScale: 1.3,
                godRays: true,
                godRayIntensity: 0.0,
                godRayDensity: 0.1,
                godRayDecay: 0.8,
                godRayWeight: 0.85,
                lumMin: 0.85,
                lumMax: 0.98,
                rayColorInner: '#ffea9f',
                rayColorOuter: '#ff9933',
                ambColor: '#ffffff',
                dirColor: '#f09e9e',
                ambI: 1.833,
                dirI: 4.92,
                waterColor: '#1a4075',
                glintCol: '#ffaa00'
            };

            function applySunPreset(cfg) {
                if (!cfg) return;

                if (typeof setNormalizeSun === 'function') {
                    setNormalizeSun(cfg.normalizeSun);
                } else {
                    params.normalizeSun = cfg.normalizeSun;
                }

                params.sunAltitude = cfg.sunAltitude;
                params.sunAzimuth = cfg.sunAzimuth;
                params.lockSunToPlayer = cfg.lockSunToPlayer;
                params.sunDiscScale = cfg.sunDiscScale;
                params.godRays = cfg.godRays;
                params.godRayIntensity = cfg.godRayIntensity;
                params.godRayDensity = cfg.godRayDensity;
                params.godRayDecay = cfg.godRayDecay;
                params.godRayWeight = cfg.godRayWeight;
                params.lumMin = cfg.lumMin;
                params.lumMax = cfg.lumMax;
                params.rayColorInner = cfg.rayColorInner;
                params.rayColorOuter = cfg.rayColorOuter;

                if (typeof staticSun !== 'undefined' && staticSun) {
                    staticSun.scale.setScalar(cfg.sunDiscScale);
                }

                if (typeof godRaysPass !== 'undefined' && godRaysPass) {
                    godRaysPass.enabled = cfg.godRays;
                    if (godRaysPass.uniforms) {
                        if (godRaysPass.uniforms.uIntensity) godRaysPass.uniforms.uIntensity.value = cfg.godRayIntensity;
                        if (godRaysPass.uniforms.uDensity) godRaysPass.uniforms.uDensity.value = cfg.godRayDensity;
                        if (godRaysPass.uniforms.uDecay) godRaysPass.uniforms.uDecay.value = cfg.godRayDecay;
                        if (godRaysPass.uniforms.uWeight) godRaysPass.uniforms.uWeight.value = cfg.godRayWeight;
                        if (godRaysPass.uniforms.uLumMin) godRaysPass.uniforms.uLumMin.value = cfg.lumMin;
                        if (godRaysPass.uniforms.uLumMax) godRaysPass.uniforms.uLumMax.value = cfg.lumMax;
                        if (godRaysPass.uniforms.uRayColorInner) godRaysPass.uniforms.uRayColorInner.value.set(cfg.rayColorInner);
                        if (godRaysPass.uniforms.uRayColorOuter) godRaysPass.uniforms.uRayColorOuter.value.set(cfg.rayColorOuter);
                    }
                }

                atmoParams.ambColor = cfg.ambColor;
                atmoParams.dirColor = cfg.dirColor;
                atmoParams.ambI = cfg.ambI;
                atmoParams.dirI = cfg.dirI;
                atmoParams.waterColor = cfg.waterColor;
                atmoParams.glintCol = cfg.glintCol;

                if (typeof envConfigs !== 'undefined' && envConfigs[timePhase]) {
                    envConfigs[timePhase].sunY = cfg.sunAltitude;
                    envConfigs[timePhase].amb = parseInt(cfg.ambColor.replace('#', ''), 16);
                    envConfigs[timePhase].dir = parseInt(cfg.dirColor.replace('#', ''), 16);
                    envConfigs[timePhase].ambI = cfg.ambI;
                    envConfigs[timePhase].dirI = cfg.dirI;
                    const wCol = parseInt(cfg.waterColor.replace('#', ''), 16);
                    envConfigs[timePhase].waterColor = wCol;
                    envConfigs[timePhase].glintCol = parseInt(cfg.glintCol.replace('#', ''), 16);
                    if (typeof waterUniforms !== 'undefined' && waterUniforms.uWaterColor) {
                        waterUniforms.uWaterColor.value.set(wCol);
                    }
                }

                // Refresh GUI controllers to reflect updated values
                if (atmoFolder) {
                    atmoFolder.controllersRecursive().forEach(c => c.updateDisplay());
                }
                if (window.sunGodRaysFolder) {
                    window.sunGodRaysFolder.controllersRecursive().forEach(c => c.updateDisplay());
                }
            }

            toonFolder.add(roystanParams, 'enabled').name('Enable Toon Mode').onChange(v => {
                syncRoystanUniforms();
                if (v) {
                    // Save baseline settings before applying Toon Sun preset
                    savedSunSettings = {
                        sunAltitude: params.sunAltitude,
                        sunAzimuth: params.sunAzimuth,
                        lockSunToPlayer: params.lockSunToPlayer,
                        normalizeSun: params.normalizeSun,
                        sunDiscScale: params.sunDiscScale,
                        godRays: params.godRays,
                        godRayIntensity: params.godRayIntensity,
                        godRayDensity: params.godRayDensity,
                        godRayDecay: params.godRayDecay,
                        godRayWeight: params.godRayWeight,
                        lumMin: params.lumMin,
                        lumMax: params.lumMax,
                        rayColorInner: params.rayColorInner,
                        rayColorOuter: params.rayColorOuter,
                        ambColor: atmoParams.ambColor,
                        dirColor: atmoParams.dirColor,
                        ambI: atmoParams.ambI,
                        dirI: atmoParams.dirI,
                        waterColor: atmoParams.waterColor,
                        glintCol: atmoParams.glintCol
                    };
                    applySunPreset(TOON_SUN_PRESET);
                } else {
                    // Revert to saved defaults when Toon Mode is turned off
                    applySunPreset(savedSunSettings || DEFAULT_SUN_SETTINGS);
                }
            });

            const rimSub = toonFolder.addFolder('Sunlit Rim Glow');
            rimSub.add(roystanParams, 'rimEnabled').name('Rim Enabled').onChange(() => syncRoystanUniforms());
            rimSub.addColor(roystanParams, 'rimColor').name('Rim Color').onChange(() => syncRoystanUniforms());
            rimSub.add(roystanParams, 'rimIntensity', 0.1, 4.0, 0.05).name('Rim Brightness').onChange(() => syncRoystanUniforms());
            rimSub.add(roystanParams, 'rimAmount', 0.1, 0.95, 0.01).name('Rim Width').onChange(() => syncRoystanUniforms());
            rimSub.add(roystanParams, 'rimThreshold', 0.0, 1.0, 0.05).name('Sun Facing Mask').onChange(() => syncRoystanUniforms());

            const specSub = toonFolder.addFolder('Cartoon Specular (Shine)');
            specSub.add(roystanParams, 'specularEnabled').name('Specular Enabled').onChange(() => syncRoystanUniforms());
            specSub.addColor(roystanParams, 'specularColor').name('Shine Color').onChange(() => syncRoystanUniforms());
            specSub.add(roystanParams, 'specularSize', 0.01, 0.25, 0.005).name('Shine Size').onChange(() => syncRoystanUniforms());
            specSub.add(roystanParams, 'specularSmoothness', 0.001, 0.05, 0.002).name('Border Softness').onChange(() => syncRoystanUniforms());
            specSub.add(roystanParams, 'shininess', 4.0, 128.0, 2.0).name('Glossiness').onChange(() => syncRoystanUniforms());

            // Night
            const moonParams = {
                moonlightColor: '#' + envConfigs[2].dir.toString(16).padStart(6, '0'),
                moonlightIntensity: envConfigs[2].dirI,
                nightAmbColor: '#' + envConfigs[2].amb.toString(16).padStart(6, '0'),
                nightAmbIntensity: envConfigs[2].ambI,
                nightSkyColor: '#' + envConfigs[2].bg.toString(16).padStart(6, '0'),
                nightFogColor: '#' + envConfigs[2].skyHorizon.toString(16).padStart(6, '0'),
                moonAltitude: envConfigs[2].moonY
            };
    
            const moonFolder = gui.addFolder('Night');
            moonFolder.addColor(moonParams, 'moonlightColor').name('Moonlight Color').onChange(v => envConfigs[2].dir = parseInt(v.replace('#',''), 16));
            moonFolder.add(moonParams, 'moonlightIntensity', 0, 10, 0.1).name('Moonlight Power').onChange(v => envConfigs[2].dirI = v);
            moonFolder.addColor(moonParams, 'nightAmbColor').name('Night Fill Color').onChange(v => envConfigs[2].amb = parseInt(v.replace('#',''), 16));
            moonFolder.add(moonParams, 'nightAmbIntensity', 0, 5, 0.1).name('Night Fill Power').onChange(v => envConfigs[2].ambI = v);
            moonFolder.addColor(moonParams, 'nightSkyColor').name('Night Sky Color').onChange(v => envConfigs[2].bg = parseInt(v.replace('#',''), 16));
            moonFolder.addColor(moonParams, 'nightFogColor').name('Night Fog + Horizon').onChange(v => envConfigs[2].skyHorizon = parseInt(v.replace('#',''), 16));
            moonFolder.add(moonParams, 'moonAltitude', 200, 4000, 50).name('Moon Altitude').onChange(v => envConfigs[2].moonY = v);
    
            // =========================================================================
            // UNIFIED CLOUDS SECTION (All Low & Distant Cloud Options Combined)
            // =========================================================================
            let lastCloudDistance = params.cloudsLowDistance;
            function updateLowCloudDistance(newDist) {
                if (!lastCloudDistance || lastCloudDistance === newDist) {
                    lastCloudDistance = newDist;
                    return;
                }
                const previousDistance = lastCloudDistance;
                lastCloudDistance = newDist;
                const px = typeof playerGrp !== 'undefined' ? playerGrp.position.x : 0;
                const pz = typeof playerGrp !== 'undefined' ? playerGrp.position.z : 0;
                if (typeof redistributeLowClouds === 'function') {
                    redistributeLowClouds(px, pz, previousDistance, newDist);
                }
            }
    
            function enforceCloudMinDistance(minDist) {
                if (!instClouds || typeof playerGrp === 'undefined') return;
                const px = playerGrp.position.x;
                const pz = playerGrp.position.z;
                const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
                const totalCloudSlots = (instClouds.instanceMatrix ? instClouds.instanceMatrix.count : instClouds.count);
                let updated = false;
                for (let i = 0; i < totalCloudSlots; i++) {
                    instClouds.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    if (p.y > -4000) {
                        const dx = p.x - px;
                        const dz = p.z - pz;
                        const dist = Math.hypot(dx, dz);
                        if (dist < minDist) {
                            const pushFactor = (minDist * 1.25) / Math.max(dist, 1);
                            p.x = px + dx * pushFactor;
                            p.z = pz + dz * pushFactor;
                            m.compose(p, q, sc);
                            instClouds.setMatrixAt(i, m);
                            updated = true;
                        }
                    }
                }
                if (updated) instClouds.instanceMatrix.needsUpdate = true;
            }
    
            let lastHighCloudDistance = params.cloudsHighDistance || 3600;
            function updateHighCloudDistance(newDist) {
                if (!lastHighCloudDistance || lastHighCloudDistance === newDist) {
                    lastHighCloudDistance = newDist;
                    return;
                }
                const ratio = newDist / lastHighCloudDistance;
                lastHighCloudDistance = newDist;
                const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
                const px = typeof playerGrp !== 'undefined' ? playerGrp.position.x : 0;
                const pz = typeof playerGrp !== 'undefined' ? playerGrp.position.z : 0;
                const totalSlots = (instHighClouds.instanceMatrix ? instHighClouds.instanceMatrix.count : instHighClouds.count);
                for (let i = 0; i < totalSlots; i++) {
                    instHighClouds.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    p.x = px + (p.x - px) * ratio;
                    p.z = pz + (p.z - pz) * ratio;
                    m.compose(p, q, sc);
                    instHighClouds.setMatrixAt(i, m);
                }
                instHighClouds.instanceMatrix.needsUpdate = true;
            }
    
            let lastGiantCloudDistance = params.cloudsGiantDistance || 4200;
            function updateGiantCloudDistance(newDist) {
                if (!lastGiantCloudDistance || lastGiantCloudDistance === newDist) {
                    lastGiantCloudDistance = newDist;
                    return;
                }
                const ratio = newDist / lastGiantCloudDistance;
                lastGiantCloudDistance = newDist;
                const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
                megaMeshes.forEach(mesh => {
                    const totalSlots = (mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count);
                    for (let i = 0; i < totalSlots; i++) {
                        mesh.getMatrixAt(i, m);
                        m.decompose(p, q, sc);
                        p.x = p.x * ratio;
                        p.z = p.z * ratio;
                        m.compose(p, q, sc);
                        mesh.setMatrixAt(i, m);
                    }
                    mesh.instanceMatrix.needsUpdate = true;
                });
            }
    
            let lastLowTowerCloudDistance = params.cloudsLowTowerDistance || 2200;
            function updateLowTowerCloudDistance(newDist) {
                if (!lastLowTowerCloudDistance || lastLowTowerCloudDistance === newDist) {
                    lastLowTowerCloudDistance = newDist;
                    return;
                }
                const ratio = newDist / lastLowTowerCloudDistance;
                lastLowTowerCloudDistance = newDist;
                const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
                const px = typeof playerGrp !== 'undefined' ? playerGrp.position.x : 0;
                const pz = typeof playerGrp !== 'undefined' ? playerGrp.position.z : 0;
                const totalSlots = (instLowTowerClouds.instanceMatrix ? instLowTowerClouds.instanceMatrix.count : instLowTowerClouds.count);
                for (let i = 0; i < totalSlots; i++) {
                    instLowTowerClouds.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    p.x = px + (p.x - px) * ratio;
                    p.z = pz + (p.z - pz) * ratio;
                    m.compose(p, q, sc);
                    instLowTowerClouds.setMatrixAt(i, m);
                }
                instLowTowerClouds.instanceMatrix.needsUpdate = true;
            }
    
            function updateLowBankCloudDensity(density) {
                params.cloudsLowBankDensity = density;
                const dummy = new THREE.Object3D();
                const baseDist = params.cloudsLowBankDistance || 3400;
                const baseSize = params.cloudsLowBankSize || 1.0;
                const baseAlt = params.cloudsLowBankAltitude !== undefined ? params.cloudsLowBankAltitude : -20;
                const widthBoost = Math.min(2.2, Math.max(0.6, 0.75 + density * 0.35));
    
                for (let i = 0; i < MEGA_CLOUD_COUNT; i++) {
                    const variantIdx = i % MEGA_VARIANTS;
                    const slotInVariant = Math.floor(i / MEGA_VARIANTS);
                    const ang = (i * 2.399963 / Math.max(0.2, density) + 2.4) + (Math.sin(i * 1.7) * 0.1);
                    const depthLayer = (i % 2 === 0) ? (baseDist - 250) : (baseDist + 250);
                    const altOffset = cloudAltitudeOffsets[i % cloudAltitudeOffsets.length] || 0;
    
                    dummy.position.set(Math.cos(ang) * depthLayer, baseAlt + altOffset, Math.sin(ang) * depthLayer);
                    const tangentAng = ang + Math.PI * 0.5 + (Math.cos(i * 2.1) * 0.2);
                    dummy.rotation.set(0, tangentAng + (i % 2 === 0 ? 0 : Math.PI), 0);
    
                    const s = 0.95 + (i % 3) * 0.1;
                    const sx = s * 1.15 * (0.88 + (i % 4) * 0.09) * widthBoost;
                    const sy = s * (0.90 + ((i + 1) % 4) * 0.08);
                    const sz = s * (0.92 + ((i + 2) % 3) * 0.08) * widthBoost;
    
                    lowBankCloudBaseScale[variantIdx][slotInVariant * 3 + 0] = sx;
                    lowBankCloudBaseScale[variantIdx][slotInVariant * 3 + 1] = sy;
                    lowBankCloudBaseScale[variantIdx][slotInVariant * 3 + 2] = sz;
    
                    dummy.scale.set(sx, sy, sz).multiplyScalar(baseSize);
                    dummy.updateMatrix();
                    lowBankMeshes[variantIdx].setMatrixAt(slotInVariant, dummy.matrix);
                }
                lowBankMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
            }
    
            let lastLowBankCloudDistance = params.cloudsLowBankDistance || 3400;
            function updateLowBankCloudDistance(newDist) {
                if (!lastLowBankCloudDistance || lastLowBankCloudDistance === newDist) {
                    lastLowBankCloudDistance = newDist;
                    return;
                }
                const ratio = newDist / lastLowBankCloudDistance;
                lastLowBankCloudDistance = newDist;
                const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
                lowBankMeshes.forEach(mesh => {
                    const totalSlots = (mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count);
                    for (let i = 0; i < totalSlots; i++) {
                        mesh.getMatrixAt(i, m);
                        m.decompose(p, q, sc);
                        p.x = p.x * ratio;
                        p.z = p.z * ratio;
                        m.compose(p, q, sc);
                        mesh.setMatrixAt(i, m);
                    }
                    mesh.instanceMatrix.needsUpdate = true;
                });
            }
    
            const cloudFolder = gui.addFolder('Clouds');
            const lowBankModelActive = { 'Shelf': true, 'Fortress': true, 'Asymmetric': true, 'Undulating': true };
            const cirroModelActive = { 'Cirro Shelf': true, 'Cirro Cluster': true, 'High Horizon Shelf': true };
    
            function updateAllCloudVisibility() {
                const master = params.showClouds !== false;
                if (typeof instClouds !== 'undefined') instClouds.visible = master && !!params.cloudsLow;
                if (typeof instHighClouds !== 'undefined') instHighClouds.visible = master && !!params.cloudsHigh;
                if (typeof instLowTowerClouds !== 'undefined') instLowTowerClouds.visible = master && !!params.cloudsLowTower;
                if (typeof instMegaClouds !== 'undefined') {
                    instMegaClouds.visible = master && !!params.cloudsGiant;
                    if (typeof megaMeshes !== 'undefined') megaMeshes.forEach(m => { m.visible = instMegaClouds.visible; });
                }
                if (typeof instLowBankClouds !== 'undefined') {
                    instLowBankClouds.visible = master && !!params.cloudsLowBank;
                    if (typeof lowBankMeshes !== 'undefined') {
                        const lowBankNames = ['Shelf', 'Fortress', 'Asymmetric', 'Undulating'];
                        lowBankMeshes.forEach((m, idx) => {
                            m.visible = instLowBankClouds.visible && (lowBankModelActive[lowBankNames[idx]] !== false);
                        });
                    }
                }
                if (typeof instBillboardClouds !== 'undefined') {
                    instBillboardClouds.visible = master && !!params.cloudsBillboard;
                    if (typeof cirroMeshes !== 'undefined') {
                        const cirroNames = ['Cirro Shelf', 'Cirro Cluster', 'High Horizon Shelf'];
                        cirroMeshes.forEach((m, idx) => {
                            m.visible = instBillboardClouds.visible && (cirroModelActive[cirroNames[idx]] !== false);
                        });
                    }
                }
            }
            window.updateAllCloudVisibility = updateAllCloudVisibility;
    
            // Top-Level Instant Cloud Toggles
            cloudFolder.add(params, 'showClouds').name('All Clouds (Master)').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'showCloudDebug').name('Debug: Show Cloud Types (U)').listen().onChange(v => setCloudDebugMode(v));
            cloudFolder.add(params, 'cloudDebugTargetMode', { 'Every Visible Cloud': 'visible', 'Single Cloud (Aim Only)': 'single', 'Nearest 3 Visible': 'nearest3' }).name('Debug Targeting Mode').listen();
            cloudFolder.add(params, 'debugCloudTint').name('Debug: Color Tint Clouds').listen().onChange(() => updateCloudDebugTints());
            cloudFolder.add(params, 'cloudsLow').name('1. Low Clouds (Nearby)').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsHigh').name('2. Distant Cumulus Towers').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsLowTower').name('3. Low Horizon Towers').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsGiant').name('4. Distant Horizon Banks').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsLowBank').name('5. Low Horizon Banks').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsBillboard').name('6. Distant High Clouds').onChange(updateAllCloudVisibility).listen();
            cloudFolder.add(params, 'cloudsMinDistance', 0, 3000, 25).name('Minimum Camera Clearance').onChange(v => enforceCloudMinDistance(v)).listen();
            cloudFolder.add(params, 'cloudTerrainClearance', 0, 1500, 10).name('Mountain Clearance').onChange(() => {
                if (typeof updateLowCloudAltitude === 'function') updateLowCloudAltitude(params.cloudsLowAltitude);
            }).listen();
            updateAllCloudVisibility();
    
            // 0. Sky Dome Procedural Clouds
            const domeCloudsFolder = cloudFolder.addFolder('Sky Dome Clouds (Procedural)');
            domeCloudsFolder.add(params, 'domeClouds').name('Enable Dome Clouds').onChange(v => {
                skyUniforms.uEnableProceduralClouds.value = v ? 1.0 : 0.0;
            });
            domeCloudsFolder.add(params, 'domeCloudCoverage', 0.1, 0.9, 0.02).name('Coverage').onChange(v => {
                skyUniforms.uCloudCoverage.value = v;
            });
            domeCloudsFolder.add(params, 'domeCloudEdge', 0.01, 0.25, 0.01).name('Soft Edge').onChange(v => {
                skyUniforms.uCloudEdge.value = v;
            });
            domeCloudsFolder.add(params, 'domeCloudSpeed', 0.001, 0.08, 0.002).name('Drift Speed').onChange(v => {
                skyUniforms.uCloudSpeed.value = v;
            });
            domeCloudsFolder.add(params, 'domeCloudOpacity', 0.1, 1.0, 0.05).name('Dome Cloud Opacity').onChange(v => {
                skyUniforms.uCloudOpacity.value = v;
            });
    
            // 1. Low Nearby Clouds
            // 1. Low Nearby Clouds
        const lowFolder = cloudFolder.addFolder('Low Clouds (Nearby)');
        lowFolder.add(params, 'cloudsLow').name('Show Low Clouds').onChange(updateAllCloudVisibility).listen();
        lowFolder.add(params, 'cloudsLowCount', 0, 250, 1).name('How Many').onChange(v => setCloudCount(instClouds, v));
        lowFolder.add(params, 'cloudsLowSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instClouds, v));
        lowFolder.add(params, 'cloudsLowAltitude', -300, 2000, 5).name('Height (from Ground)').onChange(v => {
            if (typeof updateLowCloudAltitude === 'function') updateLowCloudAltitude(v);
        }).listen();
        lowFolder.add(params, 'cloudsLowDistance', 100, 4000, 25).name('Distance from Camera').onChange(v => {
            updateLowCloudDistance(v);
        }).listen();
        lowFolder.add(params, 'cloudsMinDistance', 0, 3000, 25).name('Min Camera Clearance').onChange(v => enforceCloudMinDistance(v)).listen();
        lowFolder.add(params, 'cloudsLowOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(matCloud, v);
        });
        lowFolder.add(params, 'cloudsLowBottomBlur', 0.0, 0.9, 0.01).name('Bottom Blur / Feather').onChange(v => {
            if (matCloud.userData && matCloud.userData.shader && matCloud.userData.shader.uniforms.uBottomBlur) {
                matCloud.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        lowFolder.addColor(params, 'cloudsLowColor').name('Color Tint');

        // 2. Distant Cumulus Towers
        const highFolder = cloudFolder.addFolder('Distant Cumulus Towers');
        highFolder.add(params, 'cloudsHigh').name('Show Towers').onChange(updateAllCloudVisibility).listen();
        highFolder.add(params, 'cloudsHighCount', 0, 28, 1).name('How Many').onChange(v => setCloudCount(instHighClouds, v));
        highFolder.add(params, 'cloudsHighSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instHighClouds, v));
        highFolder.add(params, 'cloudsHighAltitude', -500, 500, 2).name('Altitude / Height').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            const totalSlots = instHighClouds.instanceMatrix ? instHighClouds.instanceMatrix.count : instHighClouds.count;
            for (let i = 0; i < totalSlots; i++) {
                instHighClouds.getMatrixAt(i, m);
                m.decompose(p, q, sc);
                p.y = v + (highAltitudeOffsets[i % highAltitudeOffsets.length] || 0);
                m.compose(p, q, sc);
                instHighClouds.setMatrixAt(i, m);
            }
            instHighClouds.instanceMatrix.needsUpdate = true;
        });
        highFolder.add(params, 'cloudsHighDistance', 800, 8000, 25).name('Distance from Camera').onChange(v => {
            updateHighCloudDistance(v);
        }).listen();
        highFolder.add(params, 'cloudsHighOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(highCloudMat, v);
        });
        highFolder.add(params, 'cloudsHighBottomBlur', 0.05, 0.8, 0.02).name('Bottom Blur / Feather').onChange(v => {
            if (highCloudMat.userData && highCloudMat.userData.shader && highCloudMat.userData.shader.uniforms.uBottomBlur) {
                highCloudMat.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        highFolder.addColor(params, 'cloudsHighColor').name('Color Tint');

        // 2b. Low Horizon Towers
        const lowTowerFolder = cloudFolder.addFolder('Low Horizon Towers');
        lowTowerFolder.add(params, 'cloudsLowTower').name('Show Towers').onChange(updateAllCloudVisibility).listen();
        lowTowerFolder.add(params, 'cloudsLowTowerCount', 0, 28, 1).name('How Many').onChange(v => setCloudCount(instLowTowerClouds, v));
        lowTowerFolder.add(params, 'cloudsLowTowerSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instLowTowerClouds, v));
        lowTowerFolder.add(params, 'cloudsLowTowerAltitude', -500, 500, 2).name('Altitude / Height').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            const totalSlots = instLowTowerClouds.instanceMatrix ? instLowTowerClouds.instanceMatrix.count : instLowTowerClouds.count;
            for (let i = 0; i < totalSlots; i++) {
                instLowTowerClouds.getMatrixAt(i, m);
                m.decompose(p, q, sc);
                p.y = v + (lowTowerAltitudeOffsets[i % lowTowerAltitudeOffsets.length] || 0);
                m.compose(p, q, sc);
                instLowTowerClouds.setMatrixAt(i, m);
            }
            instLowTowerClouds.instanceMatrix.needsUpdate = true;
        });
        lowTowerFolder.add(params, 'cloudsLowTowerDistance', 800, 8000, 25).name('Distance from Camera').onChange(v => {
            updateLowTowerCloudDistance(v);
        }).listen();
        lowTowerFolder.add(params, 'cloudsLowTowerOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(lowTowerCloudMat, v);
        });
        lowTowerFolder.add(params, 'cloudsLowTowerBottomBlur', 0.05, 0.8, 0.02).name('Bottom Blur / Feather').onChange(v => {
            if (lowTowerCloudMat.userData && lowTowerCloudMat.userData.shader && lowTowerCloudMat.userData.shader.uniforms.uBottomBlur) {
                lowTowerCloudMat.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        lowTowerFolder.addColor(params, 'cloudsLowTowerColor').name('Color Tint');

        // 3. Distant Horizon Banks
        const giantFolder = cloudFolder.addFolder('Distant Horizon Banks');
        giantFolder.add(params, 'cloudsGiant').name('Show Horizon Banks').onChange(updateAllCloudVisibility).listen();
        giantFolder.add(params, 'cloudsGiantCount', 0, 28, 1).name('How Many').onChange(v => setCloudCount(instMegaClouds, v));
        giantFolder.add(params, 'cloudsGiantSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instMegaClouds, v));
        giantFolder.add(params, 'cloudsGiantAltitude', -500, 500, 2).name('Altitude / Height').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            megaMeshes.forEach((mesh, vIdx) => {
                const totalSlots = mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count;
                for (let i = 0; i < totalSlots; i++) {
                    mesh.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    const cloudIdx = vIdx * totalSlots + i;
                    p.y = v + (cloudAltitudeOffsets[cloudIdx] || 0);
                    m.compose(p, q, sc);
                    mesh.setMatrixAt(i, m);
                }
                mesh.instanceMatrix.needsUpdate = true;
            });
        });
        giantFolder.add(params, 'cloudsGiantDistance', 1000, 10000, 25).name('Distance from Camera').onChange(v => {
            updateGiantCloudDistance(v);
        }).listen();
        giantFolder.add(params, 'cloudsGiantOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(megaCloudMat, v);
        });
        giantFolder.add(params, 'cloudsGiantBottomBlur', 0.05, 0.8, 0.02).name('Bottom Blur / Feather').onChange(v => {
            if (megaCloudMat.userData && megaCloudMat.userData.shader && megaCloudMat.userData.shader.uniforms.uBottomBlur) {
                megaCloudMat.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        giantFolder.addColor(params, 'cloudsGiantColor').name('Color Tint');

        // 3b. Low Horizon Banks
        const lowBankFolder = cloudFolder.addFolder('Low Horizon Banks');
        lowBankFolder.add(params, 'cloudsLowBank').name('Show Low Horizon Banks').onChange(updateAllCloudVisibility).listen();
        lowBankFolder.add(params, 'cloudsLowBankCount', 0, 48, 1).name('How Many').onChange(v => setCloudCount(instLowBankClouds, v));
        lowBankFolder.add(params, 'cloudsLowBankDensity', 0.2, 3.0, 0.05).name('Density').onChange(v => updateLowBankCloudDensity(v)).listen();
        lowBankFolder.add(params, 'cloudsLowBankSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instLowBankClouds, v));
        lowBankFolder.add(params, 'cloudsLowBankAltitude', -500, 500, 2).name('Altitude / Height').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            lowBankMeshes.forEach((mesh, vIdx) => {
                const totalSlots = mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count;
                for (let i = 0; i < totalSlots; i++) {
                    mesh.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    const cloudIdx = vIdx * totalSlots + i;
                    p.y = v + (cloudAltitudeOffsets[cloudIdx] || 0);
                    m.compose(p, q, sc);
                    mesh.setMatrixAt(i, m);
                }
                mesh.instanceMatrix.needsUpdate = true;
            });
        });
        lowBankFolder.add(params, 'cloudsLowBankDistance', 1000, 10000, 25).name('Distance from Camera').onChange(v => {
            updateLowBankCloudDistance(v);
        }).listen();
        lowBankFolder.add(params, 'cloudsLowBankOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(lowBankCloudMat, v);
        });
        lowBankFolder.add(params, 'cloudsLowBankBottomBlur', 0.05, 0.8, 0.02).name('Bottom Blur / Feather').onChange(v => {
            if (lowBankCloudMat.userData && lowBankCloudMat.userData.shader && lowBankCloudMat.userData.shader.uniforms.uBottomBlur) {
                lowBankCloudMat.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        lowBankFolder.addColor(params, 'cloudsLowBankColor').name('Color Tint');

        const lowBankModelsFolder = lowBankFolder.addFolder('Models / Archetypes');
        ['Shelf', 'Fortress', 'Asymmetric', 'Undulating'].forEach(name => {
            lowBankModelsFolder.add(lowBankModelActive, name).name(name).onChange(updateAllCloudVisibility);
        });

        // 3c. Distant High Clouds (3D Procedural Meshes)
        const billboardFolder = cloudFolder.addFolder('Distant High Clouds');
        billboardFolder.add(params, 'cloudsBillboard').name('Show Distant High Clouds').onChange(updateAllCloudVisibility).listen();
        billboardFolder.add(params, 'cloudsBillboardCount', 0, 36, 1).name('How Many').onChange(v => setCloudCount(instBillboardClouds, v));
        billboardFolder.add(params, 'cloudsBillboardSize', 0.2, 3, 0.05).name('Scale / Size').onChange(v => setCloudSize(instBillboardClouds, v));
        billboardFolder.add(params, 'cloudsBillboardAltitude', 400, 3000, 25).name('Altitude / Height').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            cirroMeshes.forEach((mesh, vIdx) => {
                const totalSlots = mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count;
                for (let i = 0; i < totalSlots; i++) {
                    mesh.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    const cloudIdx = vIdx * totalSlots + i;
                    p.y = v + ((cloudIdx % 5 - 2) * 80);
                    m.compose(p, q, sc);
                    mesh.setMatrixAt(i, m);
                }
                mesh.instanceMatrix.needsUpdate = true;
            });
        });
        billboardFolder.add(params, 'cloudsBillboardDistance', 2000, 9000, 50).name('Distance from Camera').onChange(v => {
            const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
            cirroMeshes.forEach(mesh => {
                const totalSlots = mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count;
                for (let i = 0; i < totalSlots; i++) {
                    mesh.getMatrixAt(i, m);
                    m.decompose(p, q, sc);
                    const hDist = Math.sqrt(p.x * p.x + p.z * p.z) || 1.0;
                    const angle = Math.atan2(p.z, p.x);
                    const mult = hDist / (params.cloudsBillboardDistance || 5200);
                    p.x = Math.cos(angle) * v * mult;
                    p.z = Math.sin(angle) * v * mult;
                    m.compose(p, q, sc);
                    mesh.setMatrixAt(i, m);
                }
                mesh.instanceMatrix.needsUpdate = true;
            });
        });
        billboardFolder.add(params, 'cloudsBillboardOpacity', 0.1, 1.0, 0.02).name('Opacity').onChange(v => {
            setMaterialOpacity(cirroCloudMat, v);
        });
        billboardFolder.add(params, 'cloudsBillboardBottomBlur', 0.05, 0.8, 0.02).name('Bottom Blur / Feather').onChange(v => {
            if (cirroCloudMat.userData && cirroCloudMat.userData.shader && cirroCloudMat.userData.shader.uniforms.uBottomBlur) {
                cirroCloudMat.userData.shader.uniforms.uBottomBlur.value = v;
            }
        });
        billboardFolder.addColor(params, 'cloudsBillboardColor').name('Color Tint').onChange(v => {
            cirroCloudMat.color.set(v);
        });

        const cirroModelsFolder = billboardFolder.addFolder('Models / Archetypes');
        ['Cirro Shelf', 'Cirro Cluster', 'High Horizon Shelf'].forEach(name => {
            cirroModelsFolder.add(cirroModelActive, name).name(name).onChange(updateAllCloudVisibility);
        });

            // 4. Lighting & Ghibli Shading Colors
            const lightFolder = cloudFolder.addFolder('Lighting & Shading');
            lightFolder.addColor(params, 'cloudsDayLitColor').name('Day Sunlit Tops');
            lightFolder.addColor(params, 'cloudsDayShadowColor').name('Day Sky Shadows');
            lightFolder.addColor(params, 'cloudsNightLitColor').name('Night Moonlit Tops');
            lightFolder.addColor(params, 'cloudsNightShadowColor').name('Night Sky Shadows');
    
            // 5. Cloud Dynamics
            const dynamicFolder = cloudFolder.addFolder('Cloud Dynamics & Mist');
            dynamicFolder.add(params, 'cloudsBillowAmount', 0.0, 3.0, 0.05).name('Billow Motion');
            dynamicFolder.add(params, 'cloudsBillowSpeed', 0.05, 1.5, 0.02).name('Billow Speed');

            // Cloud entry, exit haze, and physical wake particles are deliberately separate:
            // artists can tune the feeling of flying through cloud without losing the whole system.
            const cloudMistFolder = cloudFolder.addFolder('Cloud Immersion & Exit Mist');
            cloudMistFolder.add(params, 'cloudMistEffect').name('Enable Cloud Mist System').listen();
            cloudMistFolder.add(params, 'cloudImmersionFog').name('In-Cloud Screen Fog').listen();
            cloudMistFolder.add(params, 'cloudImmersionStrength', 0.0, 1.0, 0.02).name('In-Cloud Fog Strength').listen();
            cloudMistFolder.add(params, 'cloudImmersionVignette', 0.0, 1.0, 0.02).name('In-Cloud Edge Haze').listen();
            cloudMistFolder.add(params, 'cloudImmersionEnterSpeed', 0.2, 8.0, 0.1).name('Fog Enter Speed').listen();
            cloudMistFolder.add(params, 'cloudImmersionExitSpeed', 0.2, 8.0, 0.1).name('Fog Leave Speed').listen();
            cloudMistFolder.add(params, 'cloudExitHaze').name('Exit Screen Haze').listen();
            cloudMistFolder.add(params, 'cloudExitMistDuration', 0.1, 10.0, 0.1).name('Exit Haze Duration').listen();
            cloudMistFolder.add(params, 'cloudExitHazeStrength', 0.0, 1.0, 0.02).name('Exit Haze Strength').listen();
            cloudMistFolder.add(params, 'cloudExitVignetteStrength', 0.0, 1.0, 0.02).name('Exit Edge Haze').listen();
            cloudMistFolder.add(params, 'cloudExitPuffs').name('Physical Exit Puffs').listen();
            cloudMistFolder.add(params, 'cloudExitPuffCount', 0, LOW_GFX ? 20 : 40, 1).name('Exit Puff Count').listen();
            cloudMistFolder.add(params, 'cloudExitPuffLife', 0.1, 3.0, 0.05).name('Exit Puff Lifetime').listen();
            cloudMistFolder.add(params, 'cloudExitPuffScale', 0.1, 3.0, 0.05).name('Exit Puff Scale').listen();
    
            // ==========================================
            // TREE & VEGETATION LOADER (PER-BIOME INDEPENDENT)
            // ==========================================
            const treeFolder = gui.addFolder('🌿 Tree & Vegetation Loader');
            window.treeFolder = treeFolder;

            const biomeLabels = {
                'ghibli_land': '🌳 Ghibli Land',
                'archipelago': '🌊 Archipelago',
                'ghibli_isles': '🌳 Ghibli Isles',
                'misty_mountains': '🏔️ Misty Mountains I',
                'misty_mountains_2': '🏔️ Misty Mountains II',
                'crystal_land': '💎 Crystal Land',
                'magical_sanctuary': '✨ Magical Sanctuary'
            };

            let selectedBiomeId = 'ghibli_land';
            let currentCfg = getBiomeTreeConfig(selectedBiomeId);

            // State object for lil-gui controllers
            const treeControls = {
                biome: selectedBiomeId,
                enabled: currentCfg.enabled,
                density: currentCfg.density,
                minDistance: currentCfg.minDistance,
                minHeight: currentCfg.minHeight,
                maxHeight: currentCfg.maxHeight,
                scale: currentCfg.scale,
                foliageColor: currentCfg.foliageColor,
                trunkColor: currentCfg.trunkColor,
                hueVariation: currentCfg.hueVariation,
                tintVariation: currentCfg.tintVariation
            };

            // Model checkbox states
            const modelStates = {};
            Object.keys(ALL_TREE_MODELS).forEach(id => {
                modelStates[id] = (currentCfg.activeModels || []).includes(id);
            });

            const controllers = {};
            const modelControllers = {};

            function syncControlsForBiome(bId) {
                const cfg = getBiomeTreeConfig(bId);
                if (!cfg) return;
                treeControls.enabled = !!cfg.enabled;
                treeControls.density = cfg.density !== undefined ? cfg.density : 0.7;
                treeControls.minDistance = cfg.minDistance !== undefined ? cfg.minDistance : 16.0;
                treeControls.minHeight = cfg.minHeight !== undefined ? cfg.minHeight : 3.0;
                treeControls.maxHeight = cfg.maxHeight !== undefined ? cfg.maxHeight : 140.0;
                treeControls.scale = cfg.scale !== undefined ? cfg.scale : 1.0;
                treeControls.foliageColor = cfg.foliageColor || '#3cb371';
                treeControls.trunkColor = cfg.trunkColor || '#8b5a2b';
                treeControls.hueVariation = cfg.hueVariation !== undefined ? cfg.hueVariation : 0.08;
                treeControls.tintVariation = cfg.tintVariation !== undefined ? cfg.tintVariation : 0.16;

                Object.keys(controllers).forEach(key => {
                    if (controllers[key] && controllers[key].updateDisplay) {
                        controllers[key].updateDisplay();
                    }
                });

                Object.keys(ALL_TREE_MODELS).forEach(mId => {
                    modelStates[mId] = (cfg.activeModels || []).includes(mId);
                    if (modelControllers[mId] && modelControllers[mId].updateDisplay) {
                        modelControllers[mId].updateDisplay();
                    }
                });
            }

            function selectTreeEditorBiome(bId) {
                if (!biomeLabels[bId]) return;
                selectedBiomeId = bId;
                treeControls.biome = bId;
                syncControlsForBiome(bId);
            }

            // Main navigation and the top tree button both use this, so edits
            // always apply to the biome the player is currently viewing.
            window.selectTreeEditorBiome = selectTreeEditorBiome;

            // 1. Biome selector
            controllers.biome = treeFolder.add(treeControls, 'biome', biomeLabels).name('Select Biome').onChange(bId => {
                selectTreeEditorBiome(bId);
            });

            // 2. Placement & Density folder
            const placementFolder = treeFolder.addFolder('Placement & Density');
            controllers.enabled = placementFolder.add(treeControls, 'enabled').name('Trees Enabled').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { enabled: v });
                refreshAllTrees();
            });
            controllers.scale = placementFolder.add(treeControls, 'scale', 0.2, 3.5, 0.05).name('Scale / Size').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { scale: v });
                refreshAllTrees();
            });
            controllers.density = placementFolder.add(treeControls, 'density', 0.05, 1.0, 0.05).name('Density').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { density: v });
                refreshAllTrees();
            });
            controllers.minDistance = placementFolder.add(treeControls, 'minDistance', 6.0, 50.0, 1.0).name('Distance Between Each (m)').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { minDistance: v });
                refreshAllTrees();
            });
            controllers.minHeight = placementFolder.add(treeControls, 'minHeight', -10.0, 100.0, 1.0).name('Min Height (m)').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { minHeight: v });
                refreshAllTrees();
            });
            controllers.maxHeight = placementFolder.add(treeControls, 'maxHeight', 10.0, 300.0, 5.0).name('Max Height (m)').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { maxHeight: v });
                refreshAllTrees();
            });

            // 3. Colors & Variation folder
            const colorFolder = treeFolder.addFolder('Colors & Variation');
            controllers.foliageColor = colorFolder.addColor(treeControls, 'foliageColor').name('Foliage Color').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { foliageColor: v });
                refreshBiomeColors(selectedBiomeId);
            });
            controllers.trunkColor = colorFolder.addColor(treeControls, 'trunkColor').name('Trunk Color').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { trunkColor: v });
                refreshBiomeColors(selectedBiomeId);
            });
            controllers.hueVariation = colorFolder.add(treeControls, 'hueVariation', 0.0, 0.35, 0.01).name('Hue Variation').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { hueVariation: v });
                refreshBiomeColors(selectedBiomeId);
            });
            controllers.tintVariation = colorFolder.add(treeControls, 'tintVariation', 0.0, 0.50, 0.01).name('Tint Variation').onChange(v => {
                setBiomeTreeConfig(selectedBiomeId, { tintVariation: v });
                refreshBiomeColors(selectedBiomeId);
            });

            // 4. Model Picker with Toggles and Submenus
            const pickerFolder = treeFolder.addFolder('Model Picker (Active Models)');

            Object.keys(TREE_CATEGORIES).forEach(categoryName => {
                const catFolder = pickerFolder.addFolder(categoryName);
                const models = TREE_CATEGORIES[categoryName];

                catFolder.add({
                    selectAll: () => {
                        const cfg = getBiomeTreeConfig(selectedBiomeId);
                        if (!cfg.activeModels) cfg.activeModels = [];
                        models.forEach(m => {
                            if (!cfg.activeModels.includes(m.id)) cfg.activeModels.push(m.id);
                            modelStates[m.id] = true;
                            if (window.loadModelEntry) window.loadModelEntry(m);
                        });
                        saveBiomeTreeSettings();
                        syncControlsForBiome(selectedBiomeId);
                        refreshAllTrees();
                    }
                }, 'selectAll').name('Select All');

                catFolder.add({
                    clearAll: () => {
                        const cfg = getBiomeTreeConfig(selectedBiomeId);
                        const catIds = new Set(models.map(m => m.id));
                        cfg.activeModels = (cfg.activeModels || []).filter(id => !catIds.has(id));
                        models.forEach(m => { modelStates[m.id] = false; });
                        saveBiomeTreeSettings();
                        syncControlsForBiome(selectedBiomeId);
                        refreshAllTrees();
                    }
                }, 'clearAll').name('Clear Category');

                models.forEach(m => {
                    modelControllers[m.id] = catFolder.add(modelStates, m.id).name(m.name).onChange(checked => {
                        const cfg = getBiomeTreeConfig(selectedBiomeId);
                        if (!cfg.activeModels) cfg.activeModels = [];
                        if (checked) {
                            if (!cfg.activeModels.includes(m.id)) cfg.activeModels.push(m.id);
                            if (window.loadModelEntry) window.loadModelEntry(m);
                        } else {
                            cfg.activeModels = cfg.activeModels.filter(id => id !== m.id);
                        }
                        saveBiomeTreeSettings();
                        refreshAllTrees();
                    });
                });

                catFolder.close();
            });

            // Quick reset button for current biome
            treeFolder.add({
                resetBiome: () => {
                    if (DEFAULT_BIOME_TREE_CONFIGS && DEFAULT_BIOME_TREE_CONFIGS[selectedBiomeId]) {
                        setBiomeTreeConfig(selectedBiomeId, JSON.parse(JSON.stringify(DEFAULT_BIOME_TREE_CONFIGS[selectedBiomeId])));
                        syncControlsForBiome(selectedBiomeId);
                        refreshAllTrees();
                    }
                }
            }, 'resetBiome').name('Reset This Biome to Default');

            treeFolder.add({
                openBank: () => {
                    if (window.openMatcapBank) window.openMatcapBank();
                }
            }, 'openBank').name('🎨 MatCap Shader Bank');

            treeFolder.close();

// ==========================================
            const sysFolder = gui.addFolder('Dev & System');
    
            // Editor launchers
            sysFolder.add({ openShaderBank: () => {
                if (window.openMatcapBank) window.openMatcapBank();
            }}, 'openShaderBank').name('MatCap Shader Bank (B)');
            sysFolder.add({ openTerrainEditor: () => {
                const btn = document.getElementById('editor-toggle');
                if (btn) btn.click();
            }}, 'openTerrainEditor').name('Terrain Editor');
            sysFolder.add({ openCrystalEditor: () => {
                const crystalEditor = document.getElementById('crystal-editor');
                if (crystalEditor) crystalEditor.style.display = crystalEditor.style.display === 'none' ? 'block' : 'none';
            }}, 'openCrystalEditor').name('Crystal Editor');
    
            // 20-seed acceptance test
            sysFolder.add(worldParams, 'runAcceptanceTests').name('Run 20-Seed Tests');
    
            // Save & Reset
            sysFolder.add({
                saveSettings: () => {
                    const data = gui.save();
                    localStorage.setItem('flightSettings', JSON.stringify(data));
                    const prevTitle = 'Dev & System';
                    sysFolder.title('Saved!');
                    setTimeout(() => sysFolder.title(prevTitle), 1500);
                }
            }, 'saveSettings').name('Save All Settings');
    
            sysFolder.add({
                resetSettings: () => {
                    if (cloudManager) cloudManager.resetToDefaults();
                    else localStorage.removeItem('flightSettings');
                    localStorage.removeItem('gfxQuality');
                    location.reload();
                }
            }, 'resetSettings').name('Reset to Default');
    
            // ==========================================
            // DEBUG MODE (Ported from Wanderlust-II)
            // ==========================================
            const debugFolder = gui.addFolder('Debug Mode');
            debugFolder.add(params, 'godMode').name('God Mode (Free Cam) [G]').listen().onChange(v => setGodMode(v));
            debugFolder.add(params, 'showGodModelMarker').name('Show Model Marker in God Mode').listen();
            debugFolder.add(params, 'cameraFov', 5, 100, 1).name('Camera FOV / Zoom [Z]').listen().onChange(v => {
                camera.fov = v;
                camera.updateProjectionMatrix();
                if (godCamera) {
                    godCamera.fov = v;
                    godCamera.updateProjectionMatrix();
                }
            });
            debugFolder.add(params, 'normalizeSun').name('Normalize Sun').listen().onChange(v => setNormalizeSun(v));
            debugFolder.add(params, 'showTerrain').name('Terrain').onChange(v => { terrain.visible = v; });
            debugFolder.add(params, 'showWater').name('Water').onChange(v => { waterMesh.visible = v; });
            debugFolder.add(params, 'showTrees').name('Trees').listen();
            debugFolder.add(params, 'showClouds').name('Clouds').onChange(updateAllCloudVisibility).listen();
            debugFolder.add(params, 'showCloudDebug').name('Cloud Type Overlays (U)').listen().onChange(v => setCloudDebugMode(v));
            debugFolder.add(params, 'cloudDebugTargetMode', { 'Every Visible Cloud': 'visible', 'Single Cloud (Aim Only)': 'single', 'Nearest 3 Visible': 'nearest3' }).name('Cloud Debug Mode').listen();
            debugFolder.add(params, 'debugCloudTint').name('Cloud Color Coding').listen().onChange(() => updateCloudDebugTints());
            debugFolder.add(params, 'showFog').name('All Fog').listen().onChange(v => setAllFogEnabled(v));
            debugFolder.add(params, 'showFogPlanes').name('Fog Planes').listen().onChange(v => {
                if (typeof window.fogGroup !== 'undefined') window.fogGroup.visible = v && params.showFog;
            });
            debugFolder.add(params, 'godRays').name('God Rays').listen().onChange(v => { godRaysPass.enabled = v; });
            debugFolder.add(params, 'showBirds').name('Birds').onChange(v => { if(typeof instBirds !== 'undefined') instBirds.visible = v; if(typeof flockGrp !== 'undefined') flockGrp.visible = v; });
            debugFolder.add(params, 'showCrystals').name('Crystals').onChange(v => { instCrystals.visible = v; });
            debugFolder.add(params, 'showMap').name('World Map').onChange(v => { const f = document.getElementById('map-frame'); if(f) f.style.display = v ? '' : 'none'; const el = document.getElementById('world-map'); if(el) el.classList.toggle('map-no-compass', !v); });
            debugFolder.add(params, 'showGUI').name('Hide Panel').onChange(v => toggleGUI(v));
    
            function collapseAllGUI(g) {
                if (!g) return;
                if (typeof g.foldersRecursive === 'function') {
                    g.foldersRecursive().forEach(f => {
                        if (typeof f.close === 'function') f.close();
                    });
                } else if (g.folders && Array.isArray(g.folders)) {
                    g.folders.forEach(f => collapseAllGUI(f));
                }
                if (typeof g.close === 'function') g.close();
            }
    
            // Load settings if they exist
            try {
                const savedData = localStorage.getItem('flightSettings');
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed && parsed.controllers) {
                        parsed.controllers.cloudsHigh = true;
                        params.cloudsHigh = true;
                        if (cloudManager) {
                            parsed.controllers = cloudManager.applyState(parsed.controllers);
                        }
                        if (parsed.controllers.showFog !== undefined) {
                            params.showFog = parsed.controllers.showFog;
                            params.showFogPlanes = parsed.controllers.showFog;
                        } else if (parsed.controllers.showFogPlanes !== undefined) {
                            parsed.controllers.showFog = parsed.controllers.showFogPlanes;
                            params.showFog = parsed.controllers.showFogPlanes;
                            params.showFogPlanes = parsed.controllers.showFogPlanes;
                        }
                        if (parsed.controllers.cameraFov !== undefined) {
                            params.cameraFov = parsed.controllers.cameraFov;
                        }
                        if (parsed.controllers.normalizeSun !== undefined) {
                            params.normalizeSun = parsed.controllers.normalizeSun;
                        }
                        if (parsed.controllers.cloudsLowBottomBlur === undefined || parsed.controllers.cloudsLowBottomBlur < 0.28) parsed.controllers.cloudsLowBottomBlur = 0.35;
                        if (parsed.controllers.cloudsLowTowerBottomBlur === undefined || parsed.controllers.cloudsLowTowerBottomBlur < 0.28) parsed.controllers.cloudsLowTowerBottomBlur = 0.35;
                        if (parsed.controllers.cloudsLowBankBottomBlur === undefined || parsed.controllers.cloudsLowBankBottomBlur < 0.30) parsed.controllers.cloudsLowBankBottomBlur = 0.40;
                        if (parsed.controllers.cloudsLowBankSize > 1.8) parsed.controllers.cloudsLowBankSize = 1.1;
                        if (parsed.controllers.cloudsLowBankDistance < 3600) parsed.controllers.cloudsLowBankDistance = 4400;
                        if (parsed.controllers.cloudsLowBankCount > 18) parsed.controllers.cloudsLowBankCount = 14;
                        if (parsed.controllers.cloudsMinDistance === undefined || parsed.controllers.cloudsMinDistance < 100) parsed.controllers.cloudsMinDistance = 300;
                        delete parsed.controllers.showCloudDebug;
                        params.showCloudDebug = false;
                        delete parsed.controllers.cloudDebugTargetMode;
                        params.cloudDebugTargetMode = 'visible';
                        delete parsed.controllers.debugCloudTint;
                        params.debugCloudTint = false;
                        delete parsed.controllers.modelVisible;
                        params.modelVisible = true;
                        isModelVisible = true;
                    }
                    gui.load(parsed);
                    setCloudSize(instClouds, params.cloudsLowSize);
                    setCloudSize(instHighClouds, params.cloudsHighSize);
                    setCloudSize(instLowTowerClouds, params.cloudsLowTowerSize);
                    setCloudSize(instMegaClouds, params.cloudsGiantSize);
                    if (typeof instLowBankClouds !== 'undefined') setCloudSize(instLowBankClouds, params.cloudsLowBankSize);
                    if (typeof instBillboardClouds !== 'undefined') setCloudSize(instBillboardClouds, params.cloudsBillboardSize);
                    setCloudCount(instClouds, params.cloudsLowCount);
                    setCloudCount(instHighClouds, params.cloudsHighCount);
                    setCloudCount(instLowTowerClouds, params.cloudsLowTowerCount);
                    setCloudCount(instMegaClouds, params.cloudsGiantCount);
                    if (typeof instLowBankClouds !== 'undefined') setCloudCount(instLowBankClouds, params.cloudsLowBankCount);
                    if (typeof instBillboardClouds !== 'undefined') setCloudCount(instBillboardClouds, params.cloudsBillboardCount);
                    setMaterialOpacity(matCloud, params.cloudsLowOpacity);
                    setMaterialOpacity(highCloudMat, params.cloudsHighOpacity);
                    setMaterialOpacity(lowTowerCloudMat, params.cloudsLowTowerOpacity);
                    setMaterialOpacity(megaCloudMat, params.cloudsGiantOpacity);
                    setMaterialOpacity(lowBankCloudMat, params.cloudsLowBankOpacity);
                    if (typeof cirroCloudMat !== 'undefined') setMaterialOpacity(cirroCloudMat, params.cloudsBillboardOpacity);
                    setAllFogEnabled(params.showFog);
                    setNormalizeSun(params.normalizeSun);
                    params.modelVisible = true;
                    isModelVisible = true;
                    updateModelVisibility();
                    updateAllCloudVisibility();
                    if (parsed.controllers && typeof waterUniforms !== 'undefined') {
                        if (parsed.controllers.waterScale !== undefined && waterUniforms.waterScale) {
                            const ws = parsed.controllers.waterScale;
                            const wsx = parsed.controllers.waterScaleX !== undefined ? parsed.controllers.waterScaleX : ws;
                            const wsz = parsed.controllers.waterScaleZ !== undefined ? parsed.controllers.waterScaleZ : ws;
                            waterUniforms.waterScale.value.set(wsx, wsz);
                        }
                        if (parsed.controllers.displacementScale !== undefined && waterUniforms.waterDisplacementScale) {
                            waterUniforms.waterDisplacementScale.value.set(parsed.controllers.displacementScale, parsed.controllers.displacementScale);
                        }
                        if (parsed.controllers.specularScale !== undefined && waterUniforms.specularScale) {
                            waterUniforms.specularScale.value = parsed.controllers.specularScale;
                        }
                        if (parsed.controllers.foamScale !== undefined && waterUniforms.uFoamScale) {
                            waterUniforms.uFoamScale.value = parsed.controllers.foamScale;
                        }
                    }
                }
            } catch(e) {
                console.error('Failed to load settings', e);
            }
    
            // Always collapse GUI on load
            collapseAllGUI(gui);
    
            // Top-Left Save Menu (Wanderlust-II per-biome and global scene saves)
            const saveGui = new GUI({
                title: 'Per-Biome Saves',
                autoPlace: false,
                width: 250
            });
            document.body.appendChild(saveGui.domElement);
            saveGui.domElement.classList.add('save-gui-menu');
            saveGui.domElement.id = 'top-save-menu';
            saveGui.domElement.style.display = 'none';
    
            function showVisualToast(msg) {
                let toast = document.getElementById('visual-toast');
                if (!toast) {
                    toast = document.createElement('div');
                    toast.id = 'visual-toast';
                    toast.style.cssText = 'position:fixed;top:68px;left:50%;transform:translateX(-50%);background:rgba(15,20,28,0.94);color:#38bdf8;border:1px solid rgba(56,189,248,0.4);padding:8px 18px;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:9999;pointer-events:none;transition:opacity 0.25s ease, transform 0.25s ease;';
                    document.body.appendChild(toast);
                }
                toast.textContent = msg;
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
                clearTimeout(toast._timeout);
                toast._timeout = setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(-50%) translateY(-8px)';
                }, 2200);
            }
    
            function positionSaveGui() {
                const btn = document.getElementById('top-save-setting-btn');
                if (btn && saveGui && saveGui.domElement) {
                    const rect = btn.getBoundingClientRect();
                    saveGui.domElement.style.left = `${Math.max(10, Math.round(rect.left))}px`;
                    saveGui.domElement.style.top = `${Math.round(rect.bottom + 8)}px`;
                }
            }
            window.addEventListener('resize', positionSaveGui);
    
            const saveActions = {
                saveActive: () => {
                    const data = gui.save();
                    const curB = (typeof currentBiome !== 'undefined' && currentBiome) ? currentBiome.name : 'Current';
                    localStorage.setItem('flight_biome_' + curB, JSON.stringify(data));
                    showVisualToast('Saved preset for: ' + curB);
                    saveGui.domElement.style.display = 'none';
                },
                resetActive: () => {
                    const curB = (typeof currentBiome !== 'undefined' && currentBiome) ? currentBiome.name : 'Current';
                    localStorage.removeItem('flight_biome_' + curB);
                    showVisualToast('Reset preset for: ' + curB);
                    saveGui.domElement.style.display = 'none';
                },
                saveAll: () => {
                    const data = gui.save();
                    localStorage.setItem('flightSettings', JSON.stringify(data));
                    showVisualToast('All settings saved to disk');
                    saveGui.domElement.style.display = 'none';
                },
                resetAll: () => {
                    if (confirm('Are you sure you want to reset all settings to default?')) {
                        if (cloudManager) cloudManager.resetToDefaults();
                        else localStorage.removeItem('flightSettings');
                        localStorage.removeItem('gfxQuality');
                        location.reload();
                    }
                    saveGui.domElement.style.display = 'none';
                },
                saveGlobal: () => {
                    const data = gui.save();
                    localStorage.setItem('flightSettings', JSON.stringify(data));
                    showVisualToast('Global preset saved');
                    saveGui.domElement.style.display = 'none';
                },
                loadFile: () => {
                    try {
                        const saved = localStorage.getItem('flightSettings');
                        if (saved) {
                            const parsed = JSON.parse(saved);
                            if (parsed && parsed.controllers) {
                                parsed.controllers.cloudsHigh = true;
                                params.cloudsHigh = true;
                            }
                            if (parsed && parsed.controllers && cloudManager) {
                                parsed.controllers = cloudManager.applyState(parsed.controllers);
                            }
                            gui.load(parsed);
                            showVisualToast('Settings loaded from disk');
                        } else {
                            showVisualToast('No saved preset found');
                        }
                    } catch(e) {
                        console.error(e);
                    }
                    saveGui.domElement.style.display = 'none';
                }
            };
    
            saveGui.add(saveActions, 'saveActive').name('Save Current Biome');
            saveGui.add(saveActions, 'resetActive').name('Reset Current Biome');
            saveGui.add(saveActions, 'saveAll').name('Save All Biomes');
            saveGui.add(saveActions, 'resetAll').name('Reset All Biomes');
    
            const globalFolder = saveGui.addFolder('Global Scene Saves');
            globalFolder.add(saveActions, 'saveGlobal').name('Save Global Preset');
            globalFolder.add(saveActions, 'loadFile').name('Load File from Disk');
            globalFolder.close();
            collapseAllGUI(saveGui);
    
            const topSaveBtn = document.getElementById('top-save-setting-btn');
            if (topSaveBtn) {
                topSaveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = saveGui.domElement.style.display !== 'none';
                    if (isOpen) {
                        saveGui.domElement.style.display = 'none';
                    } else {
                        positionSaveGui();
                        saveGui.domElement.style.display = '';
                    }
                });
    
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('#top-save-setting-btn') && !e.target.closest('.save-gui-menu')) {
                        saveGui.domElement.style.display = 'none';
                    }
                });
            }
    
            const topSaveAllBtn = document.getElementById('top-save-all-btn');
            if (topSaveAllBtn) {
                topSaveAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveActions.saveAll();
                });
            }
    
            const topTreeBtn = document.getElementById('top-tree-btn');
            if (topTreeBtn) {
                topTreeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const activeBiome = getBiomeAt && playerGrp
                        ? getBiomeAt(playerGrp.position.x, playerGrp.position.z)
                        : null;
                    if (activeBiome && biomeLabels[activeBiome.id]) {
                        selectTreeEditorBiome(activeBiome.id);
                    }
                    if (typeof toggleGUI === 'function') toggleGUI(true);
                    if (window.treeFolder) {
                        gui.foldersRecursive().forEach(f => f.close());
                        window.treeFolder.open();
                        window.treeFolder.domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            }

            const topShaderBankBtn = document.getElementById('top-shader-bank-btn');
            if (topShaderBankBtn) {
                topShaderBankBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.toggleMatcapBank) window.toggleMatcapBank();
                });
            }
    
            window.addEventListener('keydown', (e) => {
                if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
                if (e.code === 'KeyT') {
                    const btn = document.getElementById('top-tree-btn');
                    if (btn) btn.click();
                }
                if (e.code === 'KeyB') {
                    const btn = document.getElementById('top-shader-bank-btn');
                    if (btn) btn.click();
                }
            });
    
            window.isInitializingGui = false;
            gui.close();
        }
    
}
