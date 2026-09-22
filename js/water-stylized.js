import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// StylizedWaterShader — Cel-shaded / anime water using Voronoi F1 − SmoothF1
// Ported from: https://github.com/cortiz2894/stylized-components
// ─────────────────────────────────────────────────────────────────────────────

export const STYLIZED_WATER_VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>

  varying vec2 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos     = worldPos.xz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position   = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;


export const STYLIZED_WATER_FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>

  uniform float uTime;
  uniform float uScale;
  uniform float uSmoothness;
  uniform float uEdgeThreshold;
  uniform float uEdgeSoftness;
  uniform float uFlowX;
  uniform float uFlowZ;
  uniform float uCellSpeed;
  uniform float uNoiseScale;
  uniform float uNoiseFlowSpeed;
  uniform float uDistortAmount;
  uniform vec3  uDeepColor;
  uniform vec3  uMidColor;
  uniform float uMidPos;
  uniform vec3  uHighlight;
  uniform float uOpacity;
  uniform float uDeepOpacity;
  uniform float uFadeDistance;
  uniform float uFadeStrength;
  uniform vec2  uCamXZ;

  // ── Ripple uniforms ────────────────────────────────────────────────────────
  uniform vec2  uRippleCenters[8];
  uniform float uRippleTimes[8];
  uniform int   uRippleCount;
  uniform float uRippleSpeed;
  uniform float uRippleWidth;
  uniform float uRippleStrength;
  uniform float uRippleDecay;
  uniform int   uRippleRings;
  uniform float uRippleSpacing;

  varying vec2 vWorldPos;

  // ── Helpers ────────────────────────────────────────────────────────────────
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  // Polynomial smooth-min (k = blend radius)
  float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * h * k / 6.0;
  }

  // Animated cell position — shared between F1 and SmoothF1 so subtraction
  // produces correct cell-edge values (same random offsets in both passes).
  vec2 cellPt(vec2 seed) {
    return 0.5 + 0.5 * sin(uTime * uCellSpeed + 6.2831 * seed);
  }

  // Voronoi F1 — nearest-cell Euclidean distance
  float voronoiF1(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float md = 8.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 n  = vec2(float(x), float(y));
        vec2 pt = cellPt(hash2(i + n));
        md = min(md, length(n + pt - f));
      }
    }
    return md;
  }

  // Voronoi SmoothF1 — smooth-min over all cell distances
  float voronoiSF1(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float res = 8.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 n  = vec2(float(x), float(y));
        vec2 pt = cellPt(hash2(i + n));
        res = smin(res, length(n + pt - f), uSmoothness);
      }
    }
    return res;
  }

  // ── fBm noise ─────────────────────────────────────────────────────────────
  float nHash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(nHash(i),                  nHash(i + vec2(1.0, 0.0)), f.x),
      mix(nHash(i + vec2(0.0, 1.0)), nHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 2; i++) { v += a * vnoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    // Noise distortion
    vec2 noiseUV  = vWorldPos * uNoiseScale + vec2(uTime * uNoiseFlowSpeed, 0.0);
    float noiseFac = fbm(noiseUV);
    vec2 distort   = vec2(noiseFac - 0.5) * uDistortAmount;

    // Voronoi UV: base flow + noise distortion
    vec2 uv = vWorldPos * uScale + vec2(uFlowX, uFlowZ) * uTime + distort;

    float f1   = voronoiF1(uv);
    float sf1  = voronoiSF1(uv);

    // F1 − SmoothF1: 0 at cell centers → positive at boundaries
    float edge = f1 - sf1;

    // Cel-shaded ColorRamp: hard step at threshold
    float t = smoothstep(
      uEdgeThreshold - uEdgeSoftness,
      uEdgeThreshold + uEdgeSoftness,
      edge
    );

    // 3-stop ColorRamp: deepColor → midColor → highlight
    float safeMP = max(uMidPos, 1e-4);
    float seg0   = clamp(t / safeMP, 0.0, 1.0);
    float seg1   = clamp((t - safeMP) / max(1.0 - safeMP, 1e-4), 0.0, 1.0);
    float inSeg1 = step(safeMP, t);
    vec3 color   = mix(
      mix(uDeepColor, uMidColor, seg0),
      mix(uMidColor,  uHighlight, seg1),
      inSeg1
    );

    // ── Ripple rings — hard-edged anime rings per impact event ────────────────
    float rippleAcc = 0.0;
    for (int i = 0; i < 8; i++) {
      float isOn    = step(float(i), float(uRippleCount) - 0.5);
      float elapsed = max(uTime - uRippleTimes[i], 0.0);
      float d       = length(vWorldPos - uRippleCenters[i]);

      for (int r = 0; r < 4; r++) {
        float rIsOn    = step(float(r), float(uRippleRings) - 0.5);
        float re       = max(elapsed - float(r) * uRippleSpacing, 0.0);
        float ringR    = re * uRippleSpeed;
        float ringDist = abs(d - ringR);
        float ring     = 1.0 - smoothstep(0.0, uRippleWidth, ringDist);
        float fade     = exp(-re * uRippleDecay);
        rippleAcc     += ring * fade * isOn * rIsOn;
      }
    }
    float ripple = clamp(rippleAcc * uRippleStrength, 0.0, 1.0);

    // Brighten toward highlight color at ring location
    color = mix(color, uHighlight, ripple);

    // Distance fade: keep water solid across the flight world, softly rolling off near outer edge
    float dist = length(vWorldPos - uCamXZ);
    float fade = 1.0 - smoothstep(uFadeDistance * 0.85, uFadeDistance, dist);

    float alpha = mix(uDeepOpacity, 1.0, max(t, ripple)) * uOpacity * fade;
    gl_FragColor = vec4(color, alpha);

    #include <fog_fragment>
  }
`;

// ── Ripple Buffer (max 8 ripples) ───────────────────────────────────────────
const MAX_RIPPLES = 8;
const rippleBuffer = [];

export function addStylizedWaterRipple(x, z, time) {
  if (rippleBuffer.length >= MAX_RIPPLES) rippleBuffer.shift();
  rippleBuffer.push({ x, z, t: time });
}

export function clearStylizedWaterRipples() {
  rippleBuffer.length = 0;
}

// ── Material Factory ────────────────────────────────────────────────────────
export function createStylizedWaterMaterial(options = {}) {
  const customUniforms = {
    uTime:          { value: 0 },
    uScale:         { value: options.uScale ?? 0.045 },
    uSmoothness:    { value: options.uSmoothness ?? 0.46 },
    uEdgeThreshold: { value: options.uEdgeThreshold ?? 0.09 },
    uEdgeSoftness:  { value: options.uEdgeSoftness ?? 0.10 },
    uFlowX:         { value: options.uFlowX ?? 0.03 },
    uFlowZ:         { value: options.uFlowZ ?? -0.08 },
    uCellSpeed:     { value: options.uCellSpeed ?? 0.45 },
    uNoiseScale:    { value: options.uNoiseScale ?? 0.25 },
    uNoiseFlowSpeed:{ value: options.uNoiseFlowSpeed ?? 0.08 },
    uDistortAmount: { value: options.uDistortAmount ?? 0.26 },
    uDeepColor:     { value: new THREE.Color(options.deepColor ?? "#1a4075") },
    uMidColor:      { value: new THREE.Color(options.midColor ?? "#4da9e8") },
    uMidPos:        { value: options.midPos ?? 0.31 },
    uHighlight:     { value: new THREE.Color(options.highlight ?? "#ffffff") },
    uOpacity:       { value: options.opacity ?? 1.0 },
    uDeepOpacity:   { value: options.deepOpacity ?? 0.88 },
    uFadeDistance:  { value: options.fadeDistance ?? 2800.0 },
    uFadeStrength:  { value: options.fadeStrength ?? 1.2 },
    uCamXZ:         { value: new THREE.Vector2(0, 0) },

    // Ripple uniforms
    uRippleCenters: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) },
    uRippleTimes:   { value: new Array(8).fill(0) },
    uRippleCount:   { value: 0 },
    uRippleSpeed:   { value: 6.5 },
    uRippleWidth:   { value: 1.2 },
    uRippleStrength:{ value: 4.0 },
    uRippleDecay:   { value: 1.2 },
    uRippleRings:   { value: 2 },
    uRippleSpacing: { value: 0.8 },

    // Compatibility helpers
    uWaterColor:    { value: new THREE.Color(options.deepColor ?? "#1a4075") },
    uPlayerPos:     { value: new THREE.Vector3(0, 0, 0) },
  };

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    customUniforms
  ]);


  const mat = new THREE.ShaderMaterial({
    vertexShader: STYLIZED_WATER_VERTEX,
    fragmentShader: STYLIZED_WATER_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    fog: true
  });

  return { mat, uniforms };
}

export function syncStylizedWaterRipples(uniforms) {
  if (!uniforms || !uniforms.uRippleCount) return;
  uniforms.uRippleCount.value = rippleBuffer.length;
  for (let i = 0; i < rippleBuffer.length; i++) {
    uniforms.uRippleCenters.value[i].set(rippleBuffer[i].x, rippleBuffer[i].z);
    uniforms.uRippleTimes.value[i] = rippleBuffer[i].t;
  }
}
