import * as THREE from 'three';
import { snoise } from './noise.js';
import { getWorldHeight, getWorldColor, getBiomeAt } from './world.js';
import { setupToonCloudShader } from './clouds.js';
import { applyRoystanShader } from './shaders/roystanToon.js';

// ==========================================
// TERRAIN, TOON MATERIALS & STYLIZED WATER
// ==========================================

// MatCap full shader replacement uniforms for Crystal Land terrain
export const crystalMatcapUniform = { value: null };
export const crystalUseMatcapUniform = { value: 0.0 };
export const crystalMatcapReplaceUniform = { value: 1.0 }; // 1.0 = 100% full replacement of terrain shader

export function setCrystalTerrainMatcap(texture, replaceFactor = 1.0) {
    crystalMatcapUniform.value = texture || null;
    crystalUseMatcapUniform.value = texture ? 1.0 : 0.0;
    if (typeof replaceFactor === 'number') {
        crystalMatcapReplaceUniform.value = replaceFactor;
    }
}

export function getCrystalTerrainMatcapState() {
    return {
        active: crystalUseMatcapUniform.value > 0.5,
        texture: crystalMatcapUniform.value,
        replace: crystalMatcapReplaceUniform.value
    };
}

// Shared terrain height texture for water shoreline waves, foam, and depth
export let terrainHeightTex = null;
export const terrainCenter = new THREE.Vector2(0, 0);
export let currentTerrainSize = 1200;
let activeWaterUniforms = null;

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

        // Shader injection for perfect pixel-smooth shorelines + Crystal Land MatCap replacement
        terrainMat.onBeforeCompile = (shader) => {
            shader.uniforms.uCrystalMatcap = crystalMatcapUniform;
            shader.uniforms.uCrystalUseMatcap = crystalUseMatcapUniform;
            shader.uniforms.uCrystalMatcapReplace = crystalMatcapReplaceUniform;

            shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vCrystalNormal;
            ` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                `#include <worldpos_vertex>`,
                `#include <worldpos_vertex>
                 vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                 vCrystalNormal = normalize(normalMatrix * normal);`
            );

            shader.fragmentShader = `
                uniform sampler2D uCrystalMatcap;
                uniform float uCrystalUseMatcap;
                uniform float uCrystalMatcapReplace;
                varying vec3 vWorldPos;
                varying vec3 vCrystalNormal;
            ` + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>
                 if (uCrystalUseMatcap > 0.5) {
                     vec3 cNorm = normalize(vCrystalNormal);
                     vec2 mcUv = cNorm.xy * 0.495 + vec2(0.5);
                     vec4 mc = texture2D(uCrystalMatcap, mcUv);
                     vec3 finalCrystalCol = mc.rgb;

                     #ifdef USE_FOG
                     #ifdef FOG_EXP2
                     float cFogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
                     #else
                     float cFogFactor = smoothstep( fogNear, fogFar, vFogDepth );
                     #endif
                     finalCrystalCol = mix( finalCrystalCol, fogColor, cFogFactor );
                     #endif

                     gl_FragColor.rgb = mix(gl_FragColor.rgb, finalCrystalCol, uCrystalMatcapReplace);
                 }
                `
            );
        };
        terrainMat.customProgramCacheKey = () => 'crystal-terrain-toon-matcap';
    
        applyRoystanShader(terrainMat);
        applyRoystanShader(smoothTerrainMat);
        applyRoystanShader(matRock);
        applyRoystanShader(matBush);
    
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
        currentTerrainSize = TERRAIN_SIZE;
        const initStride = terrainRes + 1;
        if (!terrainHeightTex) {
            terrainHeightTex = new THREE.DataTexture(
                terrainHeightBuffer,
                initStride,
                initStride,
                THREE.RedFormat,
                THREE.FloatType
            );
            terrainHeightTex.minFilter = THREE.LinearFilter;
            terrainHeightTex.magFilter = THREE.LinearFilter;
            terrainHeightTex.wrapS = THREE.ClampToEdgeWrapping;
            terrainHeightTex.wrapT = THREE.ClampToEdgeWrapping;
            terrainHeightTex.needsUpdate = true;
        }
        let terrainPrevHeights = new Float32Array(0);
        // Keep an unfiltered colour map, then filter it for rendering. The terrain positions,
        // normals, and grid resolution are deliberately left alone.
        let terrainRawColors = new Float32Array(0);
        let terrainPrevRawColors = new Float32Array(0);
        let terrainColorScratch = new Float32Array(0);
        let terrainNormalScratch = new Float32Array(0);
        let terrainPrevFinalColors = new Float32Array(0);
        let terrainPrevFinalNormals = new Float32Array(0);
        let lastTerrainRes = -1;
        let lastVisualSmoothing = null;

        function computeGridNormalsRegion(heights, targetNormals, stride, vertexSpacing, minRow, maxRow, minCol, maxCol) {
            const inv2Spacing = 1.0 / (2.0 * vertexSpacing);
            const last = stride - 1;
            for (let row = minRow; row <= maxRow; row++) {
                const rowUp = row > 0 ? (row - 1) * stride : row * stride;
                const rowDown = row < last ? (row + 1) * stride : row * stride;
                const rowOffset = row * stride;
                for (let col = minCol; col <= maxCol; col++) {
                    const colLeft = col > 0 ? col - 1 : col;
                    const colRight = col < last ? col + 1 : col;

                    const hl = heights[rowOffset + colLeft];
                    const hr = heights[rowOffset + colRight];
                    const hu = heights[rowUp + col];
                    const hd = heights[rowDown + col];

                    const nx = (hl - hr) * inv2Spacing;
                    const nz = (hu - hd) * inv2Spacing;
                    const ny = 1.0;
                    const invLen = 1.0 / Math.hypot(nx, ny, nz);

                    const idx = (rowOffset + col) * 3;
                    targetNormals[idx] = nx * invLen;
                    targetNormals[idx + 1] = ny * invLen;
                    targetNormals[idx + 2] = nz * invLen;
                }
            }
        }

        function blurTerrainColorsRegion(source, target, stride, minRow, maxRow, minCol, maxCol, radius = 1) {
            const last = stride - 1;
            for (let row = minRow; row <= maxRow; row++) {
                const rowUp = Math.max(0, row - radius);
                const rowDown = Math.min(last, row + radius);
                for (let col = minCol; col <= maxCol; col++) {
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

        function blurTerrainNormalsRegion(source, target, stride, minRow, maxRow, minCol, maxCol) {
            const last = stride - 1;
            for (let row = minRow; row <= maxRow; row++) {
                const rowUp = Math.max(0, row - 1);
                const rowDown = Math.min(last, row + 1);
                for (let col = minCol; col <= maxCol; col++) {
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
            const last = stride - 1;
    
            if (terrainHeightBuffer.length < count) {
                terrainHeightBuffer = new Float32Array(count);
            }
            if (terrainRawColors.length !== count * 3) terrainRawColors = new Float32Array(count * 3);
            if (terrainColorScratch.length !== count * 3) terrainColorScratch = new Float32Array(count * 3);
            if (terrainNormalScratch.length !== count * 3) terrainNormalScratch = new Float32Array(count * 3);
            if (terrainPrevFinalColors.length !== count * 3) terrainPrevFinalColors = new Float32Array(count * 3);
            if (terrainPrevFinalNormals.length !== count * 3) terrainPrevFinalNormals = new Float32Array(count * 3);
    
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
                terrainPrevFinalColors.set(colors.array);
                terrainPrevFinalNormals.set(normals.array);
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
                        terrainRawColors[i * 3] = terrainPrevRawColors[oi * 3];
                        terrainRawColors[i * 3 + 1] = terrainPrevRawColors[oi * 3 + 1];
                        terrainRawColors[i * 3 + 2] = terrainPrevRawColors[oi * 3 + 2];
                        colors.setXYZ(i, terrainPrevFinalColors[oi * 3], terrainPrevFinalColors[oi * 3 + 1], terrainPrevFinalColors[oi * 3 + 2]);
                        normals.setXYZ(i, terrainPrevFinalNormals[oi * 3], terrainPrevFinalNormals[oi * 3 + 1], terrainPrevFinalNormals[oi * 3 + 2]);
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
    
                terrainRawColors[i * 3] = tempColor.r;
                terrainRawColors[i * 3 + 1] = tempColor.g;
                terrainRawColors[i * 3 + 2] = tempColor.b;
                colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
            }

            if (!canShift) {
                // Full rebuild
                computeGridNormalsRegion(terrainHeightBuffer, normals.array, stride, vertexSpacing, 0, last, 0, last);
                if (useVisualSmoothing) {
                    blurTerrainColorsRegion(terrainRawColors, colors.array, stride, 0, last, 0, last, 1);
                    blurTerrainNormalsRegion(normals.array, terrainNormalScratch, stride, 0, last, 0, last);
                    normals.array.set(terrainNormalScratch);
                }
            } else {
                // Fast boundary-only update: recompute normals and smoothing only for the newly exposed strip (plus 1 margin)
                const dirtyMinRow = dr > 0 ? Math.max(0, stride - dr - 1) : 0;
                const dirtyMaxRow = dr < 0 ? Math.min(last, -dr) : last;
                const dirtyMinCol = dc > 0 ? Math.max(0, stride - dc - 1) : 0;
                const dirtyMaxCol = dc < 0 ? Math.min(last, -dc) : last;

                if (dr !== 0) {
                    computeGridNormalsRegion(terrainHeightBuffer, normals.array, stride, vertexSpacing, dirtyMinRow, dirtyMaxRow, 0, last);
                    if (useVisualSmoothing) {
                        blurTerrainColorsRegion(terrainRawColors, colors.array, stride, dirtyMinRow, dirtyMaxRow, 0, last, 1);
                        blurTerrainNormalsRegion(normals.array, terrainNormalScratch, stride, dirtyMinRow, dirtyMaxRow, 0, last);
                        for (let r = dirtyMinRow; r <= dirtyMaxRow; r++) {
                            const start = r * stride * 3;
                            const end = (r * stride + stride) * 3;
                            normals.array.set(terrainNormalScratch.subarray(start, end), start);
                        }
                    }
                }
                if (dc !== 0) {
                    computeGridNormalsRegion(terrainHeightBuffer, normals.array, stride, vertexSpacing, 0, last, dirtyMinCol, dirtyMaxCol);
                    if (useVisualSmoothing) {
                        blurTerrainColorsRegion(terrainRawColors, colors.array, stride, 0, last, dirtyMinCol, dirtyMaxCol, 1);
                        blurTerrainNormalsRegion(normals.array, terrainNormalScratch, stride, 0, last, dirtyMinCol, dirtyMaxCol);
                        for (let r = 0; r <= last; r++) {
                            for (let c = dirtyMinCol; c <= dirtyMaxCol; c++) {
                                const idx = (r * stride + c) * 3;
                                normals.array[idx] = terrainNormalScratch[idx];
                                normals.array[idx + 1] = terrainNormalScratch[idx + 1];
                                normals.array[idx + 2] = terrainNormalScratch[idx + 2];
                            }
                        }
                    }
                }
            }

            pos.needsUpdate = true;
            colors.needsUpdate = true;
            normals.needsUpdate = true;
    
            lastTerrainGridX = gridX;
            lastTerrainGridZ = gridZ;
            lastTerrainRes = terrainRes;
            lastVisualSmoothing = useVisualSmoothing;

            terrainCenter.set(gridX, gridZ);
            if (terrainHeightTex) {
                terrainHeightTex.needsUpdate = true;
            }
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

            const nextStride = next + 1;
            if (terrainHeightTex) terrainHeightTex.dispose();
            terrainHeightTex = new THREE.DataTexture(
                terrainHeightBuffer,
                nextStride,
                nextStride,
                THREE.RedFormat,
                THREE.FloatType
            );
            terrainHeightTex.minFilter = THREE.LinearFilter;
            terrainHeightTex.magFilter = THREE.LinearFilter;
            terrainHeightTex.wrapS = THREE.ClampToEdgeWrapping;
            terrainHeightTex.wrapT = THREE.ClampToEdgeWrapping;
            terrainHeightTex.needsUpdate = true;
            if (activeWaterUniforms && activeWaterUniforms.uTerrainHeightMap) {
                activeWaterUniforms.uTerrainHeightMap.value = terrainHeightTex;
            }

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
    const WATER_SIZE = 4000;
    const WATER_SEGS = LOW_GFX ? 64 : 192;
    const waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEGS, WATER_SEGS);
    waterGeo.rotateX(-Math.PI / 2);

    const texLoader = new THREE.TextureLoader();
    const waterTex = texLoader.load('./assets/water-tex-cartoon.jpg');
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;

    const noiseTex = texLoader.load('./assets/smooth_monochrome_noise.jpg');
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;

    const timeUniform = { value: 0.0 };
    const waterUniforms = {
        uTime: timeUniform,
        time: timeUniform,
        uPlayerPos: { value: new THREE.Vector3() },

        // Terrain heightmap & shoreline depth
        uTerrainHeightMap: { value: terrainHeightTex },
        uTerrainCenter: { value: terrainCenter },
        uTerrainSize: { value: currentTerrainSize },
        uWaterLevel: { value: 2.4 },

        // Shoreline Waves & Lapping Foam
        uShoreFoamWidth: { value: 2.6 },
        uShoreWaveSpeed: { value: 1.1 },
        uShoreWaveFreq: { value: 1.2 },
        uShoreSurge: { value: 0.8 },
        uFoamScale: { value: 0.045 }, // Shore foam texture repeat scale
        uFoamColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        uShallowColor: { value: new THREE.Color(0.18, 0.92, 0.88) }, // Radiant tropical turquoise

        // Gerstner Waves & Simplex Noise Displacement (ShaderFrog flight-scale)
        normalOffset: { value: 0.1 },
        fbmHeight: { value: 0.015 },
        fbmScale: { value: 1.2 },
        pScale: { value: new THREE.Vector3(0.02, 1.0, 0.02) },
        waveHeight: { value: 2.8 },
        waveSpeed: { value: 0.45 },
        waveFrequency: { value: 0.75 },
        waveSharpness: { value: 0.78 },

        // Deep ocean and crest colors (Vibrant ShaderFrog Cyan Palette)
        waveColor: { value: new THREE.Color(0.0, 0.67, 1.0) },
        waterHighlight: { value: new THREE.Color(1.0, 1.0, 1.0) },
        contrast: { value: 22.0 },
        brightness: { value: 1.65 },
        offset: { value: 0.042 },

        // Cartoon Water Surface textures & sparkles
        waterImage: { value: waterTex },
        waterScale: { value: new THREE.Vector2(0.035, 0.035) },
        waterSpeed: { value: new THREE.Vector2(-0.091, -0.094) },
        waterColorTint: { value: new THREE.Color(0.0, 0.67, 1.0) },
        waterAmt: { value: 0.45 },

        displacement: { value: noiseTex },
        displacementSpeed: { value: new THREE.Vector2(-0.039, 0.038) },
        waterDisplacementScale: { value: new THREE.Vector2(0.018, 0.018) },
        displacementHeight: { value: 0.28 },

        specularMap: { value: noiseTex },
        specularScale: { value: 0.032 },
        specularBrightness: { value: 2.5 },
        specularPop: { value: 0.78 },
        specularMax: { value: 0.30 },
        specularSpeed: { value: new THREE.Vector2(0.021, 0.026) }
    };
    activeWaterUniforms = waterUniforms;

    const waterMat = new THREE.MeshPhysicalMaterial({
        roughness: 0.0,
        metalness: 0.15,
        iridescence: 0.22,
        clearcoat: 0.1,
        clearcoatRoughness: 0.1
    });

    waterMat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, waterUniforms);
        shader.defines.USE_UV = '';

        // --- VERTEX SHADER INJECTION ---
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            varying float vOceanHeight;
            varying vec3 vOceanWorldPos;

            uniform float time;
            uniform vec3 uPlayerPos;
            uniform float normalOffset;
            uniform float fbmHeight;
            uniform float fbmScale;
            uniform vec3 pScale;
            uniform float waveHeight;
            uniform float waveSpeed;
            uniform float waveFrequency;
            uniform float waveSharpness;

            // Shore uniforms
            uniform sampler2D uTerrainHeightMap;
            uniform vec2 uTerrainCenter;
            uniform float uTerrainSize;
            uniform float uWaterLevel;
            uniform float uShoreWaveSpeed;
            uniform float uShoreWaveFreq;
            uniform float uShoreSurge;

            // Simplex 4D Noise & FBM
            vec4 mod289_ocean(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            float mod289_ocean(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute_ocean(vec4 x) { return mod289_ocean(((x * 34.0) + 1.0) * x); }
            float permute_ocean(float x) { return mod289_ocean(((x * 34.0) + 1.0) * x); }
            vec4 taylorInvSqrt_ocean(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float taylorInvSqrt_ocean(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

            vec4 grad4_ocean(float j, vec4 ip) {
                const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
                vec4 p, s;
                p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
                p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
                s = vec4(lessThan(p, vec4(0.0)));
                p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
                return p;
            }

            float snoise_ocean(vec4 v, float t) {
                const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
                vec4 i  = floor(v + dot(v, vec4(0.309016994374947451)));
                vec4 x0 = v - i + dot(i, C.xxxx);

                vec4 i0;
                vec3 isX = step(x0.yzw, x0.xxx);
                vec3 isYZ = step(x0.zww, x0.yyz);
                i0.x = isX.x + isX.y + isX.z;
                i0.yzw = 1.0 - isX;
                i0.y += isYZ.x + isYZ.y;
                i0.zw += 1.0 - isYZ.xy;
                i0.z += isYZ.z;
                i0.w += 1.0 - isYZ.z;

                vec4 i3 = clamp(i0, 0.0, 1.0);
                vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
                vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);

                vec4 x1 = x0 - i1 + C.xxxx;
                vec4 x2 = x0 - i2 + C.yyyy;
                vec4 x3 = x0 - i3 + C.zzzz;
                vec4 x4 = x0 + C.wwww;

                vec4 ip = vec4(1.0/289.0, 1.0/49.0, 1.0/7.0, 0.0);
                vec4 p0 = grad4_ocean(mod289_ocean(i.x), ip);
                vec4 p1 = grad4_ocean(mod289_ocean(i.y), ip);
                vec4 p2 = grad4_ocean(mod289_ocean(i.z), ip);
                vec4 p3 = grad4_ocean(mod289_ocean(i.w), ip);

                vec4 m0 = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                vec2 m1 = max(0.6 - vec2(dot(x4,x4), 0.0), 0.0);
                m0 = m0 * m0;
                m1 = m1 * m1;

                return 49.0 * (dot(m0 * m0, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))) +
                               dot(m1 * m1, vec2(dot(p0, x4), 0.0)));
            }

            float ocean_surface(vec4 coord, float t) {
                float n = 0.0;
                n += 1.000 * abs(snoise_ocean(coord, t));
                n += 0.500 * abs(snoise_ocean(coord * 2.0, t));
                n += 0.250 * abs(snoise_ocean(coord * 4.0, t));
                n += 0.125 * abs(snoise_ocean(coord * 8.0, t));
                return n;
            }

            vec3 ocean_GerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal, float t) {
                float wavelength = wave.w;
                float k = 2.0 * 3.14159265 / max(1.0, wavelength);
                float c = sqrt(9.8 / k);
                vec2 d = normalize(wave.xy);
                vec2 crossDir = vec2(-d.y, d.x);
                float phaseOffset = fract(wavelength * 0.173) * 6.2831853;
                float crestBend = sin(dot(crossDir, p.xz) * k * 0.34 + t * 0.16 + phaseOffset) * 0.48;
                crestBend += sin(dot(crossDir, p.xz) * k * 0.13 - t * 0.09) * 0.22;
                float f = k * (dot(d, p.xz) - c * t) + phaseOffset + crestBend;
                float a = waveHeight * wave.z;
                float shortWaveFactor = clamp((220.0 - wavelength) / 150.0, 0.0, 1.0);
                float q = waveSharpness * mix(0.32, 0.52, shortWaveFactor);

                tangent += vec3(
                    -d.x * d.x * (q * k * a * sin(f)),
                    d.x * (k * a * cos(f)),
                    -d.x * d.y * (q * k * a * sin(f))
                );
                binormal += vec3(
                    -d.x * d.y * (q * k * a * sin(f)),
                    d.y * (k * a * cos(f)),
                    -d.y * d.y * (q * k * a * sin(f))
                );
                return vec3(
                    d.x * (q * a * cos(f)),
                    a * sin(f),
                    d.y * (q * a * cos(f))
                );
            }

            vec3 ocean_displace(vec3 pt, float t, float closeWaveDetail) {
                vec3 tan = vec3(0.0, 0.0, 1.0);
                vec3 bit = vec3(0.0, 0.0, 1.0);

                // The 4 km water plane has 31 m vertex spacing at regular quality.
                // Broad swells stay above that sampling limit; fine motion remains
                // in the fragment textures instead of deforming sparse vertices.
                vec3 wave1 = ocean_GerstnerWave(vec4(vec2(-0.88, -0.47), 0.31, 620.0 * waveFrequency), pt, tan, bit, t);
                vec3 wave2 = ocean_GerstnerWave(vec4(vec2(0.34, 0.94), 0.22, 335.0 * waveFrequency), pt, tan, bit, t);
                vec3 wave3 = ocean_GerstnerWave(vec4(vec2(0.97, 0.22), 0.15, 185.0 * waveFrequency), pt, tan, bit, t);
                vec3 wave4 = ocean_GerstnerWave(vec4(vec2(-0.24, 0.97), 0.18, 118.0 * waveFrequency), pt, tan, bit, t);
                vec3 wave5 = ocean_GerstnerWave(vec4(vec2(0.78, -0.63), 0.13, 88.0 * waveFrequency), pt, tan, bit, t);

                vec3 newPos = pt + wave1 + wave2 + wave3 + (wave4 + wave5) * closeWaveDetail;
                return newPos;
            }

            vec3 ocean_orthogonal(vec3 v) {
                return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
            }
            `
        );

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>

            // Absolute world position for continuous seamless waves as player flies
            vec3 wPos = (modelMatrix * vec4(position, 1.0)).xyz;
            vec3 pScaled = vec3(wPos.x, position.y, wPos.z);
            float sTime = time * waveSpeed * 2.75;
            float waterMeshScale = max(length(modelMatrix[0].xyz), length(modelMatrix[2].xyz));
            float samplingDamping = mix(1.0, 0.12, clamp((waterMeshScale - 1.0) / 9.0, 0.0, 1.0));
            float closeWaveDetail = 1.0 - smoothstep(140.0, 460.0, distance(wPos, uPlayerPos));

            vec3 dispPos = ocean_displace(pScaled, sTime, closeWaveDetail);

            vec3 t1 = vec3(1.0, 0.0, 0.0);
            vec3 b1 = vec3(0.0, 0.0, 1.0);
            vec3 n1 = pScaled + t1 * normalOffset;
            vec3 n2 = pScaled + b1 * normalOffset;
            vec3 dispN1 = ocean_displace(n1, sTime, closeWaveDetail);
            vec3 dispN2 = ocean_displace(n2, sTime, closeWaveDetail);

            vec3 dispTan = dispN1 - dispPos;
            vec3 dispBitan = dispN2 - dispPos;
            vec3 dispNorm = normalize(cross(dispBitan, dispTan));
            if (dispNorm.y < 0.0) dispNorm = -dispNorm;

            // Dynamic shore wave surge & shallow water damping
            vec2 tUV = (wPos.xz - uTerrainCenter) / uTerrainSize + 0.5;
            float wDepth = 50.0;
            if (tUV.x >= 0.005 && tUV.x <= 0.995 && tUV.y >= 0.005 && tUV.y <= 0.995) {
                float grndH = texture2D(uTerrainHeightMap, tUV).r;
                wDepth = uWaterLevel - grndH;
            }
            float shoreFactor = clamp(1.0 - max(0.0, wDepth) / 8.0, 0.0, 1.0);
            float shoreSwell = sin(max(0.0, wDepth) * uShoreWaveFreq - time * uShoreWaveSpeed * 1.35);
            float deepDamping = smoothstep(0.0, 8.0, max(0.0, wDepth));

            objectNormal = normalize(mix(vec3(0.0, 1.0, 0.0), dispNorm, samplingDamping));
            float oceanDispY = (dispPos.y - pScaled.y) * deepDamping;
            float closeGeometryBoost = mix(1.0, 1.9, closeWaveDetail);
            float visibleOceanDispY = oceanDispY * closeGeometryBoost;
            vec2 oceanDispXZ = (dispPos.xz - pScaled.xz) * deepDamping;
            float shoreDispY = shoreSwell * uShoreSurge * 0.35 * shoreFactor;
            float totalDispY = (visibleOceanDispY + shoreDispY) * samplingDamping;
            transformed.xz += oceanDispXZ * closeWaveDetail * samplingDamping * 0.65;
            transformed.y = position.y + totalDispY;
            vOceanHeight = visibleOceanDispY * samplingDamping; // displayed crest/trough relative to mean sea level
            vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );

        // --- FRAGMENT SHADER INJECTION ---
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            varying float vOceanHeight;
            varying vec3 vOceanWorldPos;

            uniform float time;
            uniform vec3 uPlayerPos;
            uniform vec3 waveColor;
            uniform vec3 waterHighlight;
            uniform vec3 uShallowColor;
            uniform vec3 uFoamColor;
            uniform float contrast;
            uniform float brightness;
            uniform float offset;
            uniform float waveHeight;

            // Shore uniforms
            uniform sampler2D uTerrainHeightMap;
            uniform vec2 uTerrainCenter;
            uniform float uTerrainSize;
            uniform float uWaterLevel;
            uniform float uShoreFoamWidth;
            uniform float uShoreWaveSpeed;
            uniform float uShoreWaveFreq;
            uniform float uShoreSurge;
            uniform float uFoamScale;

            // Textures & sparkles
            uniform sampler2D waterImage;
            uniform vec2 waterScale;
            uniform vec2 waterSpeed;
            uniform vec3 waterColorTint;
            uniform float waterAmt;

            uniform sampler2D displacement;
            uniform vec2 displacementSpeed;
            uniform vec2 waterDisplacementScale;
            uniform float displacementHeight;

            uniform sampler2D specularMap;
            uniform float specularScale;
            uniform float specularBrightness;
            uniform float specularPop;
            uniform float specularMax;
            uniform vec2 specularSpeed;

            vec4 getCartoonWater(vec2 worldCoord, float detailFade) {
                vec4 disp = texture2D(
                    displacement,
                    worldCoord * waterDisplacementScale + time * displacementSpeed
                );

                vec4 wColor = mix(
                    texture2D(
                        waterImage,
                        (worldCoord * waterScale + (disp.rg - 0.5) * displacementHeight) + time * waterSpeed
                    ),
                    vec4(waterColorTint, 1.0),
                    waterAmt
                );

                // Preserve the authored close-up texture, but collapse it into a
                // broad stable tone before it becomes sub-pixel noise at altitude.
                float broadVariation = texture2D(
                    displacement,
                    worldCoord * 0.0015 + time * displacementSpeed * 0.08
                ).r;
                vec2 swellDirA = normalize(vec2(0.82, 0.57));
                vec2 swellDirB = normalize(vec2(-0.38, 0.92));
                float distantSwellA = sin(dot(worldCoord, swellDirA) * 0.015 - time * 0.72);
                float distantSwellB = sin(dot(worldCoord, swellDirB) * 0.008 + time * 0.43);
                float distantSwell = clamp(0.5 + distantSwellA * 0.28 + distantSwellB * 0.18, 0.0, 1.0);
                vec3 distantWater = waterColorTint * (
                    0.58 + broadVariation * 0.12 + distantSwell * 0.28
                );
                wColor.rgb = mix(distantWater, wColor.rgb, detailFade);

                vec4 specBase = (
                    texture2D(specularMap, worldCoord * specularScale + time * specularSpeed) *
                    texture2D(specularMap, worldCoord * specularScale - time * specularSpeed)
                );

                vec4 spec = specBase;
                float len = length(specBase.rgb);
                if (len < specularPop) {
                    spec *= 0.0;
                } else {
                    spec = vec4(1.0) * smoothstep(specularPop, specularPop + 0.15, len);
                }

                float specNoiseDarken = (length(
                    texture2D(specularMap, worldCoord * 0.008 - time * specularSpeed * 0.5).rgb
                ) / 1.732) * 3.0 - 1.0;
                specNoiseDarken = clamp(specNoiseDarken, 0.0, 1.0);

                spec = min(spec * specularBrightness, vec4(specularMax));

                float distantSpecularFade = detailFade * detailFade;
                return vec4(wColor.rgb + spec.rgb * specNoiseDarken * distantSpecularFade, 1.0);
            }

            vec3 getOceanWaveColor(float h, float detailFade) {
                // Crest factor: only wave peaks (h > 0) receive bright white foam
                float crestFactor = clamp(h / max(0.1, waveHeight * 0.8), 0.0, 1.0);
                float mask = clamp((pow(crestFactor, 2.5) - offset) * contrast, 0.0, 1.0) * detailFade;
                vec3 closeColor = mix(waveColor, waterHighlight, mask) * brightness;
                return mix(waveColor * 0.72, closeColor, detailFade);
            }

            vec4 getCartoonOceanComposite(vec2 worldCoord, float h, float detailFade) {
                vec4 tex = getCartoonWater(worldCoord, detailFade);
                vec3 crestCol = getOceanWaveColor(h, detailFade);
                // Pure frothy white cap right on top of wave peak
                float peakFoam = smoothstep(waveHeight * 0.55, waveHeight * 1.15, h) * detailFade;
                vec3 composite = mix(crestCol * tex.rgb, waterHighlight, peakFoam * 0.45);
                return vec4(composite, 1.0);
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            // Sample terrain height & calculate real water depth along shores
            vec2 tUV = (vOceanWorldPos.xz - uTerrainCenter) / uTerrainSize + 0.5;
            float wDepth = 50.0;
            if (tUV.x >= 0.005 && tUV.x <= 0.995 && tUV.y >= 0.005 && tUV.y <= 0.995) {
                float groundH = texture2D(uTerrainHeightMap, tUV).r;
                wDepth = uWaterLevel - groundH;
            }

            // Keep the close-up style intact, then progressively suppress detail
            // that aliases into bright blobs when viewed from flight altitude.
            float waterViewDist = distance(vOceanWorldPos, uPlayerPos);
            float waterDetailFade = 1.0 - smoothstep(140.0, 460.0, waterViewDist);

            // 1. Shoreline surge waves & breaking surf
            float shoreDist = max(0.0, wDepth);
            float shoreDepthFactor = smoothstep(8.0, 0.0, shoreDist);
            float shoreSwell = sin(shoreDist * uShoreWaveFreq - time * uShoreWaveSpeed * 1.35);

            // 2. Shore foam: waterline contact band + breaking surge lines
            float edgeFoam = smoothstep(uShoreFoamWidth * 0.45, 0.0, shoreDist);
            float surgeFoam = smoothstep(0.35, 0.85, shoreSwell) * shoreDepthFactor * smoothstep(uShoreFoamWidth * 1.5, 0.0, shoreDist);

            // Bubbly procedural foam froth texture
            vec2 foamNoiseUV = vOceanWorldPos.xz * uFoamScale + vec2(time * 0.03, -time * 0.02);
            float foamNoise = texture2D(displacement, foamNoiseUV).r;
            float totalFoam = clamp(edgeFoam * 1.35 + surgeFoam * 0.85, 0.0, 1.0);
            totalFoam = smoothstep(0.22, 0.58, totalFoam * (0.6 + 0.75 * foamNoise));
            totalFoam *= mix(0.24, 1.0, waterDetailFade);

            // 3. Base cartoon ocean with caustics & sparkles
            vec4 oceanAlbedo = getCartoonOceanComposite(vOceanWorldPos.xz, vOceanHeight, waterDetailFade);

            // 4. Blend to shallow tropical turquoise near shores
            float shallowBlend = smoothstep(6.5, 0.0, shoreDist) * mix(0.18, 1.0, waterDetailFade);
            vec3 waterCol = mix(oceanAlbedo.rgb, uShallowColor * 1.25, shallowBlend * 0.75);

            // 5. Apply bright frothy shore foam on beach contact
            waterCol = mix(waterCol, uFoamColor, totalFoam);

            diffuseColor = vec4(waterCol, 1.0);
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            // Self-radiant cartoon glow so the ocean is vividly luminous under all lighting
            float waterEmissiveStrength = mix(0.08, 0.28, waterDetailFade);
            totalEmissiveRadiance += waterCol * waterEmissiveStrength + (uFoamColor * totalFoam * 0.35);
            `
        );
    };

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 2.4;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    return {
        waterMesh,
        waterMat,
        waterUniforms
    };
}
