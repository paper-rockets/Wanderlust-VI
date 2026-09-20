import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ==========================================
// GOD RAYS & SUMMER POST-PROCESSING SHADERS
// ==========================================

export function initPostProcessingShaders(composer, params, LOW_GFX) {
        // ==========================================
        // GOD RAYS POST-PROCESSING PASS
        // ==========================================
        const GodRaysShader = {
            uniforms: {
                tDiffuse: { value: null },
                uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
                uIntensity: { value: 0.60 },
                uDecay: { value: 0.92 },
                uDensity: { value: 0.50 },
                uWeight: { value: 0.85 },
                uLumMin: { value: 0.85 },
                uLumMax: { value: 0.98 },
                uRayColorInner: { value: new THREE.Color('#ffea9f') },
                uRayColorOuter: { value: new THREE.Color('#ff9933') },
                uEdgeFadeDist: { value: 1.5 },
                uSunVisible: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 uSunScreenPos;
                uniform float uIntensity;
                uniform float uDecay;
                uniform float uDensity;
                uniform float uWeight;
                uniform float uLumMin;
                uniform float uLumMax;
                uniform vec3 uRayColorInner;
                uniform vec3 uRayColorOuter;
                uniform float uEdgeFadeDist;
                uniform float uSunVisible;
                varying vec2 vUv;
    
                float pseudoRand(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
                }
    
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
    
                    // Direction from this pixel toward the sun
                    vec2 deltaUV = (vUv - uSunScreenPos);
                    float dist = length(deltaUV);
                    deltaUV *= (1.0 / 24.0) * uDensity; // 24 dithered samples for crepuscular light shafts piercing through clouds
    
                    // Screen-space dither offsets sample points to eliminate banding
                    float dither = pseudoRand(gl_FragCoord.xy);
                    vec2 sampleUV = vUv - (deltaUV * dither);
    
                    float illumination = 0.0;
                    float currentWeight = uWeight;
    
                    for(int i = 0; i < 24; i++) {
                        sampleUV -= deltaUV;
                        vec4 samp = texture2D(tDiffuse, clamp(sampleUV, 0.001, 0.999));
                        float lum = dot(samp.rgb, vec3(0.299, 0.587, 0.114));
                        // Luminance gate captures sun disk and rim highlights piercing past clouds
                        float bright = smoothstep(uLumMin, uLumMax, lum);
                        illumination += bright * currentWeight;
                        currentWeight *= uDecay;
                    }
    
                    // Intensity normalization for 24-sample step integration
                    illumination *= 1.35;
    
                    // Fade out rays near screen edges and when sun is off-screen
                    float edgeFade = 1.0 - smoothstep(0.4, uEdgeFadeDist, dist);
    
                    // Dual-tone sunset/daylight radial gradient from Wanderlust-II
                    vec3 rayTint = mix(uRayColorInner, uRayColorOuter, smoothstep(0.0, uEdgeFadeDist * 0.7, dist));
                    vec3 rayColor = rayTint * illumination * uIntensity * edgeFade * uSunVisible;
    
                    gl_FragColor = vec4(texel.rgb + rayColor, texel.a);
                }
            `
        };
    
        const godRaysPass = new ShaderPass(GodRaysShader);
        godRaysPass.enabled = !LOW_GFX;
        composer.addPass(godRaysPass);
    
        const GhibliSummerShader = {
            uniforms: {
                tDiffuse: { value: null }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D( tDiffuse, vUv );
                    vec3 col = texel.rgb;

                    float lum = dot(col, vec3(0.299, 0.587, 0.114));

                    // Studio Ghibli Summer Split-Toning (Golden sunlit highlights, soft atmospheric cerulean shadows)
                    vec3 warmGold = col * vec3(1.07, 1.02, 0.92);
                    vec3 azureShadow = col * vec3(0.93, 0.98, 1.07);
                    col = mix(azureShadow, warmGold, smoothstep(0.2, 0.75, lum));

                    // Lush Saturation Boost (Chlorophyll greens & vibrant ocean)
                    col = mix(vec3(lum), col, 1.18);

                    // Sun-drenched warm optical shimmer on highlights
                    col += max(vec3(0.0), col - 0.55) * vec3(0.12, 0.09, 0.02);

                    // Subtle Hand-Painted Celluloid Vignette
                    vec2 uv = (vUv - 0.5) * 2.0;
                    float vign = clamp(1.0 - dot(uv, uv) * 0.14, 0.0, 1.0);
                    col *= vign;

                    gl_FragColor = vec4(col, texel.a);
                }
            `
        };

        const summerPass = new ShaderPass(GhibliSummerShader);
        summerPass.enabled = false;
        composer.addPass(summerPass);
    
        let isSummerFilterOn = false;
        const summerBtn = document.getElementById('summer-toggle');
        if (summerBtn) {
            summerBtn.addEventListener('click', () => {
                isSummerFilterOn = !isSummerFilterOn;
                summerPass.enabled = isSummerFilterOn;
                if (typeof params !== 'undefined') params.summerFilter = isSummerFilterOn;
            });
        }
    
    

    return {
        GodRaysShader,
        GhibliSummerShader,
        godRaysPass,
        summerPass
    };
}
