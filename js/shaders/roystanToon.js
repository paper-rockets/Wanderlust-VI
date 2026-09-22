import * as THREE from 'three';

// =============================================================================
// ROYSTAN TOON SHADER MODULE (Zelda: Breath of the Wild Style)
// Reference: https://roystan.net/articles/toon-shader/
// =============================================================================

export const roystanParams = {
    enabled: false,             // Master toggle (default OFF)
    rimEnabled: true,           // Sunlit rim lighting on/off
    rimColor: '#fff2d6',        // Warm sunlight glow
    rimThreshold: 0.15,         // Directional light mask threshold
    rimAmount: 0.65,            // Width of the rim highlight (lower = thicker)
    rimIntensity: 1.25,         // Brightness of the rim glow
    specularEnabled: true,      // Stepped cartoon specular on/off
    specularColor: '#ffffff',   // Specular highlight color
    specularSize: 0.04,         // Size of the highlight dot
    specularSmoothness: 0.015,  // Crispness of highlight border
    shininess: 32.0,            // Blinn-phong specular exponent
    applyTerrain: true,         // Apply to landscape & mountains
    applyPlayer: true,          // Apply to player airplane / character
    applyProps: true            // Apply to rocks & ground props
};

export const roystanUniforms = {
    uRoystanEnabled: { value: 0.0 },
    uRoystanRimEnabled: { value: 1.0 },
    uRoystanRimColor: { value: new THREE.Color(roystanParams.rimColor) },
    uRoystanRimThreshold: { value: roystanParams.rimThreshold },
    uRoystanRimAmount: { value: roystanParams.rimAmount },
    uRoystanRimIntensity: { value: roystanParams.rimIntensity },
    uRoystanSpecularEnabled: { value: 1.0 },
    uRoystanSpecularColor: { value: new THREE.Color(roystanParams.specularColor) },
    uRoystanSpecularSize: { value: roystanParams.specularSize },
    uRoystanSpecularSmoothness: { value: roystanParams.specularSmoothness },
    uRoystanShininess: { value: roystanParams.shininess }
};

export function syncRoystanUniforms() {
    roystanUniforms.uRoystanEnabled.value = roystanParams.enabled ? 1.0 : 0.0;
    roystanUniforms.uRoystanRimEnabled.value = roystanParams.rimEnabled ? 1.0 : 0.0;
    roystanUniforms.uRoystanRimColor.value.set(roystanParams.rimColor);
    roystanUniforms.uRoystanRimThreshold.value = Number(roystanParams.rimThreshold);
    roystanUniforms.uRoystanRimAmount.value = Number(roystanParams.rimAmount);
    roystanUniforms.uRoystanRimIntensity.value = Number(roystanParams.rimIntensity);
    roystanUniforms.uRoystanSpecularEnabled.value = roystanParams.specularEnabled ? 1.0 : 0.0;
    roystanUniforms.uRoystanSpecularColor.value.set(roystanParams.specularColor);
    roystanUniforms.uRoystanSpecularSize.value = Number(roystanParams.specularSize);
    roystanUniforms.uRoystanSpecularSmoothness.value = Number(roystanParams.specularSmoothness);
    roystanUniforms.uRoystanShininess.value = Number(roystanParams.shininess);
}

const taggedMaterials = new WeakSet();

/**
 * Injects Roystan's sunlit rim and cartoon specular calculations into any Three.js material.
 * Preserves any prior onBeforeCompile callbacks.
 */
export function applyRoystanShader(material) {
    if (!material || taggedMaterials.has(material) || material.isMeshBasicMaterial) return;
    taggedMaterials.add(material);

    const prevOnBeforeCompile = material.onBeforeCompile;

    material.onBeforeCompile = (shader, renderer) => {
        if (prevOnBeforeCompile) {
            prevOnBeforeCompile(shader, renderer);
        }

        // Attach shared uniforms to this shader instance
        shader.uniforms.uRoystanEnabled = roystanUniforms.uRoystanEnabled;
        shader.uniforms.uRoystanRimEnabled = roystanUniforms.uRoystanRimEnabled;
        shader.uniforms.uRoystanRimColor = roystanUniforms.uRoystanRimColor;
        shader.uniforms.uRoystanRimThreshold = roystanUniforms.uRoystanRimThreshold;
        shader.uniforms.uRoystanRimAmount = roystanUniforms.uRoystanRimAmount;
        shader.uniforms.uRoystanRimIntensity = roystanUniforms.uRoystanRimIntensity;
        shader.uniforms.uRoystanSpecularEnabled = roystanUniforms.uRoystanSpecularEnabled;
        shader.uniforms.uRoystanSpecularColor = roystanUniforms.uRoystanSpecularColor;
        shader.uniforms.uRoystanSpecularSize = roystanUniforms.uRoystanSpecularSize;
        shader.uniforms.uRoystanSpecularSmoothness = roystanUniforms.uRoystanSpecularSmoothness;
        shader.uniforms.uRoystanShininess = roystanUniforms.uRoystanShininess;

        // 1. Vertex Shader: Export view position and view normal
        if (!shader.vertexShader.includes('vRoystanNormal')) {
            shader.vertexShader = `
                varying vec3 vRoystanViewPos;
                varying vec3 vRoystanNormal;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <project_vertex>',
                `#include <project_vertex>
                 vRoystanViewPos = -mvPosition.xyz;
                 vRoystanNormal = normalize(normalMatrix * normal);`
            );
        }

        // 2. Fragment Shader: Inject Roystan Rim + Specular Math
        if (!shader.fragmentShader.includes('uRoystanEnabled')) {
            shader.fragmentShader = `
                uniform float uRoystanEnabled;
                uniform float uRoystanRimEnabled;
                uniform vec3 uRoystanRimColor;
                uniform float uRoystanRimThreshold;
                uniform float uRoystanRimAmount;
                uniform float uRoystanRimIntensity;
                uniform float uRoystanSpecularEnabled;
                uniform vec3 uRoystanSpecularColor;
                uniform float uRoystanSpecularSize;
                uniform float uRoystanSpecularSmoothness;
                uniform float uRoystanShininess;
                varying vec3 vRoystanViewPos;
                varying vec3 vRoystanNormal;
            ` + shader.fragmentShader;

            const roystanFragmentChunk = `
                #include <dithering_fragment>
                if (uRoystanEnabled > 0.5) {
                    vec3 rNorm = normalize(vRoystanNormal);
                    #ifdef DOUBLE_SIDED
                        if (!gl_FrontFacing) rNorm = -rNorm;
                    #endif
                    vec3 rView = normalize(vRoystanViewPos);

                    #if NUM_DIR_LIGHTS > 0
                        vec3 rLightDir = directionalLights[0].direction;
                        vec3 rLightCol = directionalLights[0].color;
                    #else
                        vec3 rLightDir = normalize(vec3(0.5, 1.0, 0.3));
                        vec3 rLightCol = vec3(1.0);
                    #endif

                    float rNdotL = clamp(dot(rNorm, rLightDir), 0.0, 1.0);
                    float rNdotV = clamp(dot(rNorm, rView), 0.0, 1.0);

                    // --- Roystan Sunlit Rim Lighting ---
                    // Rim is masked by NdotL so only the side facing the sun receives the glow
                    float rRimDot = 1.0 - rNdotV;
                    float rRimMask = pow(max(rNdotL, 0.0), uRoystanRimThreshold);
                    float rRimVal = rRimDot * rRimMask;
                    float rRimStep = smoothstep(uRoystanRimAmount - 0.02, uRoystanRimAmount + 0.02, rRimVal);
                    vec3 rRim = rRimStep * uRoystanRimColor * uRoystanRimIntensity * rLightCol * uRoystanRimEnabled;

                    // --- Roystan Stepped Cartoon Specular (Blinn-Phong) ---
                    vec3 rHalf = normalize(rLightDir + rView);
                    float rNdotH = clamp(dot(rNorm, rHalf), 0.0, 1.0);
                    float rSpecPow = pow(rNdotH, uRoystanShininess);
                    float rSpecStep = smoothstep(1.0 - uRoystanSpecularSize - uRoystanSpecularSmoothness, 1.0 - uRoystanSpecularSize + uRoystanSpecularSmoothness, rSpecPow);
                    vec3 rSpec = rSpecStep * step(0.01, rNdotL) * uRoystanSpecularColor * rLightCol * uRoystanSpecularEnabled;

                    gl_FragColor.rgb += rRim + rSpec;
                }
            `;

            if (shader.fragmentShader.includes('#include <dithering_fragment>')) {
                shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', roystanFragmentChunk);
            } else {
                shader.fragmentShader = shader.fragmentShader.replace(/}\s*$/, roystanFragmentChunk + '\n}');
            }
        }
    };

    material.needsUpdate = true;
}
