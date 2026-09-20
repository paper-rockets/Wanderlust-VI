import * as THREE from 'three';
import { snoise } from './noise.js';
import { getWorldHeight, getWorldColor, getBiomeAt } from './world.js';
import { setupToonCloudShader } from './clouds.js';

// ==========================================
// TERRAIN, TOON MATERIALS & STYLIZED WATER
// ==========================================

export function initTerrain(scene, params, TERRAIN_SIZE, gradientMap, worldLayout) {
        let terrainRes = params.terrainRes ? parseInt(params.terrainRes) : 256;
        // ==========================================
        // 3. TOON MATERIALS
        // ==========================================
        const matRock = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap, dithering: true });
        const matBush = new THREE.MeshToonMaterial({ color: 0x48a868, gradientMap, dithering: true });
        const matCloud = new THREE.MeshToonMaterial({
            color: 0xffffff,
            transparent: false,
            opacity: params.cloudsLowOpacity,
            depthWrite: true,
            depthTest: true,
            side: THREE.FrontSide
        });
        setupToonCloudShader(matCloud, params.cloudsLowBottomBlur);
        const matWispyCloud = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, gradientMap, dithering: true });
        const matFlower = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap, dithering: true });
        const terrainMat = new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap,
            dithering: true
        });

        // Continuous lighting keeps non-Crystal terrain smooth without changing its shape.
        // Crystal Land switches back to the original toon material when entered.
        const smoothTerrainMat = new THREE.MeshLambertMaterial({
            vertexColors: true,
            dithering: true
        });
    
        // Shader injection for perfect pixel-smooth shorelines
        terrainMat.onBeforeCompile = (shader) => {
            shader.vertexShader = `
                varying vec3 vWorldPos;
            ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                 vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );
        };
    
        // Trees closer than this use the full model; farther ones use a leaves-only light model
        const TREE_LOD_RADIUS = 150.0;
        // Trees exist only inside this radius; ground fog is fully opaque by then (see dynamicFar)
        const TREE_VIEW_DIST = 520.0;
        const treeUniforms = {
            uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
            uTreeScale: { value: 3.75 },
            uLodRadius: { value: TREE_LOD_RADIUS }
        };
    
        // lod: 'near' draws only trees inside TREE_LOD_RADIUS, 'far' only trees outside it
        function makeTreeMaterial(lod) {
            const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap, dithering: true, side: THREE.DoubleSide });
            mat.onBeforeCompile = (shader) => {
                mat.userData.shader = shader;
                shader.uniforms.uPlayerPos = treeUniforms.uPlayerPos;
                shader.uniforms.uTreeScale = treeUniforms.uTreeScale;
                shader.uniforms.uLodRadius = treeUniforms.uLodRadius;
    
                shader.vertexShader = `
                    uniform vec3 uPlayerPos;
                    uniform float uTreeScale;
                    uniform float uLodRadius;
                    ${shader.vertexShader}
                `.replace(
                    `#include <begin_vertex>`,
                    `
                    #include <begin_vertex>
                    float dist = distance(instanceMatrix[3].xz, uPlayerPos.xz); // tree base, so a tree swaps as a whole
                    float distScale = clamp((${TREE_VIEW_DIST.toFixed(1)} - dist) / 80.0, 0.0, 1.0);
                    distScale *= ${lod === 'near' ? '1.0 - step(uLodRadius, dist)' : 'step(uLodRadius, dist)'};
                    transformed *= (uTreeScale / 1.5) * distScale;
                    `
                );
            };
            mat.customProgramCacheKey = () => 'tree-' + lod;
            return mat;
        }
        const matTree = makeTreeMaterial('far');
        const matTreeNear = makeTreeMaterial('near');
    
    
    
    
    
    
    
        // ==========================================
        // 5. TERRAIN MESH WITH VERTEX COLORS
        // ==========================================
        let terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, terrainRes, terrainRes);
        terrainGeo.rotateX(-Math.PI / 2);
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.receiveShadow = true;
        scene.add(terrain);
    
        let lastTerrainGridX = -9999;
        let lastTerrainGridZ = -9999;
        let lastTerrainScale = 1.0;
        let terrainScale = 1.0;
    
        const colorDeepWater = new THREE.Color(0x1a4a8c);
        const colorShallowWater = new THREE.Color(0x4da9e8); // Matches the waterMesh exactly
        const colorSand = new THREE.Color(0xf2e1b8);
        const colorIslandGrass = new THREE.Color(0x76d149);
        const colorEmeraldGrass = new THREE.Color(0x56b847);
        const colorOliveGrass = new THREE.Color(0x8cc440);
        const colorHigh = new THREE.Color(0x89e05e); // Grass High
        const colorIslandRock = new THREE.Color(0x8a725a);
        const colorDirt = new THREE.Color(0xdcb58a);
        const colorPath = new THREE.Color(0xbd9973); // dirt path color
        const tempColor = new THREE.Color();
        const patchColor = new THREE.Color();
    
        function smoothstep(edge0, edge1, x) {
            const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
            return t * t * (3 - 2 * t);
        }
    
        function distToSegment(px, pz, ax, az, bx, bz) {
            const l2 = (ax - bx)**2 + (az - bz)**2;
            if (l2 === 0) return Math.hypot(px - ax, pz - az);
            let t = ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (ax + t * (bx - ax)), pz - (az + t * (bz - az)));
        }
    
        function getPathStrength(x, z) {
            const scale = 0.002;
            const n1 = snoise(x * scale, z * scale);
            const n2 = snoise(x * scale * 2 + 1000, z * scale * 2 + 1000) * 0.3;
            let path = Math.abs(n1 + n2);
            let mask = smoothstep(0.15, 0.0, path); // wider, softer path
            return mask;
        }
    
        let terrainHeightBuffer = new Float32Array((256 + 1) * (256 + 1));
        let terrainPrevHeights = new Float32Array(0);
        // Keep an unfiltered colour map, then filter it for rendering. The terrain positions,
        // normals, and grid resolution are deliberately left alone.
        let terrainRawColors = new Float32Array(0);
        let terrainPrevRawColors = new Float32Array(0);
        let terrainColorScratch = new Float32Array(0);
        let terrainNormalScratch = new Float32Array(0);
        let lastTerrainRes = -1;
        let lastVisualSmoothing = null;

        function blurTerrainColors(source, target, stride, radius) {
            const last = stride - 1;
            for (let row = 0; row < stride; row++) {
                const rowUp = Math.max(0, row - radius);
                const rowDown = Math.min(last, row + radius);
                for (let col = 0; col < stride; col++) {
                    const colLeft = Math.max(0, col - radius);
                    const colRight = Math.min(last, col + radius);
                    const center = (row * stride + col) * 3;
                    let red = 0, green = 0, blue = 0, weightSum = 0;

                    for (let sampleRow = rowUp; sampleRow <= rowDown; sampleRow++) {
                        for (let sampleCol = colLeft; sampleCol <= colRight; sampleCol++) {
                            const isCenter = sampleRow === row && sampleCol === col;
                            const isCross = sampleRow === row || sampleCol === col;
                            const weight = isCenter ? 4 : (isCross ? 2 : 1);
                            const sample = (sampleRow * stride + sampleCol) * 3;
                            red += source[sample] * weight;
                            green += source[sample + 1] * weight;
                            blue += source[sample + 2] * weight;
                            weightSum += weight;
                        }
                    }

                    target[center] = red / weightSum;
                    target[center + 1] = green / weightSum;
                    target[center + 2] = blue / weightSum;
                }
            }
        }

        // Blend only lighting directions. Terrain vertices are not moved, so
        // terrain shape, height, collision, and placement all stay exact.
        function blurTerrainNormals(source, target, stride) {
            const last = stride - 1;
            for (let row = 0; row < stride; row++) {
                const rowUp = Math.max(0, row - 1);
                const rowDown = Math.min(last, row + 1);
                for (let col = 0; col < stride; col++) {
                    const colLeft = Math.max(0, col - 1);
                    const colRight = Math.min(last, col + 1);
                    let nx = 0, ny = 0, nz = 0;

                    for (let sampleRow = rowUp; sampleRow <= rowDown; sampleRow++) {
                        for (let sampleCol = colLeft; sampleCol <= colRight; sampleCol++) {
                            const isCenter = sampleRow === row && sampleCol === col;
                            const isCross = sampleRow === row || sampleCol === col;
                            const weight = isCenter ? 4 : (isCross ? 2 : 1);
                            const sample = (sampleRow * stride + sampleCol) * 3;
                            nx += source[sample] * weight;
                            ny += source[sample + 1] * weight;
                            nz += source[sample + 2] * weight;
                        }
                    }

                    const length = Math.hypot(nx, ny, nz) || 1;
                    const targetIndex = (row * stride + col) * 3;
                    target[targetIndex] = nx / length;
                    target[targetIndex + 1] = ny / length;
                    target[targetIndex + 2] = nz / length;
                }
            }
        }
    
        // Height of the *drawn* ground at (x, z). Terrain vertices always sit on a fixed world lattice,
        // so interpolating the same two triangles PlaneGeometry uses gives the exact visible surface.
        // Also returns the surface slope in _meshSlope.
        let _meshSlope = 0;
        function getMeshHeight(x, z) {
            const sp = TERRAIN_SIZE / terrainRes;
            const x0 = Math.floor(x / sp) * sp, z0 = Math.floor(z / sp) * sp;
            const fx = (x - x0) / sp, fz = (z - z0) / sp;
            const ha = getWorldHeight(x0, z0);           // (x0, z0)
            const hb = getWorldHeight(x0, z0 + sp);      // (x0, z1)
            const hc = getWorldHeight(x0 + sp, z0 + sp); // (x1, z1)
            const hd = getWorldHeight(x0 + sp, z0);      // (x1, z0)
            const sx = Math.max(Math.abs(hd - ha), Math.abs(hc - hb)) / sp;
            const sz = Math.max(Math.abs(hb - ha), Math.abs(hc - hd)) / sp;
            _meshSlope = Math.sqrt(sx * sx + sz * sz);
            if (fx + fz <= 1.0) return ha + (hd - ha) * fx + (hb - ha) * fz;
            return hc + (hb - hc) * (1.0 - fx) + (hd - hc) * (1.0 - fz);
        }
    
        function updateTerrainGeometry(playerX, playerZ) {
            const vertexSpacing = TERRAIN_SIZE / terrainRes;
            const gridX = Math.floor(playerX / vertexSpacing) * vertexSpacing;
            const gridZ = Math.floor(playerZ / vertexSpacing) * vertexSpacing;

            // Crystal Land remains entirely on its original toon renderer and
            // raw visual data. Every other biome receives visual-only smoothing.
            const useVisualSmoothing = getBiomeAt(playerX, playerZ)?.id !== 'crystal_land';
            const visualModeChanged = lastVisualSmoothing !== useVisualSmoothing;
            terrain.material = useVisualSmoothing ? smoothTerrainMat : terrainMat;

            if (!visualModeChanged && gridX === lastTerrainGridX && gridZ === lastTerrainGridZ) return;
    
            terrain.position.set(gridX, 0, gridZ);
    
            const pos = terrainGeo.attributes.position;
            if (!terrainGeo.attributes.color) {
                terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
            }
            const colors = terrainGeo.attributes.color;
            const normals = terrainGeo.attributes.normal;
            const count = pos.count;
            const stride = terrainRes + 1;
    
            if (terrainHeightBuffer.length < count) {
                terrainHeightBuffer = new Float32Array(count);
            }
            if (terrainRawColors.length !== count * 3) terrainRawColors = new Float32Array(count * 3);
            if (terrainColorScratch.length !== count * 3) terrainColorScratch = new Float32Array(count * 3);
            if (terrainNormalScratch.length !== count * 3) terrainNormalScratch = new Float32Array(count * 3);
    
            // Grid moved by (dc, dr) cells: vertex (r, c) now shows what (r + dr, c + dc) showed before
            const dc = Math.round((gridX - lastTerrainGridX) / vertexSpacing);
            const dr = Math.round((gridZ - lastTerrainGridZ) / vertexSpacing);
            const canShift = !visualModeChanged && lastTerrainGridX !== -9999 && lastTerrainRes === terrainRes &&
                             Math.abs(dc) < stride && Math.abs(dr) < stride;
            if (canShift) {
                if (terrainPrevHeights.length !== count) terrainPrevHeights = new Float32Array(count);
                if (terrainPrevRawColors.length !== count * 3) terrainPrevRawColors = new Float32Array(count * 3);
                terrainPrevHeights.set(terrainHeightBuffer.subarray(0, count));
                terrainPrevRawColors.set(terrainRawColors);
            }
    
            for (let i = 0; i < count; i++) {
                if (canShift) {
                    const oc = (i % stride) + dc;
                    const or = ((i / stride) | 0) + dr;
                    if (oc >= 0 && oc < stride && or >= 0 && or < stride) {
                        const oi = or * stride + oc;
                        const h = terrainPrevHeights[oi];
                        pos.setY(i, h);
                        terrainHeightBuffer[i] = h;
                        colors.setXYZ(i, terrainPrevRawColors[oi * 3], terrainPrevRawColors[oi * 3 + 1], terrainPrevRawColors[oi * 3 + 2]);
                        terrainRawColors[i * 3] = terrainPrevRawColors[oi * 3];
                        terrainRawColors[i * 3 + 1] = terrainPrevRawColors[oi * 3 + 1];
                        terrainRawColors[i * 3 + 2] = terrainPrevRawColors[oi * 3 + 2];
                        continue;
                    }
                }
                const worldX = pos.getX(i) + gridX;
                const worldZ = pos.getZ(i) + gridZ;
                const h = getWorldHeight(worldX, worldZ);
                pos.setY(i, h);
                terrainHeightBuffer[i] = h;
    
                getWorldColor(h, worldX, worldZ, tempColor);
    
                // Add dirt path
                const pathMask = getPathStrength(worldX, worldZ);
                if (pathMask > 0 && h > 2.0 && h < 25.0) {
                    tempColor.lerp(colorPath, pathMask * 0.85);
                }
    
                colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
                terrainRawColors[i * 3] = tempColor.r;
                terrainRawColors[i * 3 + 1] = tempColor.g;
                terrainRawColors[i * 3 + 2] = tempColor.b;
            }

            terrainGeo.computeVertexNormals();

            if (useVisualSmoothing) {
                // One weighted pass removes colour blocks and hard light seams.
                // The raw buffers remain available when Crystal Land is entered.
                blurTerrainColors(terrainRawColors, terrainColorScratch, stride, 1);
                colors.array.set(terrainColorScratch);
                blurTerrainNormals(normals.array, terrainNormalScratch, stride);
                normals.array.set(terrainNormalScratch);
                normals.needsUpdate = true;
            }

            pos.needsUpdate = true;
            colors.needsUpdate = true;
    
            lastTerrainGridX = gridX;
            lastTerrainGridZ = gridZ;
            lastTerrainRes = terrainRes;
            lastVisualSmoothing = useVisualSmoothing;
        }

        function setTerrainResolution(nextResolution) {
            const next = parseInt(nextResolution, 10);
            if (!Number.isFinite(next) || next === terrainRes) return;

            const nextGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, next, next);
            nextGeo.rotateX(-Math.PI / 2);
            terrainGeo.dispose();
            terrainGeo = nextGeo;
            terrain.geometry = terrainGeo;
            terrainRes = next;

            // Force a full height, color, and normal rebuild on the new geometry next frame.
            lastTerrainGridX = -9999;
            lastTerrainGridZ = -9999;
            lastTerrainRes = -1;
        }
    

    return {
        matRock,
        matBush,
        matFlower,
        matCloud,
        matWispyCloud,
        terrainMat,
        terrainGeo,
        terrain,
        treeUniforms,
        matTree,
        matTreeNear,
        updateTerrainGeometry,
        setTerrainResolution,
        getMeshHeight,
        getMeshSlope: () => _meshSlope,
        getPathStrength
    };
}

export function initWater(scene, LOW_GFX) {
    let waterMesh;
        const WATER_SEGS = LOW_GFX ? 24 : 48;
        const waterGeo = new THREE.PlaneGeometry(5000, 5000, WATER_SEGS, WATER_SEGS);
        waterGeo.rotateX(-Math.PI / 2);
    
        const waterUniforms = {
            uTime:      { value: 0 },
            uPlayerPos: { value: new THREE.Vector3() }
        };
    
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x00c8c0,
            transparent: false,
            opacity: 1.0,
            roughness: 0.04,
            metalness: 0.0
        });
    
        waterMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime      = waterUniforms.uTime;
            shader.uniforms.uPlayerPos = waterUniforms.uPlayerPos;
    
            shader.vertexShader = `
                varying vec3 vWorldPos;
            ` + shader.vertexShader;
    
            // no vertex displacement — keeps geometry stable
    
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                 vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            );
    
            // ── Fragment shader: caustics + subtle fresnel + shore foam ────────
            shader.fragmentShader = `
                uniform float uTime;
                varying vec3  vWorldPos;
    
                vec3 w_permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v){
                    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy));
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
                    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = w_permute(w_permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
                    vec3 m = max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
                    m = m*m; m = m*m;
                    vec3 x = 2.0*fract(p*C.www)-1.0; vec3 h = abs(x)-0.5; vec3 ox = floor(x+0.5);
                    vec3 a0 = x-ox; m *= 1.79284291400159-0.85373472095314*(a0*a0+h*h);
                    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
                    return 130.0*dot(m,g);
                }
            ` + shader.fragmentShader;
    
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <color_fragment>`,
                `#include <color_fragment>
    
                // ── Base: keep material cyan, subtle far-distance darkening ──────
                diffuseColor.rgb = vec3(0.00, 0.78, 0.80);
                float camDist = length(vWorldPos.xz - cameraPosition.xz);
                float farFade = smoothstep(80.0, 500.0, camDist);
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, farFade);
    
                // ── Caustics ────────────────────────────────────────────────────
                vec2 cuv = vWorldPos.xz * 0.10;
                float c1 = 1.0 - abs(snoise(cuv + vec2( uTime*0.10,  uTime*0.05)));
                float c2 = 1.0 - abs(snoise(cuv * 1.5 - vec2(uTime*0.15, -uTime*0.05)));
                float caustics = clamp(pow(c1, 6.0) + pow(c2, 5.5)*0.5, 0.0, 1.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.97, 1.0), caustics * 0.4);
    
                // ── Shore foam: noise patches that look like water edge ──────────
                float foamN1 = snoise(vWorldPos.xz * 0.28 + vec2( uTime*0.18, -uTime*0.13));
                float foamN2 = snoise(vWorldPos.xz * 0.60 - vec2(-uTime*0.11,  uTime*0.16));
                float foamN3 = snoise(vWorldPos.xz * 0.12 + vec2( uTime*0.07,  uTime*0.05));
                float foam   = smoothstep(0.3, 0.7, foamN1)
                             * smoothstep(0.2, 0.6, foamN2)
                             * smoothstep(0.0, 0.5, foamN3);
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 1.0, 1.0), foam * 0.85);
                `
            );
        };
    
        waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.y = 2.4; // Lowered slightly so the terrain shader can paint a smooth shoreline above it
        waterMesh.receiveShadow = true;
        scene.add(waterMesh);

    

    return {
        waterMesh,
        waterMat,
        waterUniforms
    };
}
