// Game Configuration & Quality Tier Detection
const _savedGfx = localStorage.getItem('gfxQuality');
export const LOW_GFX = _savedGfx === 'low'
    || (_savedGfx == null && typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4);

export const TERRAIN_SIZE = 3200; // ground patch that follows the player (12.5m vertex spacing at 256)
