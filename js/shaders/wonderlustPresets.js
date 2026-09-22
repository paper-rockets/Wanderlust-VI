import { createMatCap } from './materialPresets.js';

export const WONDERLUST_PRESETS = [
  {
    id: 'wonderlust_anime_water',
    name: 'Anime Caustics Water',
    category: 'Wonderlust',
    type: 'shader',
    description: 'Procedural Voronoi water caustics with smooth minimum edge rings, 3-tier anime depth palette, and animated wave flow.',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#4da9e8');
      grad.addColorStop(0.65, '#1a4a8c');
      grad.addColorStop(1, '#091c38');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
      // Caustic web lines
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w*0.3 + i*30, h*0.3 + (i%3)*40, 25, 0, Math.PI*2);
        ctx.stroke();
      }
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_world_pos;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  v_world_pos = wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_world_pos;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k / 6.0;
}

vec2 cellPt(vec2 seed) {
  return 0.5 + 0.5 * sin(u_time * 0.8 + 6.2831 * seed);
}

float voronoiF1(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 n = vec2(float(x), float(y));
      vec2 pt = cellPt(hash2(i + n));
      md = min(md, length(n + pt - f));
    }
  }
  return md;
}

float voronoiSF1(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float res = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 n = vec2(float(x), float(y));
      vec2 pt = cellPt(hash2(i + n));
      res = smin(res, length(n + pt - f), 0.25);
    }
  }
  return res;
}

void main() {
  vec2 uv = (v_normal.xy * 0.5 + 0.5) * 6.0 + vec2(u_time * 0.08, u_time * 0.05);
  float f1 = voronoiF1(uv);
  float sf1 = voronoiSF1(uv);
  float edge = f1 - sf1;

  float t = smoothstep(0.03, 0.08, edge);
  vec3 deepColor = vec3(0.04, 0.15, 0.38);
  vec3 midColor = vec3(0.25, 0.65, 0.95);
  vec3 highlight = vec3(1.0, 1.0, 1.0);

  vec3 col = mix(deepColor, midColor, smoothstep(0.0, 0.5, t));
  col = mix(col, highlight, smoothstep(0.5, 1.0, t));

  // Fresnel edge brightness
  float fresnel = pow(1.0 - max(dot(v_normal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
  col += vec3(0.3, 0.7, 1.0) * fresnel * 0.6;

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'wonderlust_ghibli_summer',
    name: 'Ghibli Summer Split-Toning',
    category: 'Wonderlust',
    type: 'shader',
    description: 'Golden sunlit highlights, soft atmospheric cerulean shadows, chlorophyll saturation boost, and celluloid vignette.',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#fff4cc');
      grad.addColorStop(0.3, '#78c25e');
      grad.addColorStop(0.7, '#257d5a');
      grad.addColorStop(1, '#0e2b38');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec2 v_uv;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec2 v_uv;

void main() {
  // Lighting computation with sun vector
  vec3 sunDir = normalize(vec3(0.5, 0.8, 0.6));
  float NdotL = max(dot(v_normal, sunDir), 0.0);
  
  // Base lush nature palette
  vec3 shadowCol = vec3(0.08, 0.22, 0.32);
  vec3 midCol = vec3(0.22, 0.55, 0.25);
  vec3 litCol = vec3(0.68, 0.88, 0.38);

  vec3 col = mix(shadowCol, midCol, smoothstep(0.1, 0.45, NdotL));
  col = mix(col, litCol, smoothstep(0.45, 0.9, NdotL));

  // Ghibli Summer Split-Toning
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 warmGold = col * vec3(1.12, 1.05, 0.88);
  vec3 azureShadow = col * vec3(0.90, 0.96, 1.10);
  col = mix(azureShadow, warmGold, smoothstep(0.2, 0.75, lum));

  // Lush saturation boost
  col = mix(vec3(lum), col, 1.25);

  // Optical sun shimmer on highlight peaks
  col += max(vec3(0.0), col - 0.55) * vec3(0.18, 0.14, 0.04);

  // Celluloid rim
  float fresnel = pow(1.0 - max(dot(v_normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  col += vec3(0.9, 0.95, 0.7) * fresnel * 0.4;

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'wonderlust_journey_sand',
    name: 'Journey Desert Sand & Shimmer',
    category: 'Wonderlust',
    type: 'shader',
    description: 'Warm desert dunes with Journey-inspired sparkling Blinn-Phong micro-glitter and ridge rim lighting.',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#fff2d1');
      grad.addColorStop(0.3, '#f39c12');
      grad.addColorStop(0.7, '#d35400');
      grad.addColorStop(1, '#5c1d00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_position = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_position;

void main() {
  vec3 viewDir = normalize(-v_position);
  vec3 lightDir = normalize(vec3(0.6, 0.8, 0.5));
  vec3 halfDir = normalize(lightDir + viewDir);

  float NdotL = max(dot(v_normal, lightDir), 0.0);
  vec3 sandShadow = vec3(0.38, 0.16, 0.06);
  vec3 sandMid = vec3(0.92, 0.58, 0.22);
  vec3 sandSun = vec3(1.0, 0.86, 0.55);

  vec3 col = mix(sandShadow, sandMid, smoothstep(0.08, 0.45, NdotL));
  col = mix(col, sandSun, smoothstep(0.45, 0.92, NdotL));

  // Dune rim lighting along grazing angles
  float rim = 1.0 - max(dot(v_normal, viewDir), 0.0);
  float rimStrength = pow(rim, 3.8) * 0.65;
  col += vec3(1.0, 0.78, 0.42) * rimStrength;

  // Journey Sand Specular Shimmer (Continuous organic micro-glitter, NO chunky pixels)
  float spec = pow(max(dot(v_normal, halfDir), 0.0), 20.0);
  vec3 p = v_position * 120.0;
  float s1 = sin(p.x * 1.5 + sin(p.y * 1.7 + u_time * 2.5) * 2.8);
  float s2 = cos(p.y * 1.6 + cos(p.z * 1.4 - u_time * 2.0) * 2.8);
  float s3 = sin(p.z * 1.8 + sin(p.x * 1.9 + u_time * 1.2) * 2.8);
  float sparkle = pow(clamp(s1 * s2 * s3 * 0.5 + 0.5, 0.0, 1.0), 10.0) * 4.5;

  col += vec3(1.0, 0.90, 0.65) * spec * (0.35 + sparkle * 1.4);

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'wonderlust_glacial_snow',
    name: 'Glacial Diamond Snow & Ice',
    category: 'Wonderlust',
    type: 'shader',
    description: 'Crisp sky-blue rim highlight, dynamic diamond snow glitter sparkle effect, and glacial subsurface ice tones.',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.65, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#bfe9ff');
      grad.addColorStop(0.7, '#4895ef');
      grad.addColorStop(1, '#0e244d');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_position = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_position;

void main() {
  vec3 viewDir = normalize(-v_position);
  vec3 lightDir = normalize(vec3(0.5, 0.9, 0.4));
  vec3 halfDir = normalize(lightDir + viewDir);

  float NdotL = max(dot(v_normal, lightDir), 0.0);
  vec3 snowDeep = vec3(0.12, 0.26, 0.50);
  vec3 snowMid = vec3(0.68, 0.86, 0.98);
  vec3 snowHighlight = vec3(1.0, 1.0, 1.0);

  vec3 col = mix(snowDeep, snowMid, smoothstep(0.08, 0.48, NdotL));
  col = mix(col, snowHighlight, smoothstep(0.48, 0.92, NdotL));

  // Glacial crisp sky-blue rim
  float snowRim = 1.0 - max(dot(v_normal, viewDir), 0.0);
  col += vec3(0.65, 0.88, 1.0) * pow(snowRim, 3.2) * 0.85;

  // Diamond snow micro-sparkle (Continuous crystalline glints, NO chunky pixels)
  float spec = pow(max(dot(v_normal, halfDir), 0.0), 22.0);
  vec3 p = v_position * 135.0;
  float s1 = sin(p.x * 1.6 + cos(p.y * 1.9 + u_time * 2.6) * 3.0);
  float s2 = cos(p.y * 1.7 + sin(p.z * 1.8 - u_time * 2.2) * 3.0);
  float s3 = sin(p.z * 2.0 + cos(p.x * 1.4 + u_time * 1.4) * 3.0);
  float diamondSparkle = pow(clamp(s1 * s2 * s3 * 0.5 + 0.5, 0.0, 1.0), 12.0) * 5.0;

  col += vec3(0.90, 0.96, 1.0) * spec * (0.3 + diamondSparkle * 1.6);

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'wonderlust_crystal_glow',
    name: 'Prismatic Instanced Crystal',
    category: 'Wonderlust',
    type: 'shader',
    description: '6-stop smooth cubic color gradient, animated hue shifting, Fresnel rim glow, and vibrance boosting.',
    generate: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0.0, '#ff007f');
      grad.addColorStop(0.25, '#7928ca');
      grad.addColorStop(0.5, '#0070f3');
      grad.addColorStop(0.75, '#00dfd8');
      grad.addColorStop(1.0, '#79ffe1');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_position = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_position;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float tC = clamp((v_position.y + 1.2) / 2.4, 0.0, 1.0);
  
  // 6 color stops
  vec3 c0 = vec3(0.9, 0.1, 0.5);
  vec3 c1 = vec3(0.5, 0.1, 0.9);
  vec3 c2 = vec3(0.1, 0.4, 1.0);
  vec3 c3 = vec3(0.0, 0.9, 0.8);
  vec3 c4 = vec3(0.4, 1.0, 0.5);
  vec3 c5 = vec3(1.0, 0.9, 0.2);

  float segment = tC * 5.0;
  int idx = int(floor(segment));
  float frac = fract(segment);
  float t = frac * frac * (3.0 - 2.0 * frac);

  vec3 gradCol;
  if (idx == 0) gradCol = mix(c0, c1, t);
  else if (idx == 1) gradCol = mix(c1, c2, t);
  else if (idx == 2) gradCol = mix(c2, c3, t);
  else if (idx == 3) gradCol = mix(c3, c4, t);
  else gradCol = mix(c4, c5, t);

  // Time-based hue shift
  vec3 hsv = rgb2hsv(gradCol);
  hsv.x = fract(hsv.x + u_time * 0.1);
  gradCol = hsv2rgb(hsv);

  // High power Fresnel rim glow
  float fresnel = pow(1.0 - max(dot(v_normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  vec3 rimCol = mix(gradCol, vec3(1.0), 0.6);
  vec3 finalCol = mix(gradCol, rimCol, fresnel * 0.8);

  // Vibrance
  vec3 hsvFinal = rgb2hsv(finalCol);
  hsvFinal.y = min(hsvFinal.y * 1.3, 1.0);
  hsvFinal.z = min(hsvFinal.z * 1.2, 1.0);

  gl_FragColor = vec4(hsv2rgb(hsvFinal), 1.0);
}`
  },
  {
    id: 'wonderlust_beach_shoreline',
    name: 'Anime Beach Shoreline',
    category: 'Wonderlust',
    type: 'shader',
    description: 'Stylized anime beach shoreline with oscillating wave foam, turquoise shallow sea, deep waters, and warm sand.',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#f5d77f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, h*0.35, w, 20);
      ctx.fillStyle = '#00d2d3'; ctx.fillRect(0, h*0.4, w, h*0.3);
      ctx.fillStyle = '#0984e3'; ctx.fillRect(0, h*0.7, w, h*0.3);
    },
    vertexShader: `precision mediump float;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  v_uv = uv;
  v_normal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec2 v_uv;
varying vec3 v_normal;

#define PI 3.14159265359

float plotFoam(vec2 st, float pct) {
  return step(pct + 0.06, st.y) - step(pct + 0.08 + abs(sin(u_time * 0.8) * 0.15), st.y);
}
float plotSand(vec2 st, float pct) {
  return step(pct + 0.08, st.y);
}
float plotSea(vec2 st, float pct) {
  return step(pct - 0.45, st.y) - step(pct + 0.06, st.y);
}
float plotDeepSea(vec2 st, float pct) {
  return 1.0 - step(pct - 0.45, st.y);
}

void main() {
  vec2 st = v_uv;
  float y = sin(u_time * 0.8) * 0.15 + sin(PI * 6.0 * st.x) * 0.03 + st.x * 0.3 + 0.35;

  float foam = plotFoam(st, y);
  float sand = plotSand(st, y);
  float sea = plotSea(st, y);
  float deepSea = plotDeepSea(st, y);

  vec3 sandCol = vec3(0.96, 0.82, 0.45);
  vec3 foamCol = vec3(1.0, 1.0, 1.0);
  vec3 seaCol = vec3(0.0, 0.82, 0.95);
  vec3 deepSeaCol = vec3(0.08, 0.25, 0.65);

  vec3 col = sand * sandCol + foam * foamCol + sea * seaCol + deepSea * deepSeaCol;
  
  // Soft 3D lighting shading
  float diff = max(dot(v_normal, normalize(vec3(0.4, 0.7, 0.6))), 0.0);
  col *= (0.75 + diff * 0.3);

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'wonderlust_sunset_ocean',
    name: 'Minimalist Sunset Ocean',
    category: 'Wonderlust',
    type: 'shader',
    description: '3-color minimalist animated ocean sunset gradient with organic wave displacement and warm twilight glow.',
    generate: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f39c12');
      grad.addColorStop(0.5, '#e74c3c');
      grad.addColorStop(1, '#2c3e50');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI * 2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  v_uv = uv;
  v_normal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec2 v_uv;
varying vec3 v_normal;

float cnoise(vec2 uv) {
  const mat2 r = mat2(-0.1288, -0.9917, 0.9917, -0.1288);
  vec2 s0 = cos(uv);
  vec2 s1 = cos(uv * 2.5 * r);
  vec2 s2 = cos(uv * 4.0 * r * r);
  vec2 s = s0 * s1 * s2;
  return (s.x + s.y) * 0.25 + 0.5;
}

void main() {
  vec2 uv = (v_uv - 0.5) * 2.0;

  // Wave displacement
  float wave = cnoise(uv * vec2(2.0, 15.0) + u_time * 1.5) * 0.08;
  vec2 st = vec2(uv.x, uv.y + wave);

  vec3 sunGold = vec3(1.0, 0.78, 0.2);
  vec3 orangeSky = vec3(0.95, 0.42, 0.12);
  vec3 twilightDeep = vec3(0.18, 0.08, 0.25);

  vec3 col = mix(sunGold, orangeSky, smoothstep(-0.4, 0.4, st.y));
  col = mix(col, twilightDeep, smoothstep(0.2, 0.9, -st.y));

  // Sun disc in center
  float sunDisc = smoothstep(0.35, 0.33, length(uv - vec2(0.0, 0.15)));
  col = mix(col, vec3(1.0, 0.95, 0.8), sunDisc * 0.8);

  // Soft spherical shading
  float diff = max(dot(v_normal, normalize(vec3(0.2, 0.5, 0.8))), 0.0);
  col *= (0.7 + diff * 0.35);

  gl_FragColor = vec4(col, 1.0);
}`
  }
];

// ASSEMBLE ALL PRESETS
