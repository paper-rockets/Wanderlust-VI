import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getWorldHeight, getBiomeAt, isTreeZone } from './world.js';
import { snoise } from './noise.js';

// ==========================================
// 1. MODEL CATALOG & CATEGORIES (35 Models)
// ==========================================
export const TREE_CATEGORIES = {
    'Cartoon trees': [
        { id: 'cartoon_1', name: 'Cartoon Tree 1', file: 'Cartoon_Trees_Pack_Tree_1.glb' },
        { id: 'cartoon_2', name: 'Cartoon Tree 2', file: 'Cartoon_Trees_Pack_Tree_2.glb' },
        { id: 'cartoon_7', name: 'Cartoon Tree 7', file: 'Cartoon_Trees_Pack_Tree_7.glb' },
        { id: 'cartoon_8', name: 'Cartoon Tree 8', file: 'Cartoon_Trees_Pack_Tree_8.glb' },
        { id: 'cartoon_10', name: 'Cartoon Tree 10', file: 'Cartoon_Trees_Pack_Tree_10.glb' },
        { id: 'cartoon_11', name: 'Cartoon Tree 11', file: 'Cartoon_Trees_Pack_Tree_11.glb' },
        { id: 'cartoon_12', name: 'Cartoon Tree 12', file: 'Cartoon_Trees_Pack_Tree_12.glb' }
    ],
    'Pine A': [
        { id: 'pine_a_6', name: 'Pine A (6)', file: 'Pine model  A (6)_2.glb' },
        { id: 'pine_a_7', name: 'Pine A (7)', file: 'Pine model  A (7)_2.glb' },
        { id: 'pine_a_8', name: 'Pine A (8)', file: 'Pine model  A (8)_31388.glb' }
    ],
    'Pine B': [
        { id: 'pine_b_1', name: 'Pine B (1)', file: 'Pine model B (1)_1.glb' },
        { id: 'pine_b_2', name: 'Pine B (2)', file: 'Pine model B (2)_92080.glb' },
        { id: 'pine_b_3', name: 'Pine B (3)', file: 'Pine_model_B_(3)_instanced_l1_34168.glb' },
        { id: 'pine_b_4', name: 'Pine B (4)', file: 'Pine_model_B_(4)_instanced_l1_34212.glb' },
        { id: 'pine_b_6', name: 'Pine B (6)', file: 'Pine_model_B_(6)_instanced_l2_35364.glb' }
    ],
    'Pine C': [
        { id: 'pine_c_6', name: 'Pine C (6)', file: 'pine_tree_06_26340.glb' },
        { id: 'pine_c_5', name: 'Pine C (5)', file: 'pine_tree_05_27920.glb' }
    ],
    'Magic A': [
        { id: 'magic_a_azurite2', name: 'Azurite Tier 2', file: 'natureuniverse_azuritetier2_azuritetier2_original.glb' },
        { id: 'magic_a_azurite3', name: 'Azurite Tier 3', file: 'natureuniverse_azuritetier3_azuritetier3_original.glb' },
        { id: 'magic_a_cactus', name: 'Cactus', file: 'natureuniverse_cactus_cactus_original.glb' },
        { id: 'magic_a_crystala01', name: 'Crystal A01', file: 'natureuniverse_cystala01_cystala01_original.glb' },
        { id: 'magic_a_deepseatree', name: 'Deep Sea Tree', file: 'natureuniverse_deepseatree_deepseatree_original.glb' },
        { id: 'magic_a_diamond', name: 'Diamond', file: 'natureuniverse_diamond_diamond_original.glb' },
        { id: 'magic_a_halucogentree', name: 'Halucogen Tree', file: 'natureuniverse_halucogentree_halucogentree_original.glb' },
        { id: 'magic_a_portalruby', name: 'Portal Ruby', file: 'natureuniverse_portalruby_portalruby_original.glb' },
        { id: 'magic_a_ruby', name: 'Ruby', file: 'natureuniverse_ruby_ruby_original.glb' },
        { id: 'magic_a_rubytier3', name: 'Ruby Tier 3', file: 'natureuniverse_rubytier3_rubytier3_original.glb' },
        { id: 'magic_a_tier2diamond', name: 'Tier 2 Diamond', file: 'natureuniverse_tier2diamond_tier2diamond_original.glb' },
        { id: 'magic_a_tier2sulfur', name: 'Tier 2 Sulfur', file: 'natureuniverse_tier2sulfur_tier2sulfur_original.glb' },
        { id: 'magic_a_uraniumtier2', name: 'Uranium Tier 2', file: 'natureuniverse_uraniumtier2_uraniumtier2_original.glb' },
        { id: 'magic_a_uraniumtier3', name: 'Uranium Tier 3', file: 'natureuniverse_uraniumtier3_uraniumtier3_original.glb' },
        { id: 'magic_a_amethisttier2', name: 'Amethyst Tier 2', file: 'natureuniverse_amethisttier2_amethisttier2_original.glb' }
    ],
    'Magic B': [
        { id: 'magic_b_shroom', name: 'Shroom', file: 'natureuniverse_shroom_shroom_original.glb' },
        { id: 'magic_b_shroomv2', name: 'Shroom V2', file: 'natureuniverse_shroomv2_shroomv2_original.glb' },
        { id: 'magic_b_mushroompiece', name: 'Mushroom Piece', file: 'natureuniverse_mushroompiece_mushroompiece_original.glb' }
    ]
};

// Flat index of all models for fast lookup
export const ALL_TREE_MODELS = {};
Object.keys(TREE_CATEGORIES).forEach(cat => {
    TREE_CATEGORIES[cat].forEach(model => {
        ALL_TREE_MODELS[model.id] = { ...model, category: cat };
    });
});

// ==========================================
// 2. BIOME INDEPENDENT DEFAULT CONFIGS
// ==========================================
export const DEFAULT_BIOME_TREE_CONFIGS = {
    'ghibli_land': {
        enabled: true,
        scale: 1.0,
        density: 0.75,
        count: 550,
        minDistance: 16.0,
        minHeight: 3.0,
        maxHeight: 140.0,
        foliageColor: '#5c8338',
        trunkColor: '#8b5a2b',
        hueVariation: 0.08,
        tintVariation: 0.16,
        activeModels: ['pine_a_6', 'pine_b_1', 'pine_c_6']
    },
    'archipelago': {
        enabled: true,
        scale: 0.95,
        density: 0.65,
        count: 500,
        minDistance: 18.0,
        minHeight: 2.8,
        maxHeight: 90.0,
        foliageColor: '#3cb371',
        trunkColor: '#6b4226',
        hueVariation: 0.07,
        tintVariation: 0.18,
        activeModels: ['pine_a_6', 'pine_b_1', 'pine_c_6']
    },
    'ghibli_isles': {
        enabled: true,
        scale: 1.0,
        density: 0.70,
        count: 500,
        minDistance: 16.0,
        minHeight: 3.0,
        maxHeight: 135.0,
        foliageColor: '#5c8338',
        trunkColor: '#795548',
        hueVariation: 0.08,
        tintVariation: 0.16,
        activeModels: ['pine_a_7', 'pine_b_2', 'pine_c_5']
    },
    'misty_mountains': {
        enabled: true,
        scale: 0.85,
        density: 0.45,
        count: 380,
        minDistance: 22.0,
        minHeight: 25.0,
        maxHeight: 220.0,
        foliageColor: '#2d5a3f',
        trunkColor: '#4a3728',
        hueVariation: 0.05,
        tintVariation: 0.14,
        activeModels: ['pine_a_8', 'pine_b_3', 'pine_c_6']
    },
    'misty_mountains_2': {
        enabled: true,
        scale: 0.85,
        density: 0.45,
        count: 380,
        minDistance: 22.0,
        minHeight: 25.0,
        maxHeight: 220.0,
        foliageColor: '#345842',
        trunkColor: '#3e2d21',
        hueVariation: 0.05,
        tintVariation: 0.14,
        activeModels: ['pine_a_7', 'pine_b_4', 'pine_c_5']
    },
    'crystal_land': {
        enabled: true,
        scale: 1.25,
        density: 0.55,
        count: 400,
        minDistance: 20.0,
        minHeight: 3.0,
        maxHeight: 180.0,
        foliageColor: '#00d2ff',
        trunkColor: '#9b59b6',
        hueVariation: 0.12,
        tintVariation: 0.25,
        activeModels: ['magic_a_crystala01', 'magic_a_diamond', 'magic_a_ruby']
    },
    'magical_sanctuary': {
        enabled: true,
        scale: 1.15,
        density: 0.60,
        count: 420,
        minDistance: 18.0,
        minHeight: 3.0,
        maxHeight: 160.0,
        foliageColor: '#d946ef',
        trunkColor: '#475569',
        hueVariation: 0.10,
        tintVariation: 0.22,
        activeModels: ['magic_b_shroom', 'magic_b_shroomv2', 'magic_a_halucogentree']
    },
    
};

// Global active biome configs with localStorage persistence
export let biomeTreeConfigs = JSON.parse(JSON.stringify(DEFAULT_BIOME_TREE_CONFIGS));

const STORAGE_KEY = 'ghibli_biome_tree_settings_v5';
try {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.keys(parsed).forEach(k => {
                if (biomeTreeConfigs[k]) {
                    const savedConfig = parsed[k] || {};
                    biomeTreeConfigs[k] = { ...biomeTreeConfigs[k], ...savedConfig };
                    // Older saves did not always contain a model list.  In that
                    // case retain the defaults, but an intentionally empty list
                    // means “no trees” and must stay empty after a restart.
                    if (!Array.isArray(savedConfig.activeModels)) {
                        biomeTreeConfigs[k].activeModels = [...(DEFAULT_BIOME_TREE_CONFIGS[k]?.activeModels || [])];
                    }
                    if (k === 'ghibli_land') {
                        if (biomeTreeConfigs[k].maxHeight < 100) biomeTreeConfigs[k].maxHeight = 140.0;
                        if (biomeTreeConfigs[k].minHeight > 6) biomeTreeConfigs[k].minHeight = 3.0;
                    }
                }
            });
        }
    }
} catch (e) {
    console.warn('Could not load biome tree settings from storage:', e);
}

export function saveBiomeTreeSettings() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(biomeTreeConfigs));
        }
    } catch (e) {
        console.warn('Could not save biome tree settings:', e);
    }
}

const SAFE_EMPTY_CONFIG = {
    enabled: false,
    scale: 1.0,
    density: 0,
    count: 0,
    minDistance: 50.0,
    minHeight: 999.0,
    maxHeight: 999.0,
    foliageColor: '#3cb371',
    trunkColor: '#8b5a2b',
    hueVariation: 0,
    tintVariation: 0,
    activeModels: []
};

export function getBiomeTreeConfig(biomeId) {
    if (!biomeId || biomeId === 'open_ocean') return SAFE_EMPTY_CONFIG;
    return biomeTreeConfigs[biomeId] || SAFE_EMPTY_CONFIG;
}

export function setBiomeTreeConfig(biomeId, newConfig) {
    if (biomeTreeConfigs[biomeId]) {
        biomeTreeConfigs[biomeId] = { ...biomeTreeConfigs[biomeId], ...newConfig };
        saveBiomeTreeSettings();
    }
}

// Module-level manager reference
let activeTreeManager = null;

export function refreshAllTrees() {
    // During Vite hot reload this module can be replaced while the running
    // scene still owns the previous manager. Keep the live manager on window
    // so tree-picker buttons always control the instances the player sees.
    const manager = activeTreeManager || (typeof window !== 'undefined' ? window.__treeInstanceManager : null);
    if (manager && typeof manager.refreshAllTrees === 'function') {
        manager.refreshAllTrees();
    }
}

export function refreshBiomeColors(biomeId) {
    const manager = activeTreeManager || (typeof window !== 'undefined' ? window.__treeInstanceManager : null);
    if (manager && typeof manager.refreshBiomeColors === 'function') {
        manager.refreshBiomeColors(biomeId);
    }
}

// Window attachments for cross-module integration
if (typeof window !== 'undefined') {
    window.biomeTreeConfigs = biomeTreeConfigs;
    window.getBiomeTreeConfig = getBiomeTreeConfig;
    window.setBiomeTreeConfig = setBiomeTreeConfig;
    window.TREE_CATEGORIES = TREE_CATEGORIES;
    window.ALL_TREE_MODELS = ALL_TREE_MODELS;
    window.DEFAULT_BIOME_TREE_CONFIGS = DEFAULT_BIOME_TREE_CONFIGS;
    window.refreshAllTrees = refreshAllTrees;
    window.refreshBiomeColors = refreshBiomeColors;
}

// ==========================================
// 3. COLOR & TINT VARIATION ENGINE
// ==========================================
const _tempColor = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

export function applyColorVariation(hexColor, hueVar = 0, tintVar = 0) {
    _tempColor.set(hexColor);
    _tempColor.getHSL(_hsl);

    const hJitter = (Math.random() - 0.5) * 2.0 * hueVar;
    const lJitter = (Math.random() - 0.5) * 2.0 * tintVar;
    const sJitter = (Math.random() - 0.5) * tintVar * 0.4;

    let h = (_hsl.h + hJitter + 1.0) % 1.0;
    let s = Math.min(1.0, Math.max(0.05, _hsl.s + sJitter));
    let l = Math.min(0.95, Math.max(0.05, _hsl.l + lJitter));

    const result = new THREE.Color();
    result.setHSL(h, s, l);
    return result;
}

// ==========================================
// 4. MAIN TREE & VEGETATION LOADER ENGINE
// ==========================================
export const treeMatcapUniform = { value: null };
export const treeUseMatcapUniform = { value: 0.0 };
export const treeMatcapTintUniform = { value: 0.35 };

export function setTreeMatcap(texture, tintFactor = 0.35) {
    treeMatcapUniform.value = texture || null;
    treeUseMatcapUniform.value = texture ? 1.0 : 0.0;
    if (tintFactor !== undefined) {
        treeMatcapTintUniform.value = tintFactor;
    }
}

export function getTreeMatcapState() {
    return {
        active: treeUseMatcapUniform.value > 0.5,
        texture: treeMatcapUniform.value,
        tint: treeMatcapTintUniform.value
    };
}
export function initTreesAndOctree(...args) {
    let opts;
    if (args.length === 1 && typeof args[0] === 'object' && !args[0].isScene) {
        opts = args[0];
    } else {
        opts = {
            scene: args[0],
            gltfLoader: args[1],
            params: args[2],
            LOW_GFX: args[3],
            treeMeshes: args[4]
        };
    }

    const {
        scene,
        gltfLoader,
        params,
        LOW_GFX,
        camera,
        treeMeshes = [],
        treeNearMeshes = [],
        updateTreeLOD = () => {},
        compactTreeInstances,
        instRocks,
        instBushes,
        instFlowers,
        flowerColors = [0xffffff, 0xffd700, 0xffa8d1, 0x4da9e8, 0xff6b6b],
        ROCK_COUNT = 0,
        BUSH_COUNT = 0,
        FLOWER_COUNT = 0,
        getMeshHeight,
        getPathStrength,
        getMeshSlope,
        getTreeLightFactor = () => 1.0,
        matTree
    } = opts;

    const _scratchVec3 = new THREE.Vector3();
    const dummy = new THREE.Object3D();
    const dummyMatrix = new THREE.Matrix4();
    dummyMatrix.setPosition(0, -2000, 0);

    const tempFlowerColor = new THREE.Color();
    // Keep the forest dense around the player, but stop drawing distant full
    // tree models beyond the scene's useful fog range.
    const treeDist = 380;
    let logicTimer = 0;
    let currentFrame = 0;
    // Model-picker edits must be reflected as one atomic change.  Normal
    // streaming spreads work over six frames, but that left a window where
    // removed trees stayed visible and newly loaded models never received
    // their first placement pass.
    let forceFullTreeUpdate = false;
    const treeLightUniform = { value: 1.0 };
    const treeTimeUniform = { value: 0.0 };

    // Spatial cell hash map to enforce minimum distance between trees
    const treeGrid = new Map();

    // Octree view frustum culling
    class HierarchicalOctreeNode {
        constructor(minX, minY, minZ, maxX, maxY, maxZ, depth = 0, maxDepth = 3) {
            this.depth = depth;
            this.maxDepth = maxDepth;
            this.box = new THREE.Box3(
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(maxX, maxY, maxZ)
            );
            this.sphere = new THREE.Sphere();
            this.box.getBoundingSphere(this.sphere);
            this.children = null;
            this.isVisible = false;
            if (depth < maxDepth) this.subdivide();
        }

        subdivide() {
            const min = this.box.min, max = this.box.max;
            const midX = (min.x + max.x) * 0.5;
            const midY = (min.y + max.y) * 0.5;
            const midZ = (min.z + max.z) * 0.5;
            this.children = [
                new HierarchicalOctreeNode(min.x, min.y, min.z, midX, midY, midZ, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(midX, min.y, min.z, max.x, midY, midZ, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(min.x, midY, min.z, midX, max.y, midZ, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(midX, midY, min.z, max.x, max.y, midZ, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(min.x, min.y, midZ, midX, midY, max.z, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(midX, min.y, midZ, max.x, midY, max.z, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(min.x, midY, midZ, midX, max.y, max.z, this.depth + 1, this.maxDepth),
                new HierarchicalOctreeNode(midX, midY, midZ, max.x, max.y, max.z, this.depth + 1, this.maxDepth)
            ];
        }

        updateBounds(minX, minY, minZ, maxX, maxY, maxZ) {
            this.box.min.set(minX, minY, minZ);
            this.box.max.set(maxX, maxY, maxZ);
            this.box.getBoundingSphere(this.sphere);
            if (this.children) {
                const midX = (minX + maxX) * 0.5;
                const midY = (minY + maxY) * 0.5;
                const midZ = (minZ + maxZ) * 0.5;
                this.children[0].updateBounds(minX, minY, minZ, midX, midY, midZ);
                this.children[1].updateBounds(midX, minY, minZ, maxX, midY, midZ);
                this.children[2].updateBounds(minX, midY, minZ, midX, maxY, midZ);
                this.children[3].updateBounds(midX, midY, minZ, maxX, maxY, midZ);
                this.children[4].updateBounds(minX, minY, midZ, midX, midY, maxZ);
                this.children[5].updateBounds(midX, minY, midZ, maxX, midY, maxZ);
                this.children[6].updateBounds(minX, midY, midZ, midX, maxY, maxZ);
                this.children[7].updateBounds(midX, midY, midZ, maxX, maxY, maxZ);
            }
        }

        cullWithFrustum(frustum) {
            if (!frustum.intersectsSphere(this.sphere) || !frustum.intersectsBox(this.box)) {
                this.markHidden();
                return;
            }
            this.isVisible = true;
            if (this.children) {
                for (let i = 0; i < 8; i++) this.children[i].cullWithFrustum(frustum);
            }
        }

        markHidden() {
            this.isVisible = false;
            if (this.children) {
                for (let i = 0; i < 8; i++) this.children[i].markHidden();
            }
        }

        isPointInFrustum(x, y, z) {
            if (!this.isVisible) return false;
            if (!this.box.containsPoint(_scratchVec3.set(x, y, z))) return false;
            if (!this.children) return this.isVisible;
            for (let i = 0; i < 8; i++) {
                if (this.children[i].isPointInFrustum(x, y, z)) return true;
            }
            return false;
        }
    }

    class VegetationHierarchicalOctree {
        constructor() {
            this.root = new HierarchicalOctreeNode(-900, -30, -900, 900, 250, 900, 0, 3);
            this.cameraFrustum = new THREE.Frustum();
            this.projMatrix = new THREE.Matrix4();
            this.lastRootX = -99999;
            this.lastRootZ = -99999;
        }

        update(cam, playerX, playerZ, maxDist = treeDist) {
            if (!cam) return;
            this.projMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
            this.cameraFrustum.setFromProjectionMatrix(this.projMatrix);

            const step = 80;
            const rx = Math.floor(playerX / step) * step;
            const rz = Math.floor(playerZ / step) * step;

            if (Math.abs(rx - this.lastRootX) >= step || Math.abs(rz - this.lastRootZ) >= step) {
                this.root.updateBounds(rx - maxDist, -30, rz - maxDist, rx + maxDist, 250, rz + maxDist);
                this.lastRootX = rx;
                this.lastRootZ = rz;
            }
            this.root.cullWithFrustum(this.cameraFrustum);
        }

        isPointInViewFrustum(x, y, z) {
            return this.root.isPointInFrustum(x, y, z);
        }
    }

    const vegOctree = new VegetationHierarchicalOctree();

    // Hide original legacy cones/pines completely
    if (treeMeshes && treeMeshes.length > 0) {
        treeMeshes.forEach(mesh => {
            if (mesh) {
                mesh.count = 0;
                mesh.visible = false;
            }
        });
    }
    if (treeNearMeshes && treeNearMeshes.length > 0) {
        treeNearMeshes.forEach(mesh => {
            if (mesh) {
                mesh.count = 0;
                mesh.visible = false;
            }
        });
    }

    // ==========================================
    // 5. TOON MATERIALS & MODEL INSTANCING POOL
    // ==========================================
    const gradientMap = matTree ? matTree.gradientMap : null;

    // Stylized Tree Shader:
    // Implements volumetric canopy gradient (inner/underside #1c3b23 to outer #5c8338),
    // 3D spherical normal curvature, 2-tone cel lighting, backlight translucency rim,
    // procedural trunk bark striations with under-canopy AO, and vertex wind sway/flutter.
    function makeInstancedTreeMaterial(sourceMaterial, isFoliage = false, isPine = false, axialBillboard = false) {
        const source = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
        const hasMap = !!(source && source.map);
        const usesCutout = !!(source && (source.alphaTest > 0 || source.transparent || source.alphaMap || (isPine && hasMap)));
        const useAxialBillboard = axialBillboard && isFoliage && usesCutout;

        const material = new THREE.MeshToonMaterial({
            color: 0xffffff,
            map: hasMap ? source.map : null,
            gradientMap: gradientMap,
            dithering: true,
            side: isFoliage ? THREE.DoubleSide : THREE.FrontSide
        });

        material.alphaTest = usesCutout ? Math.max(source?.alphaTest || 0, 0.45) : 0;
        material.transparent = false;
        material.depthWrite = true;
        material.vertexColors = true;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTreeLightFactor = treeLightUniform;
            shader.uniforms.uTreeTime = treeTimeUniform;
            shader.uniforms.uTreeMatcap = treeMatcapUniform;
            shader.uniforms.uUseTreeMatcap = treeUseMatcapUniform;
            shader.uniforms.uTreeMatcapTint = treeMatcapTintUniform;

            const vVaryings = `
uniform float uTreeLightFactor;
uniform float uTreeTime;
varying vec3 vTreeLocalPos;
varying vec3 vTreeWorldPos;
varying vec3 vTreeInstanceColor;
varying float vTreeTone;
varying vec3 vBlendedNormal;
`;

            shader.vertexShader = vVaryings + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                 vTreeLocalPos = position;
                 #if defined(USE_INSTANCING_COLOR)
                 vTreeInstanceColor = instanceColor;
                 #elif defined(USE_COLOR)
                 vTreeInstanceColor = vColor;
                 #else
                 vTreeInstanceColor = vec3(0.361, 0.514, 0.220);
                 #endif

                 vTreeTone = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);

                 ${isFoliage ? `
                 vec3 crownCenter = vec3(0.0, max(position.y * 0.65, 2.2), 0.0);
                 vec3 sphereDir = normalize(position - crownCenter);
                 vec3 adjustedNormal = normalize(mix(normal, sphereDir, 0.55));
                 ` : `
                 vec3 adjustedNormal = normal;
                 `}

                 mat3 instNormalMat = mat3(modelMatrix * instanceMatrix);
                 vBlendedNormal = normalize(instNormalMat * adjustedNormal);

                 vec4 instWorldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
                 vTreeWorldPos = instWorldPos.xyz;

                 // Wind Sway & Flutter (Stylized Tree Sandbox parameters)
                 // Wind Strength: 0.15, Wind Speed: 1.2, Pendulum Dip: 0.05
                 float hFactor = clamp(position.y / 11.0, 0.0, 1.0);
                 float swayCurve = hFactor * hFactor;
                 float swayPhase = uTreeTime * 1.2 + instanceMatrix[3].x * 0.12 + instanceMatrix[3].z * 0.12;
                 float swayX = sin(swayPhase) * 0.15 * swayCurve;
                 float swayZ = cos(swayPhase * 0.85) * 0.10 * swayCurve;
                 float swayDip = -(swayX * swayX + swayZ * swayZ) * 0.05;

                 transformed.x += swayX;
                 transformed.z += swayZ;
                 transformed.y += swayDip;

                 ${isFoliage ? `
                 // Flutter Amplitude: 0.03, Flutter Speed: 2.5
                 // Performance optimization: only compute flutter on trees within 160m
                 float distToCam = length(cameraPosition - vTreeWorldPos);
                 if (distToCam < 160.0) {
                     float flutterFade = 1.0 - smoothstep(70.0, 160.0, distToCam);
                     float branchDist = length(position.xz);
                     float flutterPhase = uTreeTime * 2.5 + position.y * 2.8 + (position.x + position.z) * 1.5;
                     float flutterAmt = sin(flutterPhase) * 0.03 * clamp(branchDist * 0.35, 0.0, 1.0) * flutterFade;
                     transformed += normal * flutterAmt;
                 }
                 ` : ''}`
            );

            if (useAxialBillboard) {
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <project_vertex>',
                    `vec3 instancePosition = instanceMatrix[3].xyz;
                     vec2 cameraDirection = cameraPosition.xz - instancePosition.xz;
                     float cameraDistance = max(length(cameraDirection), 0.0001);
                     cameraDirection /= cameraDistance;
                     vec3 billboardRight = vec3(cameraDirection.y, 0.0, -cameraDirection.x);
                     vec3 billboardForward = vec3(cameraDirection.x, 0.0, cameraDirection.y);
                     float instanceScaleX = length(instanceMatrix[0].xyz);
                     float instanceScaleY = length(instanceMatrix[1].xyz);
                     float instanceScaleZ = length(instanceMatrix[2].xyz);
                     vec3 billboardPosition = instancePosition
                         + billboardRight * transformed.x * instanceScaleX
                         + vec3(0.0, transformed.y * instanceScaleY, 0.0)
                         + billboardForward * transformed.z * instanceScaleZ;
                     vec4 mvPosition = modelViewMatrix * vec4(billboardPosition, 1.0);
                     gl_Position = projectionMatrix * mvPosition;`
                );
            }

            const fVaryings = `
uniform float uTreeLightFactor;
uniform float uTreeTime;
uniform sampler2D uTreeMatcap;
uniform float uUseTreeMatcap;
uniform float uTreeMatcapTint;
varying vec3 vTreeLocalPos;
varying vec3 vTreeWorldPos;
varying vec3 vTreeInstanceColor;
varying float vTreeTone;
varying vec3 vBlendedNormal;
`;
            shader.fragmentShader = fVaryings + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                 float distToCamera = length(cameraPosition - vTreeWorldPos);
                 float distBlur = smoothstep(100.0, 360.0, distToCamera);

                 ${isFoliage ? `
                 // 1. VOLUMETRIC CANOPY GRADIENT & PUFF DEPTH
                 float normH = clamp((vTreeLocalPos.y - 0.5) / 8.5, 0.0, 1.0);
                 float normRadius = clamp(length(vTreeLocalPos.xz) / 3.0, 0.0, 1.0);
                 float canopyHeightExposure = clamp(normH * 0.65 + normRadius * 0.35, 0.0, 1.0);

                 // Underside puff ambient occlusion
                 float upFactor = clamp(vBlendedNormal.y * 0.5 + 0.5, 0.0, 1.0);
                 float puffExposure = clamp(upFactor * 0.55 + canopyHeightExposure * 0.45, 0.0, 1.0);
                 float tGradient = pow(puffExposure, 1.9);

                 // Outer / Top color from tree instance color
                 vec3 colOuter = vTreeInstanceColor;
                 if (dot(colOuter, colOuter) < 0.02) {
                     colOuter = vec3(0.361, 0.514, 0.220);
                 }

                 // Inner / Underside color: deep forest viridian #1c3b23 tone
                 vec3 colInner = mix(vec3(0.110, 0.231, 0.137), colOuter * 0.26, 0.42);

                 // Crown color patches.  These use the mesh position plus the tree's
                 // world position, so every individual tree keeps a stable, hand-painted
                 // looking mix of cool shadow branches and warmer sun-facing branches.
                 // It deliberately happens before lighting, preserving the biome color.
                 float crownAngle = atan(vTreeLocalPos.z, vTreeLocalPos.x);
                 float crownSlice = floor((crownAngle + 3.14159) * 2.15 + vTreeLocalPos.y * 0.52);
                 float crownPatch = fract(sin(crownSlice * 19.19 + floor(vTreeLocalPos.y * 1.35) * 43.71 + vTreeTone * 97.13) * 43758.5453);
                 float crownPatchSoft = smoothstep(0.18, 0.82, crownPatch);
                 vec3 coolBranchColor = clamp(colOuter * vec3(0.56, 0.98, 1.20), 0.0, 1.0);
                 vec3 warmBranchColor = clamp(colOuter * vec3(1.20, 1.14, 0.64), 0.0, 1.0);
                 vec3 crownPatchColor = mix(coolBranchColor, warmBranchColor, crownPatchSoft);
                 float patchStrength = 0.20 + (1.0 - tGradient) * 0.16;
                 colInner = mix(colInner, crownPatchColor * 0.62, patchStrength);

                 // Procedural micro-leaf cellular grain: only evaluate nearby (< 120m) to save fillrate and eliminate far shimmering
                 float activeGrain = 1.0;
                 if (distToCamera < 120.0) {
                     float grainFade = 1.0 - smoothstep(60.0, 120.0, distToCamera);
                     float leafGrain = sin(vTreeLocalPos.x * 20.0) * sin(vTreeLocalPos.y * 20.0) * sin(vTreeLocalPos.z * 20.0) * 0.08;
                     activeGrain += leafGrain * grainFade;
                 }

                 vec3 baseCanopyColor = mix(colInner, colOuter, tGradient);

                 // Let the colored branch facets remain visible on the outer canopy too.
                 // The height mask keeps a clean, sunlit crown tip while the lower layers
                 // gain the richer teal/lime or red/gold variation seen in stylized trees.
                 float outerPatchMask = (1.0 - smoothstep(0.72, 0.98, tGradient)) * (0.34 + 0.26 * (1.0 - crownPatchSoft));
                 baseCanopyColor = mix(baseCanopyColor, crownPatchColor, outerPatchMask);
                 baseCanopyColor *= activeGrain;

                 // MatCap Shader Bank blending
                 if (uUseTreeMatcap > 0.5) {
                     vec3 viewN = normalize((viewMatrix * vec4(vBlendedNormal, 0.0)).xyz);
                     vec2 mcUV = viewN.xy * 0.495 + 0.5;
                     vec3 mcCol = texture2D(uTreeMatcap, mcUV).rgb;
                     baseCanopyColor = mix(mcCol, mcCol * vTreeInstanceColor * 1.5, uTreeMatcapTint);
                 }

                 // 2. DIRECTIONAL SUN LIGHTING & CEL / TOON SHADING
                 vec3 sunDir = normalize(vec3(0.588, 0.784, 0.196));
                 float NdotL = dot(normalize(vBlendedNormal), sunDir);
                 float halfLambert = clamp(NdotL * 0.5 + 0.5, 0.0, 1.0);

                 // Soften cel steps into smooth painterly lighting at distance
                 float toonStep = smoothstep(0.36, 0.44, halfLambert) * 0.48 + smoothstep(0.66, 0.74, halfLambert) * 0.52;
                 float softLighting = mix(toonStep, halfLambert, distBlur * 0.75);

                 vec3 sunlitTint = vec3(1.15, 1.08, 0.94);
                 vec3 skyShadowTint = vec3(0.62, 0.78, 0.92);
                 vec3 lightRamp = mix(skyShadowTint * 0.55, sunlitTint, softLighting);

                 // 3. BACKLIGHT RIM / LEAF TRANSLUCENCY (fade out past 140m for performance)
                 float rimFade = 1.0 - smoothstep(70.0, 140.0, distToCamera);
                 vec3 viewDir = normalize(cameraPosition - vTreeWorldPos);
                 float backLight = max(0.0, dot(-viewDir, sunDir));
                 float leafGlow = pow(backLight, 3.2) * 0.28 * tGradient * rimFade;

                 // 4. COMBINE SHADING
                 vec3 litFoliage = baseCanopyColor * lightRamp + (colOuter * leafGlow * uTreeLightFactor);
                 if (uUseTreeMatcap > 0.5) {
                     litFoliage = mix(baseCanopyColor, baseCanopyColor * lightRamp, 0.35);
                 }

                 ${hasMap ? `
                 // Textured leaves: at distance soften texture contrast so it looks like blurred painterly foliage
                 // Texture supplies leaf detail only; it no longer flattens the new
                 // per-branch color treatment into one dull overall tint.
                 vec3 needleTex = mix(gl_FragColor.rgb * 1.22, vec3(1.0), distBlur * 0.60);
                 litFoliage *= needleTex;
                 ` : ''}

                 // 5. AMBIENT FLOOR (Guarantees visible depth, never pitch black)
                 float dayNightScale = mix(0.42, 1.0, uTreeLightFactor);
                 float ambientFloor = mix(0.25, 0.38, uTreeLightFactor);
                 vec3 finalTreeColor = max(litFoliage * dayNightScale, baseCanopyColor * ambientFloor);

                 // 6. ATMOSPHERIC DISTANCE BLUR & FOG (Softens & blurs further trees into sky haze)
                 vec3 skyAtmosphereColor = mix(vec3(0.64, 0.78, 0.92), vec3(0.30, 0.40, 0.55), 1.0 - uTreeLightFactor);
                 #ifdef USE_FOG
                 skyAtmosphereColor = fogColor;
                 #endif
                 float atmosBlurFactor = smoothstep(110.0, 360.0, distToCamera) * 0.70;
                 finalTreeColor = mix(finalTreeColor, skyAtmosphereColor, atmosBlurFactor);

                 #ifdef USE_FOG
                 #ifdef FOG_EXP2
                 float fFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
                 #else
                 float fFactor = smoothstep( fogNear, fogFar, vFogDepth );
                 #endif
                 finalTreeColor = mix( finalTreeColor, fogColor, fFactor );
                 #endif

                 gl_FragColor.rgb = finalTreeColor;

                 ` : `
                 // TRUNK SHADING
                 float barkGrain = 1.0;
                 if (distToCamera < 120.0) {
                     barkGrain += sin(vTreeLocalPos.y * 5.6 + sin(vTreeLocalPos.x * 12.0) * 0.8) * 0.12 * (1.0 - distBlur);
                 }
                 float trunkAO = mix(0.55, 1.0, clamp(1.0 - (vTreeLocalPos.y / 7.0), 0.0, 1.0));

                 vec3 trunkBase = vTreeInstanceColor;
                 if (dot(trunkBase, trunkBase) < 0.02) {
                     trunkBase = vec3(0.47, 0.35, 0.28);
                 }

                 ${hasMap ? `
                 vec3 litTrunk = gl_FragColor.rgb * barkGrain * trunkAO * 1.25;
                 ` : `
                 vec3 litTrunk = trunkBase * barkGrain * trunkAO * 1.25;
                 `}

                 float trunkDayNight = mix(0.42, 1.0, uTreeLightFactor);
                 float trunkFloor = mix(0.20, 0.30, uTreeLightFactor);
                 vec3 finalTrunkColor = max(litTrunk * trunkDayNight, trunkBase * trunkFloor);

                 // Atmospheric distance blur for trunks
                 vec3 skyAtmosphereColor = mix(vec3(0.64, 0.78, 0.92), vec3(0.30, 0.40, 0.55), 1.0 - uTreeLightFactor);
                 #ifdef USE_FOG
                 skyAtmosphereColor = fogColor;
                 #endif
                 float atmosBlurFactor = smoothstep(110.0, 360.0, distToCamera) * 0.70;
                 finalTrunkColor = mix(finalTrunkColor, skyAtmosphereColor, atmosBlurFactor);

                 #ifdef USE_FOG
                 #ifdef FOG_EXP2
                 float fFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
                 #else
                 float fFactor = smoothstep( fogNear, fogFar, vFogDepth );
                 #endif
                 finalTrunkColor = mix( finalTrunkColor, fogColor, fFactor );
                 #endif

                 gl_FragColor.rgb = finalTrunkColor;
                 `}`
            );
        };

        material.customProgramCacheKey = () => `stylized-tree-${isFoliage ? 'foliage' : 'trunk'}-${hasMap ? 'map' : 'nomap'}-${useAxialBillboard ? 'axial' : 'fixed'}`;
        return material;
    }

    // Dynamic instance pool: inactive slots cost 0 draw calls because
    // count is dynamically matched to living instances.
    const MODEL_POOL_CAP = LOW_GFX ? 150 : 350;
    const loadedModels = new Map();

    function loadModelEntry(modelDef, onReady) {
        if (loadedModels.has(modelDef.id)) {
            const entry = loadedModels.get(modelDef.id);
            if (onReady) onReady(entry);
            return entry;
        }

        const entry = {
            def: modelDef,
            isLoaded: false,
            isTwoPart: false,
            instTrunk: null,
            instLeaves: null,
            instSingle: null,
            poolCap: MODEL_POOL_CAP,
            cursor: 0,
            slots: new Array(MODEL_POOL_CAP).fill(null)
        };
        loadedModels.set(modelDef.id, entry);

        if (!gltfLoader) {
            console.warn('gltfLoader is not available for tree loading');
            return entry;
        }

        gltfLoader.load('assets/trees/' + modelDef.file, (gltf) => {
            const childMeshes = [];
            const isPine = modelDef.id.startsWith('pine_');
            const axialBillboard = modelDef.id.startsWith('pine_c_');
            gltf.scene.traverse((child) => {
                if (child.isMesh) childMeshes.push(child);
            });

            if (childMeshes.length >= 2) {
                entry.isTwoPart = true;
                const trunkGeo = childMeshes[0].geometry.clone();
                const leavesGeo = childMeshes[1].geometry.clone();
                trunkGeo.computeVertexNormals();
                leavesGeo.computeVertexNormals();

                entry.instTrunk = new THREE.InstancedMesh(
                    trunkGeo,
                    makeInstancedTreeMaterial(childMeshes[0].material, false, isPine, axialBillboard),
                    MODEL_POOL_CAP
                );
                entry.instLeaves = new THREE.InstancedMesh(
                    leavesGeo,
                    makeInstancedTreeMaterial(childMeshes[1].material, true, isPine, axialBillboard),
                    MODEL_POOL_CAP
                );

                entry.instTrunk.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MODEL_POOL_CAP * 3).fill(1), 3);
                entry.instLeaves.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MODEL_POOL_CAP * 3).fill(1), 3);

                entry.instTrunk.castShadow = false;
                entry.instTrunk.receiveShadow = true;
                entry.instTrunk.frustumCulled = false;

                entry.instLeaves.castShadow = false;
                entry.instLeaves.receiveShadow = true;
                entry.instLeaves.frustumCulled = false;

                for (let i = 0; i < MODEL_POOL_CAP; i++) {
                    entry.instTrunk.setMatrixAt(i, dummyMatrix);
                    entry.instLeaves.setMatrixAt(i, dummyMatrix);
                }
                entry.instTrunk.instanceMatrix.needsUpdate = true;
                entry.instLeaves.instanceMatrix.needsUpdate = true;

                scene.add(entry.instTrunk);
                scene.add(entry.instLeaves);
            } else if (childMeshes.length === 1) {
                entry.isTwoPart = false;
                const singleGeo = childMeshes[0].geometry.clone();
                singleGeo.computeVertexNormals();

                entry.instSingle = new THREE.InstancedMesh(
                    singleGeo,
                    makeInstancedTreeMaterial(childMeshes[0].material, true, isPine, axialBillboard),
                    MODEL_POOL_CAP
                );
                entry.instSingle.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MODEL_POOL_CAP * 3).fill(1), 3);

                entry.instSingle.castShadow = false;
                entry.instSingle.receiveShadow = true;
                entry.instSingle.frustumCulled = false;

                for (let i = 0; i < MODEL_POOL_CAP; i++) {
                    entry.instSingle.setMatrixAt(i, dummyMatrix);
                }
                entry.instSingle.instanceMatrix.needsUpdate = true;
                scene.add(entry.instSingle);
            }

            entry.isLoaded = true;
            // A checkbox can be enabled while its GLB is still downloading.
            // Request a complete placement pass now that the mesh exists.
            forceFullTreeUpdate = true;
            if (onReady) onReady(entry);
        }, undefined, (err) => {
            console.warn('Could not load tree GLB:', modelDef.file, err);
        });

        return entry;
    }

    function preloadActiveModels() {
        const activeIds = new Set();
        Object.keys(biomeTreeConfigs).forEach(bId => {
            const cfg = biomeTreeConfigs[bId];
            if (cfg.enabled && cfg.activeModels) {
                cfg.activeModels.forEach(mId => activeIds.add(mId));
            }
        });

        activeIds.forEach(id => {
            if (ALL_TREE_MODELS[id]) {
                loadModelEntry(ALL_TREE_MODELS[id]);
            }
        });
    }

    preloadActiveModels();

    function doRefreshAllTrees() {
        // The editor can enable a model after startup. Always load every selected
        // model here so a biome change cannot depend on the Ghibli-only preload.
        preloadActiveModels();
        treeGrid.clear();
        loadedModels.forEach(entry => {
            for (let i = 0; i < entry.poolCap; i++) {
                if (entry.instTrunk) entry.instTrunk.setMatrixAt(i, dummyMatrix);
                if (entry.instLeaves) entry.instLeaves.setMatrixAt(i, dummyMatrix);
                if (entry.instSingle) entry.instSingle.setMatrixAt(i, dummyMatrix);
                entry.slots[i] = null;
            }
            if (entry.instTrunk) {
                entry.instTrunk.instanceMatrix.needsUpdate = true;
                entry.instTrunk.count = entry.poolCap;
            }
            if (entry.instLeaves) {
                entry.instLeaves.instanceMatrix.needsUpdate = true;
                entry.instLeaves.count = entry.poolCap;
            }
            if (entry.instSingle) {
                entry.instSingle.instanceMatrix.needsUpdate = true;
                entry.instSingle.count = entry.poolCap;
            }
        });
        // The very next simulation update repopulates every selected model
        // instead of waiting for the usual six-frame streaming rotation.
        forceFullTreeUpdate = true;
    }

    function doRefreshBiomeColors(targetBiomeId) {
        const cfg = getBiomeTreeConfig(targetBiomeId);
        if (!cfg) return;

        loadedModels.forEach(entry => {
            let updated = false;
            for (let i = 0; i < entry.poolCap; i++) {
                const slotData = entry.slots[i];
                if (slotData && slotData.biomeId === targetBiomeId) {
                    const folCol = applyColorVariation(cfg.foliageColor, cfg.hueVariation, cfg.tintVariation);
                    const trkCol = applyColorVariation(cfg.trunkColor, cfg.hueVariation * 0.5, cfg.tintVariation);

                    if (entry.instLeaves) entry.instLeaves.setColorAt(i, folCol);
                    if (entry.instTrunk) entry.instTrunk.setColorAt(i, trkCol);
                    if (entry.instSingle) entry.instSingle.setColorAt(i, folCol);
                    updated = true;
                }
            }
            if (updated) {
                if (entry.instLeaves && entry.instLeaves.instanceColor) entry.instLeaves.instanceColor.needsUpdate = true;
                if (entry.instTrunk && entry.instTrunk.instanceColor) entry.instTrunk.instanceColor.needsUpdate = true;
                if (entry.instSingle && entry.instSingle.instanceColor) entry.instSingle.instanceColor.needsUpdate = true;
            }
        });
    }

    activeTreeManager = {
        refreshAllTrees: doRefreshAllTrees,
        refreshBiomeColors: doRefreshBiomeColors
    };

    if (typeof window !== 'undefined') {
        window.loadModelEntry = loadModelEntry;
        window.__treeInstanceManager = activeTreeManager;
    }

    // ==========================================
    // 7. SPATIAL STREAMING & INSTANCE UPDATES
    // ==========================================
    // A fixed grid lets nearby models with different per-biome spacing rules
    // share one reliable collision check. The previous variable-sized keys only
    // prevented duplicates in the exact same cell, so trees could overlap at
    // cell borders and different model types could stack on one another.
    const TREE_GRID_CELL_SIZE = 6.0;
    const WATER_CLEARANCE_HEIGHT = 3.25;

    function getTreeGridKey(x, z) {
        return Math.floor(x / TREE_GRID_CELL_SIZE) + '_' + Math.floor(z / TREE_GRID_CELL_SIZE);
    }

    function hasNearbyTree(x, z, minDistance) {
        const cellX = Math.floor(x / TREE_GRID_CELL_SIZE);
        const cellZ = Math.floor(z / TREE_GRID_CELL_SIZE);
        const cellRadius = Math.ceil(minDistance / TREE_GRID_CELL_SIZE);

        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
            for (let dx = -cellRadius; dx <= cellRadius; dx++) {
                const other = treeGrid.get((cellX + dx) + '_' + (cellZ + dz));
                if (!other) continue;

                const requiredDistance = Math.max(minDistance, other.minDistance || 0);
                const offsetX = x - other.x;
                const offsetZ = z - other.z;
                if (offsetX * offsetX + offsetZ * offsetZ < requiredDistance * requiredDistance) {
                    return true;
                }
            }
        }
        return false;
    }

    function passesDensity(nx, nz, density) {
        const clampedDensity = Math.max(0.1, Math.min(1.0, density ?? 0.75));
        const stand = (snoise(nx * 0.002, nz * 0.002) + 1.0) * 0.5;
        const site = (snoise(nx * 0.025 + 100.0, nz * 0.025 - 100.0) + 1.0) * 0.5;
        return site <= (clampedDensity * 0.78 + stand * 0.22);
    }

    function getModelBiomeQuota(cfg, poolCap) {
        const selectedModelCount = Math.max(1, (cfg.activeModels || []).length);
        const biomeBudget = Math.max(0, cfg.count ?? 550);
        return Math.max(1, Math.min(poolCap, Math.ceil(biomeBudget / selectedModelCount)));
    }

    function updateInstances(playerX, playerZ, time, dt, playerYaw) {
        currentFrame++;
        const dist = treeDist;
        treeLightUniform.value = Math.max(0.25, Math.min(1.0, getTreeLightFactor()));
        treeTimeUniform.value = (typeof time === 'number') ? time : 0.0;

        if (camera) {
            vegOctree.update(camera, playerX, playerZ, dist);
        }

        logicTimer += dt;
        const shouldUpdateTerrain = logicTimer >= (1.0 / 15.0);
        if (shouldUpdateTerrain) {
            logicTimer = 0;
        }

        const playerY = (typeof window !== 'undefined' && window.playerGrp) ? window.playerGrp.position.y : 0;
        const treesCulledByAlt = playerY > 650;

        loadedModels.forEach(entry => {
            const isVis = params.showTrees && !treesCulledByAlt;
            if (entry.instTrunk) entry.instTrunk.visible = isVis;
            if (entry.instLeaves) entry.instLeaves.visible = isVis;
            if (entry.instSingle) entry.instSingle.visible = isVis;
        });

        if (shouldUpdateTerrain && !treesCulledByAlt && params.showTrees) {
            const runFullTreeUpdate = forceFullTreeUpdate;
            loadedModels.forEach((entry, modelId) => {
                if (!entry.isLoaded) return;

                const count = entry.poolCap;
                let modelUpdated = false;
                const nearbySlotsByBiome = new Map();

                // A biome's count is a total vegetation budget, not a budget for
                // every selected model. This keeps "Select All" from multiplying
                // instance count and protects frame time.
                for (const slot of entry.slots) {
                    if (!slot) continue;
                    const dx = slot.x - playerX;
                    const dz = slot.z - playerZ;
                    if (dx * dx + dz * dz <= treeDist * treeDist) {
                        nearbySlotsByBiome.set(slot.biomeId, (nearbySlotsByBiome.get(slot.biomeId) || 0) + 1);
                    }
                }

                // 1. If this model is not active in any enabled biome right now, despawn all its slots
                const isModelActiveAnywhere = Object.keys(biomeTreeConfigs).some(bId => {
                    const c = biomeTreeConfigs[bId];
                    return c && c.enabled && c.activeModels && c.activeModels.includes(modelId);
                });

                if (!isModelActiveAnywhere) {
                    let hadLive = false;
                    for (let s = 0; s < count; s++) {
                        if (entry.slots[s]) {
                            treeGrid.delete(entry.slots[s].cellKey);
                            entry.slots[s] = null;
                            if (entry.instTrunk) entry.instTrunk.setMatrixAt(s, dummyMatrix);
                            if (entry.instLeaves) entry.instLeaves.setMatrixAt(s, dummyMatrix);
                            if (entry.instSingle) entry.instSingle.setMatrixAt(s, dummyMatrix);
                            hadLive = true;
                        }
                    }
                    if (hadLive) {
                        if (entry.instTrunk) entry.instTrunk.instanceMatrix.needsUpdate = true;
                        if (entry.instLeaves) entry.instLeaves.instanceMatrix.needsUpdate = true;
                        if (entry.instSingle) entry.instSingle.instanceMatrix.needsUpdate = true;
                    }
                    return;
                }

                const slotStart = runFullTreeUpdate ? 0 : currentFrame % 6;
                const slotStep = runFullTreeUpdate ? 1 : 6;
                for (let i = slotStart; i < count; i += slotStep) {
                    const slotData = entry.slots[i];
                    let needsReposition = false;

                    if (!slotData) {
                        needsReposition = true;
                    } else {
                        // 2. Validate that this tree instance is STILL permitted in its assigned biome
                        const curCfg = getBiomeTreeConfig(slotData.biomeId);
                        if (!curCfg || !curCfg.enabled || !curCfg.activeModels || !curCfg.activeModels.includes(modelId)) {
                            needsReposition = false;
                            treeGrid.delete(slotData.cellKey);
                            entry.slots[i] = null;
                            if (entry.instTrunk) entry.instTrunk.setMatrixAt(i, dummyMatrix);
                            if (entry.instLeaves) entry.instLeaves.setMatrixAt(i, dummyMatrix);
                            if (entry.instSingle) entry.instSingle.setMatrixAt(i, dummyMatrix);
                            modelUpdated = true;
                            continue;
                        }

                        const tdx = slotData.x - playerX;
                        const tdz = slotData.z - playerZ;
                        if (tdx * tdx + tdz * tdz > treeDist * treeDist) {
                            needsReposition = true;
                            treeGrid.delete(slotData.cellKey);
                            entry.slots[i] = null;
                        }
                    }

                    if (needsReposition) {
                        let valid = false;
                        let nx, nz, h, cellKey, treeSlope = 0;
                        let chosenBiome = null;
                        let bConfig = null;
                        let attempts = 0;

                        while (!valid && attempts < 5) {
                            const ang = Math.random() * Math.PI * 2.0;
                            const rad = treeDist * Math.sqrt(Math.random());
                            nx = playerX + Math.cos(ang) * rad;
                            nz = playerZ + Math.sin(ang) * rad;

                            if (vegOctree.isPointInViewFrustum(nx, 10, nz) || attempts > 2) {
                                const curB = getBiomeAt(nx, nz);
                                const biomeId = curB ? curB.id : null;
                                if (!biomeId || biomeId === 'open_ocean') {
                                    attempts++;
                                    continue;
                                }
                                const cfg = getBiomeTreeConfig(biomeId);

                                if (cfg && cfg.enabled && cfg.activeModels && cfg.activeModels.includes(modelId)) {
                                    const biomeQuota = getModelBiomeQuota(cfg, count);
                                    if ((nearbySlotsByBiome.get(biomeId) || 0) >= biomeQuota) {
                                        attempts++;
                                        continue;
                                    }

                                    h = getMeshHeight ? getMeshHeight(nx, nz) : getWorldHeight(nx, nz);
                                    treeSlope = getMeshSlope ? getMeshSlope() : 0;

                                    // Keep roots above the visible waterline as well as each
                                    // biome's configured altitude range.
                                    const minGroundHeight = Math.max(cfg.minHeight, WATER_CLEARANCE_HEIGHT);
                                    if (h >= minGroundHeight && h <= cfg.maxHeight) {
                                        if (treeSlope < 0.52) {
                                            const pathVal = getPathStrength ? getPathStrength(nx, nz) : 0;
                                            if (pathVal < 0.08) {
                                                if (passesDensity(nx, nz, cfg.density)) {
                                                    const minDistance = Math.max(6.0, cfg.minDistance || 16.0);
                                                    cellKey = getTreeGridKey(nx, nz);

                                                    if (!hasNearbyTree(nx, nz, minDistance)) {
                                                        valid = true;
                                                        chosenBiome = biomeId;
                                                        bConfig = cfg;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            attempts++;
                        }

                        if (valid && bConfig) {
                            const minDistance = Math.max(6.0, bConfig.minDistance || 16.0);
                            treeGrid.set(cellKey, { x: nx, z: nz, modelId, slot: i, minDistance });
                            entry.slots[i] = { x: nx, z: nz, cellKey, biomeId: chosenBiome };
                            nearbySlotsByBiome.set(chosenBiome, (nearbySlotsByBiome.get(chosenBiome) || 0) + 1);

                            // getMeshHeight already gives the drawn terrain surface. Sinking
                            // trees by their slope caused visibly buried trunks on hillsides.
                            dummy.position.set(nx, h - 0.1, nz);
                            dummy.rotation.set(0, Math.random() * Math.PI * 2.0, 0);

                            const baseScale = (bConfig.scale || 1.0) * (params.treeScale ? (params.treeScale / 3.75) : 1.0);
                            const scaleRand = baseScale * (0.85 + Math.random() * 0.35);
                            dummy.scale.set(scaleRand, scaleRand, scaleRand);
                            dummy.updateMatrix();

                            const folColor = applyColorVariation(bConfig.foliageColor, bConfig.hueVariation, bConfig.tintVariation);
                            const trkColor = applyColorVariation(bConfig.trunkColor, bConfig.hueVariation * 0.5, bConfig.tintVariation);

                            if (entry.instTrunk) {
                                entry.instTrunk.setMatrixAt(i, dummy.matrix);
                                entry.instTrunk.setColorAt(i, trkColor);
                            }
                            if (entry.instLeaves) {
                                entry.instLeaves.setMatrixAt(i, dummy.matrix);
                                entry.instLeaves.setColorAt(i, folColor);
                            }
                            if (entry.instSingle) {
                                entry.instSingle.setMatrixAt(i, dummy.matrix);
                                entry.instSingle.setColorAt(i, folColor);
                            }

                            modelUpdated = true;
                        } else {
                            if (entry.slots[i] !== null) {
                                if (entry.instTrunk) entry.instTrunk.setMatrixAt(i, dummyMatrix);
                                if (entry.instLeaves) entry.instLeaves.setMatrixAt(i, dummyMatrix);
                                if (entry.instSingle) entry.instSingle.setMatrixAt(i, dummyMatrix);
                                entry.slots[i] = null;
                                modelUpdated = true;
                            }
                        }
                    }
                }

                if (modelUpdated) {
                    if (entry.instTrunk) {
                        entry.instTrunk.instanceMatrix.needsUpdate = true;
                        if (entry.instTrunk.instanceColor) entry.instTrunk.instanceColor.needsUpdate = true;
                    }
                    if (entry.instLeaves) {
                        entry.instLeaves.instanceMatrix.needsUpdate = true;
                        if (entry.instLeaves.instanceColor) entry.instLeaves.instanceColor.needsUpdate = true;
                    }
                    if (entry.instSingle) {
                        entry.instSingle.instanceMatrix.needsUpdate = true;
                        if (entry.instSingle.instanceColor) entry.instSingle.instanceColor.needsUpdate = true;
                    }
                }
            });
            forceFullTreeUpdate = false;

            // Rocks
            if (instRocks && ROCK_COUNT > 0) {
                let rocksUpdated = false;
                for (let i = currentFrame % 5; i < ROCK_COUNT; i += 5) {
                    instRocks.getMatrixAt(i, dummy.matrix);
                    dummy.position.setFromMatrixPosition(dummy.matrix);

                    if (Math.abs(dummy.position.x - playerX) > dist || Math.abs(dummy.position.z - playerZ) > dist || dummy.position.y < -500) {
                        const nx = playerX + (Math.random() - 0.5) * dist * 2.0;
                        const nz = playerZ + (Math.random() - 0.5) * dist * 2.0;
                        const h = getWorldHeight(nx, nz);

                        if (h > 0.0 && (!getPathStrength || getPathStrength(nx, nz) < 0.1)) {
                            dummy.position.set(nx, h, nz);
                            dummy.rotation.set(Math.random(), Math.random(), Math.random());
                            dummy.scale.set(0.7 + Math.random() * 2.0, 0.5 + Math.random() * 1.5, 0.7 + Math.random() * 2.0);
                        } else {
                            dummy.position.set(0, -1000, 0);
                        }
                        dummy.updateMatrix();
                        instRocks.setMatrixAt(i, dummy.matrix);
                        rocksUpdated = true;
                    }
                }
                if (rocksUpdated) instRocks.instanceMatrix.needsUpdate = true;
            }

            // Bushes
            if (instBushes && BUSH_COUNT > 0) {
                let bushesUpdated = false;
                for (let i = currentFrame % 10; i < BUSH_COUNT; i += 10) {
                    instBushes.getMatrixAt(i, dummy.matrix);
                    dummy.position.setFromMatrixPosition(dummy.matrix);

                    if (Math.abs(dummy.position.x - playerX) > dist || Math.abs(dummy.position.z - playerZ) > dist || dummy.position.y < -500) {
                        const nx = playerX + (Math.random() - 0.5) * dist * 2.0;
                        const nz = playerZ + (Math.random() - 0.5) * dist * 2.0;

                        if (vegOctree.isPointInViewFrustum(nx, 10, nz)) {
                            const h = getWorldHeight(nx, nz);
                            let isClearing = snoise(nx * 0.003, nz * 0.003 + 50) > 0.2;
                            let validBush = isClearing ? (Math.random() < 0.2) : (Math.random() < 0.05);

                            if (validBush && h > 3.0 && h < 18.0 && (!getPathStrength || getPathStrength(nx, nz) < 0.1)) {
                                dummy.position.set(nx, h - 0.1, nz);
                                dummy.rotation.set(0, Math.random() * Math.PI, 0);
                                dummy.scale.setScalar(0.7 + Math.random() * 1.6);
                            } else {
                                dummy.position.set(0, -1000, 0);
                            }
                        } else {
                            dummy.position.set(0, -1000, 0);
                        }
                        dummy.updateMatrix();
                        instBushes.setMatrixAt(i, dummy.matrix);
                        bushesUpdated = true;
                    }
                }
                if (bushesUpdated) instBushes.instanceMatrix.needsUpdate = true;
            }

            // Flowers
            if (instFlowers && FLOWER_COUNT > 0 && flowerColors) {
                let flowersUpdated = false;
                for (let i = currentFrame % 10; i < FLOWER_COUNT; i += 10) {
                    instFlowers.getMatrixAt(i, dummy.matrix);
                    dummy.position.setFromMatrixPosition(dummy.matrix);

                    if (Math.abs(dummy.position.x - playerX) > dist || Math.abs(dummy.position.z - playerZ) > dist || dummy.position.y < -500) {
                        const nx = playerX + (Math.random() - 0.5) * dist * 2.0;
                        const nz = playerZ + (Math.random() - 0.5) * dist * 2.0;

                        if (vegOctree.isPointInViewFrustum(nx, 10, nz)) {
                            const h = getWorldHeight(nx, nz);
                            let isClearing = snoise(nx * 0.003, nz * 0.003 + 50) > 0.2;
                            let validFlower = isClearing ? (Math.random() < 0.8) : (Math.random() < 0.05);

                            if (validFlower && h > 2.0 && h < 18.0 && (!getPathStrength || getPathStrength(nx, nz) < 0.1)) {
                                dummy.position.set(nx, h - 0.05, nz);
                                dummy.rotation.set(0, Math.random() * Math.PI, 0);
                                dummy.scale.set(1, 1, 1);
                                let cNoise = snoise(nx * 0.005, nz * 0.005);
                                let cIdx = Math.floor(((cNoise + 1.0) / 2.0) * flowerColors.length);
                                tempFlowerColor.setHex(flowerColors[Math.min(flowerColors.length - 1, Math.max(0, cIdx))]);
                                instFlowers.setColorAt(i, tempFlowerColor);
                            } else {
                                dummy.position.set(0, -1000, 0);
                            }
                        } else {
                            dummy.position.set(0, -1000, 0);
                        }
                        dummy.updateMatrix();
                        instFlowers.setMatrixAt(i, dummy.matrix);
                        flowersUpdated = true;
                    }
                }
                if (flowersUpdated) {
                    instFlowers.instanceMatrix.needsUpdate = true;
                    instFlowers.instanceColor.needsUpdate = true;
                }
            }
        }
    }

    function applyGLBPineTree(gltf, targetInstancedMeshes, targetHeight) {
        // Compatibility stub
    }

    return {
        updateInstances,
        updateTreeLOD,
        applyGLBPineTree
    };
}
