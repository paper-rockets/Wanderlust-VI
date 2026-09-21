// ============================================================================
// 100% Procedural Glass & Crystal Presets
// Mathematically rendered via HTML5 Canvas gradients & GLSL Fresnel refraction
// 100% Original Code - Safe for Commercial Distribution
// ============================================================================

export const GLASS_PRESETS = [
  {
    id: 'glass_prismatic_dichroic',
    name: 'Prismatic Dichroic Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Optical dichroic glass prism with rainbow chromatic dispersion and brilliant internal reflections.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      // Dark glass core
      ctx.fillStyle = '#080a14';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // Prismatic spectrum ring
      const prism = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 0.98);
      prism.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
      prism.addColorStop(0.4, 'rgba(255, 60, 150, 0.4)');
      prism.addColorStop(0.65, 'rgba(0, 240, 255, 0.6)');
      prism.addColorStop(0.85, 'rgba(255, 230, 0, 0.5)');
      prism.addColorStop(0.96, 'rgba(255, 255, 255, 0.9)');
      prism.addColorStop(1.0, 'rgba(100, 30, 255, 0.7)');
      ctx.fillStyle = prism;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // Sharp specular glints
      const spec1 = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 1, cx * 0.7, cy * 0.35, r * 0.2);
      spec1.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec1.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
      spec1.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec2 = ctx.createRadialGradient(cx * 1.3, cy * 1.35, 1, cx * 1.3, cy * 1.35, r * 0.25);
      spec2.addColorStop(0.0, 'rgba(0, 242, 254, 0.8)');
      spec2.addColorStop(1.0, 'rgba(0, 242, 254, 0)');
      ctx.fillStyle = spec2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_crystal_clear',
    name: 'Crystal Clear Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Ultra-pure optical glass with high-translucency Fresnel rim and crisp highlight reflection.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      ctx.fillStyle = '#0f141d';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
      rim.addColorStop(0.7, 'rgba(180, 225, 255, 0.35)');
      rim.addColorStop(0.95, 'rgba(255, 255, 255, 0.95)');
      rim.addColorStop(1.0, 'rgba(40, 80, 140, 0.7)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 2, cx * 0.7, cy * 0.35, r * 0.24);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(0.35, 'rgba(255, 255, 255, 0.6)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_frosted_cyan',
    name: 'Frosted Cyan Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Soft sandblasted frosted glass with radiant seafoam cyan diffuse scattering.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      grad.addColorStop(0.0, '#06202e');
      grad.addColorStop(0.5, '#0e4e6d');
      grad.addColorStop(0.85, '#4de7ff');
      grad.addColorStop(1.0, '#d6f8ff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const softGlow = ctx.createRadialGradient(cx * 0.65, cy * 0.38, 2, cx * 0.65, cy * 0.38, r * 0.45);
      softGlow.addColorStop(0.0, 'rgba(255, 255, 255, 0.75)');
      softGlow.addColorStop(0.5, 'rgba(120, 240, 255, 0.25)');
      softGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = softGlow;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_ruby_rose',
    name: 'Ruby Rose Crystal',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Deep crimson ruby gemstone glass with bright magenta refraction.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#ff3b69');
      grad.addColorStop(0.6, '#9b0028');
      grad.addColorStop(0.9, '#4a0014');
      grad.addColorStop(1.0, '#1a0007');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 80, 140, 0)');
      rim.addColorStop(1.0, 'rgba(255, 120, 180, 0.8)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_emerald_bottle',
    name: 'Emerald Bottle Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Vintage emerald bottle glass with rich jade depth and bright mint caustic glints.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#2ed573');
      grad.addColorStop(0.65, '#0d6b38');
      grad.addColorStop(0.9, '#043018');
      grad.addColorStop(1.0, '#02160b');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(126, 255, 180, 0)');
      rim.addColorStop(1.0, 'rgba(160, 255, 200, 0.8)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_amethyst_tint',
    name: 'Amethyst Tint Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Royal amethyst crystal glass with glowing violet facets and ultraviolet edge flare.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#c56cf0');
      grad.addColorStop(0.6, '#6b1899');
      grad.addColorStop(0.9, '#2f0547');
      grad.addColorStop(1.0, '#12001c');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(215, 140, 255, 0)');
      rim.addColorStop(1.0, 'rgba(235, 180, 255, 0.85)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_stained_rainbow',
    name: 'Stained Rainbow Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Cathedral stained glass jewel with vivid kaleidoscopic color bands.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      for (let i = 0; i < 5; i++) {
        const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6'];
        const bandGrad = ctx.createRadialGradient(cx * (0.6 + i * 0.08), cy * (0.4 + i * 0.08), 5, cx, cy, r * (1 - i * 0.15));
        bandGrad.addColorStop(0.0, colors[i]);
        bandGrad.addColorStop(1.0, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = bandGrad;
        ctx.beginPath(); ctx.arc(cx, cy, r * (1 - i * 0.12), 0, Math.PI * 2); ctx.fill();
      }
      const spec = ctx.createRadialGradient(cx * 0.65, cy * 0.35, 2, cx * 0.65, cy * 0.35, r * 0.28);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_milk_opal',
    name: 'Luminescent Milk Opal',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Milky translucent glass with fiery inner pastel warmth and sky blue scattering.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#ffeaa7');
      grad.addColorStop(0.55, '#fab1a0');
      grad.addColorStop(0.85, '#81ecec');
      grad.addColorStop(1.0, '#74b9ff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.33, 2, cx * 0.66, cy * 0.33, r * 0.2);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 0.9)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_diamond_facet',
    name: 'Diamond Facet Sparkle',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Brilliant high-refractive diamond crystal with scintillating white and rainbow facets.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      ctx.fillStyle = '#0a0d14';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        const ray = ctx.createLinearGradient(0, 0, r, 0);
        ray.addColorStop(0.0, i % 2 === 0 ? '#00f2fe' : '#ff007f');
        ray.addColorStop(0.7, '#ffffff');
        ray.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 0.95, -r * 0.15);
        ctx.lineTo(r * 0.95, r * 0.15);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const spec = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 1, cx * 0.7, cy * 0.35, r * 0.3);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_honey_amber',
    name: 'Liquid Honey Amber',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Golden fossilized amber glass with rich caramel core and sunny honey highlights.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#fed330');
      grad.addColorStop(0.55, '#fa8231');
      grad.addColorStop(0.85, '#a73a00');
      grad.addColorStop(1.0, '#3e1400');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 215, 0, 0)');
      rim.addColorStop(1.0, 'rgba(255, 235, 120, 0.85)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_smoky_obsidian',
    name: 'Smoky Obsidian Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Dark semi-translucent volcanic glass with smooth charcoal sheen.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 2, cx * 0.7, cy * 0.35, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#888888');
      grad.addColorStop(0.6, '#2a2a2a');
      grad.addColorStop(0.9, '#111111');
      grad.addColorStop(1.0, '#000000');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'glass_neon_edge',
    name: 'Neon Edge Cyber Glass',
    category: '🔮 Glass & Crystal',
    type: 'matcap',
    description: 'Futuristic acrylic glass with illuminated electric cyan rim and laser magenta backlight.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      ctx.fillStyle = '#060714';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(0, 242, 254, 0)');
      rim.addColorStop(0.85, 'rgba(0, 242, 254, 0.9)');
      rim.addColorStop(1.0, 'rgba(255, 0, 128, 0.95)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.65, cy * 0.35, 2, cx * 0.65, cy * 0.35, r * 0.22);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
];
