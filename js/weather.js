import * as THREE from 'three';

// ==========================================
// WEATHER: GROUND FOG, MIST, RAIN & STARFIELD
// ==========================================

export function initGroundFog(scene, params) {
        // ==========================================
        // VOLUMETRIC GROUND FOG (GOD RAYS)
        // ==========================================
        const fogGroup = new THREE.Group();
        const fogGeo = new THREE.PlaneGeometry(3500, 3500);
        fogGeo.rotateX(-Math.PI / 2);
        const fogUniforms = { uTime: { value: 0 } };
    
        const fogMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: (typeof params.fogMistOpacity === 'number') ? params.fogMistOpacity : 0.18,
            depthWrite: false,
        });
    
        fogMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = fogUniforms.uTime;
            shader.vertexShader = `
                varying vec3 vWorldPos;
            ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                 vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
            );
            shader.fragmentShader = `
                uniform float uTime;
                varying vec3 vWorldPos;
    
                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v){
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m ; m = m*m ;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }
            ` + shader.fragmentShader;
    
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                 vec2 uv = vWorldPos.xz * 0.002;
                 float yOffset = vWorldPos.y * 0.2;
                 float n1 = snoise(uv + vec2(uTime * 0.02 + yOffset, uTime * 0.015));
                 float n2 = snoise(uv * 2.0 - vec2(uTime * 0.015 - yOffset, -uTime * 0.02));
    
                 float noiseAlpha = smoothstep(-0.2, 0.8, n1 + n2 * 0.5);
    
                 float dist = length(vWorldPos.xz - cameraPosition.xz);
                 float edgeFade = 1.0 - smoothstep(1000.0, 1600.0, dist);
    
                 // Soft camera proximity dissolve so mist never clips abruptly into view
                 float camProximity = length(vWorldPos - cameraPosition);
                 float camNearFade = smoothstep(6.0, 24.0, camProximity);
    
                 gl_FragColor.a *= noiseAlpha * edgeFade * camNearFade;
                `
            );
        };
    
        const fogPlanes = [];
        for(let i = 0; i < 3; i++) {
            const p = new THREE.Mesh(fogGeo, fogMat);
            p.receiveShadow = false; // High FPS: Disable shadow map lookups on full-screen transparent planes
            fogGroup.add(p);
            fogPlanes.push(p);
        }
        scene.add(fogGroup);
        window.fogGroup = fogGroup;
        window.fogPlanes = fogPlanes;
        window.fogUniforms = fogUniforms;
        window.fogMat = fogMat;
    
        window.updateFogPlanes = function() {
            if (!window.fogGroup || !window.fogPlanes) return;
            window.fogGroup.visible = !!params.fogPlane;
            if (!params.fogPlane) return;
    
            const count = params.fogMistLayers || 1;
            for (let i = 0; i < window.fogPlanes.length; i++) {
                const p = window.fogPlanes[i];
                if (i < count) {
                    p.visible = true;
                    p.position.y = (params.fogMistHeight || 5.5) + i * 10.0;
                } else {
                    p.visible = false;
                }
            }
            fogMat.opacity = (typeof params.fogMistOpacity === 'number') ? params.fogMistOpacity : 0.18;
        };
        window.updateFogPlanes();
    return { fogGroup, fogPlanes, fogUniforms, fogMat };
}

export function initMist(scene, LOW_GFX) {
        // ==========================================
        // CLOUD EXIT CONDENSATION MIST PARTICLES
        // ==========================================
        const MIST_EXIT_DURATION = 4.0;
        const MIST_COUNT = LOW_GFX ? 80 : 200;
        const mistGeo = new THREE.PlaneGeometry(1, 1);
    
        // Procedural 128x128 cloud puff — multiple offset radial blobs for organic lumpy shape
        const mistCanvas = document.createElement('canvas');
        mistCanvas.width = 128; mistCanvas.height = 128;
        const mCtx = mistCanvas.getContext('2d');
        const blobOffsets = [
            [64, 64, 52], [42, 50, 38], [82, 55, 36], [58, 78, 32],
            [72, 40, 30], [48, 60, 34], [76, 72, 28]
        ];
        mCtx.globalCompositeOperation = 'lighter';
        for (const [bx, by, br] of blobOffsets) {
            const mGrad = mCtx.createRadialGradient(bx, by, 0, bx, by, br);
            mGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
            mGrad.addColorStop(0.4, 'rgba(255,255,255,0.12)');
            mGrad.addColorStop(0.75, 'rgba(255,255,255,0.04)');
            mGrad.addColorStop(1, 'rgba(255,255,255,0)');
            mCtx.fillStyle = mGrad;
            mCtx.fillRect(0, 0, 128, 128);
        }
        const mistTexture = new THREE.CanvasTexture(mistCanvas);
    
        const mistMat = new THREE.MeshBasicMaterial({
            map: mistTexture,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const instMist = new THREE.InstancedMesh(mistGeo, mistMat, MIST_COUNT);
        instMist.frustumCulled = false;
        scene.add(instMist);
    
        // Initialize instanceColor buffer (all black = invisible)
        const _mistColor = new THREE.Color();
        for (let ci = 0; ci < MIST_COUNT; ci++) {
            _mistColor.setRGB(0, 0, 0);
            instMist.setColorAt(ci, _mistColor);
        }
        instMist.instanceColor.needsUpdate = true;
    
        const mistPool = [];
        for (let i = 0; i < MIST_COUNT; i++) {
            mistPool.push({
                pos: new THREE.Vector3(0, -9999, 0),
                vel: new THREE.Vector3(0, 0, 0),
                life: 0.0,
                maxLife: 3.0,
                scale: 0.1,
                rot: 0
            });
        }
        let mistSpawnIndex = 0;
        let cloudImmersion = 0.0;
        let cloudExitMistTimer = 0.0;
        let wasInsideCloud = false;
        const _scratchMistWingL = new THREE.Vector3();
        const _scratchMistWingR = new THREE.Vector3();
        const _scratchMistNose = new THREE.Vector3();
        const _scratchMistBody = new THREE.Vector3();
        const _scratchCloudCheckM4 = new THREE.Matrix4();
    
        // Pre-rendered fog blob sprite for animated screen overlay (drawn once, stamped per frame)
        const fogBlobSprite = document.createElement('canvas');
        fogBlobSprite.width = 128; fogBlobSprite.height = 128;
        const fbsCtx = fogBlobSprite.getContext('2d');
        const fbsGrad = fbsCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        fbsGrad.addColorStop(0, 'rgba(255,255,255,1.0)');
        fbsGrad.addColorStop(0.3, 'rgba(250,252,255,0.55)');
        fbsGrad.addColorStop(0.65, 'rgba(245,250,255,0.15)');
        fbsGrad.addColorStop(1, 'rgba(240,248,255,0)');
        fbsCtx.fillStyle = fbsGrad;
        fbsCtx.fillRect(0, 0, 128, 128);
    
        // Animated fog overlay blobs — drift across screen for living fog feel
        const FOG_BLOB_COUNT = LOW_GFX ? 0 : 8;
        const fogBlobs = [];
        for (let i = 0; i < FOG_BLOB_COUNT; i++) {
            fogBlobs.push({
                x: Math.random(), y: Math.random(),
                radius: 0.18 + Math.random() * 0.28,
                driftX: (Math.random() - 0.5) * 0.04,
                driftY: (Math.random() - 0.5) * 0.025,
                phase: Math.random() * Math.PI * 2,
                opacity: 0.25 + Math.random() * 0.35
            });
        }
        const fogOverlayCanvas = document.getElementById('cloud-fog-canvas');
        let fogOverlayCtx = null;
        if (fogOverlayCanvas && FOG_BLOB_COUNT > 0) {
            fogOverlayCanvas.width = Math.ceil(window.innerWidth / 2);
            fogOverlayCanvas.height = Math.ceil(window.innerHeight / 2);
            fogOverlayCtx = fogOverlayCanvas.getContext('2d');
        }
    return {
        instMist,
        mistPool,
        fogOverlayCanvas,
        fogOverlayCtx,
        fogBlobs,
        fogBlobSprite,
        FOG_BLOB_COUNT,
        MIST_COUNT,
        MIST_EXIT_DURATION
    };
}

export function initRain(scene) {
        // ==========================================
        // RAIN SYSTEM
        // ==========================================
        const RAIN_COUNT = 2500;
        const rainGeoAttr = new THREE.BufferGeometry();
        const rainPositions = new Float32Array(RAIN_COUNT * 3);
        const rainVelocities = new Float32Array(RAIN_COUNT); // per-drop fall speed variance
        for (let i = 0; i < RAIN_COUNT; i++) {
            rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 320;
            rainPositions[i * 3 + 1] = (Math.random()) * 200 - 20;
            rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 320;
            rainVelocities[i] = 70 + Math.random() * 50; // 70–120 units/s
        }
        rainGeoAttr.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        const rainMat = new THREE.PointsMaterial({
            color: 0xaaccff,
            size: 1.2,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            sizeAttenuation: true
        });
        const rainSystem = new THREE.Points(rainGeoAttr, rainMat);
        rainSystem.visible = false;
        rainSystem.frustumCulled = false;
        scene.add(rainSystem);
    return { rainSystem, rainPositions, rainVelocities, RAIN_COUNT };
}

export function initStarfield(scene, LOW_GFX) {
        // --- Low-Poly Particle Starfield ---
        const starCount = LOW_GFX ? 2000 : 8000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
    
        for (let i = 0; i < starCount * 3; i += 3) {
            // Distribute randomly in an upper sky dome beyond all clouds (well within camera.far 30000)
            // Stars are placed strictly above the horizon so they never appear below the player
            const radius = 24000;
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            // Upper hemisphere only: cos(phi) from 0.05 (just above horizon) to 1.0 (zenith)
            const cosPhi = 0.05 + 0.95 * v;
            const sinPhi = Math.sqrt(Math.max(0, 1.0 - cosPhi * cosPhi));
    
            const y = radius * cosPhi;
            const x = radius * sinPhi * Math.cos(theta);
            const z = radius * sinPhi * Math.sin(theta);
    
            starPositions[i] = x;
            starPositions[i + 1] = y;
            starPositions[i + 2] = z;
        }
    
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2.5,
            sizeAttenuation: false,
            fog: false, // Prevents scene fog from hiding the stars
            transparent: true,
            depthWrite: false, // invisible stars were punching holes in clouds drawn after them
            opacity: 0.0 // Start invisible — lerps to target based on time-of-day
        });
        const starField = new THREE.Points(starGeometry, starMaterial);
        starField.visible = false;
        starField.renderOrder = -900; // right after the sky dome, so clouds are drawn over the stars
        scene.add(starField);
    return { starField, starMaterial };
}
