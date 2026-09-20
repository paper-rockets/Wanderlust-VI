import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

// ==========================================
// 2. LIGHTING & CELESTIAL BODIES (Sun, Moon, Glare)
// ==========================================
export function initLighting(scene, params) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfffaeb, 1.4); // warm bright sunlight
        dirLight.position.set(150, 200, 50);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -120;
        dirLight.shadow.camera.right = 120;
        dirLight.shadow.camera.top = 120;
        dirLight.shadow.camera.bottom = -120;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.002;
        dirLight.shadow.normalBias = 1.5;
        scene.add(dirLight);
    
        // Sun Glare (Lensflare)
        const flareTextureLoader = new THREE.TextureLoader();
        const textureFlare0 = flareTextureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare0.png');
        const textureFlare3 = flareTextureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare3.png');
    
        const staticSun = new THREE.Group();
        staticSun.position.set(0, 1500, -20000); // Massive distance so Kiki can fly towards it
        scene.add(staticSun);
    
        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(textureFlare0, 1600, 0, dirLight.color)); // Massive permanent horizon glare
        lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
        lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
        lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
        lensflare.addElement(new LensflareElement(textureFlare3, 70, 1.0));
        staticSun.add(lensflare);
    
        // Physical Sun Sphere
        const sunGeo = new THREE.SphereGeometry(600, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }); // fog: false makes it glow through atmosphere
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        staticSun.add(sunMesh);
    
        let _savedSunDiscScale = params.sunDiscScale;
        let _savedGodRayIntensity = params.godRayIntensity;
        let _savedGodRayWeight = params.godRayWeight;
    
        function setNormalizeSun(enabled) {
            params.normalizeSun = !!enabled;
            if (typeof lensflare !== 'undefined' && lensflare) {
                lensflare.visible = (typeof timePhase !== 'undefined' ? timePhase !== 2 : true) && !params.normalizeSun;
            }
            if (params.normalizeSun) {
                if (params.sunDiscScale > 1.0) {
                    _savedSunDiscScale = params.sunDiscScale;
                    params.sunDiscScale = 1.0;
                }
                if (params.godRayIntensity > 0.30) {
                    _savedGodRayIntensity = params.godRayIntensity;
                    params.godRayIntensity = 0.20;
                }
                if (params.godRayWeight > 0.45) {
                    _savedGodRayWeight = params.godRayWeight;
                    params.godRayWeight = 0.35;
                }
            } else {
                params.sunDiscScale = _savedSunDiscScale || 1.8;
                params.godRayIntensity = _savedGodRayIntensity || 0.60;
                params.godRayWeight = _savedGodRayWeight || 0.85;
            }
    
            if (typeof staticSun !== 'undefined' && staticSun) {
                staticSun.scale.setScalar(params.sunDiscScale);
            }
            if (typeof godRaysPass !== 'undefined' && godRaysPass && godRaysPass.uniforms) {
                if (godRaysPass.uniforms.uIntensity) godRaysPass.uniforms.uIntensity.value = params.godRayIntensity;
                if (godRaysPass.uniforms.uWeight) godRaysPass.uniforms.uWeight.value = params.godRayWeight;
            }
            if (typeof gui !== 'undefined' && gui && gui.controllersRecursive) {
                gui.controllersRecursive().forEach(c => {
                    if (c.property === 'sunDiscScale' || c.property === 'godRayIntensity' || c.property === 'godRayWeight' || c.property === 'normalizeSun') {
                        c.updateDisplay();
                    }
                });
            }
        }
        window.setNormalizeSun = setNormalizeSun;
    
        // Glowing 3D Moon Sphere & Atmospheric Halo
        const staticMoon = new THREE.Group();
        scene.add(staticMoon);
        const moonGeo = new THREE.SphereGeometry(450, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeffff, fog: false });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        staticMoon.add(moonMesh);
    
        const haloGeo = new THREE.SphereGeometry(650, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0x88c8ff, transparent: true, opacity: 0.3, fog: false, side: THREE.BackSide });
        const moonHalo = new THREE.Mesh(haloGeo, haloMat);
        staticMoon.add(moonHalo);

    return {
        ambientLight,
        dirLight,
        lensflare,
        staticSun,
        sunMesh,
        staticMoon,
        moonMesh,
        moonHalo,
        setNormalizeSun
    };
}
