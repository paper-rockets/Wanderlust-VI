// ============================================================================
// 🧸 Real Play-Doh & Magic Dough Shaders (Expanded Collection)
// Authentic 3D procedural dough marbling with domain-warped FBM,
// physical micro-grain, matte diffuse, high-gloss clearcoat, and metallic flakes.
// Safe for commercial distribution.
// ============================================================================

export const PLAYDOH_VERTEX_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 v_world_pos;
varying vec3 v_normal;
varying vec3 v_view_dir;

void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  v_world_pos = worldPos.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const GLSL_COMMON_NOISE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 v_world_pos;
varying vec3 v_normal;
varying vec3 v_view_dir;

float hash(vec3 p) {
  vec3 q = fract(p * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  v += 0.50 * noise(p); p *= 2.02;
  v += 0.25 * noise(p); p *= 2.03;
  v += 0.125 * noise(p);
  return v;
}
`;

// 1. Rainbow Play-Doh Palette
const GLSL_RAINBOW_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cRed = vec3(0.96, 0.22, 0.20);
  vec3 cYellow = vec3(1.0, 0.85, 0.06);
  vec3 cGreen = vec3(0.24, 0.78, 0.32);
  vec3 cBlue = vec3(0.08, 0.52, 0.96);
  vec3 cPurple = vec3(0.68, 0.26, 0.88);
  vec3 cOrange = vec3(1.0, 0.52, 0.08);

  float f = fract(t);
  if (f < 0.166) return mix(cRed, cOrange, smoothstep(0.0, 0.166, f));
  if (f < 0.333) return mix(cOrange, cYellow, smoothstep(0.166, 0.333, f));
  if (f < 0.500) return mix(cYellow, cGreen, smoothstep(0.333, 0.500, f));
  if (f < 0.666) return mix(cGreen, cBlue, smoothstep(0.500, 0.666, f));
  if (f < 0.833) return mix(cBlue, cPurple, smoothstep(0.666, 0.833, f));
  return mix(cPurple, cRed, smoothstep(0.833, 1.0, f));
}
`;

// 2. Galaxy Cosmic Palette
const GLSL_GALAXY_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cNavy = vec3(0.05, 0.06, 0.24);
  vec3 cPurple = vec3(0.40, 0.10, 0.68);
  vec3 cMagenta = vec3(0.90, 0.15, 0.58);
  vec3 cCyan = vec3(0.08, 0.82, 0.96);
  vec3 cGold = vec3(1.0, 0.85, 0.35);

  float f = fract(t);
  if (f < 0.25) return mix(cNavy, cPurple, smoothstep(0.0, 0.25, f));
  if (f < 0.50) return mix(cPurple, cMagenta, smoothstep(0.25, 0.50, f));
  if (f < 0.75) return mix(cMagenta, cCyan, smoothstep(0.50, 0.75, f));
  return mix(cCyan, cNavy, smoothstep(0.75, 1.0, f));
}
`;

// 3. Pastel Unicorn Palette
const GLSL_UNICORN_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cPink = vec3(1.0, 0.70, 0.82);
  vec3 cLilac = vec3(0.84, 0.72, 0.96);
  vec3 cMint = vec3(0.65, 0.96, 0.85);
  vec3 cYellow = vec3(1.0, 0.94, 0.68);
  vec3 cCream = vec3(1.0, 0.98, 0.94);

  float f = fract(t);
  if (f < 0.25) return mix(cPink, cLilac, smoothstep(0.0, 0.25, f));
  if (f < 0.50) return mix(cLilac, cMint, smoothstep(0.25, 0.50, f));
  if (f < 0.75) return mix(cMint, cYellow, smoothstep(0.50, 0.75, f));
  return mix(cYellow, cPink, smoothstep(0.75, 1.0, f));
}
`;

// 4. Sunset Sherbet Palette
const GLSL_SHERBET_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cCoral = vec3(1.0, 0.26, 0.36);
  vec3 cOrange = vec3(1.0, 0.56, 0.10);
  vec3 cPeach = vec3(1.0, 0.76, 0.46);
  vec3 cMango = vec3(1.0, 0.88, 0.20);
  vec3 cBerry = vec3(0.88, 0.16, 0.48);

  float f = fract(t);
  if (f < 0.25) return mix(cCoral, cOrange, smoothstep(0.0, 0.25, f));
  if (f < 0.50) return mix(cOrange, cPeach, smoothstep(0.25, 0.50, f));
  if (f < 0.75) return mix(cPeach, cMango, smoothstep(0.50, 0.75, f));
  return mix(cMango, cBerry, smoothstep(0.75, 1.0, f));
}
`;

// 5. Chocolate Caramel Vanilla Palette
const GLSL_CHOCOLATE_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cDarkChoc = vec3(0.22, 0.12, 0.08);
  vec3 cMilkChoc = vec3(0.46, 0.26, 0.15);
  vec3 cCaramel = vec3(0.86, 0.54, 0.18);
  vec3 cVanilla = vec3(0.98, 0.94, 0.82);

  float f = fract(t);
  if (f < 0.33) return mix(cDarkChoc, cMilkChoc, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cMilkChoc, cCaramel, smoothstep(0.33, 0.66, f));
  return mix(cCaramel, cVanilla, smoothstep(0.66, 1.0, f));
}
`;

// 6. Arctic Mint Frost Palette
const GLSL_ARCTIC_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cNavy = vec3(0.08, 0.22, 0.46);
  vec3 cIceBlue = vec3(0.42, 0.78, 0.98);
  vec3 cMint = vec3(0.50, 0.96, 0.84);
  vec3 cWhite = vec3(0.96, 0.98, 1.0);

  float f = fract(t);
  if (f < 0.33) return mix(cNavy, cIceBlue, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cIceBlue, cMint, smoothstep(0.33, 0.66, f));
  return mix(cMint, cWhite, smoothstep(0.66, 1.0, f));
}
`;

// 7. Toxic Neon Slime Palette
const GLSL_TOXIC_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cChartreuse = vec3(0.70, 1.0, 0.06);
  vec3 cLime = vec3(0.24, 0.92, 0.20);
  vec3 cCyan = vec3(0.06, 0.96, 0.84);
  vec3 cDarkGreen = vec3(0.06, 0.38, 0.16);

  float f = fract(t);
  if (f < 0.33) return mix(cChartreuse, cLime, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cLime, cCyan, smoothstep(0.33, 0.66, f));
  return mix(cCyan, cChartreuse, smoothstep(0.66, 1.0, f));
}
`;

// 8. Berry Smoothie Palette
const GLSL_BERRY_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cBlackberry = vec3(0.26, 0.06, 0.36);
  vec3 cBlueberry = vec3(0.16, 0.30, 0.76);
  vec3 cRaspberry = vec3(0.86, 0.14, 0.46);
  vec3 cCream = vec3(0.98, 0.84, 0.92);

  float f = fract(t);
  if (f < 0.33) return mix(cBlackberry, cBlueberry, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cBlueberry, cRaspberry, smoothstep(0.33, 0.66, f));
  return mix(cRaspberry, cCream, smoothstep(0.66, 1.0, f));
}
`;

// 9. Metallic Gold Swirl Palette
const GLSL_GOLD_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cBronze = vec3(0.62, 0.38, 0.14);
  vec3 cGold = vec3(1.0, 0.82, 0.24);
  vec3 cBrightGold = vec3(1.0, 0.94, 0.55);
  vec3 cCopper = vec3(0.85, 0.48, 0.22);

  float f = fract(t);
  if (f < 0.33) return mix(cBronze, cGold, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cGold, cBrightGold, smoothstep(0.33, 0.66, f));
  return mix(cBrightGold, cCopper, smoothstep(0.66, 1.0, f));
}
`;

// 10. Metallic Silver Chrome Palette
const GLSL_SILVER_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cDarkSilver = vec3(0.42, 0.45, 0.50);
  vec3 cMidSilver = vec3(0.72, 0.76, 0.82);
  vec3 cBrightSilver = vec3(0.95, 0.97, 1.0);
  vec3 cSteel = vec3(0.55, 0.58, 0.64);

  float f = fract(t);
  if (f < 0.33) return mix(cDarkSilver, cMidSilver, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cMidSilver, cBrightSilver, smoothstep(0.33, 0.66, f));
  return mix(cBrightSilver, cSteel, smoothstep(0.66, 1.0, f));
}
`;

// 11. Metallic Rose Gold Palette
const GLSL_ROSEGOLD_PALETTE = `
vec3 dough_palette(float t) {
  vec3 cCopper = vec3(0.75, 0.38, 0.28);
  vec3 cRoseGold = vec3(0.96, 0.62, 0.55);
  vec3 cChampagne = vec3(1.0, 0.84, 0.76);
  vec3 cBurnished = vec3(0.60, 0.28, 0.22);

  float f = fract(t);
  if (f < 0.33) return mix(cCopper, cRoseGold, smoothstep(0.0, 0.33, f));
  if (f < 0.66) return mix(cRoseGold, cChampagne, smoothstep(0.33, 0.66, f));
  return mix(cChampagne, cBurnished, smoothstep(0.66, 1.0, f));
}
`;

// Shader Body Generator: Matte Dough
function createMatteSwirlShader(paletteCode) {
  return `
${GLSL_COMMON_NOISE}
${paletteCode}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(v_view_dir);
  vec3 p = v_world_pos * 5.0;
  vec3 q = vec3(fbm(p), fbm(p + vec3(4.3, 1.2, 2.7)), fbm(p + vec3(1.5, 7.8, 3.4)));
  float swirl = fbm(p + 3.2 * q);

  vec3 albedo = dough_palette(swirl * 2.2 + v_world_pos.y * 0.8);

  vec3 lightDir = normalize(vec3(0.5, 0.85, 0.6));
  float diff = max(dot(normal, lightDir), 0.0);
  float softDiff = diff * 0.6 + 0.4;
  float microGrain = (noise(v_world_pos * 80.0) - 0.5) * 0.07;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
  vec3 rimColor = vec3(1.0, 0.96, 0.88);

  vec3 finalColor = albedo * (softDiff + microGrain) + rimColor * (fresnel * 0.15);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;
}

// Shader Body Generator: High-Gloss Glazed Slime Dough
function createGlossSwirlShader(paletteCode) {
  return `
${GLSL_COMMON_NOISE}
${paletteCode}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(v_view_dir);
  vec3 p = v_world_pos * 5.0;
  vec3 q = vec3(fbm(p), fbm(p + vec3(4.3, 1.2, 2.7)), fbm(p + vec3(1.5, 7.8, 3.4)));
  float swirl = fbm(p + 3.2 * q);

  vec3 albedo = dough_palette(swirl * 2.2 + v_world_pos.y * 0.8);

  vec3 lightDir = normalize(vec3(0.5, 0.85, 0.6));
  vec3 halfDir = normalize(lightDir + viewDir);
  float diff = max(dot(normal, lightDir), 0.0);
  float softDiff = diff * 0.7 + 0.3;

  float spec1 = pow(max(dot(normal, halfDir), 0.0), 36.0) * 0.55;
  float spec2 = pow(max(dot(normal, halfDir), 0.0), 128.0) * 0.85;
  float clearcoat = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.48;
  vec3 rimColor = vec3(1.0, 0.98, 0.92);

  vec3 finalColor = albedo * softDiff + vec3(1.0) * (spec1 + spec2) + rimColor * clearcoat;
  gl_FragColor = vec4(finalColor, 1.0);
}
`;
}

// Shader Body Generator: Metallic Flake & Glitter Dough
function createMetalSwirlShader(paletteCode) {
  return `
${GLSL_COMMON_NOISE}
${paletteCode}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(v_view_dir);
  vec3 p = v_world_pos * 5.0;
  vec3 q = vec3(fbm(p), fbm(p + vec3(4.3, 1.2, 2.7)), fbm(p + vec3(1.5, 7.8, 3.4)));
  float swirl = fbm(p + 3.2 * q);

  vec3 albedo = dough_palette(swirl * 2.2 + v_world_pos.y * 0.8);

  vec3 lightDir = normalize(vec3(0.5, 0.85, 0.6));
  vec3 halfDir = normalize(lightDir + viewDir);
  float diff = max(dot(normal, lightDir), 0.0);
  float softDiff = diff * 0.7 + 0.3;

  float metalSpec = pow(max(dot(normal, halfDir), 0.0), 22.0) * 0.85;
  float sparkle = pow(hash(floor(v_world_pos * 135.0)), 15.0) * 2.5;
  float glitter = sparkle * max(dot(normal, lightDir), 0.0);

  vec3 metalReflect = mix(vec3(1.0, 0.95, 0.85), albedo, 0.65) * metalSpec;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
  vec3 rimColor = mix(albedo, vec3(1.0), 0.5);

  vec3 finalColor = albedo * softDiff + metalReflect + vec3(glitter) + rimColor * (fresnel * 0.28);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;
}

// Solid Play-Doh Fragment Helper
function createSolidPlaydohFragment(r, g, b) {
  return `
${GLSL_COMMON_NOISE}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(v_view_dir);
  vec3 baseColor = vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)});
  vec3 p = v_world_pos * 4.0;
  float doughCrease = (fbm(p) - 0.5) * 0.06;

  vec3 lightDir = normalize(vec3(0.5, 0.85, 0.6));
  float diff = max(dot(normal, lightDir), 0.0);
  float softDiff = diff * 0.65 + 0.35;
  float microGrain = (noise(v_world_pos * 85.0) - 0.5) * 0.08;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
  vec3 rimColor = vec3(1.0, 0.97, 0.90);

  vec3 finalColor = (baseColor + doughCrease) * (softDiff + microGrain) + rimColor * (fresnel * 0.12);
  gl_FragColor = vec4(finalColor, 1.0);
}
`;
}

// 2D MatCap Preview Generator
function drawPlaydohMatcap(colors, style = 'matte') {
  return (ctx, w, h) => {
    const cx = w * 0.5, cy = h * 0.5, r = w * 0.5;

    if (Array.isArray(colors)) {
      // Multi-stop swirled dough gradient
      const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.4, 2, cx, cy, r);
      colors.forEach((col, idx) => {
        grad.addColorStop(idx / (colors.length - 1), col);
      });
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    } else {
      // Solid clay dough
      const grad = ctx.createRadialGradient(cx * 0.68, cy * 0.42, 4, cx, cy, r);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.35, colors);
      grad.addColorStop(1.0, '#1a1a1a');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }

    if (style === 'gloss') {
      // Glossy clearcoat curved reflection
      const spec = ctx.createRadialGradient(cx * 0.62, cy * 0.35, 1, cx * 0.62, cy * 0.35, r * 0.28);
      spec.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
      spec.addColorStop(0.35, 'rgba(255, 255, 255, 0.65)');
      spec.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
      rim.addColorStop(1.0, 'rgba(255, 255, 255, 0.55)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'metal') {
      // Metallic luster highlight
      const spec = ctx.createRadialGradient(cx * 0.64, cy * 0.36, 2, cx * 0.64, cy * 0.36, r * 0.36);
      spec.addColorStop(0.0, 'rgba(255, 250, 220, 0.9)');
      spec.addColorStop(0.5, 'rgba(255, 230, 160, 0.35)');
      spec.addColorStop(1.0, 'rgba(255, 230, 160, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.84, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 240, 180, 0)');
      rim.addColorStop(1.0, 'rgba(255, 240, 180, 0.6)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    } else {
      // Classic matte clay dough highlight
      const softLight = ctx.createRadialGradient(cx * 0.62, cy * 0.38, 2, cx * 0.62, cy * 0.38, r * 0.45);
      softLight.addColorStop(0.0, 'rgba(255, 255, 255, 0.38)');
      softLight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      softLight.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = softLight;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

      const rim = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255, 250, 230, 0)');
      rim.addColorStop(1.0, 'rgba(255, 250, 230, 0.28)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  };
}

export const PLAYDOH_PRESETS = [
  // ==========================================
  // 1. CLASSIC MATTE DOUGH SWIRLS & SOLIDS
  // ==========================================
  {
    id: 'playdoh_swirl_v23',
    name: 'Rainbow Play-Doh Swirl',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Actual multi-color swirled modeling compound with physical dough grain and soft matte light scattering.',
    generate: drawPlaydohMatcap(['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_RAINBOW_PALETTE),
  },
  {
    id: 'playdoh_swirl_galaxy',
    name: 'Galaxy Cosmic Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Deep cosmic space swirl dough with nebula violet, magenta, and starlight cyan.',
    generate: drawPlaydohMatcap(['#0d1137', '#6b1cb0', '#e62694', '#14d2f5', '#ffd959'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_GALAXY_PALETTE),
  },
  {
    id: 'playdoh_swirl_unicorn',
    name: 'Pastel Unicorn Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Soft pastel unicorn dough with baby pink, lavender lilac, mint green, and lemon cream.',
    generate: drawPlaydohMatcap(['#ffb3d1', '#d6b8f5', '#a6f5d9', '#fff0ad', '#fffaf0'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_UNICORN_PALETTE),
  },
  {
    id: 'playdoh_swirl_sherbet',
    name: 'Sunset Sherbet Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Warm sunset sherbet swirl dough with fiery coral, blood orange, peach, and mango.',
    generate: drawPlaydohMatcap(['#ff425c', '#ff8f1a', '#ffc275', '#ffe033', '#e0297a'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_SHERBET_PALETTE),
  },
  {
    id: 'playdoh_swirl_chocolate',
    name: 'Chocolate Caramel Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Fudge chocolate, amber caramel ribbon, and sweet vanilla cream dough.',
    generate: drawPlaydohMatcap(['#381f14', '#754226', '#db8a2e', '#faeed1'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_CHOCOLATE_PALETTE),
  },
  {
    id: 'playdoh_swirl_arctic',
    name: 'Arctic Mint Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Crisp glacier navy, peppermint ice blue, frosted mint, and clean white swirl.',
    generate: drawPlaydohMatcap(['#143875', '#6bc7fa', '#80f5d6', '#f5faff'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_ARCTIC_PALETTE),
  },
  {
    id: 'playdoh_swirl_toxic',
    name: 'Toxic Lime Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Radioactive neon chartreuse, fluorescent lime, and electric green slime swirl dough.',
    generate: drawPlaydohMatcap(['#b3ff10', '#3deb33', '#10f5d6', '#0f6129'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_TOXIC_PALETTE),
  },
  {
    id: 'playdoh_swirl_berry',
    name: 'Berry Smoothie Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Velvety blackberry, blueberry, raspberry, and sweet strawberry cream swirl.',
    generate: drawPlaydohMatcap(['#42105c', '#294dc2', '#db2475', '#fad6eb'], 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMatteSwirlShader(GLSL_BERRY_PALETTE),
  },

  // ==========================================
  // 2. HIGH-GLOSS / WET SLIME DOUGH SHADERS
  // ==========================================
  {
    id: 'playdoh_gloss_rainbow',
    name: 'Glossy Rainbow Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Ultra-shiny glazed rainbow taffy modeling compound with high-gloss clearcoat.',
    generate: drawPlaydohMatcap(['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de'], 'gloss'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createGlossSwirlShader(GLSL_RAINBOW_PALETTE),
  },
  {
    id: 'playdoh_gloss_bubblegum',
    name: 'Glossy Bubblegum Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Juicy, wet, high-gloss reflective bubblegum pink and cyan slime dough.',
    generate: drawPlaydohMatcap(['#ff2d55', '#ff70a6', '#00f2fe', '#4facfe'], 'gloss'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createGlossSwirlShader(GLSL_UNICORN_PALETTE),
  },
  {
    id: 'playdoh_gloss_neon',
    name: 'Glossy Neon Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Wet lacquered electric neon chartreuse and lime green slime dough.',
    generate: drawPlaydohMatcap(['#b3ff10', '#3deb33', '#10f5d6', '#00e5ff'], 'gloss'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createGlossSwirlShader(GLSL_TOXIC_PALETTE),
  },
  {
    id: 'playdoh_gloss_berry',
    name: 'Glossy Berry Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'High-shine glazed raspberry and blueberry smoothie dough.',
    generate: drawPlaydohMatcap(['#db2475', '#7b2ff7', '#00f2fe', '#fbc2eb'], 'gloss'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createGlossSwirlShader(GLSL_BERRY_PALETTE),
  },

  // ==========================================
  // 3. METALLIC & GLITTER DOUGH SHADERS
  // ==========================================
  {
    id: 'playdoh_metal_gold',
    name: 'Metallic Gold Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: '24K metallic luster dough with shimmering gold flakes and bronze swirl.',
    generate: drawPlaydohMatcap(['#9e6124', '#ffcf3d', '#fff08c', '#d97a38'], 'metal'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMetalSwirlShader(GLSL_GOLD_PALETTE),
  },
  {
    id: 'playdoh_metal_silver',
    name: 'Metallic Silver Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Liquid chrome silver and platinum glitter modeling compound.',
    generate: drawPlaydohMatcap(['#6b7380', '#b8c2d1', '#f3f6fa', '#8c94a3'], 'metal'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMetalSwirlShader(GLSL_SILVER_PALETTE),
  },
  {
    id: 'playdoh_metal_rosegold',
    name: 'Metallic Rose Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Burnished metallic copper and rose gold marbling with metallic micro-sparkles.',
    generate: drawPlaydohMatcap(['#bf6147', '#f59e8c', '#ffd6c2', '#994738'], 'metal'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMetalSwirlShader(GLSL_ROSEGOLD_PALETTE),
  },
  {
    id: 'playdoh_metal_cosmic',
    name: 'Metallic Cosmic Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Deep cosmic amethyst and starlight cyan metallic foil dough.',
    generate: drawPlaydohMatcap(['#14184a', '#8a2be2', '#00f2fe', '#ffd700'], 'metal'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createMetalSwirlShader(GLSL_GALAXY_PALETTE),
  },

  // ==========================================
  // 4. SOLID MATTE MODELING CLAY COLORS
  // ==========================================
  {
    id: 'playdoh_red_v23',
    name: 'Strawberry Red Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Squishy crimson modeling dough with natural matte micro-creases and warm rim glow.',
    generate: drawPlaydohMatcap('#ff3b30', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(1.0, 0.231, 0.188),
  },
  {
    id: 'playdoh_yellow_v23',
    name: 'Sunshine Yellow Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Bright sunshine yellow modeling dough with soft physical clay texture.',
    generate: drawPlaydohMatcap('#ffcc00', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(1.0, 0.800, 0.0),
  },
  {
    id: 'playdoh_blue_v23',
    name: 'Sky Blue Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Smooth sky blue modeling compound with soft matte diffuse light.',
    generate: drawPlaydohMatcap('#007aff', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(0.0, 0.478, 1.0),
  },
  {
    id: 'playdoh_green_v23',
    name: 'Lime Green Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Vibrant lime green squishy toy clay with authentic surface grain.',
    generate: drawPlaydohMatcap('#34c759', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(0.204, 0.780, 0.349),
  },
  {
    id: 'playdoh_orange_v23',
    name: 'Tangerine Orange Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Warm tangerine orange dough with realistic clay surface creases.',
    generate: drawPlaydohMatcap('#ff9500', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(1.0, 0.584, 0.0),
  },
  {
    id: 'playdoh_purple_v23',
    name: 'Grape Purple Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Rich grape purple modeling dough with velvety matte light response.',
    generate: drawPlaydohMatcap('#af52de', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(0.686, 0.322, 0.871),
  },
  {
    id: 'playdoh_pink_v23',
    name: 'Bubblegum Pink Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Playful bubblegum pink soft modeling clay with gentle rim reflection.',
    generate: drawPlaydohMatcap('#ff2d55', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(1.0, 0.176, 0.333),
  },
  {
    id: 'playdoh_white_v23',
    name: 'Snow White Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Pure clean white clay dough with delicate micro-texture.',
    generate: drawPlaydohMatcap('#f5f5f7', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(0.96, 0.96, 0.97),
  },
  {
    id: 'playdoh_turquoise_v23',
    name: 'Turquoise Magic Play-Doh',
    category: 'Kids Toy',
    type: 'shader',
    description: 'Electrifying turquoise dough compound with soft physical shading.',
    generate: drawPlaydohMatcap('#00c7be', 'matte'),
    vertexShader: PLAYDOH_VERTEX_SHADER,
    fragmentShader: createSolidPlaydohFragment(0.0, 0.780, 0.745),
  },
];


