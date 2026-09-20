import * as THREE from 'three';
import { WorldLayout, BIOME_CATALOG } from '../world-layout.js';
import { snoise } from './noise.js';

// ==========================================
// 2. PROCEDURAL 2D WORLD LAYOUT & SPATIAL ENGINE
// ==========================================
export let currentWorldSeed = 482731;
export let worldLayout = new WorldLayout(currentWorldSeed);
export let showDebugMapOverlay = false;

const blendColor1 = new THREE.Color();
const blendColor2 = new THREE.Color();

export function getWorldHeight(worldX, worldZ) {
    return worldLayout.getHeight(worldX, worldZ, snoise);
}

export function getWorldColor(h, worldX, worldZ, targetColor) {
    worldLayout.getColor(h, worldX, worldZ, snoise, targetColor, blendColor1, blendColor2);
}

export function getBiomeAt(worldX, worldZ) {
    return worldLayout.getBiomeAt(worldX, worldZ, snoise);
}

export function isTreeZone(worldX, worldZ) {
    const b = getBiomeAt(worldX, worldZ);
    if (!b || b.id === 'open_ocean') return false;
    if (typeof window !== 'undefined' && typeof window.getBiomeTreeConfig === 'function') {
        const cfg = window.getBiomeTreeConfig(b.id);
        if (cfg) return !!cfg.enabled && Array.isArray(cfg.activeModels) && cfg.activeModels.length > 0;
    }
    return false;
}

export function setWorldSeed(seed) {
    currentWorldSeed = seed;
    worldLayout = new WorldLayout(currentWorldSeed);
    return worldLayout;
}

export const _mapName = (biome) => biome ? biome.name.replace(/^[^A-Za-z]+/, '') : '';
export { WorldLayout, BIOME_CATALOG };
