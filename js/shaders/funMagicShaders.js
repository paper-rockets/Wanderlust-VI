import { createMatCap } from './materialPresets.js';

export const FUN_MAGIC_SHADERS = [
  {
    id: 'magic_rainbow_pulse',
    name: 'Rainbow Pulse',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      // Thumbnail: spinning rainbow gradient
      for (let i = 0; i < 6; i++) {
        const hue = i * 60;
        const grad = ctx.createRadialGradient(w*0.5, h*0.5, w*i*0.07, w*0.5, h*0.5, w*(i+1)*0.07);
        grad.addColorStop(0, `hsla(${hue},100%,65%,1)`);
        grad.addColorStop(1, `hsla(${hue+60},100%,65%,1)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      }
      const shine = ctx.createRadialGradient(w*0.6, h*0.35, 2, w*0.6, h*0.35, w*0.25);
      shine.addColorStop(0, 'rgba(255,255,255,0.9)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;

vec3 rainbow(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  float fresnel = 1.0 - max(dot(v_normal, v_view_dir), 0.0);
  float t = fresnel * 3.0 + u_time * 0.8 + v_normal.y * 2.0;
  vec3 col = rainbow(t);
  float pulse = 0.8 + 0.2 * sin(u_time * 4.0 + fresnel * 8.0);
  gl_FragColor = vec4(col * pulse, 1.0);
}`
  },
  {
    id: 'magic_electric_arc',
    name: 'Electric Arc',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#050518';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      // Electric blue-white rim
      const rim = ctx.createRadialGradient(w/2, h/2, w*0.3, w/2, h/2, w*0.5);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(0.7, 'rgba(80,160,255,0.5)');
      rim.addColorStop(0.95, 'rgba(180,220,255,0.95)');
      rim.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      // Spark bolt
      ctx.strokeStyle = '#00eeff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w*0.45, h*0.3);
      ctx.lineTo(w*0.52, h*0.5);
      ctx.lineTo(w*0.47, h*0.55);
      ctx.lineTo(w*0.55, h*0.72);
      ctx.stroke();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec3 v_position;
uniform float u_time;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec3 pos = position;
  float bolt = sin(pos.y * 18.0 + u_time * 20.0) * 0.012 * max(0.0, sin(u_time * 5.0));
  pos.x += bolt;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  v_view_dir = normalize(-mv.xyz);
  v_position = pos;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec3 v_position;

void main() {
  float fresnel = pow(1.0 - max(dot(v_normal, v_view_dir), 0.0), 2.0);
  
  // Core dark body
  vec3 col = vec3(0.02, 0.04, 0.12);
  
  // Electric glow on rim
  float spark = sin(v_position.y * 30.0 + u_time * 25.0) * 0.5 + 0.5;
  spark *= sin(v_position.x * 20.0 - u_time * 18.0) * 0.5 + 0.5;
  vec3 arc_color = mix(vec3(0.1, 0.4, 1.0), vec3(0.8, 0.95, 1.0), spark);
  
  col = mix(col, arc_color, fresnel * 1.2);
  col += arc_color * pow(spark, 3.0) * fresnel * 0.8;
  
  // Constant electric rim glow
  col += vec3(0.05, 0.15, 0.5) * pow(fresnel, 2.0);
  
  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'magic_lava_flow',
    name: 'Lava Flow',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.6, h*0.4, 5, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.15, '#ffee00');
      grad.addColorStop(0.4, '#ff5500');
      grad.addColorStop(0.7, '#cc1100');
      grad.addColorStop(0.88, '#330800');
      grad.addColorStop(1, '#0a0000');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_position;
void main() {
  v_normal = normalize(normalMatrix * normal);
  v_uv = uv;
  v_position = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec2 v_uv;
varying vec3 v_position;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = v_uv * 3.0 + vec2(0.0, -u_time * 0.3);
  float n1 = noise(uv + vec2(u_time * 0.2, 0.0));
  float n2 = noise(uv * 2.0 - vec2(u_time * 0.15, u_time * 0.1));
  float lava = n1 * 0.6 + n2 * 0.4;

  vec3 dark_rock = vec3(0.04, 0.01, 0.0);
  vec3 hot_orange = vec3(1.0, 0.35, 0.0);
  vec3 bright_core = vec3(1.0, 0.95, 0.3);

  vec3 col = mix(dark_rock, hot_orange, smoothstep(0.35, 0.65, lava));
  col = mix(col, bright_core, smoothstep(0.65, 0.9, lava));

  // Edge glow
  float fresnel = pow(1.0 - max(dot(v_normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  col += vec3(1.0, 0.2, 0.0) * fresnel * 0.5;

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'magic_soap_bubble',
    name: 'Soap Bubble',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(10,12,20,0.95)';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      const irid = ctx.createLinearGradient(0, 0, w, h);
      irid.addColorStop(0.0, 'rgba(255,100,200,0.5)');
      irid.addColorStop(0.25, 'rgba(100,200,255,0.5)');
      irid.addColorStop(0.5, 'rgba(200,255,100,0.5)');
      irid.addColorStop(0.75, 'rgba(255,180,50,0.5)');
      irid.addColorStop(1.0, 'rgba(200,80,255,0.5)');
      ctx.fillStyle = irid;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      const rim = ctx.createRadialGradient(w/2, h/2, w*0.32, w/2, h/2, w*0.5);
      rim.addColorStop(0, 'rgba(255,255,255,0.0)');
      rim.addColorStop(0.85, 'rgba(255,255,255,0.15)');
      rim.addColorStop(1, 'rgba(255,255,255,0.9)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;

vec3 rainbow(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  float fresnel = 1.0 - max(dot(v_normal, v_view_dir), 0.0);
  
  // Thin-film soap iridescence — shifts with angle and time
  float film = fresnel * 5.0 + u_time * 0.4 + v_normal.x * 2.0 + v_normal.y * 1.5;
  vec3 irid = rainbow(film);
  
  // Very transparent interior, colorful rim
  float alpha_rim = pow(fresnel, 1.2);
  vec3 col = irid * alpha_rim;
  
  // Soft specular highlight
  float spec = pow(max(dot(v_normal, normalize(vec3(0.5, 0.7, 1.0))), 0.0), 24.0);
  col += vec3(spec * 0.6);

  gl_FragColor = vec4(col, 0.5 + fresnel * 0.45);
}`
  },
  {
    id: 'magic_sparkle_glitter',
    name: 'Magic Glitter',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w*0.65, h*0.35, 5, w*0.5, h*0.5, w*0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#e040fb');
      grad.addColorStop(0.65, '#6200ea');
      grad.addColorStop(1, '#12005e');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      // Sparkle dots
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const r = w * (0.15 + Math.random() * 0.3);
        const x = w/2 + Math.cos(angle) * r;
        const y = h/2 + Math.sin(angle) * r;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
      }
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec2 v_uv;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  v_uv = uv;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec2 v_uv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }

void main() {
  float fresnel = 1.0 - max(dot(v_normal, v_view_dir), 0.0);

  // Base purple-violet
  vec3 col = mix(vec3(0.1, 0.0, 0.25), vec3(0.7, 0.1, 1.0), fresnel);

  // Animated glitter — high-frequency micro sparks with smooth circular particle falloff
  vec2 grid = v_uv * 120.0;
  vec2 cell = floor(grid);
  vec2 fractUV = fract(grid) - 0.5;
  vec2 offset = (vec2(hash(cell + 0.1), hash(cell + 0.2)) - 0.5) * 0.55;
  float d = length(fractUV - offset);
  float spark_phase = hash(cell) * 6.28318;
  float twinkle = pow(max(0.0, sin(u_time * 4.5 + spark_phase)), 8.0);
  float flake = smoothstep(0.32, 0.04, d);
  float spark = step(hash(cell + 0.5), 0.42) * flake * twinkle;

  col += vec3(spark * 2.5);

  // Rainbow shimmer on rim
  float hue_t = fresnel * 4.0 + u_time * 0.5;
  vec3 shimmer = 0.5 + 0.5 * cos(6.28318 * (hue_t + vec3(0.0, 0.33, 0.67)));
  col = mix(col, shimmer, fresnel * 0.4);

  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'magic_hologram_scan',
    name: 'Hologram Scan',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#010a0a';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      const rim = ctx.createRadialGradient(w/2, h/2, w*0.28, w/2, h/2, w*0.5);
      rim.addColorStop(0, 'rgba(0,255,200,0.0)');
      rim.addColorStop(0.7, 'rgba(0,255,180,0.3)');
      rim.addColorStop(1, 'rgba(0,255,200,0.95)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      // Scan lines
      for (let y = 0; y < h; y += 12) {
        ctx.fillStyle = 'rgba(0,255,180,0.12)';
        ctx.fillRect(0, y, w, 4);
      }
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec3 v_position;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  v_position = position;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;
varying vec3 v_position;

void main() {
  float fresnel = pow(1.0 - max(dot(v_normal, v_view_dir), 0.0), 1.5);

  // Animated scan line sweep
  float scan_y = mod(v_position.y * 4.0 - u_time * 2.0, 1.0);
  float scanline = step(0.85, scan_y) * 0.6;

  // Holographic teal core
  vec3 holo = vec3(0.0, 1.0, 0.75);
  vec3 col = holo * (fresnel * 0.9 + 0.05);

  // Horizontal scan band moving up
  float sweep = smoothstep(0.0, 0.08, abs(scan_y - 0.5));
  col += holo * (1.0 - sweep) * 0.35;

  // Grid-line flicker
  col += holo * scanline * fresnel;

  // Flicker noise
  float flicker = 0.9 + 0.1 * sin(u_time * 60.0 + v_position.y * 100.0);
  col *= flicker;

  gl_FragColor = vec4(col, 0.75 + fresnel * 0.2);
}`
  },
  {
    id: 'magic_candy_chrome',
    name: 'Candy Chrome',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      // Pastel chrome gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0.0, '#ff9de2');
      grad.addColorStop(0.2, '#a8edea');
      grad.addColorStop(0.4, '#fed6e3');
      grad.addColorStop(0.6, '#a1c4fd');
      grad.addColorStop(0.8, '#ffecd2');
      grad.addColorStop(1.0, '#ff9de2');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      const shine = ctx.createRadialGradient(w*0.65, h*0.35, 2, w*0.65, h*0.35, w*0.3);
      shine.addColorStop(0, 'rgba(255,255,255,1.0)');
      shine.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      shine.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = shine;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;

vec3 pastelRainbow(float t) {
  return 0.75 + 0.22 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  float fresnel = 1.0 - max(dot(v_normal, v_view_dir), 0.0);
  
  // Pastel color shift with normal angle + slow time drift
  float hue = (v_normal.x + v_normal.y) * 1.5 + u_time * 0.25;
  vec3 candy = pastelRainbow(hue);
  
  // Chrome-like reflective sheen
  float spec = pow(max(dot(v_normal, normalize(vec3(0.5, 0.8, 1.0))), 0.0), 32.0);
  vec3 col = candy + vec3(spec * 0.8);

  // Soft rim
  col = mix(col, vec3(1.0), fresnel * 0.25);
  
  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'magic_xray',
    name: 'X-Ray',
    category: '✨ Fun & Magic',
    type: 'shader',
    generate: (ctx, w, h) => {
      ctx.fillStyle = '#000508';
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
      const rim = ctx.createRadialGradient(w/2, h/2, w*0.25, w/2, h/2, w*0.5);
      rim.addColorStop(0, 'rgba(150,220,255,0.0)');
      rim.addColorStop(0.75, 'rgba(150,220,255,0.5)');
      rim.addColorStop(1, 'rgba(220,245,255,1.0)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(w/2, h/2, w/2, 0, Math.PI*2); ctx.fill();
    },
    vertexShader: `precision mediump float;
varying vec3 v_normal;
varying vec3 v_view_dir;
void main() {
  v_normal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  v_view_dir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `precision mediump float;
uniform float u_time;
varying vec3 v_normal;
varying vec3 v_view_dir;

void main() {
  float fresnel = pow(1.0 - max(dot(v_normal, v_view_dir), 0.0), 1.8);
  float pulse = 0.85 + 0.15 * sin(u_time * 2.0);
  vec3 xray = vec3(0.55, 0.88, 1.0) * fresnel * pulse * 2.2;
  gl_FragColor = vec4(xray, fresnel * 0.9);
}`
  }
];


// 🌍 WONDERLUST WEBGPU ANIMATED LIVE SHADERS