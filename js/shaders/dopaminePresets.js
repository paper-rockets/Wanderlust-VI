// ============================================================================
// Dopamine, Iridescent, Dichroic & Candy Toy Procedural MatCaps
// 100% Original Code-Drawn Materials - Safe for Commercial Distribution
// ============================================================================

export const DOPAMINE_PRESETS = [
  // --- 1. DICHROIC & IRIDESCENT ---
  {
    id: 'dopamine_dichroic_sunset_cyan',
    name: 'Dichroic Rainbow Film',
    category: '✨ Iridescent & Dichroic',
    type: 'matcap',
    description: 'Optical dichroic glass with shifting hot pink, sunset orange, electric cyan, and indigo sheen.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, r * 0.05, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.18, '#ff69b4');
      grad.addColorStop(0.42, '#ffaa00');
      grad.addColorStop(0.68, '#00f2fe');
      grad.addColorStop(0.92, '#7b2ff7');
      grad.addColorStop(1.0, '#1a0033');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.65, cy * 0.32, 2, cx * 0.65, cy * 0.32, r * 0.28);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      spec.addColorStop(0.35, 'rgba(255, 255, 200, 0.5)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(0, 242, 254, 0)');
      rim.addColorStop(1.0, 'rgba(0, 242, 254, 0.7)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_cyber_opal',
    name: 'Cyber Opal Crystal',
    category: '✨ Iridescent & Dichroic',
    type: 'matcap',
    description: 'Luminescent gemstone shifting between mint green, pastel lavender, and shimmering peach.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.36, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#70f3ff');
      grad.addColorStop(0.48, '#e0c3fc');
      grad.addColorStop(0.75, '#ffc3a0');
      grad.addColorStop(0.95, '#4facfe');
      grad.addColorStop(1.0, '#2c1654');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(224, 195, 252, 0)');
      rim.addColorStop(1.0, 'rgba(224, 195, 252, 0.65)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_soap_bubble',
    name: 'Iridescent Soap Bubble',
    category: '✨ Iridescent & Dichroic',
    type: 'matcap',
    description: 'Thin-film rainbow interference sheen floating over glassy transparent pearl.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.75, cy * 0.3, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#fbc2eb');
      grad.addColorStop(0.5, '#a6c1ee');
      grad.addColorStop(0.78, '#84fab0');
      grad.addColorStop(0.94, '#fa709a');
      grad.addColorStop(1.0, '#fee140');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec1 = ctx.createRadialGradient(cx * 0.65, cy * 0.3, 2, cx * 0.65, cy * 0.3, r * 0.2);
      spec1.addColorStop(0, 'rgba(255,255,255,0.95)');
      spec1.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec2 = ctx.createRadialGradient(cx * 1.25, cy * 1.35, 1, cx * 1.25, cy * 1.35, r * 0.25);
      spec2.addColorStop(0, 'rgba(255,255,255,0.4)');
      spec2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_mermaid_scale',
    name: 'Mermaid Scales Pearl',
    category: '✨ Iridescent & Dichroic',
    type: 'matcap',
    description: 'Aquatic pearlescent finish with emerald, turquoise, violet, and sparkling gold.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 8, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.22, '#43e97b');
      grad.addColorStop(0.48, '#38f9d7');
      grad.addColorStop(0.76, '#9b51e0');
      grad.addColorStop(1.0, '#130cb7');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.86, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 223, 0, 0)');
      rim.addColorStop(1.0, 'rgba(255, 223, 0, 0.6)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_chameleon_velvet',
    name: 'Chameleon Purple-Gold',
    category: '✨ Iridescent & Dichroic',
    type: 'matcap',
    description: 'Car-paint style color shift from deep midnight violet to bright metallic gold.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.72, cy * 0.38, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffe259');
      grad.addColorStop(0.28, '#ffa751');
      grad.addColorStop(0.62, '#b000b5');
      grad.addColorStop(0.9, '#300050');
      grad.addColorStop(1.0, '#00d2ff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.34, 1, cx * 0.68, cy * 0.34, r * 0.22);
      spec.addColorStop(0, 'rgba(255,255,255,0.85)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- 2. CANDY & GUMMY (JUICY TRANSLUCENT) ---
  {
    id: 'dopamine_cherry_gummy',
    name: 'Juicy Cherry Gummy',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Mouth-watering translucent red gummy bear with warm golden subsurface scatter.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 6, cx, cy, r);
      grad.addColorStop(0.0, '#ff9999');
      grad.addColorStop(0.25, '#ff0844');
      grad.addColorStop(0.7, '#cc0033');
      grad.addColorStop(0.95, '#7a001a');
      grad.addColorStop(1.0, '#ffaa44');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 2, cx * 0.66, cy * 0.32, r * 0.2);
      spec.addColorStop(0, 'rgba(255,255,255,0.92)');
      spec.addColorStop(0.5, 'rgba(255,200,200,0.3)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_lime_jelly',
    name: 'Electric Lime Jelly',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Fluorescent lime green gelatin with bright cyan subsurface radiance.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 8, cx, cy, r);
      grad.addColorStop(0.0, '#f5ff7d');
      grad.addColorStop(0.2, '#96fbc4');
      grad.addColorStop(0.55, '#20e3b2');
      grad.addColorStop(0.85, '#0ba360');
      grad.addColorStop(1.0, '#004d26');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 1, cx * 0.66, cy * 0.32, r * 0.2);
      spec.addColorStop(0, 'rgba(255,255,255,0.9)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_bubblegum_gloss',
    name: 'Bubblegum Gloss',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Vibrant strawberry bubblegum with electric blue ambient reflection.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.72, cy * 0.36, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#ff69b4');
      grad.addColorStop(0.65, '#f72585');
      grad.addColorStop(0.9, '#7209b7');
      grad.addColorStop(1.0, '#4cc9f0');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.33, 2, cx * 0.68, cy * 0.33, r * 0.22);
      spec.addColorStop(0, 'rgba(255,255,255,0.9)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_cotton_candy',
    name: 'Cotton Candy Cloud',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Fluffy pastel fusion of cotton candy pink and baby blue.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 12, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.3, '#ffb3d9');
      grad.addColorStop(0.65, '#b3d9ff');
      grad.addColorStop(0.9, '#cbb4d4');
      grad.addColorStop(1.0, '#ff99cc');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.34, 1, cx * 0.68, cy * 0.34, r * 0.3);
      spec.addColorStop(0, 'rgba(255,255,255,0.7)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_blue_raspberry',
    name: 'Blue Raspberry Slush',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Electric blue candy with deep purple shadow and bright cyan core.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 8, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#00f0ff');
      grad.addColorStop(0.55, '#0066ff');
      grad.addColorStop(0.88, '#3d007a');
      grad.addColorStop(1.0, '#ff00aa');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 1, cx * 0.66, cy * 0.32, r * 0.22);
      spec.addColorStop(0, 'rgba(255,255,255,0.9)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- 3. HOLOGRAPHIC & NEON POP (DOPAMINE BOOST) ---
  {
    id: 'dopamine_holo_foil',
    name: 'Holographic Rainbow Foil',
    category: '🌈 Holographic & Rainbow',
    type: 'matcap',
    description: 'Chrome metallic foil with vivid rainbow diffraction bands.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 6, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.15, '#ffe600');
      grad.addColorStop(0.32, '#00ff66');
      grad.addColorStop(0.52, '#00d0ff');
      grad.addColorStop(0.72, '#9900ff');
      grad.addColorStop(0.88, '#ff0066');
      grad.addColorStop(1.0, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 1, cx * 0.66, cy * 0.32, r * 0.25);
      spec.addColorStop(0, 'rgba(255,255,255,0.98)');
      spec.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_laser_neon',
    name: 'Laser Pop Neon',
    category: '🌈 Holographic & Rainbow',
    type: 'matcap',
    description: 'Blinding electric yellow with burning magenta rim and deep cyber violet base.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.72, cy * 0.36, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#ccff00');
      grad.addColorStop(0.55, '#ff007f');
      grad.addColorStop(0.85, '#2e0854');
      grad.addColorStop(1.0, '#00ffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.34, 1, cx * 0.68, cy * 0.34, r * 0.24);
      spec.addColorStop(0, 'rgba(255,255,255,0.95)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_unicorn_stardust',
    name: 'Unicorn Stardust',
    category: '🌈 Holographic & Rainbow',
    type: 'matcap',
    description: 'Sparkling celestial pastel rainbow with glittering golden halo.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 12, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#ffeaa7');
      grad.addColorStop(0.45, '#fab1a0');
      grad.addColorStop(0.7, '#a29bfe');
      grad.addColorStop(0.92, '#81ecec');
      grad.addColorStop(1.0, '#fd79a8');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r);
      rim.addColorStop(0, 'rgba(255,255,255,0)');
      rim.addColorStop(1, 'rgba(255,215,0,0.6)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- 4. FUN KIDS TOY & CLAY ---
  {
    id: 'dopamine_sunny_playdough',
    name: 'Sunny Play-Dough',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Bright cheerful yellow modeling dough with soft velvety clay finish.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#fff9c4');
      grad.addColorStop(0.3, '#fbc02d');
      grad.addColorStop(0.7, '#f57f17');
      grad.addColorStop(1.0, '#bc5100');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_pink_playdoh',
    name: 'Bubblegum Pink Play-Doh',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Soft squishy bright bubblegum pink modeling clay with velvety matte texture.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#ffd1dc');
      grad.addColorStop(0.3, '#ff69b4');
      grad.addColorStop(0.7, '#e056fd');
      grad.addColorStop(1.0, '#68007a');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_blue_playdoh',
    name: 'Monster Blue Play-Doh',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Vibrant electric sky blue modeling dough with soft tactile shading.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#c7ecee');
      grad.addColorStop(0.3, '#22a6b3');
      grad.addColorStop(0.7, '#0984e3');
      grad.addColorStop(1.0, '#0c2461');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_green_playdoh',
    name: 'Grasshopper Green Play-Doh',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Lush bright green squishy dough with warm undertones.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#dff9fb');
      grad.addColorStop(0.3, '#6ab04c');
      grad.addColorStop(0.7, '#badc58');
      grad.addColorStop(1.0, '#130f40');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_purple_playdoh',
    name: 'Grape Purple Play-Doh',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Sweet royal purple squishy modeling dough with velvety finish.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#f8e1f4');
      grad.addColorStop(0.3, '#be2edd');
      grad.addColorStop(0.7, '#8854d0');
      grad.addColorStop(1.0, '#3b1c6e');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_toy_car_red',
    name: 'Toy Speedster Red',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'High-gloss die-cast toy car paint with brilliant white headlight reflection.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.72, cy * 0.36, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ff6b6b');
      grad.addColorStop(0.3, '#ee5253');
      grad.addColorStop(0.75, '#c23616');
      grad.addColorStop(1.0, '#4b1509');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.33, 2, cx * 0.68, cy * 0.33, r * 0.25);
      spec.addColorStop(0, 'rgba(255,255,255,0.95)');
      spec.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_creamsicle',
    name: 'Orange Creamsicle',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Sweet creamy orange sherbet with smooth vanilla ice-cream core.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.38, 12, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#ffe0b2');
      grad.addColorStop(0.6, '#ff9800');
      grad.addColorStop(0.9, '#e65100');
      grad.addColorStop(1.0, '#bf360c');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.68, cy * 0.34, 1, cx * 0.68, cy * 0.34, r * 0.22);
      spec.addColorStop(0, 'rgba(255,255,255,0.8)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_alien_slime',
    name: 'Glow Alien Slime',
    category: '🧸 Kids Toy & Clay',
    type: 'matcap',
    description: 'Toxic radioactive lime slime with an ultraviolet cosmic purple outer rim.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 10, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#b8ff00');
      grad.addColorStop(0.6, '#4cd137');
      grad.addColorStop(0.88, '#192a56');
      grad.addColorStop(1.0, '#9c88ff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 2, cx * 0.66, cy * 0.32, r * 0.22);
      spec.addColorStop(0, 'rgba(255,255,255,0.9)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- 5. STARS & COSMIC SPACE ---
  {
    id: 'dopamine_starlight_prism',
    name: 'Starlight Radiant Prism',
    category: '⭐ Stars & Space',
    type: 'matcap',
    description: 'Golden celestial starlight prism with diamond multi-point glints.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#fff3b0');
      grad.addColorStop(0.5, '#ffd166');
      grad.addColorStop(0.8, '#f77f00');
      grad.addColorStop(1.0, '#110022');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // Star glint
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      const sx = cx * 0.68, sy = cy * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx - 18, sy); ctx.lineTo(sx + 18, sy);
      ctx.moveTo(sx, sy - 18); ctx.lineTo(sx, sy + 18);
      ctx.moveTo(sx - 10, sy - 10); ctx.lineTo(sx + 10, sy + 10);
      ctx.moveTo(sx - 10, sy + 10); ctx.lineTo(sx + 10, sy - 10);
      ctx.stroke();
    }
  },
  {
    id: 'dopamine_supernova_gold',
    name: 'Supernova Golden Star',
    category: '⭐ Stars & Space',
    type: 'matcap',
    description: 'Blinding golden stellar explosion with solar flare corona rim.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.36, 12, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.3, '#ffeaa7');
      grad.addColorStop(0.65, '#f39c12');
      grad.addColorStop(0.9, '#d35400');
      grad.addColorStop(1.0, '#2c0e00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const corona = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
      corona.addColorStop(0.0, 'rgba(255, 230, 100, 0)');
      corona.addColorStop(1.0, 'rgba(255, 255, 180, 0.9)');
      ctx.fillStyle = corona;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_cosmic_stardust',
    name: 'Cosmic Violet Stardust',
    category: '⭐ Stars & Space',
    type: 'matcap',
    description: 'Deep ultraviolet nebula galaxy with scattered stardust particles.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 5, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#c7ecee');
      grad.addColorStop(0.55, '#e056fd');
      grad.addColorStop(0.85, '#686de0');
      grad.addColorStop(1.0, '#130f40');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      // Tiny stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 15; i++) {
        const a = (i * 2.39996);
        const d = (i / 15) * r * 0.75;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a)*d, cy + Math.sin(a)*d, (i % 3 === 0 ? 2 : 1.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'dopamine_shooting_star',
    name: 'Shooting Star Glitter',
    category: '⭐ Stars & Space',
    type: 'matcap',
    description: 'Cyan and magenta meteor trail with brilliant sparkling focal star.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.72, cy * 0.32, 4, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#7efff5');
      grad.addColorStop(0.5, '#18dcff');
      grad.addColorStop(0.8, '#ff3838');
      grad.addColorStop(1.0, '#17042c');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.7, cy * 0.32, 1, cx * 0.7, cy * 0.32, r * 0.3);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(0.3, 'rgba(126, 255, 245, 0.6)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- 6. MORE CANDY & GUMMY ---
  {
    id: 'dopamine_marshmallow_puff',
    name: 'Marshmallow Puffy Gloss',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Soft squishy pastel pink marshmallow puff with satin sugar sheen.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.38, 15, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.3, '#ffeef7');
      grad.addColorStop(0.65, '#ffb8d9');
      grad.addColorStop(0.9, '#f48fb1');
      grad.addColorStop(1.0, '#ad1457');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const softSpec = ctx.createRadialGradient(cx * 0.66, cy * 0.34, 1, cx * 0.66, cy * 0.34, r * 0.35);
      softSpec.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      softSpec.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
      softSpec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = softSpec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_glazed_donut',
    name: 'Glazed Sugar Donut',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Ultra-glossy warm honey sugar glaze over baked golden pastry.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 8, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.2, '#fff8e7');
      grad.addColorStop(0.5, '#f5cd79');
      grad.addColorStop(0.8, '#e17055');
      grad.addColorStop(1.0, '#6d214f');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.32, 2, cx * 0.66, cy * 0.32, r * 0.25);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_sour_apple_gummy',
    name: 'Sour Apple Neon Gummy',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Electric sour green apple candy with luminous neon yellow edge glow.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 6, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.25, '#7bed9f');
      grad.addColorStop(0.65, '#2ed573');
      grad.addColorStop(0.9, '#009432');
      grad.addColorStop(1.0, '#0652dd');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(234, 255, 0, 0)');
      rim.addColorStop(1.0, 'rgba(234, 255, 0, 0.85)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_dragonfruit_pop',
    name: 'Dragon Fruit Pop',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Vibrant magenta dragonfruit jelly with electric violet rim light.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.35, 8, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.22, '#ff6b81');
      grad.addColorStop(0.6, '#ed2f6f');
      grad.addColorStop(0.88, '#880e4f');
      grad.addColorStop(1.0, '#311b92');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const spec = ctx.createRadialGradient(cx * 0.65, cy * 0.32, 2, cx * 0.65, cy * 0.32, r * 0.22);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
  {
    id: 'dopamine_rainbow_lollipop',
    name: 'Rainbow Swirl Lollipop',
    category: '🍬 Candy & Gummy',
    type: 'matcap',
    description: 'Traditional carnival rainbow lollipop spiral with glossy candy glaze.',
    generate: (ctx, w, h) => {
      const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;
      // Spiral rainbow arcs
      const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6'];
      for (let i = 0; i < 5; i++) {
        const grad = ctx.createRadialGradient(cx * (0.6 + i*0.06), cy * (0.35 + i*0.06), 4, cx, cy, r);
        grad.addColorStop(0.0, colors[i]);
        grad.addColorStop(0.8, colors[(i+1)%5]);
        grad.addColorStop(1.0, '#1e0533');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r * (1 - i*0.14), 0, Math.PI * 2); ctx.fill();
      }
      const spec = ctx.createRadialGradient(cx * 0.66, cy * 0.33, 2, cx * 0.66, cy * 0.33, r * 0.3);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
];

