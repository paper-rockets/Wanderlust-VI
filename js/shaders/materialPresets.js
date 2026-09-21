import * as THREE from 'three';
import { DOPAMINE_PRESETS } from './dopaminePresets.js';
import { GLASS_PRESETS } from './glassPresets.js';
import { PLAYDOH_PRESETS } from './playdohPresets.js';
import {
  TOON_PRESETS,
  FLAT_COLOR_PRESETS,
  BRIGHT_COLOR_PRESETS,
  METAL_PRESETS,
  CLAY_PRESETS,
  GEMS_PRESETS,
} from './summerShaders.js';
import { FUN_MAGIC_SHADERS } from './funMagicShaders.js';
import { WONDERLUST_PRESETS } from './wonderlustPresets.js';
import { MARBLE_PRESETS } from './marbleShaders.js';
import { BLOBMIXER_MATERIAL_PRESETS } from './blobmixerShaders.js';

let sharedCanvas = null;

export function createMatCap(drawFn, width = 256, height = 256) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  if (!drawFn || typeof drawFn !== 'function') return '';

  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
  }
  sharedCanvas.width = width;
  sharedCanvas.height = height;
  const ctx = sharedCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, width, height);
  drawFn(ctx, width, height);
  return sharedCanvas.toDataURL('image/png');
}

export const STUDIO_MATCAP_PRESETS = [
  { id: 'matcap_toon', name: 'Toon Cel Studio', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/toon.jpeg' },
  { id: 'matcap_jade', name: 'Imperial Jade', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/jade.jpeg' },
  { id: 'matcap_pearl', name: 'Iridescent Pearl', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/pearl.jpeg' },
  { id: 'matcap_clay_brown', name: 'Terracotta Brown', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/clay_brown.jpeg' },
  { id: 'matcap_clay_studio', name: 'Studio Sculpt Clay', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/clay_studio.jpeg' },
  { id: 'matcap_clay_muddy', name: 'Muddy Earth Clay', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/clay_muddy.jpeg' },
  { id: 'matcap_ceramic_dark', name: 'Obsidian Ceramic', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/ceramic_dark.jpeg' },
  { id: 'matcap_ceramic_lightbulb', name: 'Ceramic Glow', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/ceramic_lightbulb.jpeg' },
  { id: 'matcap_metal_shiny', name: 'Polished Chrome', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/metal_shiny.jpeg' },
  { id: 'matcap_metal_carpaint', name: 'Metallic Carpaint', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/metal_carpaint.jpeg' },
  { id: 'matcap_metal_lead', name: 'Brushed Lead Metal', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/metal_lead.jpeg' },
  { id: 'matcap_metal_anisotropic', name: 'Anisotropic Steel', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/metal_anisotropic.jpeg' },
  { id: 'matcap_resin', name: 'Amber Resin', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/resin.jpeg' },
  { id: 'matcap_skin', name: 'Soft Velvet Skin', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/skin.jpeg' },
  { id: 'matcap_basic_1', name: 'Studio Neutral Light', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/basic_1.jpg' },
  { id: 'matcap_basic_2', name: 'Studio Soft Light', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/basic_2.jpg' },
  { id: 'matcap_basic_dark', name: 'Studio Moody Dark', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/basic_dark.jpeg' },
  { id: 'matcap_basic_side', name: 'High Key Rim Light', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/basic_side.jpeg' },
  { id: 'matcap_check_rim_light', name: 'Studio Rim Light White', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/check_rim_light.jpeg' },
  { id: 'matcap_check_rim_dark', name: 'Studio Rim Light Dark', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/check_rim_dark.jpeg' },
  { id: 'matcap_cosmic_fusion', name: 'Cosmic Fusion Gel', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/06_cosmic-fusion.c57d060d2ead19c63024.png' },
  { id: 'matcap_deep_ocean', name: 'Deep Ocean Biolum', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/07_deep-ocean.4d28da9d4d6affe2720a.png' },
  { id: 'matcap_lucky_day', name: 'Lucky Mint Emerald', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/08_lucky-day.417fad6f0e628f2c7b88.png' },
  { id: 'matcap_sunset_vibes', name: 'Sunset Vibes Velvet', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/09_sunset-vibes.059f54a69dc6a4d1bd1a.png' },
  { id: 'matcap_foil', name: 'Holographic Foil', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/11_foil.e5e53d38ad69f795876c.png' },
  { id: 'matcap_hologram', name: 'Cyber Hologram', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/13_hollogram.b58175f231f43fd02700.png' },
  { id: 'matcap_imaginarium', name: 'Imaginarium Dream', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/14_imaginarium.12a79d03b7fe54603367.png' },
  { id: 'matcap_iridescent_oil', name: 'Iridescent Oil Slick', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/15_iridescent.5ca76e71bfac053ac80f.png' },
  { id: 'matcap_sirens', name: 'Sirens Violet Coral', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/17_sirens.d6898ed7f2f00009db64.png' },
  { id: 'matcap_synthwave', name: 'Retro Synthwave Neon', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/18_synthwave.4cd0536bbe9ac1a4d74e.png' },
  { id: 'matcap_grad_primary', name: 'Dynamic Primaries', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/02_gradient-primary-variation.b581b4bf70c233adc942.png' },
  { id: 'matcap_grad_secondary', name: 'Aurora Sunset', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/03_gradient-secondary.1d6af076d5b5997e8bb1.png' },
  { id: 'matcap_grad_alert', name: 'Electric Flame Amber', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/05_gradient-alert.f5301ac20087c7fedfdf.png' },
  { id: 'matcap_grad_error', name: 'Crimson Rose Gloss', category: '🎨 Studio Matcaps', type: 'matcap', url: 'assets/matcaps/04_gradient-error.7f52eea76d121e496b7d.png' },
];

function makeLazyPreset(p) {
  let cachedUrl = p.url || null;
  return {
    ...p,
    get url() {
      if (cachedUrl) return cachedUrl;
      if (typeof p.generate === 'function') {
        cachedUrl = createMatCap(p.generate, 256, 256);
      }
      return cachedUrl;
    }
  };
}

const RAW_PRESETS = [
  ...STUDIO_MATCAP_PRESETS,
  ...TOON_PRESETS,
  ...DOPAMINE_PRESETS,
  ...FUN_MAGIC_SHADERS,
  ...PLAYDOH_PRESETS,
  ...GLASS_PRESETS,
  ...MARBLE_PRESETS,
  ...WONDERLUST_PRESETS,
  ...BLOBMIXER_MATERIAL_PRESETS,
  ...FLAT_COLOR_PRESETS,
  ...BRIGHT_COLOR_PRESETS,
  ...METAL_PRESETS,
  ...CLAY_PRESETS,
  ...GEMS_PRESETS
];

export const ALL_MATERIAL_PRESETS = RAW_PRESETS.map(makeLazyPreset);

export const PRESET_CATEGORIES = [
  'All',
  '🎨 Studio Matcaps',
  'Toon Shaders',
  '✨ Iridescent & Dichroic',
  '✨ Fun & Magic',
  '🧸 Play-Doh & Clay',
  '🔮 Glass & Crystal',
  '🏛️ Marble & Stone',
  '🌍 Wonderlust',
  '🌌 Space & Dopamine',
  'Flat Colors',
  'Bright Colors',
  'Metals',
  'Clay Shaders',
  'Gems & Crystals'
];

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

export function getMatcapTexture(preset) {
  if (!preset) return null;
  if (preset.id && textureCache.has(preset.id)) {
    return textureCache.get(preset.id);
  }

  if (typeof preset.generate === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      preset.generate(ctx, 256, 256);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      textureCache.set(preset.id, texture);
      return texture;
    }
  }

  const url = preset.url;
  if (url) {
    const texture = textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(preset.id, texture);
    return texture;
  }

  return null;
}
