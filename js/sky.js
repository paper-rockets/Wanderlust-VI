import * as THREE from 'three';

// ==========================================
// PROCEDURAL SKY DOME & ENVIRONMENT PRESETS
// ==========================================

export const envConfigs = [
    {bg: 0x3a88d6, skyMid: 0x72b2e8, skyHorizon: 0xb8daf2, horizonGlow: 0.15, amb: 0xd8eefa, dir: 0xfffbf0, ambI: 1.25, dirI: 2.50, starOp: 0, sunY: 10000, moonY: -8000, glintCol: 0xfff0d0, cloudCol: 0xfffcf5, crystalGlowMult: 0.0, waterColor: 0x1a4075}, // Day (Wanderlust-II)
    {bg: 0x2a5090, skyMid: 0xc85078, skyHorizon: 0xffa07a, horizonGlow: 0.45, amb: 0xffffff, dir: 0xf09e9e, ambI: 1.833, dirI: 4.92, starOp: 0, sunY: 160, moonY: 200, glintCol: 0xffaa00, cloudCol: 0xfffaec, crystalGlowMult: 0.45, waterColor: 0x1a4075}, // Dusk (Cloned from Wanderlust-II)
    {bg: 0x162d5a, skyMid: 0x1d3a6e, skyHorizon: 0x224888, horizonGlow: 0.10, amb: 0x7788bb, dir: 0xffbb55, ambI: 1.5, dirI: 3.5, starOp: 1.0, sunY: -8000, moonY: 1600, glintCol: 0xffaa44, cloudCol: 0x2e4a80, crystalGlowMult: 1.0, waterColor: 0x1a4075}, // Night (copied from ghibli-flight)
];

export function createCloudNoiseTexture(size = 256) {
    const data = new Uint8Array(size * size * 4);
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = p[i]; p[i] = p[j]; p[j] = temp;
    }
    for (let i = 0; i < 256; i++) p[256 + i] = p[i];

    function hash2(x, y) {
        return p[p[x & 255] + (y & 255)] / 255.0;
    }

    function tileableNoise(x, y, period) {
        const px = ((x % period) + period) % period;
        const py = ((y % period) + period) % period;
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const x1 = (x0 + 1) % period;
        const y1 = (y0 + 1) % period;
        const fx = px - x0;
        const fy = py - y0;
        const u = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
        const v = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);
        const v00 = hash2(x0, y0);
        const v10 = hash2(x1, y0);
        const v01 = hash2(x0, y1);
        const v11 = hash2(x1, y1);
        return (v00 * (1.0 - u) + v10 * u) * (1.0 - v) + (v01 * (1.0 - u) + v11 * u) * v;
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;
            const idx = (y * size + x) * 4;
            data[idx + 0] = Math.floor(tileableNoise(u * 4, v * 4, 4) * 255);
            data[idx + 1] = Math.floor(tileableNoise(u * 8, v * 8, 8) * 255);
            data[idx + 2] = Math.floor(tileableNoise(u * 16, v * 16, 16) * 255);
            data[idx + 3] = Math.floor(tileableNoise(u * 32, v * 32, 32) * 255);
        }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}

export function initSky(scene, params) {
    const cloudNoiseTex = createCloudNoiseTexture(256);

    const skyUniforms = {
        uZenith: { value: new THREE.Color(envConfigs[1].bg) },
        uMid: { value: new THREE.Color(envConfigs[1].skyMid) },
        uHorizon: { value: new THREE.Color(envConfigs[1].skyHorizon) },
        uHorizonGlow: { value: envConfigs[1].horizonGlow },
        uGradientPower: { value: 0.7 },
        uGradientMidOffset: { value: 0.08 },
        uGradientSkyEnabled: { value: 1.0 },

        uTime: { value: 0.0 },
        uSunPosition: { value: new THREE.Vector3(0.0, 0.5, -0.866).normalize() },
        uSunColor: { value: new THREE.Color(0xffaa00) },
        uNoiseTex: { value: cloudNoiseTex },
        uCloudColor: { value: new THREE.Color(0xfffaec) },
        uCloudShadowColor: { value: new THREE.Color(0x8ca4c8) },
        uCloudCoverage: { value: params.domeCloudCoverage || 0.45 },
        uCloudEdge: { value: params.domeCloudEdge || 0.08 },
        uCloudSpeed: { value: params.domeCloudSpeed || 0.015 },
        uCloudOpacity: { value: params.domeCloudOpacity || 0.95 },
        uEnableProceduralClouds: { value: params.domeClouds ? 1.0 : 0.0 },
        uDuskFactor: { value: 1.0 },
        uNightFactor: { value: 0.0 },
    };

    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: `
            varying vec3 vDir;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vDir = wp.xyz - cameraPosition;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: `
            uniform vec3 uZenith, uMid, uHorizon;
            uniform float uHorizonGlow, uGradientPower, uGradientMidOffset, uGradientSkyEnabled;
            uniform float uTime;
            uniform vec3 uSunPosition;
            uniform vec3 uSunColor;
            uniform sampler2D uNoiseTex;
            uniform vec3 uCloudColor;
            uniform vec3 uCloudShadowColor;
            uniform float uCloudCoverage;
            uniform float uCloudEdge;
            uniform float uCloudSpeed;
            uniform float uCloudOpacity;
            uniform float uEnableProceduralClouds;
            uniform float uDuskFactor;
            uniform float uNightFactor;

            varying vec3 vDir;

            void main() {
                vec3 dir = normalize(vDir);
                vec3 sunDir = normalize(uSunPosition);
                float sunDot = dot(dir, sunDir);

                // Vertical altitude angle: 0.0 at horizon, 1.0 overhead
                float alt = clamp((dir.y - 0.05) / 0.95, 0.0, 1.0);

                // 3-stop gradient: horizon -> mid (up to Mid-Height Offset) -> zenith
                float tLower = clamp(alt / max(uGradientMidOffset, 0.01), 0.0, 1.0);
                float tUpper = clamp((alt - uGradientMidOffset) / max(1.0 - uGradientMidOffset, 0.01), 0.0, 1.0);
                vec3 lowerSky = mix(uHorizon, uMid, pow(tLower, uGradientPower));
                vec3 gradientSky = mix(lowerSky, uZenith, pow(tUpper, uGradientPower));

                // Simple 2-stop fallback when the gradient curve is disabled
                vec3 twoStopSky = mix(uHorizon, uZenith, pow(clamp(alt * 1.5, 0.0, 1.0), 0.6));
                vec3 baseAtmosphere = mix(twoStopSky, gradientSky, uGradientSkyEnabled);

                // Sun disc and forward atmospheric corona glow (from Wanderlust proceduralSky.js)
                vec3 sunDisc = smoothstep(0.9985, 0.9997, sunDot) * uSunColor * 1.5;
                vec3 sunCorona = pow(clamp(sunDot, 0.0, 1.0), 96.0) * uSunColor * 0.35;
                vec3 sunHaze = pow(clamp(sunDot, 0.0, 1.0), 32.0) * uHorizon * 0.04;

                // Horizon warm rim glow
                float horizonBand = pow(clamp(1.0 - abs(dir.y), 0.0, 1.0), 3.0) * smoothstep(0.03, 0.12, dir.y);
                vec3 duskGlow = horizonBand * uHorizon * uHorizonGlow * mix(1.0, 1.8, uDuskFactor);

                // Night stars (lightweight, zero-cost during day)
                vec3 nightSky = vec3(0.0);
                if (uNightFactor > 0.01) {
                    vec3 pStar = dir * 180.0;
                    vec4 sNoise = texture2D(uNoiseTex, pStar.xz * 0.02 + pStar.y * 0.01);
                    float starVal = step(0.97, sNoise.r) * pow(sNoise.g, 2.0);
                    float starTwinkle = sin(uTime * 2.0 + sNoise.b * 6.28) * 0.35 + 0.65;
                    float starFade = smoothstep(0.05, 0.30, dir.y);
                    nightSky = vec3(starVal * starTwinkle * starFade * 1.4);
                }

                // Composite atmospheric sky
                vec3 sky = baseAtmosphere + sunCorona + sunHaze + sunDisc + duskGlow + nightSky * uNightFactor;

                // PROCEDURAL CLOUDS LAYER (Level 2 Noise Texture WebGL Optimized)
                if (uEnableProceduralClouds > 0.01 && dir.y > -0.05) {
                    // Upper hemisphere dome projection (from Wanderlust proceduralSky.js)
                    float skyDomeDist = 1.0 / max(dir.y + 0.15, 0.08);
                    vec2 cloudUV = dir.xz * skyDomeDist * 0.45;

                    // Wind drift & movement + initial offset
                    vec2 windOffset = vec2(uTime * uCloudSpeed * 0.15, uTime * uCloudSpeed * 0.08);
                    vec2 uvSample = cloudUV + windOffset + vec2(14.8, 32.4);

                    // Sample Level 2 noise texture (calibrated to Wanderlust unit scale)
                    vec4 t0 = texture2D(uNoiseTex, uvSample * 0.25);
                    vec4 t1 = texture2D(uNoiseTex, (uvSample + vec2(5.2, 1.3)) * 0.25);

                    float f0 = t0.r * 0.50 + t0.g * 0.25 + t0.b * 0.15 + t0.a * 0.10;
                    float f1 = t1.r * 0.50 + t1.g * 0.25 + t1.b * 0.15 + t1.a * 0.10;
                    vec2 q = vec2(f0 - 0.5, f1 - 0.5) * 1.6;

                    // Domain warping produces billowy anime cloud formations
                    vec2 warpedUV = uvSample * 0.25 + q * 0.35;
                    vec4 tWarp = texture2D(uNoiseTex, warpedUV);
                    float cloudNoise = tWarp.r * 0.50 + tWarp.g * 0.25 + tWarp.b * 0.15 + tWarp.a * 0.10;

                    // Coverage & Soft Edge Thresholding
                    float lowThreshold = 1.0 - uCloudCoverage;
                    float highThreshold = lowThreshold + max(uCloudEdge, 0.02);
                    float cloudAlpha = smoothstep(lowThreshold, highThreshold, cloudNoise);

                    // Solar Clearance Corridor: subtle clearing right at the sun center
                    float sunProximity = clamp(sunDot, 0.0, 1.0);
                    float sunClearMask = 1.0 - smoothstep(0.96, 0.998, sunProximity) * 0.70;

                    // Horizon fade so clouds blend cleanly above the horizon
                    float horizonFade = smoothstep(0.02, 0.22, dir.y);
                    float finalAlpha = cloudAlpha * horizonFade * sunClearMask * uCloudOpacity;

                    // Cloud Lighting & Rim / Silver Lining
                    float sunDiffuse = clamp(sunDot * 0.5 + 0.5, 0.0, 1.0);
                    float silverLining = pow(clamp(sunDot, 0.0, 1.0), 4.0) * 0.4;

                    // Base cloud color with directional shading
                    vec3 dayCloudCol = mix(uCloudShadowColor, uCloudColor, sunDiffuse + silverLining);

                    // Sunset & Dusk tinting (warm golden peach on lit edges, soft violet on shadow)
                    vec3 sunsetCloudCol = mix(dayCloudCol, vec3(1.0, 0.70, 0.55), uDuskFactor * 0.75);
                    sunsetCloudCol = mix(sunsetCloudCol, uCloudShadowColor, (1.0 - sunDiffuse) * 0.45);

                    // Night sky darkening
                    vec3 nightCloudCol = mix(sunsetCloudCol, vec3(0.04, 0.05, 0.10), uNightFactor * 0.85);

                    // Composite procedural clouds over sky
                    sky = mix(sky, nightCloudCol, finalAlpha * uEnableProceduralClouds);
                }

                gl_FragColor = vec4(sky, 1.0);
                #include <colorspace_fragment>
            }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
    });

    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(25000, 32, 16), skyMaterial);
    skyDome.renderOrder = -1000;
    skyDome.frustumCulled = false;
    scene.add(skyDome);

    const _skyCol = new THREE.Color();
    const _scratchSkyPos = new THREE.Vector3();
    const _scratchSunDir = new THREE.Vector3();
    const _scratchCloudCol = new THREE.Color();
    const _scratchCloudShadowCol = new THREE.Color();

    function updateSky(dt, timePhase, dirLight, playerGrp, camera) {
        const target = envConfigs[timePhase];
        skyDome.position.copy(camera.getWorldPosition(_scratchSkyPos));
        skyUniforms.uZenith.value.lerp(_skyCol.set(target.bg), dt * 2);
        skyUniforms.uMid.value.lerp(_skyCol.set(target.skyMid), dt * 2);
        skyUniforms.uHorizon.value.lerp(_skyCol.set(target.skyHorizon), dt * 2);
        skyUniforms.uHorizonGlow.value += (target.horizonGlow - skyUniforms.uHorizonGlow.value) * dt * 2;

        skyUniforms.uTime.value += dt;
        if (dirLight && playerGrp) {
            _scratchSunDir.copy(dirLight.position).sub(playerGrp.position).normalize();
            skyUniforms.uSunPosition.value.copy(_scratchSunDir);
            skyUniforms.uSunColor.value.copy(dirLight.color);
        }
        const targetDusk = (timePhase === 1) ? 1.0 : 0.0;
        skyUniforms.uDuskFactor.value += (targetDusk - skyUniforms.uDuskFactor.value) * dt * 2.0;
        const targetNight = (timePhase === 2) ? 1.0 : 0.0;
        skyUniforms.uNightFactor.value += (targetNight - skyUniforms.uNightFactor.value) * dt * 2.0;
        if (target.cloudCol) {
            skyUniforms.uCloudColor.value.lerp(_scratchCloudCol.set(target.cloudCol), dt * 2.0);
        }
        if (target.skyMid) {
            skyUniforms.uCloudShadowColor.value.lerp(_scratchCloudShadowCol.set(target.skyMid), dt * 2.0);
        }
    }

    return {
        envConfigs,
        skyUniforms,
        skyMaterial,
        skyDome,
        updateSky
    };
}
