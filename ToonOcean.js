// ToonOcean.js
// Requires Three.js only.
//
// Shoreline map format:
//   - grayscale texture
//   - black = land/coastline
//   - white = open ocean
//   - intermediate gray = distance from shore
//
// The texture is sampled using:
//   shoreUV = worldXZ * shoreMapScale + shoreMapOffset
//
// For best results, use a non-repeating, smoothly filtered grayscale map.
// Land pixels are discarded in the fragment shader.

import * as THREE from "three";

export const toonOceanVertexShader = /* glsl */ `
precision highp float;

#define WAVE_COUNT 10

uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uWaveDirection;
uniform float uCrossSwell;
uniform float uChoppiness;

uniform bool uUseShoreMap;
uniform sampler2D uShoreMap;
uniform vec2 uShoreMapScale;
uniform vec2 uShoreMapOffset;

// Relative wave bearings.
// Wave 0 is the dominant wind swell.
// Waves 2 and 3 are cross-swells.
// The remaining waves are shorter, multi-directional chop.
const float waveAngles[WAVE_COUNT] = float[WAVE_COUNT](
    0.00,
    0.43,
   -0.72,
    1.38,
   -1.78,
    0.92,
   -2.42,
    0.22,
    2.16,
   -1.18
);

const float waveLength[WAVE_COUNT] = float[WAVE_COUNT](
    950.0,
    620.0,
    820.0,
    510.0,
    310.0,
    210.0,
    145.0,
     96.0,
     62.0,
     38.0
);

const float waveAmplitude[WAVE_COUNT] = float[WAVE_COUNT](
    1.00,
    0.55,
    0.45,
    0.36,
    0.25,
    0.19,
    0.14,
    0.105,
    0.075,
    0.050
);

const float waveSteepness[WAVE_COUNT] = float[WAVE_COUNT](
    0.72,
    0.58,
    0.56,
    0.50,
    0.42,
    0.38,
    0.33,
    0.28,
    0.24,
    0.20
);

const float waveSpeedScale[WAVE_COUNT] = float[WAVE_COUNT](
    1.00,
    0.84,
    0.91,
    0.76,
    0.68,
    0.61,
    0.54,
    0.47,
    0.41,
    0.36
);

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vShoreUV;
varying float vShore;
varying float vHeight;
varying float vCrest;
varying vec2 vOceanXZ;

void main() {
    vec3 base = position;
    vec2 xz = base.xz;

    float shore = 1.0;
    vec2 shoreUV = xz * uShoreMapScale + uShoreMapOffset;

    if (uUseShoreMap) {
        shore = texture2D(uShoreMap, shoreUV).r;
    }

    // Calm large displacement near the coast.
    // Small residual motion remains so the shoreline does not look dead.
    float largeWaveCalm = mix(0.16, 1.0, smoothstep(0.035, 0.38, shore));
    float chopCalm = mix(0.45, 1.0, smoothstep(0.015, 0.22, shore));

    vec3 displaced = base;

    // Derivatives of the displaced surface:
    // tx = dPosition / dx
    // tz = dPosition / dz
    vec3 tx = vec3(1.0, 0.0, 0.0);
    vec3 tz = vec3(0.0, 0.0, 1.0);

    float totalHeight = 0.0;
    float crestEnergy = 0.0;

    for (int i = 0; i < WAVE_COUNT; i++) {
        float angle = uWaveDirection + waveAngles[i];
        vec2 dir = vec2(cos(angle), sin(angle));

        float wavelength = waveLength[i];
        float k = 6.28318530718 / wavelength;

        float crossAmount = 1.0;

        // Cross-swells are controlled independently.
        if (i == 2 || i == 3) {
            crossAmount = uCrossSwell;
        }

        float groupCalm = (i < 4) ? largeWaveCalm : chopCalm;

        float amplitude =
            uWaveHeight *
            waveAmplitude[i] *
            crossAmount *
            groupCalm;

        float q =
            waveSteepness[i] *
            uChoppiness *
            crossAmount *
            groupCalm;

        float phase =
            dot(dir, xz) * k -
            uTime * uWaveSpeed * waveSpeedScale[i] * sqrt(k);

        float s = sin(phase);
        float c = cos(phase);

        // Gerstner displacement.
        displaced.x += dir.x * q * amplitude * c;
        displaced.z += dir.y * q * amplitude * c;
        displaced.y += amplitude * s;

        // Analytic surface derivatives.
        float commonFactor = q * amplitude * k * s;

        tx.x += -dir.x * dir.x * commonFactor;
        tx.z += -dir.x * dir.y * commonFactor;
        tx.y +=  amplitude * k * dir.x * c;

        tz.x += -dir.x * dir.y * commonFactor;
        tz.z += -dir.y * dir.y * commonFactor;
        tz.y +=  amplitude * k * dir.y * c;

        totalHeight += amplitude * s;

        // Positive crest energy is later broken up by procedural noise.
        float crest = max(s, 0.0) * abs(amplitude);
        crestEnergy += crest * ((i < 4) ? 0.75 : 0.32);
    }

    // A stable upward-facing analytic normal.
    vec3 localNormal = normalize(cross(tz, tx));

    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);

    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(normalMatrix * localNormal);
    vShoreUV = shoreUV;
    vShore = shore;
    vHeight = totalHeight;
    vCrest = crestEnergy;
    vOceanXZ = displaced.xz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const toonOceanFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;

uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;

uniform vec3 uLightDirection;
uniform float uToonSteps;

uniform bool uUseShoreMap;
uniform float uShoreBandScale;
uniform float uShoreBandSpeed;
uniform float uShoreBandWidth;
uniform float uShoreFoamFalloff;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vShoreUV;
varying float vShore;
varying float vHeight;
varying float vCrest;
varying vec2 vOceanXZ;

// Continuous hash/value noise. It avoids hard pixel-grid artifacts.
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float n = 0.0;
    float amp = 0.5;

    for (int i = 0; i < 4; i++) {
        n += valueNoise(p) * amp;
        p = p * 2.03 + vec2(17.1, 9.2);
        amp *= 0.5;
    }

    return n;
}

float softBand(float x, float width) {
    float d = abs(fract(x) - 0.5);
    return 1.0 - smoothstep(width, width + 0.08, d);
}

void main() {
    // Black land pixels are not water.
    if (uUseShoreMap && vShore < 0.015) {
        discard;
    }

    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uLightDirection);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    float ndl = max(dot(N, L), 0.0);

    // Four-ish soft toon levels.
    float steps = clamp(uToonSteps, 3.0, 5.0);
    float bandedLight = floor(ndl * steps) / max(steps - 1.0, 1.0);
    bandedLight = mix(bandedLight, ndl, 0.22);
    bandedLight = clamp(bandedLight, 0.0, 1.0);

    // Height and crest coloration.
    float height01 = smoothstep(
        -uShallowColor.r * 0.0 - 0.45,
         0.75,
         vHeight / max(1.0, 1.0)
    );

    float crest01 = clamp(vCrest / max(0.001, 0.75), 0.0, 1.0);
    float waterMix = clamp(height01 * 0.48 + crest01 * 0.45, 0.0, 1.0);

    vec3 waterColor = mix(uDeepColor, uShallowColor, waterMix);

    // Soft toon illumination rather than PBR shading.
    vec3 color = waterColor * (0.52 + 0.72 * bandedLight);

    // Fresnel/rim contribution.
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
    float rim = fresnel * (0.18 + 0.34 * bandedLight);

    vec3 cyanRim = mix(uShallowColor, vec3(0.35, 0.95, 1.0), 0.38);
    color += cyanRim * rim;

    // Large-scale irregular breakup field.
    vec2 noiseCoord = vWorldPosition.xz * 0.0021;
    float breakup = fbm(noiseCoord + vec2(uTime * 0.006, -uTime * 0.004));
    float fineNoise = valueNoise(vWorldPosition.xz * 0.018 + uTime * 0.012);

    // Procedural crest foam:
    // steep/bright wave crests create the mask, noise breaks it into patches.
    float crestMask = smoothstep(0.18, 0.62, vCrest);
    float crestBreakup = smoothstep(0.42, 0.73, breakup * 0.72 + fineNoise * 0.28);
    float crestFoam = crestMask * crestBreakup;

    // Sparse glints, with large and small scales to prevent repetition.
    float glintNoise = fbm(vWorldPosition.xz * 0.006 + vec2(uTime * 0.035));
    float glintShape = smoothstep(0.73, 0.91, glintNoise);
    float specular = pow(max(dot(reflect(-L, N), V), 0.0), 30.0);
    float glints = glintShape * specular * 0.8;

    // Shoreline foam.
    // The map's grayscale value behaves as normalized distance from shore.
    float shoreFoam = 0.0;

    if (uUseShoreMap) {
        float nearShore =
            smoothstep(0.015, 0.13, vShore) *
            exp(-vShore * uShoreFoamFalloff);

        // Several moving bands in shore-distance space.
        // Noise offsets break the bands into fragmented patches.
        float shoreNoise = fbm(vWorldPosition.xz * 0.004 + uTime * 0.008);
        float animatedDistance =
            vShore * uShoreBandScale -
            uTime * uShoreBandSpeed +
            shoreNoise * 1.8;

        float bands = softBand(animatedDistance, uShoreBandWidth);
        float breakupShore = smoothstep(
            0.38,
            0.72,
            fbm(vWorldPosition.xz * 0.011 - uTime * 0.006)
        );

        shoreFoam = nearShore * bands * breakupShore;
    }

    float foam = clamp(max(crestFoam, shoreFoam), 0.0, 1.0);

    color = mix(color, uFoamColor, foam * 0.88);
    color += vec3(1.0, 0.98, 0.88) * glints;

    // Very mild atmospheric distance lift.
    float distanceFade = smoothstep(1200.0, 5200.0, length(cameraPosition - vWorldPosition));
    color = mix(color, color * 0.82 + uShallowColor * 0.18, distanceFade * 0.22);

    gl_FragColor = vec4(color, 1.0);
}
`;

const DEFAULTS = {
    size: 6000,
    resolution: 384,

    waveHeight: 24.0,
    waveSpeed: 1.0,
    waveDirection: 0.0,
    crossSwell: 0.85,
    choppiness: 1.0,

    deepColor: new THREE.Color("#06357d"),
    shallowColor: new THREE.Color("#19b9c9"),
    foamColor: new THREE.Color("#f5ffff"),

    toonSteps: 4,
    lightDirection: new THREE.Vector3(-0.35, 0.85, 0.25).normalize(),

    shorelineMap: null,
    shoreMapScale: new THREE.Vector2(1.0 / 6000.0, 1.0 / 6000.0),
    shoreMapOffset: new THREE.Vector2(0.5, 0.5),

    shoreBandScale: 26.0,
    shoreBandSpeed: 0.18,
    shoreBandWidth: 0.13,
    shoreFoamFalloff: 4.5
};

export class ToonOcean {
    constructor(options = {}) {
        this.options = { ...DEFAULTS, ...options };

        const o = this.options;

        const geometry = new THREE.PlaneGeometry(
            o.size,
            o.size,
            o.resolution,
            o.resolution
        );

        // PlaneGeometry initially lies in XY. Rotate it so its local XZ
        // coordinates form a horizontal ocean surface.
        geometry.rotateX(-Math.PI * 0.5);

        const shoreMap = o.shorelineMap || new THREE.DataTexture(
            new Uint8Array([255, 255, 255, 255]),
            1,
            1,
            THREE.RGBAFormat
        );

        shoreMap.wrapS = THREE.ClampToEdgeWrapping;
        shoreMap.wrapT = THREE.ClampToEdgeWrapping;
        shoreMap.minFilter = THREE.LinearFilter;
        shoreMap.magFilter = THREE.LinearFilter;
        shoreMap.needsUpdate = true;

        this.uniforms = {
            uTime: { value: 0 },

            uWaveHeight: { value: o.waveHeight },
            uWaveSpeed: { value: o.waveSpeed },
            uWaveDirection: { value: o.waveDirection },
            uCrossSwell: { value: o.crossSwell },
            uChoppiness: { value: o.choppiness },

            uDeepColor: { value: new THREE.Color(o.deepColor) },
            uShallowColor: { value: new THREE.Color(o.shallowColor) },
            uFoamColor: { value: new THREE.Color(o.foamColor) },

            uToonSteps: { value: o.toonSteps },
            uLightDirection: {
                value: new THREE.Vector3().copy(o.lightDirection).normalize()
            },

            uUseShoreMap: { value: !!o.shorelineMap },
            uShoreMap: { value: shoreMap },
            uShoreMapScale: { value: new THREE.Vector2().copy(o.shoreMapScale) },
            uShoreMapOffset: { value: new THREE.Vector2().copy(o.shoreMapOffset) },

            uShoreBandScale: { value: o.shoreBandScale },
            uShoreBandSpeed: { value: o.shoreBandSpeed },
            uShoreBandWidth: { value: o.shoreBandWidth },
            uShoreFoamFalloff: { value: o.shoreFoamFalloff }
        };

        this.material = new THREE.ShaderMaterial({
            vertexShader: toonOceanVertexShader,
            fragmentShader: toonOceanFragmentShader,
            uniforms: this.uniforms,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.name = "ToonOcean";
        this.mesh.frustumCulled = false;
    }

    update(timeInSeconds) {
        this.uniforms.uTime.value = timeInSeconds;
    }

    setControls(values = {}) {
        const u = this.uniforms;

        if (values.waveHeight !== undefined) {
            u.uWaveHeight.value = values.waveHeight;
        }

        if (values.waveSpeed !== undefined) {
            u.uWaveSpeed.value = values.waveSpeed;
        }

        if (values.waveDirection !== undefined) {
            u.uWaveDirection.value = values.waveDirection;
        }

        if (values.crossSwell !== undefined) {
            u.uCrossSwell.value = values.crossSwell;
        }

        if (values.choppiness !== undefined) {
            u.uChoppiness.value = values.choppiness;
        }

        if (values.shallowColor !== undefined) {
            u.uShallowColor.value.set(values.shallowColor);
        }

        if (values.deepColor !== undefined) {
            u.uDeepColor.value.set(values.deepColor);
        }

        if (values.foamColor !== undefined) {
            u.uFoamColor.value.set(values.foamColor);
        }

        if (values.toonSteps !== undefined) {
            u.uToonSteps.value = THREE.MathUtils.clamp(
                values.toonSteps,
                3,
                5
            );
        }

        if (values.lightDirection !== undefined) {
            u.uLightDirection.value.copy(values.lightDirection).normalize();
        }

        if (values.shorelineMap !== undefined) {
            const map = values.shorelineMap;

            u.uShoreMap.value = map;
            u.uUseShoreMap.value = !!map;

            if (map) {
                map.wrapS = THREE.ClampToEdgeWrapping;
                map.wrapT = THREE.ClampToEdgeWrapping;
                map.minFilter = THREE.LinearFilter;
                map.magFilter = THREE.LinearFilter;
                map.needsUpdate = true;
            }
        }

        if (values.shoreMapScale !== undefined) {
            u.uShoreMapScale.value.copy(values.shoreMapScale);
        }

        if (values.shoreMapOffset !== undefined) {
            u.uShoreMapOffset.value.copy(values.shoreMapOffset);
        }

        if (values.shoreBandScale !== undefined) {
            u.uShoreBandScale.value = values.shoreBandScale;
        }

        if (values.shoreBandSpeed !== undefined) {
            u.uShoreBandSpeed.value = values.shoreBandSpeed;
        }

        if (values.shoreBandWidth !== undefined) {
            u.uShoreBandWidth.value = values.shoreBandWidth;
        }

        if (values.shoreFoamFalloff !== undefined) {
            u.uShoreFoamFalloff.value = values.shoreFoamFalloff;
        }
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
