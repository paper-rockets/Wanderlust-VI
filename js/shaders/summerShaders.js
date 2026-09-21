export const SUMMER_SHADERS = [];

// 2. TOON & CEL SHADING PRESETS
export const TOON_PRESETS = [
  {
    id: 'toon_classic_2tone',
    name: 'Toon Classic 2-Tone',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ecf0f1';
      ctx.beginPath(); ctx.arc(w * 0.58, h * 0.42, w * 0.46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.32, w * 0.12, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'toon_anime_3tone',
    name: 'Toon Anime 3-Tone',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#4b4b66';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8b500';
      ctx.beginPath(); ctx.arc(w * 0.55, h * 0.45, w * 0.44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffa65';
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.38, w * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.32, w * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'toon_manga_ink',
    name: 'Toon Manga Ink & White',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#050505';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.56, h * 0.44, w * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = w * 0.04;
      ctx.beginPath(); ctx.arc(w/2, h/2, w * 0.48, 0, Math.PI * 2); ctx.stroke();
    }
  },
  {
    id: 'toon_warm_comic',
    name: 'Toon Warm Comic Book',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#574b90';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e15f41';
      ctx.beginPath(); ctx.arc(w * 0.55, h * 0.45, w * 0.44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7d794';
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.38, w * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.32, w * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'toon_cyber_cel',
    name: 'Toon Cyber Neon Cel',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#1e0038';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9b59b6';
      ctx.beginPath(); ctx.arc(w * 0.55, h * 0.45, w * 0.44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.38, w * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.32, w * 0.12, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'toon_pastel_anime',
    name: 'Toon Pastel Dream',
    category: 'Toon Shaders',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#778beb';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8a5c2';
      ctx.beginPath(); ctx.arc(w * 0.55, h * 0.45, w * 0.44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ea8685';
      ctx.beginPath(); ctx.arc(w * 0.62, h * 0.38, w * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w * 0.68, h * 0.32, w * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  },
  { id: 'toon_extracted', name: 'Authentic Toon Cel', category: 'Toon Shaders', url: '/assets/matcaps/toon.jpeg' },
  { id: 'check_rim_dark_toon', name: 'Toon Rim Shadow Check', category: 'Toon Shaders', url: '/assets/matcaps/check_rim_dark.jpeg' }
];

// 3. FLAT & GRAPHIC COLORS
export const FLAT_COLOR_PRESETS = [
  {
    id: 'flat_graphic_white',
    name: 'Flat Graphic White',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
    {
    id: 'flat_pop_red',
    name: 'Flat Pop Art Red',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#ff3838';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'flat_cyber_yellow',
    name: 'Flat Cyber Yellow',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#ffd32a';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'flat_electric_blue',
    name: 'Flat Electric Blue',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#18dcff';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'flat_vibrant_orange',
    name: 'Flat Vibrant Orange',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#ff9f1a';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'flat_pastel_lilac',
    name: 'Flat Pastel Lilac',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#cd84f1';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'flat_mint_cyan',
    name: 'Flat Mint Green',
    category: 'Flat Colors',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#7efff5';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  }
];

// 4. GLASS & CRYSTAL PRESETS
export const GLASS_PRESETS = [
  {
    id: 'glass_crystal_clear',
    name: 'Crystal Clear Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#10121a';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();

      const ring = ctx.createRadialGradient(w/2, h/2, w*0.35, w/2, h/2, w*0.5);
      ring.addColorStop(0, 'rgba(255,255,255,0.0)');
      ring.addColorStop(0.7, 'rgba(180,225,255,0.4)');
      ring.addColorStop(0.95, 'rgba(255,255,255,0.95)');
      ring.addColorStop(1, 'rgba(30,60,100,0.6)');
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(w*0.65, h*0.35, 2, w*0.65, h*0.35, w*0.22);
      spec.addColorStop(0, 'rgba(255,255,255,1.0)');
      spec.addColorStop(0.35, 'rgba(255,255,255,0.7)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_frosted_cyan',
    name: 'Frosted Cyan Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.5, h*0.5, w*0.08, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, '#0a2233');
      grad.addColorStop(0.55, '#144c6b');
      grad.addColorStop(0.88, '#70e5ff');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_ruby_wine',
    name: 'Ruby Wine Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.6, h*0.4, 8, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#ff2a6d');
      grad.addColorStop(0.65, '#5c0524');
      grad.addColorStop(0.92, '#ff7597');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_emerald_bottle',
    name: 'Emerald Bottle Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.62, h*0.38, 8, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#05c46b');
      grad.addColorStop(0.65, '#043820');
      grad.addColorStop(0.9, '#80ffdb');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_prism_rainbow',
    name: 'Prism Rainbow Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#0e111a';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();

      const rainbow = ctx.createLinearGradient(0, 0, w, h);
      rainbow.addColorStop(0.0, 'rgba(255,0,0,0.6)');
      rainbow.addColorStop(0.2, 'rgba(255,165,0,0.6)');
      rainbow.addColorStop(0.4, 'rgba(255,255,0,0.6)');
      rainbow.addColorStop(0.6, 'rgba(0,255,0,0.6)');
      rainbow.addColorStop(0.8, 'rgba(0,100,255,0.6)');
      rainbow.addColorStop(1.0, 'rgba(180,0,255,0.6)');
      ctx.fillStyle = rainbow;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(w*0.65, h*0.35, 2, w*0.65, h*0.35, w*0.25);
      spec.addColorStop(0, 'rgba(255,255,255,1.0)');
      spec.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_smoked_obsidian',
    name: 'Smoked Obsidian Glass',
    category: 'Glass & Crystal',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.65, h*0.35, 5, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.2, 'rgba(200,200,210,0.5)');
      grad.addColorStop(0.7, '#111216');
      grad.addColorStop(0.95, '#5b6272');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  }
];

// 5. BRIGHT COLORS & NEON PRESETS
export const BRIGHT_COLOR_PRESETS = [
  {
    id: 'bright_neon_cyan',
    name: 'Electric Neon Cyan',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#00f7ff');
      grad.addColorStop(0.7, '#0066ff');
      grad.addColorStop(1, '#001a40');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'bright_neon_magenta',
    name: 'Cyberpunk Magenta',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#ff007f');
      grad.addColorStop(0.65, '#8800ff');
      grad.addColorStop(1, '#220033');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'bright_sunburst_yellow',
    name: 'Sunburst Gold Glow',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffea00');
      grad.addColorStop(0.7, '#ff5500');
      grad.addColorStop(1, '#4a1500');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'bright_acid_green',
    name: 'Toxic Acid Lime',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#76ff03');
      grad.addColorStop(0.7, '#00bfa5');
      grad.addColorStop(1, '#003322');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'bright_ultraviolet',
    name: 'Electric Ultraviolet',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#c77dff');
      grad.addColorStop(0.7, '#5a189a');
      grad.addColorStop(1, '#10002b');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'bright_hot_lava',
    name: 'Hot Molten Lava',
    category: 'Bright Colors',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#ffdd59');
      grad.addColorStop(0.55, '#ff3f34');
      grad.addColorStop(1, '#3c0008');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  }
];

// 6. METALS & CHROME PRESETS
export const METAL_PRESETS = [
  { id: 'metal_shiny', name: 'Chrome Mirror Shiny', category: 'Metals', url: '/assets/matcaps/metal_shiny.jpeg' },
  { id: 'metal_carpaint', name: 'Metallic Red Car Paint', category: 'Metals', url: '/assets/matcaps/metal_carpaint.jpeg' },
    { id: 'metal_lead', name: 'Heavy Lead Metal', category: 'Metals', url: '/assets/matcaps/metal_lead.jpeg' },
      {
    id: 'metal_gold_ingot',
    name: 'Polished Gold Ingot',
    category: 'Metals',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#ffeaa7');
      grad.addColorStop(0.65, '#d4af37');
      grad.addColorStop(0.9, '#8c6d17');
      grad.addColorStop(1, '#3d2b00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'metal_copper_rose',
    name: 'Burnished Copper',
    category: 'Metals',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#f8a5c2');
      grad.addColorStop(0.65, '#b33939');
      grad.addColorStop(0.9, '#78281f');
      grad.addColorStop(1, '#33100c');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  }
];

// 7. CLAY & MATTE PRESETS
export const CLAY_PRESETS = [
  { id: 'clay_studio', name: 'Classic Clay Studio', category: 'Clay & Matte', url: '/assets/matcaps/clay_studio.jpeg' },
  { id: 'clay_brown', name: 'Terracotta Clay Brown', category: 'Clay & Matte', url: '/assets/matcaps/clay_brown.jpeg' },
  { id: 'clay_muddy', name: 'Muddy Earth Clay', category: 'Clay & Matte', url: '/assets/matcaps/clay_muddy.jpeg' },
  { id: 'ceramic_dark', name: 'Dark Ceramic Glaze', category: 'Clay & Matte', url: '/assets/matcaps/ceramic_dark.jpeg' },
  { id: 'ceramic_lightbulb', name: 'Lightbulb Ceramic', category: 'Clay & Matte', url: '/assets/matcaps/ceramic_lightbulb.jpeg' },
  { id: 'basic_1', name: 'Basic Studio Gray 1', category: 'Clay & Matte', url: '/assets/matcaps/basic_1.jpg' },
  { id: 'basic_2', name: 'Basic Studio Gray 2', category: 'Clay & Matte', url: '/assets/matcaps/basic_2.jpg' },
  { id: 'basic_dark', name: 'Basic Dark Studio', category: 'Clay & Matte', url: '/assets/matcaps/basic_dark.jpeg' },
  { id: 'basic_side', name: 'Basic Side Light', category: 'Clay & Matte', url: '/assets/matcaps/basic_side.jpeg' }
];

// 8. GEMS & ORGANICS PRESETS
export const GEMS_PRESETS = [
  { id: 'jade', name: 'Imperial Jade Gem', category: 'Gems & Organics', url: '/assets/matcaps/jade.jpeg' },
  { id: 'pearl', name: 'Lustrous Pearl', category: 'Gems & Organics', url: '/assets/matcaps/pearl.jpeg' },
  { id: 'resin', name: 'Amber Resin Gem', category: 'Gems & Organics', url: '/assets/matcaps/resin.jpeg' },
  { id: 'skin', name: 'Subsurface Skin Tone', category: 'Gems & Organics', url: '/assets/matcaps/skin.jpeg' },
  { id: 'check_normal_y', name: 'Normal Vector Map', category: 'Gems & Organics', url: '/assets/matcaps/check_normal+y.jpeg' },
  {
    id: 'gem_sapphire',
    name: 'Deep Blue Sapphire',
    category: 'Gems & Organics',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#48dbfb');
      grad.addColorStop(0.65, '#0c2461');
      grad.addColorStop(0.9, '#1e3799');
      grad.addColorStop(1, '#050c1e');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'gem_amethyst',
    name: 'Amethyst Crystal',
    category: 'Gems & Organics',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#d980fa');
      grad.addColorStop(0.65, '#5758bb');
      grad.addColorStop(0.9, '#9980fa');
      grad.addColorStop(1, '#1b1464');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    }
  }
];

// FUN & MAGIC ANIMATED LIVE SHADERS