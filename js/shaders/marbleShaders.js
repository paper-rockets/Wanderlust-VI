// ============================================================================
// 🏛️ Master Collection: 10 Procedural Marble & Natural Stone Shaders
// 100% Original Procedural 3D GLSL Math - Zero Image Downloads Required
// Seamless 3D mesh volume mapping - No UV seams on spheres, busts, or models
// ============================================================================

export const MARBLE_VERTEX_SHADER = `precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;
varying vec3 v_view_dir;
varying vec2 v_uv;

void main() {
  v_uv = uv;
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_position = position;
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

// Shared 3D Simplex Noise, FBM & Lighting GLSL Block
const GLSL_MARBLE_CORE = `
precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_position;
varying vec3 v_view_dir;
varying vec2 v_uv;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float snoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 0.0)), hash13(i + vec3(1.0, 0.0, 0.0)), u.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x),
      u.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x),
      u.y
    ),
    u.z
  );
}

float fbm(vec3 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f;
}

vec3 applyMarbleLighting(vec3 albedo, vec3 normal, vec3 viewDir, float roughness, float metalness) {
  vec3 lightDir = normalize(vec3(0.55, 0.80, 0.55));
  float NdotL = max(dot(normal, lightDir), 0.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float NdotH = max(dot(normal, halfDir), 0.0);
  float specPower = mix(140.0, 18.0, roughness);
  float spec = pow(NdotH, specPower) * (1.0 - roughness * 0.65);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  vec3 ambient = albedo * 0.38;
  vec3 diffuse = albedo * NdotL * 0.62;
  vec3 specColor = mix(vec3(1.0), albedo, metalness);
  vec3 specular = specColor * spec * 0.45;
  vec3 rim = mix(vec3(1.0), albedo, 0.45) * fresnel * 0.24;
  return ambient + diffuse + specular + rim;
}
`;

// Helper to draw a polished circular MatCap sphere thumbnail
function drawSphereThumbnail(ctx, w, h, baseGradient, veinFn) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  baseGradient(ctx, w, h);
  if (veinFn) veinFn(ctx, w, h);

  // Polished glass specular highlight on top-left
  const shine = ctx.createRadialGradient(w * 0.38, h * 0.32, 2, w * 0.38, h * 0.32, w * 0.42);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  shine.addColorStop(0.3, 'rgba(255, 255, 255, 0.20)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Edge darkening rim shadow for 3D depth
  const shadow = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r);
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const MARBLE_PRESETS = [
  // 1. Classic Carrara White Marble
  {
    id: 'marble_carrara_white',
    name: 'Carrara White Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Crisp milky white Italian alabaster stone threaded with organic dark charcoal and smoky slate branching veins.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#fafafa');
          bg.addColorStop(0.7, '#e4e6eb');
          bg.addColorStop(1, '#c8ccd4');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(70, 75, 85, 0.45)';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(width * 0.1, height * 0.2);
          c.bezierCurveTo(width * 0.4, height * 0.35, width * 0.5, height * 0.65, width * 0.85, height * 0.85);
          c.stroke();
          c.strokeStyle = 'rgba(90, 95, 105, 0.3)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(width * 0.4, height * 0.38);
          c.bezierCurveTo(width * 0.6, height * 0.3, width * 0.7, height * 0.45, width * 0.9, height * 0.4);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.2;
  vec3 q = vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(1.7, 9.2, 0.5)));
  vec3 r = vec3(fbm(p + 4.0 * q + vec3(1.7, 9.2, 0.5)), fbm(p + 4.0 * q + vec3(8.3, 2.8, 1.2)), fbm(p + 4.0 * q + vec3(2.4, 5.1, 7.3)));
  float f = fbm(p + 4.0 * r);
  
  float vein = sin(p.y * 3.2 + p.x * 2.0 + 6.0 * f);
  vein = smoothstep(0.72, 0.98, abs(vein));
  
  vec3 stoneBase = mix(vec3(0.96, 0.96, 0.97), vec3(0.88, 0.89, 0.91), q.y * 0.5 + 0.5);
  vec3 veinColor = vec3(0.24, 0.26, 0.30);
  vec3 albedo = mix(stoneBase, veinColor, vein * 0.82);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.22, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 2. Calacatta Gold Marble
  {
    id: 'marble_calacatta_gold',
    name: 'Calacatta Gold Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Warm creamy ivory marble laced with bold honey-gold veining, pale amber halos, and high-gloss polish.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#fefbf6');
          bg.addColorStop(0.7, '#ede6d8');
          bg.addColorStop(1, '#d8cdba');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(215, 165, 65, 0.65)';
          c.lineWidth = 3.5;
          c.beginPath();
          c.moveTo(width * 0.15, height * 0.85);
          c.bezierCurveTo(width * 0.35, height * 0.55, width * 0.6, height * 0.45, width * 0.85, height * 0.15);
          c.stroke();
          c.strokeStyle = 'rgba(180, 130, 45, 0.4)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(width * 0.45, height * 0.5);
          c.bezierCurveTo(width * 0.65, height * 0.65, width * 0.75, height * 0.6, width * 0.9, height * 0.75);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.0;
  vec3 q = vec3(fbm(p), fbm(p + vec3(4.3, 2.1, 1.4)), fbm(p + vec3(2.8, 6.5, 3.1)));
  vec3 r = vec3(fbm(p + 3.8 * q + vec3(1.2, 8.4, 3.5)), fbm(p + 3.8 * q + vec3(7.1, 3.2, 2.6)), fbm(p + 3.8 * q + vec3(3.5, 4.2, 8.1)));
  float f = fbm(p + 3.5 * r);
  
  float veinPrimary = smoothstep(0.70, 0.97, abs(sin(p.y * 2.8 + p.x * 2.2 + 5.5 * f)));
  float veinHalo = smoothstep(0.42, 0.85, abs(sin(p.y * 2.8 + p.x * 2.2 + 5.5 * f)));
  
  vec3 warmBase = mix(vec3(0.98, 0.97, 0.94), vec3(0.92, 0.89, 0.83), q.x * 0.5 + 0.5);
  vec3 goldVein = vec3(0.88, 0.68, 0.26);
  vec3 amberHalo = vec3(0.91, 0.82, 0.60);
  
  vec3 albedo = mix(warmBase, amberHalo, veinHalo * 0.45);
  albedo = mix(albedo, goldVein, veinPrimary * 0.90);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.20, veinPrimary * 0.4);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 3. Royal Nero & Gold Marble
  {
    id: 'marble_nero_gold',
    name: 'Royal Nero & Gold Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Obsidian black polished stone base sliced through by crackled metallic gold and warm bronze veins.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#22252a');
          bg.addColorStop(0.7, '#121418');
          bg.addColorStop(1, '#08090b');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(255, 205, 75, 0.85)';
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(width * 0.2, height * 0.15);
          c.lineTo(width * 0.45, height * 0.4);
          c.lineTo(width * 0.4, height * 0.55);
          c.lineTo(width * 0.75, height * 0.85);
          c.stroke();
          c.strokeStyle = 'rgba(200, 150, 50, 0.5)';
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(width * 0.45, height * 0.4);
          c.lineTo(width * 0.7, height * 0.35);
          c.lineTo(width * 0.85, height * 0.45);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.5;
  vec3 q = vec3(fbm(p), fbm(p + vec3(6.1, 3.4, 1.2)), fbm(p + vec3(2.2, 8.1, 4.5)));
  vec3 r = vec3(fbm(p + 4.5 * q + vec3(3.2, 5.1, 9.4)), fbm(p + 4.5 * q + vec3(8.4, 1.2, 4.3)), fbm(p + 4.5 * q + vec3(1.5, 7.8, 2.9)));
  float f = fbm(p + 4.0 * r);
  
  float sharpVein = smoothstep(0.82, 0.98, abs(sin(p.z * 3.2 + p.y * 2.5 + 7.0 * f)));
  float microVein = smoothstep(0.78, 0.96, abs(sin(p.x * 6.0 + p.y * 5.0 + 10.0 * q.y)));
  
  vec3 blackBase = mix(vec3(0.04, 0.05, 0.06), vec3(0.12, 0.13, 0.15), q.z * 0.5 + 0.5);
  vec3 goldColor = vec3(1.0, 0.82, 0.28);
  vec3 bronzeColor = vec3(0.75, 0.55, 0.22);
  
  vec3 albedo = blackBase;
  albedo = mix(albedo, bronzeColor, microVein * 0.45);
  albedo = mix(albedo, goldColor, sharpVein * 0.95);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.18, sharpVein * 0.8);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 4. Verde Alpi Emerald Marble
  {
    id: 'marble_verde_alpi',
    name: 'Verde Alpi Emerald Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Deep Italian alpine forest green and malachite banded waves with crystalline pale sage and white veins.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#1b5e3a');
          bg.addColorStop(0.65, '#0d3822');
          bg.addColorStop(1, '#051a10');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(180, 225, 195, 0.5)';
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(width * 0.1, height * 0.3);
          c.bezierCurveTo(width * 0.4, height * 0.5, width * 0.6, height * 0.35, width * 0.9, height * 0.7);
          c.stroke();
          c.strokeStyle = 'rgba(70, 160, 110, 0.4)';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(width * 0.2, height * 0.75);
          c.bezierCurveTo(width * 0.5, height * 0.85, width * 0.7, height * 0.6, width * 0.85, height * 0.3);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.3;
  vec3 q = vec3(fbm(p), fbm(p + vec3(3.1, 7.2, 1.9)), fbm(p + vec3(8.5, 2.3, 4.2)));
  float f = fbm(p + 3.8 * q);
  
  float bands = sin(length(p.xy) * 4.0 + 5.0 * f);
  float sageVein = smoothstep(0.75, 0.97, abs(sin(p.y * 4.0 + p.z * 2.0 + 6.0 * q.x)));
  
  vec3 darkGreen = vec3(0.03, 0.18, 0.10);
  vec3 jadeGreen = vec3(0.08, 0.42, 0.26);
  vec3 lightSage = vec3(0.72, 0.88, 0.76);
  
  vec3 albedo = mix(darkGreen, jadeGreen, bands * 0.5 + 0.5);
  albedo = mix(albedo, lightSage, sageVein * 0.85);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.22, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 5. Rose Quartz & Pink Onyx
  {
    id: 'marble_rose_onyx',
    name: 'Rose Quartz & Pink Onyx',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Translucent blush pink and peach quartz stone accented by delicate burgundy and crystal white veins.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#fde8eb');
          bg.addColorStop(0.65, '#e8b0b8');
          bg.addColorStop(1, '#c5848f');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(150, 45, 65, 0.55)';
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(width * 0.15, height * 0.2);
          c.bezierCurveTo(width * 0.35, height * 0.45, width * 0.6, height * 0.55, width * 0.85, height * 0.8);
          c.stroke();
          c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(width * 0.25, height * 0.75);
          c.bezierCurveTo(width * 0.5, height * 0.7, width * 0.65, height * 0.3, width * 0.85, height * 0.35);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.1;
  vec3 q = vec3(fbm(p), fbm(p + vec3(4.2, 1.7, 6.3)), fbm(p + vec3(1.9, 8.4, 2.5)));
  vec3 r = vec3(fbm(p + 3.5 * q + vec3(2.1, 7.5, 3.4)), fbm(p + 3.5 * q + vec3(6.3, 2.1, 8.2)), fbm(p + 3.5 * q + vec3(5.4, 4.3, 1.7)));
  float f = fbm(p + 3.2 * r);
  
  float veinRose = smoothstep(0.70, 0.96, abs(sin(p.y * 3.2 + p.x * 2.1 + 5.0 * f)));
  float veinWhite = smoothstep(0.85, 0.98, abs(sin(p.z * 4.5 + p.y * 3.0 + 7.0 * q.y)));
  
  vec3 softBlush = mix(vec3(0.95, 0.78, 0.81), vec3(0.89, 0.65, 0.69), q.x * 0.5 + 0.5);
  vec3 burgundyVein = vec3(0.48, 0.18, 0.22);
  vec3 whiteCrystal = vec3(0.98, 0.97, 0.98);
  
  vec3 albedo = mix(softBlush, burgundyVein, veinRose * 0.75);
  albedo = mix(albedo, whiteCrystal, veinWhite * 0.60);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.20, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 6. Royal Blue Lapis Lazuli
  {
    id: 'marble_lapis_lazuli',
    name: 'Royal Blue Lapis Lazuli',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Vibrant cobalt and ultramarine blue gemstone stone with glittering gold pyrite flecks and pale calcite swirls.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#2654b0');
          bg.addColorStop(0.65, '#122c6b');
          bg.addColorStop(1, '#071333');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.fillStyle = '#f6c944';
          const points = [
            [width * 0.3, height * 0.4], [width * 0.35, height * 0.45],
            [width * 0.6, height * 0.3], [width * 0.65, height * 0.6],
            [width * 0.45, height * 0.65], [width * 0.75, height * 0.4]
          ];
          points.forEach(([px, py]) => {
            c.beginPath();
            c.arc(px, py, 2.5, 0, Math.PI * 2);
            c.fill();
          });
          c.strokeStyle = 'rgba(230, 240, 255, 0.5)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(width * 0.15, height * 0.65);
          c.bezierCurveTo(width * 0.4, height * 0.5, width * 0.6, height * 0.65, width * 0.85, height * 0.5);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.4;
  vec3 q = vec3(fbm(p), fbm(p + vec3(5.1, 2.4, 7.8)), fbm(p + vec3(1.2, 6.5, 3.9)));
  float f = fbm(p + 3.5 * q);
  
  float calciteVein = smoothstep(0.76, 0.97, abs(sin(p.y * 3.5 + p.x * 2.2 + 5.5 * f)));
  float pyriteNoise = snoise(p * 14.0 + q * 8.0);
  float pyriteGold = smoothstep(0.65, 0.92, pyriteNoise);
  
  vec3 royalBlue = mix(vec3(0.05, 0.15, 0.58), vec3(0.08, 0.32, 0.82), q.y * 0.5 + 0.5);
  vec3 whiteCalcite = vec3(0.88, 0.91, 0.96);
  vec3 sparklingGold = vec3(1.0, 0.86, 0.25);
  
  vec3 albedo = mix(royalBlue, whiteCalcite, calciteVein * 0.65);
  albedo = mix(albedo, sparklingGold, pyriteGold * 0.90);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.22, pyriteGold * 0.7);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 7. Rosso Levanto Crimson Marble
  {
    id: 'marble_rosso_levanto',
    name: 'Rosso Levanto Crimson Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Dramatic Italian wine-red and dark cherry stone covered with intricate white and silver spiderweb fractures.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#661622');
          bg.addColorStop(0.65, '#3b0b14');
          bg.addColorStop(1, '#1c0409');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(250, 250, 250, 0.8)';
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(width * 0.2, height * 0.1);
          c.lineTo(width * 0.45, height * 0.4);
          c.lineTo(width * 0.35, height * 0.65);
          c.lineTo(width * 0.65, height * 0.9);
          c.stroke();
          c.strokeStyle = 'rgba(240, 240, 240, 0.6)';
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(width * 0.45, height * 0.4);
          c.lineTo(width * 0.75, height * 0.35);
          c.lineTo(width * 0.85, height * 0.55);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.6;
  vec3 q = vec3(fbm(p), fbm(p + vec3(7.2, 1.8, 3.4)), fbm(p + vec3(2.5, 9.1, 5.2)));
  float f = fbm(p + 4.2 * q);
  
  float spiderweb = smoothstep(0.80, 0.98, abs(sin(p.y * 4.2 + p.z * 3.5 + 7.5 * f)));
  float secondaryVein = smoothstep(0.74, 0.96, abs(sin(p.x * 5.0 + p.y * 4.0 + 8.0 * q.z)));
  
  vec3 deepWine = mix(vec3(0.35, 0.07, 0.11), vec3(0.18, 0.04, 0.07), q.x * 0.5 + 0.5);
  vec3 whiteVein = vec3(0.96, 0.95, 0.96);
  vec3 grayVein = vec3(0.65, 0.62, 0.64);
  
  vec3 albedo = mix(deepWine, grayVein, secondaryVein * 0.40);
  albedo = mix(albedo, whiteVein, spiderweb * 0.90);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.23, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 8. Roman Travertine
  {
    id: 'marble_travertine_romano',
    name: 'Roman Travertine Stone',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Warm sandy ivory and beige limestone with horizontal stratified mineral waves and natural honed texture.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#f2ece2');
          bg.addColorStop(0.65, '#d9cbba');
          bg.addColorStop(1, '#b8a691');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = 'rgba(160, 140, 120, 0.35)';
          c.lineWidth = 3;
          for (let y = height * 0.25; y < height * 0.85; y += 22) {
            c.beginPath();
            c.moveTo(width * 0.1, y);
            c.bezierCurveTo(width * 0.4, y - 5, width * 0.7, y + 6, width * 0.9, y);
            c.stroke();
          }
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 2.2;
  vec3 q = vec3(fbm(p * vec3(0.5, 2.5, 0.5)), fbm(p + vec3(3.2, 1.4, 5.8)), fbm(p + vec3(6.1, 7.3, 2.2)));
  float f = fbm(p * vec3(0.8, 3.0, 0.8) + 2.5 * q);
  
  float strata = sin(p.y * 7.0 + 3.0 * f) * 0.5 + 0.5;
  float microPores = smoothstep(0.68, 0.88, snoise(p * 18.0));
  
  vec3 lightIvory = vec3(0.93, 0.88, 0.80);
  vec3 warmTan = vec3(0.82, 0.73, 0.62);
  vec3 porousShadow = vec3(0.62, 0.54, 0.44);
  
  vec3 albedo = mix(lightIvory, warmTan, strata * 0.70);
  albedo = mix(albedo, porousShadow, microPores * 0.35);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.42, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 9. Venetian Terrazzo
  {
    id: 'marble_venetian_terrazzo',
    name: 'Venetian Terrazzo Stone',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'White polished marble cement matrix studded with scattered geometric chips of terracotta, jade, black basalt, and amber.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#f8f8f9');
          bg.addColorStop(0.7, '#e0e2e8');
          bg.addColorStop(1, '#c0c4cc');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          const chips = [
            { x: 0.3, y: 0.3, r: 8, col: '#d46548' },
            { x: 0.55, y: 0.25, r: 6, col: '#23583a' },
            { x: 0.4, y: 0.55, r: 9, col: '#1e2025' },
            { x: 0.7, y: 0.45, r: 7, col: '#d99e32' },
            { x: 0.25, y: 0.65, r: 6, col: '#456291' },
            { x: 0.65, y: 0.7, r: 8, col: '#d46548' },
            { x: 0.5, y: 0.8, r: 5, col: '#23583a' },
          ];
          chips.forEach(ch => {
            c.fillStyle = ch.col;
            c.beginPath();
            c.arc(width * ch.x, height * ch.y, ch.r, 0, Math.PI * 2);
            c.fill();
          });
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  vec3 p = v_position * 4.0;
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float minDist = 1.0;
  vec3 chipColor = vec3(0.0);
  
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 cellId = ip + neighbor;
        float rnd = fract(sin(dot(cellId, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
        vec3 posInCell = neighbor + vec3(fract(rnd * 13.1), fract(rnd * 47.3), fract(rnd * 89.7)) * 0.7 + 0.15;
        float d = length(fp - posInCell);
        if (d < minDist) {
          minDist = d;
          if (rnd < 0.25) chipColor = vec3(0.82, 0.35, 0.22);
          else if (rnd < 0.50) chipColor = vec3(0.12, 0.38, 0.25);
          else if (rnd < 0.75) chipColor = vec3(0.12, 0.13, 0.15);
          else chipColor = vec3(0.88, 0.72, 0.35);
        }
      }
    }
  }
  
  float isChip = smoothstep(0.24, 0.21, minDist);
  vec3 cementMatrix = mix(vec3(0.94, 0.94, 0.93), vec3(0.88, 0.88, 0.87), snoise(p * 0.5) * 0.5 + 0.5);
  vec3 albedo = mix(cementMatrix, chipColor, isChip);
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.28, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // 10. Living Liquid Ebru Marble
  {
    id: 'marble_liquid_ebru',
    name: 'Living Liquid Ebru Marble',
    category: '🏛️ Marble & Natural Stone',
    type: 'shader',
    description: 'Animated fluid marbling art with ribbons of deep royal navy, molten gold, white pearl, and violet drifting smoothly in real time.',
    generate: (ctx, w, h) => {
      drawSphereThumbnail(
        ctx, w, h,
        (c, width, height) => {
          const bg = c.createRadialGradient(width * 0.4, height * 0.35, 10, width * 0.5, height * 0.5, width * 0.5);
          bg.addColorStop(0, '#1c284f');
          bg.addColorStop(0.65, '#0d1326');
          bg.addColorStop(1, '#05070e');
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);
        },
        (c, width, height) => {
          c.strokeStyle = '#f5c542';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(width * 0.1, height * 0.4);
          c.bezierCurveTo(width * 0.3, height * 0.8, width * 0.6, height * 0.1, width * 0.9, height * 0.5);
          c.stroke();
          c.strokeStyle = '#9d4edd';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(width * 0.2, height * 0.2);
          c.bezierCurveTo(width * 0.4, height * 0.6, width * 0.7, height * 0.7, width * 0.8, height * 0.9);
          c.stroke();
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(width * 0.3, height * 0.35);
          c.bezierCurveTo(width * 0.5, height * 0.45, width * 0.6, height * 0.25, width * 0.85, height * 0.3);
          c.stroke();
        }
      );
    },
    vertexShader: MARBLE_VERTEX_SHADER,
    fragmentShader: `${GLSL_MARBLE_CORE}
void main() {
  float t = u_time * 0.35;
  vec3 p = v_position * 2.0;
  
  vec3 q = vec3(
    fbm(p + vec3(t * 0.28, 0.0, 0.0)),
    fbm(p + vec3(0.0, t * 0.22, 1.4)),
    fbm(p + vec3(1.2, 0.0, t * 0.30))
  );
  vec3 r = vec3(
    fbm(p + 3.8 * q + vec3(0.0, t * 0.35, 0.0)),
    fbm(p + 3.8 * q + vec3(t * 0.30, 0.0, 1.8)),
    fbm(p + 3.8 * q + vec3(2.4, 1.2, t * 0.18))
  );
  float f = fbm(p + 3.5 * r);
  
  float swirl1 = sin(p.y * 3.0 + 5.0 * f + t);
  float swirl2 = cos(p.x * 2.5 + 4.5 * r.x - t * 0.75);
  
  vec3 deepNavy = vec3(0.06, 0.12, 0.35);
  vec3 liquidGold = vec3(0.95, 0.78, 0.25);
  vec3 pearlWhite = vec3(0.96, 0.96, 0.98);
  vec3 royalViolet = vec3(0.42, 0.12, 0.55);
  
  vec3 albedo = mix(deepNavy, royalViolet, swirl1 * 0.5 + 0.5);
  albedo = mix(albedo, liquidGold, smoothstep(0.42, 0.76, swirl2));
  albedo = mix(albedo, pearlWhite, smoothstep(0.72, 0.95, abs(sin(f * 6.0 + t))));
  
  vec3 norm = normalize(v_normal);
  vec3 col = applyMarbleLighting(albedo, norm, v_view_dir, 0.18, 0.3);
  gl_FragColor = vec4(col, 1.0);
}`
  }
];
