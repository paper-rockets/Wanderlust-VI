import * as THREE from 'three';
import { applyRoystanShader } from './shaders/roystanToon.js';

/**
 * In-Game 3D Model Picker & Placement System
 * Features:
 * 1. Live 3D Catalog Model Previewer inside modal (inspect before placing)
 * 2. Automatic Slope-Aware Ground Elevation (eliminates terrain clipping on hills)
 * 3. In-App On-Screen Elevation Controls (raise/lower +/- 1m)
 * 4. Click-and-Drag to reposition placed models across the island
 * 5. High-visibility glowing placement target ring & emissive ghost
 * 6. LocalStorage persistence across flights
 * 7. Free Camera Orbit/Pan/Zoom and Satellite Top-Down View for smart placement
 * 8. Vibrant Ghibli Toon materials and ambient illumination (no dark shadows)
 */

const STORAGE_KEY = 'ghibli_placed_buildings_v2';
const WIPE_OLD_MODELS_FLAG = 'ghibli_wipe_done_v2';

// One-time deletion of all previously placed models
try {
  if (!localStorage.getItem(WIPE_OLD_MODELS_FLAG)) {
    localStorage.removeItem('ghibli_placed_buildings_v1');
    localStorage.removeItem('ghibli_placed_buildings_v2');
    localStorage.setItem(WIPE_OLD_MODELS_FLAG, 'true');
  }
} catch (_) {}

export function initModelPlacer({
  scene,
  camera,
  renderer,
  terrain,
  gltfLoader,
  getWorldHeight,
  godCamera,
  godControls,
  setGodMode
}) {
  const canvasEl = renderer.domElement;
  const raycaster = new THREE.Raycaster();

  // Soft warm village fill light so placed buildings look vibrant and never black
  const villageFillLight = new THREE.HemisphereLight(0xfff6ea, 0x90a4ae, 0.65);
  villageFillLight.position.set(0, 50, 0);
  scene.add(villageFillLight);
  const mouse = new THREE.Vector2();
  const groundFallbackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Placed models array
  let placedModels = [];
  window.placedModels = placedModels;
  let nextInstanceId = 1;

  // Placement state
  let isPlacementActive = false;
  let currentPlacingItem = null;
  let ghostRotationY = 0;
  let ghostScaleMultiplier = 1.0;
  let ghostElevationOffset = 0.0;
  const ghostWrapper = new THREE.Group();
  ghostWrapper.visible = false;
  scene.add(ghostWrapper);

  // High-visibility ground target ring for placement
  const placementRingGeo = new THREE.RingGeometry(1.8, 2.2, 32);
  placementRingGeo.rotateX(-Math.PI / 2);
  const placementRingMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });
  const placementTargetRing = new THREE.Mesh(placementRingGeo, placementRingMat);
  placementTargetRing.renderOrder = 998;
  placementTargetRing.visible = false;
  scene.add(placementTargetRing);

  // Drag-and-drop state for placed models
  let isDraggingModel = false;
  let draggedModel = null;
  const dragOffset = new THREE.Vector3();

  // Selection state
  let selectedModel = null;
  const selectionRingGeo = new THREE.RingGeometry(1.5, 1.85, 32);
  selectionRingGeo.rotateX(-Math.PI / 2);
  const selectionRingMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    depthTest: false,
    transparent: true,
    opacity: 0.95
  });
  const selectionRing = new THREE.Mesh(selectionRingGeo, selectionRingMat);
  selectionRing.renderOrder = 999;
  selectionRing.visible = false;
  scene.add(selectionRing);

  // Dedicated Fly-To state & high-visibility glowing cyan reticle
  let isFlyToActive = false;
  const flyToRingGeo = new THREE.RingGeometry(2.0, 2.6, 32);
  flyToRingGeo.rotateX(-Math.PI / 2);
  const flyToRingMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const flyToTargetRing = new THREE.Mesh(flyToRingGeo, flyToRingMat);
  flyToTargetRing.renderOrder = 999;
  flyToTargetRing.visible = false;

  const flyToDotGeo = new THREE.CircleGeometry(0.55, 16);
  flyToDotGeo.rotateX(-Math.PI / 2);
  const flyToDotMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });
  const flyToDot = new THREE.Mesh(flyToDotGeo, flyToDotMat);
  flyToDot.renderOrder = 1000;
  flyToTargetRing.add(flyToDot);
  scene.add(flyToTargetRing);

  // Catalog items
  let fullCatalog = [];
  let favoritesCatalog = [];
  let activeCatalogFilter = 'favorites';
  let activeSearchQuery = '';

  // DOM Elements - Modal & Catalog
  const topPlaceBtn = document.getElementById('top-place-btn');
  const modal = document.getElementById('model-picker-modal');
  const modalCloseBtn = document.getElementById('close-picker-btn');
  const modalPackSelect = document.getElementById('picker-pack-select');
  const modalSearchInput = document.getElementById('picker-search-input');
  const modalCountBadge = document.getElementById('picker-count-badge');
  const modalGrid = document.getElementById('picker-grid');
  const modalClearAllBtn = document.getElementById('picker-clear-all-btn');

  // DOM Elements - Catalog 3D Live Preview
  const previewCanvasContainer = document.getElementById('preview-canvas-container');
  const previewModelName = document.getElementById('preview-model-name');
  const previewModelTag = document.getElementById('preview-model-tag');
  const previewPlaceBtn = document.getElementById('preview-place-btn');
  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewCurrentModel = null;
  let currentlyInspectedItem = null;

  // DOM Elements - Placement Toolbar
  const placementToolbar = document.getElementById('placement-toolbar');
  const placementModelName = document.getElementById('placement-model-name');
  const placeRotLeftBtn = document.getElementById('place-rot-left-btn');
  const placeRotRightBtn = document.getElementById('place-rot-right-btn');
  const placeScaleDownBtn = document.getElementById('place-scale-down-btn');
  const placeScaleLabel = document.getElementById('place-scale-label');
  const placeScaleUpBtn = document.getElementById('place-scale-up-btn');
  const placeElevDownBtn = document.getElementById('place-elev-down-btn');
  const placeElevLabel = document.getElementById('place-elev-label');
  const placeElevUpBtn = document.getElementById('place-elev-up-btn');
  const cancelPlacementBtn = document.getElementById('cancel-placement-btn');

  // DOM Elements - Selected Model Toolbar
  const selectedToolbar = document.getElementById('selected-model-toolbar');
  const selToolbarName = document.getElementById('sel-toolbar-name');
  const selRotLeftBtn = document.getElementById('sel-rot-left-btn');
  const selRotRightBtn = document.getElementById('sel-rot-right-btn');
  const selScaleDownBtn = document.getElementById('sel-scale-down-btn');
  const selScaleLabel = document.getElementById('sel-scale-label');
  const selScaleUpBtn = document.getElementById('sel-scale-up-btn');
  const selElevDownBtn = document.getElementById('sel-elev-down-btn');
  const selElevLabel = document.getElementById('sel-elev-label');
  const selElevUpBtn = document.getElementById('sel-elev-up-btn');
  const selDuplicateBtn = document.getElementById('sel-duplicate-btn');
  const selDeleteBtn = document.getElementById('sel-delete-btn');
  const selCloseBtn = document.getElementById('sel-close-btn');

  // Helper: Setup in-game material optimizations & Ghibli toon lighting
  function setupMaterials(model) {
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = false; // Disables low-res shadow maps darkening building faces
        child.frustumCulled = false;

        const isArr = Array.isArray(child.material);
        const mats = isArr ? child.material : [child.material];
        const upgradedMats = mats.map((mat) => {
          if (!mat) return mat;
          let m = mat;
          if (mat.isMeshBasicMaterial) {
            m = new THREE.MeshStandardMaterial({
              map: mat.map,
              color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
              roughness: 0.6,
              metalness: 0.0,
              side: THREE.DoubleSide
            });
          }
          m.depthWrite = true;
          m.side = THREE.DoubleSide;

          if (m.map) {
            m.map.generateMipmaps = true;
            m.map.minFilter = THREE.LinearMipmapLinearFilter;
            m.map.magFilter = THREE.LinearFilter;
            m.map.anisotropy = 4;
            m.map.needsUpdate = true;
          }

          // Apply Ghibli toon rim lighting and anime shading
          applyRoystanShader(m);

          // Prevent metallic light absorption and harsh darkness
          if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            m.roughness = THREE.MathUtils.clamp(m.roughness !== undefined ? m.roughness : 0.6, 0.25, 0.75);
            m.metalness = THREE.MathUtils.clamp(m.metalness !== undefined ? m.metalness : 0.0, 0.0, 0.05);

            // Radiant ambient emission: keeps all details visible and vibrant in sunlight and shadow
            if (m.map && !m.emissiveMap) {
              m.emissiveMap = m.map;
              m.emissive = new THREE.Color(0xffffff);
              m.emissiveIntensity = 0.35;
            } else if (!m.map) {
              m.emissive = (m.color ? m.color.clone() : new THREE.Color(0xffffff));
              m.emissiveIntensity = 0.30;
            }
          }
          m.needsUpdate = true;
          return m;
        });
        child.material = isArr ? upgradedMats : upgradedMats[0];
      }
    });
  }

  // --- Terrain Height & Slope-Aware Base Calculation ---
  function sampleTerrainElevation(x, z) {
    if (typeof getWorldHeight === 'function') {
      const h = getWorldHeight(x, z);
      if (typeof h === 'number' && !isNaN(h)) {
        return Math.max(h, 0);
      }
    }
    return 0;
  }

  /**
   * Evaluates the terrain slope, height drop, and water presence across the footprint of a building.
   * Prevents buildings from being placed on steep hillsides, cliffs, or in ocean water.
   */
  function getFootprintSlopeInfo(posX, posZ, halfW = 2.5, halfD = 2.5) {
    const c = sampleTerrainElevation(posX, posZ);
    const n = sampleTerrainElevation(posX, posZ - halfD);
    const s = sampleTerrainElevation(posX, posZ + halfD);
    const e = sampleTerrainElevation(posX + halfW, posZ);
    const w = sampleTerrainElevation(posX - halfW, posZ);
    const ne = sampleTerrainElevation(posX + halfW, posZ - halfD);
    const nw = sampleTerrainElevation(posX - halfW, posZ - halfD);
    const se = sampleTerrainElevation(posX + halfW, posZ + halfD);
    const sw = sampleTerrainElevation(posX - halfW, posZ + halfD);

    const heights = [c, n, s, e, w, ne, nw, se, sw];
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const heightDelta = maxH - minH;

    const spanX = Math.max(halfW * 2, 1);
    const spanZ = Math.max(halfD * 2, 1);
    const slopeX = Math.abs(e - w) / spanX;
    const slopeZ = Math.abs(s - n) / spanZ;
    const maxSlope = Math.max(slopeX, slopeZ);

    // Strict cliff detection:
    // A cliff or steep hill has slope > 0.30 (~17 degrees) or height drop across footprint > 1.3 meters
    const isCliff = maxSlope > 0.30 || heightDelta > 1.3;
    const isWater = c <= 0.8;

    return {
      elevation: maxH,
      minH,
      maxH,
      heightDelta,
      maxSlope,
      isCliff,
      isWater,
      isValid: !isCliff && !isWater
    };
  }

  function getSlopeCompensatedHeight(posX, posZ, halfW = 2.5, halfD = 2.5) {
    return getFootprintSlopeInfo(posX, posZ, halfW, halfD).elevation;
  }

  // --- Modal Live 3D Previewer Setup ---
  function initCatalogPreviewer() {
    if (!previewCanvasContainer || previewRenderer) return;
    const w = previewCanvasContainer.clientWidth || 280;
    const h = previewCanvasContainer.clientHeight || 240;

    previewScene = new THREE.Scene();
    previewCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    previewCamera.position.set(0, 3.5, 7.5);
    previewCamera.lookAt(0, 1.2, 0);

    previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    previewRenderer.setSize(w, h);
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewCanvasContainer.appendChild(previewRenderer.domElement);

    const ambLight = new THREE.AmbientLight(0xffffff, 1.5);
    previewScene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    dirLight.position.set(5, 10, 7);
    previewScene.add(dirLight);
  }

  function previewModel(item) {
    if (!previewScene) initCatalogPreviewer();
    currentlyInspectedItem = item;
    if (previewModelName) previewModelName.textContent = item.cleanName;
    if (previewModelTag) previewModelTag.textContent = `Pack: ${item.pack}`;

    if (previewCurrentModel) {
      previewScene.remove(previewCurrentModel);
      previewCurrentModel = null;
    }

    gltfLoader.load(item.url, (gltf) => {
      if (currentlyInspectedItem !== item) return;
      const model = gltf.scene;
      setupMaterials(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? (3.6 / maxDim) : 1.0;

      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      model.scale.setScalar(scale);

      previewCurrentModel = new THREE.Group();
      previewCurrentModel.add(model);
      previewScene.add(previewCurrentModel);
    });
  }

  // --- LocalStorage Persistence ---
  function saveToStorage() {
    try {
      const data = placedModels.map(m => ({
        id: m.id,
        url: m.url,
        name: m.name,
        cleanName: m.cleanName,
        posX: m.wrapper.position.x,
        posY: m.wrapper.position.y,
        posZ: m.wrapper.position.z,
        rotY: m.wrapper.rotation.y,
        userScale: m.userScaleMultiplier,
        normScale: m.normalizedScale,
        elevationOffset: m.elevationOffset || 0
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save placed models to localStorage:', err);
    }
  }

  function clearAll() {
    placedModels.forEach(m => {
      if (m.mixer) m.mixer.stopAllAction();
      scene.remove(m.wrapper);
    });
    placedModels = [];
    window.placedModels = [];
    selectModel(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function applyVillageData(data, shouldSave = false) {
    if (!Array.isArray(data)) return;
    const cleanList = [];
    data.forEach(item => {
      const hw = 2.5 * (item.userScale || 1.0);
      const hd = 2.5 * (item.userScale || 1.0);
      const slopeInfo = getFootprintSlopeInfo(item.posX, item.posZ, hw, hd);

      // Never place models on cliff sides or in water when loading or reloading terrain!
      if (slopeInfo.isCliff || slopeInfo.isWater) {
        console.warn(`[Model Placer] Omitted building "${item.cleanName || item.name}" at (${item.posX.toFixed(1)}, ${item.posZ.toFixed(1)}) because it was on a cliff side (slope: ${slopeInfo.maxSlope.toFixed(2)}, height delta: ${slopeInfo.heightDelta.toFixed(2)}m)`);
        return;
      }

      cleanList.push(item);
      instantiateModel(
        item,
        item.posX,
        slopeInfo.elevation,
        item.posZ,
        item.rotY,
        item.userScale || 1.0,
        item.elevationOffset || 0.0,
        false
      );
    });
    if (shouldSave || cleanList.length !== data.length) {
      saveToStorage();
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          applyVillageData(data, false);
          return;
        }
      }
      // If no custom village in browser localStorage, check if a default village file is bundled with the app
      fetch('assets/default_village.json')
        .then(r => {
          if (!r.ok) return null;
          return r.json();
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            applyVillageData(data, false);
            console.log(`Loaded ${data.length} default buildings from assets/default_village.json`);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.warn('Failed to load placed models from localStorage:', err);
    }
  }

  // --- Catalogs Fetching ---
  function loadCatalogs() {
    fetch('assets/favorites_64.json')
      .then(r => r.json())
      .then(files => {
        favoritesCatalog = files.map(file => {
          const clean = file.replace('.glb', '');
          const pack = file.split('_')[0] || 'favorites';
          return {
            name: file,
            cleanName: clean,
            pack: pack,
            url: 'assets/all_models/' + file
          };
        });
        renderCatalog();
      })
      .catch(err => console.warn('Could not load favorites_64.json:', err));

    fetch('assets/manifest.json')
      .then(res => res.json())
      .then(manifest => {
        fullCatalog = [];
        Object.keys(manifest).sort().forEach(pack => {
          manifest[pack].forEach(file => {
            const clean = file.replace('.glb', '');
            const url = pack === 'terrains' ? `assets/all_models/${file}` : `assets/all_models/${pack}_${file}`;
            fullCatalog.push({
              name: file,
              cleanName: clean,
              pack: pack,
              url: url
            });
          });
        });
        renderCatalog();
      })
      .catch(err => console.warn('Could not load manifest.json:', err));
  }

  // --- Modal Catalog Render ---
  function renderCatalog() {
    if (!modalGrid) return;
    let list = activeCatalogFilter === 'favorites' ? favoritesCatalog : fullCatalog;

    if (activeCatalogFilter !== 'favorites' && activeCatalogFilter !== 'all') {
      list = fullCatalog.filter(m => m.pack === activeCatalogFilter);
    }

    const query = activeSearchQuery.toLowerCase().trim();
    if (query.length > 0) {
      list = list.filter(m => m.name.toLowerCase().includes(query) || m.cleanName.toLowerCase().includes(query));
    }

    if (modalCountBadge) {
      modalCountBadge.textContent = `${list.length} models`;
    }

    modalGrid.innerHTML = '';
    list.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'picker-card';
      if (idx === 0 && !currentlyInspectedItem) {
        card.classList.add('active-selected');
        previewModel(item);
      } else if (currentlyInspectedItem === item) {
        card.classList.add('active-selected');
      }

      const title = document.createElement('div');
      title.className = 'picker-card-title';
      title.textContent = item.cleanName;

      const tag = document.createElement('div');
      tag.className = 'picker-card-tag';
      tag.textContent = item.pack;

      const btn = document.createElement('button');
      btn.className = 'picker-card-btn';
      btn.textContent = '+ Pick & Place';

      card.appendChild(title);
      card.appendChild(tag);
      card.appendChild(btn);

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.picker-card').forEach(c => c.classList.remove('active-selected'));
        card.classList.add('active-selected');
        previewModel(item);
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startPlacementMode(item);
      });

      modalGrid.appendChild(card);
    });

    if (list.length > 0 && !currentlyInspectedItem) {
      previewModel(list[0]);
    }
  }

  // --- Selection System ---
  function selectModel(m) {
    selectedModel = m;
    window.selectedModel = selectedModel;

    if (selectedToolbar) {
      if (m) {
        selectedToolbar.style.display = 'flex';
        if (selToolbarName) selToolbarName.textContent = m.cleanName || m.name;
        if (selScaleLabel) selScaleLabel.textContent = (m.userScaleMultiplier || 1.0).toFixed(2) + 'x';
        if (selElevLabel) {
          const elev = m.elevationOffset || 0;
          selElevLabel.textContent = `${elev >= 0 ? '+' : ''}${elev.toFixed(0)}m`;
        }
        updateSatelliteBtnText();
        ensureFlightState();
        // Activate free camera so user can orbit/pan/zoom around their selected building
        if (setGodMode && !window.isGodMode && !(godControls && godControls.enabled)) {
          wasInGodMode = false;
          setGodMode(true);
        }
      } else {
        selectedToolbar.style.display = 'none';
        exitPlacementCamera();
        ensureFlightState();
      }
    }

    if (!selectionRing) return;
    if (selectedModel) {
      selectionRing.visible = true;
      selectionRing.position.set(
        selectedModel.wrapper.position.x,
        selectedModel.wrapper.position.y + 0.12,
        selectedModel.wrapper.position.z
      );
      const b = new THREE.Box3().setFromObject(selectedModel.wrapper);
      const sz = b.getSize(new THREE.Vector3());
      const radius = Math.max(Math.max(sz.x, sz.z) * 0.65, 1.8);
      selectionRing.scale.set(radius, radius, radius);
    } else {
      selectionRing.visible = false;
    }
  }

  // --- Free Camera & Satellite View System ---
  let isSatelliteView = false;
  let wasInGodMode = false;

  function updateSatelliteBtnText() {
    const pBtn = document.getElementById('place-cam-sat-btn');
    const sBtn = document.getElementById('sel-cam-sat-btn');
    const fBtn = document.getElementById('flyto-cam-sat-btn');
    const text = isSatelliteView ? '[ 3D View ]' : '[ Satellite View ]';
    if (pBtn) pBtn.textContent = text;
    if (sBtn) sBtn.textContent = text;
    if (fBtn) fBtn.textContent = text;
  }

  function getActivePlacementTarget() {
    const target = new THREE.Vector3(0, 15, 0);
    if (selectedModel) {
      target.copy(selectedModel.wrapper.position);
    } else if (ghostWrapper.visible) {
      target.copy(ghostWrapper.position);
    } else if (isFlyToActive && flyToTargetRing.visible) {
      target.copy(flyToTargetRing.position);
    } else if (godControls && godControls.target) {
      target.copy(godControls.target);
    } else if (window.playerGrp) {
      target.copy(window.playerGrp.position);
    }
    return target;
  }

  function toggleSatelliteView() {
    if (!godControls || !godCamera) return;
    isSatelliteView = !isSatelliteView;
    updateSatelliteBtnText();

    const target = getActivePlacementTarget();
    godControls.target.set(target.x, target.y, target.z);

    if (isSatelliteView) {
      // Direct overhead satellite bird's-eye view looking down on the island
      godCamera.position.set(target.x, target.y + 190, target.z + 10);
    } else {
      // Angled 3D tactical perspective view
      godCamera.position.set(target.x, target.y + 40, target.z + 60);
    }
    godControls.update();
  }

  function zoomCamera(direction) {
    if (!godControls || !godCamera) return;
    const offset = new THREE.Vector3().subVectors(godCamera.position, godControls.target);
    const dist = offset.length();
    const factor = direction > 0 ? 0.72 : 1.38;
    const newDist = THREE.MathUtils.clamp(dist * factor, 6, 900);
    offset.setLength(newDist);
    godCamera.position.copy(godControls.target).add(offset);
    godControls.update();
  }

  function orbitCamera(angle) {
    if (!godControls || !godCamera) return;
    const offset = new THREE.Vector3().subVectors(godCamera.position, godControls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    godCamera.position.copy(godControls.target).add(offset);
    godControls.update();
  }

  function focusOnModel(m) {
    if (!m || !godControls || !godCamera) return;
    const p = m.wrapper.position;
    godControls.target.set(p.x, p.y + 2, p.z);
    if (isSatelliteView) {
      godCamera.position.set(p.x, p.y + 190, p.z + 10);
    } else {
      godCamera.position.set(p.x, p.y + 35, p.z + 50);
    }
    godControls.update();
  }

  // Teleport Kiki to any location on the terrain and immediately refresh surroundings
  function teleportPlayerTo(x, z, altOffset = 35) {
    const p = window.playerGrp;
    if (!p) return;
    const groundY = sampleTerrainElevation(x, z);
    const targetY = Math.max(30, groundY + altOffset);
    p.position.set(x, targetY, z);

    if (window.cameraBase) {
      window.cameraBase.position.copy(p.position);
    }
    if (typeof window.lastTerrainGridX !== 'undefined') window.lastTerrainGridX = -9999;
    if (typeof window.lastTerrainGridZ !== 'undefined') window.lastTerrainGridZ = -9999;
    if (typeof window.updateTerrainGeometry === 'function') {
      window.updateTerrainGeometry(x, z);
    }
  }

  // Single source of truth: pauses Kiki if ANY editor/targeting state is active, resumes otherwise.
  function ensureFlightState() {
    const modalOpen = !!(modal && modal.style.display === 'flex');
    const shouldPause = isPlacementActive || isFlyToActive || !!selectedModel || modalOpen;
    if (window.setFlightPaused) window.setFlightPaused(shouldPause);
  }

  function exitPlacementCamera() {
    // Only restore camera when fully done (no placement, no fly-to, no selection)
    if (isPlacementActive || isFlyToActive || selectedModel) return;
    if (setGodMode && !wasInGodMode) {
      setGodMode(false);
    }
    ensureFlightState();
  }

  // --- Fly-To Mode (Click anywhere on terrain to fly Kiki there) ---
  const flyToToolbar = document.getElementById('flyto-toolbar');

  function startFlyToMode() {
    if (modal) modal.style.display = 'none';
    if (isPlacementActive) cancelPlacementMode();
    selectModel(null);

    isFlyToActive = true;
    ensureFlightState();

    if (flyToToolbar) flyToToolbar.style.display = 'flex';
    flyToTargetRing.visible = false;

    // Activate Free Cam controls (Orbit, Pan, Zoom) for smarter navigation
    wasInGodMode = !!(window.isGodMode || (godControls && godControls.enabled));
    if (setGodMode && !wasInGodMode) {
      setGodMode(true);
    }
    if (godControls && godCamera) {
      const basePos = window.playerGrp ? window.playerGrp.position : new THREE.Vector3(0, 20, 0);
      godControls.target.copy(basePos);
      if (isSatelliteView) {
        godCamera.position.set(basePos.x, basePos.y + 190, basePos.z + 10);
      } else {
        godCamera.position.set(basePos.x, basePos.y + 40, basePos.z + 60);
      }
      godControls.update();
      godControls.enabled = false; // Mouse aims reticle freely
    }
    updateSatelliteBtnText();
  }

  function cancelFlyToMode() {
    isFlyToActive = false;
    if (flyToToolbar) flyToToolbar.style.display = 'none';
    if (flyToTargetRing) flyToTargetRing.visible = false;
    if (godControls) godControls.enabled = true;
    exitPlacementCamera();
    ensureFlightState();
  }

  // --- Placement Mode Functions ---
  function startPlacementMode(item) {
    if (modal) modal.style.display = 'none';
    selectModel(null);
    isPlacementActive = true;
    window.isModelPlacing = true;
    currentPlacingItem = item;
    ghostRotationY = 0;
    ghostScaleMultiplier = 1.0;
    ghostElevationOffset = 0.0;

    ensureFlightState();

    // Activate Free Cam controls (Orbit, Pan, Zoom) for smarter placement
    wasInGodMode = !!(window.isGodMode || (godControls && godControls.enabled));
    if (setGodMode && !wasInGodMode) {
      setGodMode(true);
    }
    if (godControls && godCamera) {
      const basePos = window.playerGrp ? window.playerGrp.position : new THREE.Vector3(0, 20, 0);
      godControls.target.copy(basePos);
      if (isSatelliteView) {
        godCamera.position.set(basePos.x, basePos.y + 190, basePos.z + 10);
      } else {
        godCamera.position.set(basePos.x, basePos.y + 40, basePos.z + 60);
      }
      godControls.update();
      // Disable orbit drag so mouse exclusively drives the ghost, not the camera.
      // Toolbar buttons (satellite/zoom/orbit) still work fine via direct position manipulation.
      godControls.enabled = false;
    }
    updateSatelliteBtnText();

    if (placementModelName) placementModelName.textContent = item.cleanName || item.name;
    if (placeScaleLabel) placeScaleLabel.textContent = '1.0x';
    if (placeElevLabel) placeElevLabel.textContent = '0m';
    if (placementToolbar) placementToolbar.style.display = 'flex';

    while (ghostWrapper.children.length > 0) {
      ghostWrapper.remove(ghostWrapper.children[0]);
    }
    ghostWrapper.visible = false;
    placementTargetRing.visible = false;

    gltfLoader.load(item.url, (gltf) => {
      if (!isPlacementActive || currentPlacingItem !== item) return;
      const model = gltf.scene;
      setupMaterials(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      let targetDim = 6.0;
      const isIsland = item.cleanName && (item.cleanName.includes('island') || item.cleanName.includes('terrain') || item.pack === 'issum');
      if (isIsland) {
        targetDim = 36.0;
      } else if (item.cleanName && (item.cleanName.includes('castle') || item.cleanName.includes('fortress'))) {
        targetDim = 14.0;
      }
      const normScale = maxDim > 0 ? (targetDim / maxDim) : 1.0;

      model.position.set(-center.x, -box.min.y, -center.z);

      model.traverse((c) => {
        if (c.isMesh) {
          c.material = c.material.clone();
          c.material.transparent = true;
          c.material.opacity = 0.85;
          c.material.emissive = new THREE.Color(0x10b981);
          c.material.emissiveIntensity = 0.35;
          c.material.depthWrite = false;
        }
      });

      ghostWrapper.userData = { normScale, baseSize: size };
      ghostWrapper.add(model);
      ghostWrapper.scale.setScalar(normScale * ghostScaleMultiplier);
      ghostWrapper.rotation.y = ghostRotationY;
      ghostWrapper.visible = true;

      const ringRadius = Math.max(Math.max(size.x, size.z) * normScale * 0.65, 1.8);
      placementTargetRing.scale.set(ringRadius, ringRadius, ringRadius);
      placementTargetRing.visible = true;
    });
  }

  function cancelPlacementMode() {
    isPlacementActive = false;
    window.isModelPlacing = false;
    currentPlacingItem = null;
    ghostWrapper.visible = false;
    placementTargetRing.visible = false;
    while (ghostWrapper.children.length > 0) {
      ghostWrapper.remove(ghostWrapper.children[0]);
    }
    if (placementToolbar) placementToolbar.style.display = 'none';
    // Re-enable orbit drag now that ghost is gone
    if (godControls) godControls.enabled = true;
    exitPlacementCamera();
    ensureFlightState();
  }

  // --- Instantiate Placed Model ---
  function instantiateModel(item, posX, posY, posZ, rotY, scaleMult, elevationOffset = 0.0, autoSelect = true) {
    gltfLoader.load(item.url, (gltf) => {
      const model = gltf.scene;
      setupMaterials(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      let targetDim = 6.0;
      const isIsland = item.cleanName && (item.cleanName.includes('island') || item.cleanName.includes('terrain') || item.pack === 'issum');
      if (isIsland) {
        targetDim = 36.0;
      } else if (item.cleanName && (item.cleanName.includes('castle') || item.cleanName.includes('fortress'))) {
        targetDim = 14.0;
      }
      const normalizedScale = item.normScale || (maxDim > 0 ? (targetDim / maxDim) : 1.0);
      const scale = normalizedScale * scaleMult;

      const wrapper = new THREE.Group();
      model.position.set(-center.x, -box.min.y, -center.z);
      wrapper.add(model);
      wrapper.scale.setScalar(scale);
      wrapper.rotation.y = rotY;
      wrapper.position.set(posX, posY + elevationOffset, posZ);
      scene.add(wrapper);

      let mixer = null;
      const clips = gltf.animations || [];
      if (clips.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const act = mixer.clipAction(clips[0]);
        act.play();
      }

      const modelData = {
        id: item.id || nextInstanceId++,
        wrapper,
        model,
        normalizedScale,
        userScaleMultiplier: scaleMult,
        elevationOffset: elevationOffset,
        baseSize: size,
        url: item.url,
        name: item.name,
        cleanName: item.cleanName || item.name,
        mixer
      };

      placedModels.push(modelData);
      window.placedModels = placedModels;

      if (autoSelect) {
        selectModel(modelData);
      }
      saveToStorage();
    });
  }

  // --- Placement Toolbar Controls ---
  if (placeRotLeftBtn) {
    placeRotLeftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostRotationY -= Math.PI / 4;
      ghostWrapper.rotation.y = ghostRotationY;
    });
  }
  if (placeRotRightBtn) {
    placeRotRightBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostRotationY += Math.PI / 4;
      ghostWrapper.rotation.y = ghostRotationY;
    });
  }
  if (placeScaleDownBtn) {
    placeScaleDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostScaleMultiplier = Math.max(0.2, ghostScaleMultiplier * 0.8);
      if (placeScaleLabel) placeScaleLabel.textContent = ghostScaleMultiplier.toFixed(2) + 'x';
      const normScale = ghostWrapper.userData?.normScale || 1.0;
      ghostWrapper.scale.setScalar(normScale * ghostScaleMultiplier);
    });
  }
  if (placeScaleUpBtn) {
    placeScaleUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostScaleMultiplier = Math.min(6.0, ghostScaleMultiplier * 1.25);
      if (placeScaleLabel) placeScaleLabel.textContent = ghostScaleMultiplier.toFixed(2) + 'x';
      const normScale = ghostWrapper.userData?.normScale || 1.0;
      ghostWrapper.scale.setScalar(normScale * ghostScaleMultiplier);
    });
  }
  if (placeElevDownBtn) {
    placeElevDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostElevationOffset -= 1.0;
      if (placeElevLabel) placeElevLabel.textContent = `${ghostElevationOffset >= 0 ? '+' : ''}${ghostElevationOffset.toFixed(0)}m`;
    });
  }
  if (placeElevUpBtn) {
    placeElevUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ghostElevationOffset += 1.0;
      if (placeElevLabel) placeElevLabel.textContent = `${ghostElevationOffset >= 0 ? '+' : ''}${ghostElevationOffset.toFixed(0)}m`;
    });
  }
  if (cancelPlacementBtn) {
    cancelPlacementBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelPlacementMode();
    });
  }

  // --- Selected Model Toolbar Controls ---
  if (selRotLeftBtn) {
    selRotLeftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.wrapper.rotation.y -= Math.PI / 4;
      saveToStorage();
    });
  }
  if (selRotRightBtn) {
    selRotRightBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.wrapper.rotation.y += Math.PI / 4;
      saveToStorage();
    });
  }
  if (selScaleDownBtn) {
    selScaleDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.userScaleMultiplier = Math.max(0.2, (selectedModel.userScaleMultiplier || 1.0) * 0.8);
      const s = (selectedModel.normalizedScale || 1.0) * selectedModel.userScaleMultiplier;
      selectedModel.wrapper.scale.setScalar(s);
      if (selScaleLabel) selScaleLabel.textContent = selectedModel.userScaleMultiplier.toFixed(2) + 'x';
      selectModel(selectedModel);
      saveToStorage();
    });
  }
  if (selScaleUpBtn) {
    selScaleUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.userScaleMultiplier = Math.min(6.0, (selectedModel.userScaleMultiplier || 1.0) * 1.25);
      const s = (selectedModel.normalizedScale || 1.0) * selectedModel.userScaleMultiplier;
      selectedModel.wrapper.scale.setScalar(s);
      if (selScaleLabel) selScaleLabel.textContent = selectedModel.userScaleMultiplier.toFixed(2) + 'x';
      selectModel(selectedModel);
      saveToStorage();
    });
  }
  if (selElevDownBtn) {
    selElevDownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.elevationOffset = (selectedModel.elevationOffset || 0) - 1.0;
      selectedModel.wrapper.position.y -= 1.0;
      if (selElevLabel) selElevLabel.textContent = `${selectedModel.elevationOffset >= 0 ? '+' : ''}${selectedModel.elevationOffset.toFixed(0)}m`;
      selectModel(selectedModel);
      saveToStorage();
    });
  }
  if (selElevUpBtn) {
    selElevUpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      selectedModel.elevationOffset = (selectedModel.elevationOffset || 0) + 1.0;
      selectedModel.wrapper.position.y += 1.0;
      if (selElevLabel) selElevLabel.textContent = `${selectedModel.elevationOffset >= 0 ? '+' : ''}${selectedModel.elevationOffset.toFixed(0)}m`;
      selectModel(selectedModel);
      saveToStorage();
    });
  }
  if (selDuplicateBtn) {
    selDuplicateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      const item = {
        name: selectedModel.name,
        cleanName: selectedModel.cleanName,
        url: selectedModel.url,
        pack: 'favorites'
      };
      // Capture settings BEFORE startPlacementMode resets ghost state
      const savedScale = selectedModel.userScaleMultiplier || 1.0;
      const savedRot   = selectedModel.wrapper.rotation.y;
      const savedElev  = selectedModel.elevationOffset || 0;
      startPlacementMode(item);
      // Inject original settings so duplicate ghost matches the source
      ghostScaleMultiplier = savedScale;
      ghostRotationY = savedRot;
      ghostElevationOffset = savedElev;
      ghostWrapper.rotation.y = ghostRotationY;
      // The ghost model loads async — ghostScaleMultiplier is read at load time (line 637),
      // so setting it here before the callback fires is sufficient.
      if (placeScaleLabel) placeScaleLabel.textContent = ghostScaleMultiplier.toFixed(2) + 'x';
      if (placeElevLabel) placeElevLabel.textContent = `${ghostElevationOffset >= 0 ? '+' : ''}${ghostElevationOffset.toFixed(0)}m`;
    });
  }
  if (selDeleteBtn) {
    selDeleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!selectedModel) return;
      if (selectedModel.mixer) selectedModel.mixer.stopAllAction();
      scene.remove(selectedModel.wrapper);
      placedModels = placedModels.filter(m => m !== selectedModel);
      window.placedModels = placedModels;
      selectModel(null);
      saveToStorage();
    });
  }
  if (selCloseBtn) {
    selCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectModel(null);
    });
  }

  // --- Save / Export / Place More Handlers ---
  const pickerSaveBtn = document.getElementById('picker-save-btn');
  const placeSaveBtn = document.getElementById('place-save-btn');
  const selSaveBtn = document.getElementById('sel-save-btn');
  const pickerExportBtn = document.getElementById('picker-export-btn');
  const pickerImportBtn = document.getElementById('picker-import-btn');
  const pickerImportInput = document.getElementById('picker-import-input');
  const selPlaceMoreBtn = document.getElementById('sel-place-more-btn');

  function showSaveToast(msg = '✓ Village Saved!') {
    const toast = document.getElementById('save-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 2400);
  }

  function handleSaveClick() {
    saveToStorage();
    const count = placedModels.length;
    showSaveToast(`✓ Saved ${count} building${count === 1 ? '' : 's'} to browser!`);
  }

  function handleExportClick() {
    saveToStorage();
    const data = localStorage.getItem(STORAGE_KEY) || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_village_layout_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSaveToast('✓ Village layout file downloaded!');
  }

  if (pickerSaveBtn) pickerSaveBtn.addEventListener('click', (e) => { e.stopPropagation(); handleSaveClick(); });
  if (placeSaveBtn) placeSaveBtn.addEventListener('click', (e) => { e.stopPropagation(); handleSaveClick(); });
  if (selSaveBtn) selSaveBtn.addEventListener('click', (e) => { e.stopPropagation(); handleSaveClick(); });
  if (pickerExportBtn) pickerExportBtn.addEventListener('click', (e) => { e.stopPropagation(); handleExportClick(); });

  if (pickerImportBtn && pickerImportInput) {
    pickerImportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerImportInput.click();
    });
    pickerImportInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Array.isArray(data)) {
            clearAll();
            applyVillageData(data, true);
            showSaveToast(`✓ Loaded & saved ${data.length} building${data.length === 1 ? '' : 's'}!`);
          } else {
            alert('Invalid village file format.');
          }
        } catch (err) {
          alert('Failed to read village file: ' + err.message);
        }
        pickerImportInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  if (selPlaceMoreBtn) {
    selPlaceMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectModel(null);
      if (modal) {
        modal.style.display = 'flex';
        renderCatalog();
        initCatalogPreviewer();
        ensureFlightState();
      }
    });
  }

  // --- Camera & Satellite View Controls ---
  const placeCamSatBtn = document.getElementById('place-cam-sat-btn');
  const selCamSatBtn = document.getElementById('sel-cam-sat-btn');
  const placeCamZoomIn = document.getElementById('place-cam-zoom-in');
  const placeCamZoomOut = document.getElementById('place-cam-zoom-out');
  const selCamZoomIn = document.getElementById('sel-cam-zoom-in');
  const selCamZoomOut = document.getElementById('sel-cam-zoom-out');
  const placeCamSpinL = document.getElementById('place-cam-spin-left');
  const placeCamSpinR = document.getElementById('place-cam-spin-right');
  const selCamFocusBtn = document.getElementById('sel-cam-focus-btn');

  if (placeCamSatBtn) placeCamSatBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSatelliteView(); });
  if (selCamSatBtn) selCamSatBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSatelliteView(); });

  if (placeCamZoomIn) placeCamZoomIn.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(1); });
  if (placeCamZoomOut) placeCamZoomOut.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(-1); });
  if (selCamZoomIn) selCamZoomIn.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(1); });
  if (selCamZoomOut) selCamZoomOut.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(-1); });

  if (placeCamSpinL) placeCamSpinL.addEventListener('click', (e) => { e.stopPropagation(); orbitCamera(Math.PI / 6); });
  if (placeCamSpinR) placeCamSpinR.addEventListener('click', (e) => { e.stopPropagation(); orbitCamera(-Math.PI / 6); });

  if (selCamFocusBtn) selCamFocusBtn.addEventListener('click', (e) => { e.stopPropagation(); focusOnModel(selectedModel); });

  // --- Fly-To Toolbar Controls & Buttons ---
  const topFlyToBtn = document.getElementById('top-flyto-btn');
  const placeFlyHereBtn = document.getElementById('place-flyhere-btn');
  const selFlyHereBtn = document.getElementById('sel-flyhere-btn');
  const cancelFlyToBtn = document.getElementById('cancel-flyto-btn');
  const flytoCamSatBtn = document.getElementById('flyto-cam-sat-btn');
  const flytoCamZoomIn = document.getElementById('flyto-cam-zoom-in');
  const flytoCamZoomOut = document.getElementById('flyto-cam-zoom-out');
  const flytoCamSpinL = document.getElementById('flyto-cam-spin-left');
  const flytoCamSpinR = document.getElementById('flyto-cam-spin-right');

  if (topFlyToBtn) {
    topFlyToBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isFlyToActive) {
        cancelFlyToMode();
      } else {
        startFlyToMode();
      }
    });
  }

  if (placeFlyHereBtn) {
    placeFlyHereBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ghostWrapper.visible) {
        const tx = ghostWrapper.position.x;
        const tz = ghostWrapper.position.z;
        cancelPlacementMode();
        teleportPlayerTo(tx, tz, 35);
        showSaveToast('Flew to location!');
      }
    });
  }

  if (selFlyHereBtn) {
    selFlyHereBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedModel) {
        const tx = selectedModel.wrapper.position.x;
        const tz = selectedModel.wrapper.position.z;
        selectModel(null);
        teleportPlayerTo(tx, tz, 35);
        showSaveToast('Flew to building!');
      }
    });
  }

  if (cancelFlyToBtn) {
    cancelFlyToBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelFlyToMode();
    });
  }

  if (flytoCamSatBtn) flytoCamSatBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSatelliteView(); });
  if (flytoCamZoomIn) flytoCamZoomIn.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(1); });
  if (flytoCamZoomOut) flytoCamZoomOut.addEventListener('click', (e) => { e.stopPropagation(); zoomCamera(-1); });
  if (flytoCamSpinL) flytoCamSpinL.addEventListener('click', (e) => { e.stopPropagation(); orbitCamera(Math.PI / 6); });
  if (flytoCamSpinR) flytoCamSpinR.addEventListener('click', (e) => { e.stopPropagation(); orbitCamera(-Math.PI / 6); });

  // --- Modal Open/Close Event Listeners ---
  function openPickerModal() {
    if (modal) {
      const isShown = modal.style.display === 'flex';
      modal.style.display = isShown ? 'none' : 'flex';
      if (!isShown) {
        renderCatalog();
        initCatalogPreviewer();
      }
      ensureFlightState();
    }
  }

  if (topPlaceBtn) {
    topPlaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPickerModal();
    });
  }

  if (previewPlaceBtn) {
    previewPlaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentlyInspectedItem) {
        startPlacementMode(currentlyInspectedItem);
      }
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (modal) modal.style.display = 'none';
      ensureFlightState(); // resume Kiki if nothing else is active
    });
  }

  if (modalPackSelect) {
    modalPackSelect.addEventListener('change', (e) => {
      activeCatalogFilter = e.target.value;
      renderCatalog();
    });
  }

  if (modalSearchInput) {
    modalSearchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value;
      renderCatalog();
    });
  }

  if (modalClearAllBtn) {
    modalClearAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Clear all placed models from this world?')) {
        clearAll();
        showSaveToast('All placed buildings cleared.');
      }
    });
  }

  function getActiveCamera() {
    return window.camera || (godControls && godControls.enabled ? godCamera : camera);
  }

  // --- World Raycasting & Ground Intersection ---
  function getGroundIntersection(e, halfW = 2.5, halfD = 2.5) {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const curCam = getActiveCamera();
    raycaster.setFromCamera(mouse, curCam);

    if (terrain) {
      const hits = raycaster.intersectObject(terrain, false);
      if (hits.length > 0) {
        const hit = hits[0].point;
        const slopeInfo = getFootprintSlopeInfo(hit.x, hit.z, halfW, halfD);
        const res = new THREE.Vector3(hit.x, slopeInfo.elevation, hit.z);
        res.slopeInfo = slopeInfo;
        return res;
      }
    }

    const groundHit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundFallbackPlane, groundHit)) {
      const slopeInfo = getFootprintSlopeInfo(groundHit.x, groundHit.z, halfW, halfD);
      const res = new THREE.Vector3(groundHit.x, slopeInfo.elevation, groundHit.z);
      res.slopeInfo = slopeInfo;
      return res;
    }
    return null;
  }

  // --- Pointer Handlers (Placement & Click-and-Drag) ---
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // Left click only
    if (modal && modal.style.display === 'flex') return;

    // 0. In Fly-To Mode: clicking ground teleports Kiki there immediately!
    if (isFlyToActive) {
      e.preventDefault();
      e.stopPropagation();
      const pos = getGroundIntersection(e, 2.0, 2.0);
      if (pos) {
        teleportPlayerTo(pos.x, pos.z, 35);
        cancelFlyToMode();
        showSaveToast('Flew to location!');
      }
      return;
    }

    // 1. Check if user clicked on an EXISTING placed building
    let clickedExisting = null;
    if (placedModels.length > 0) {
      const rect = canvasEl.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const curCam = getActiveCamera();
      raycaster.setFromCamera(mouse, curCam);

      const interactable = [];
      placedModels.forEach(m => {
        m.wrapper.traverse(c => {
          if (c.isMesh) {
            c.userData.modelRef = m;
            interactable.push(c);
          }
        });
      });

      const hits = raycaster.intersectObjects(interactable, false);
      if (hits.length > 0) {
        clickedExisting = hits[0].object.userData.modelRef;
      }
    }

    // If clicked an existing building: ALWAYS select it and allow immediate reposition/rotate/resize!
    if (clickedExisting) {
      e.preventDefault();
      e.stopPropagation();
      if (isPlacementActive) {
        cancelPlacementMode();
      }
      draggedModel = clickedExisting;
      selectModel(draggedModel);
      isDraggingModel = true;
      window.isModelDragging = true;
      canvasEl.style.cursor = 'grabbing';

      const groundPos = getGroundIntersection(e);
      if (groundPos) {
        dragOffset.copy(draggedModel.wrapper.position).sub(groundPos);
      }
      return;
    }

    // 2. In Placement Mode: clicking empty ground places the building & immediately selects it!
    if (isPlacementActive && currentPlacingItem) {
      e.preventDefault();
      e.stopPropagation();
      const sz = ghostWrapper.userData?.baseSize || { x: 5, z: 5 };
      const normScale = ghostWrapper.userData?.normScale || 1.0;
      const hw = (sz.x * normScale * ghostScaleMultiplier) * 0.45;
      const hd = (sz.z * normScale * ghostScaleMultiplier) * 0.45;
      const pos = getGroundIntersection(e, hw, hd);
      if (pos) {
        if (pos.slopeInfo && pos.slopeInfo.isCliff) {
          showSaveToast('⚠️ Cannot place on a cliff side! Choose flatter ground.');
          return;
        }
        if (pos.slopeInfo && pos.slopeInfo.isWater) {
          showSaveToast('⚠️ Cannot place in water! Choose dry ground.');
          return;
        }

        const itemToPlace = currentPlacingItem;
        const curRot = ghostRotationY;
        const curScale = ghostScaleMultiplier;
        const curElev = ghostElevationOffset;
        cancelPlacementMode(); // exit placement mode to avoid accidental double-clicks
        instantiateModel(
          itemToPlace,
          pos.x,
          pos.y,
          pos.z,
          curRot,
          curScale,
          curElev,
          true // immediately selects so user can resize/rotate/reposition!
        );
        showSaveToast('Building placed! Drag to move, or use buttons below.');
      }
      return;
    }

    // 3. Clicking empty ground deselects
    if (selectedModel && !isDraggingModel) {
      selectModel(null);
    }
  });

  window.addEventListener('pointermove', (e) => {
    // Fly-to mode targeting reticle follow
    if (isFlyToActive) {
      const pos = getGroundIntersection(e, 2.0, 2.0);
      if (pos) {
        flyToTargetRing.position.set(pos.x, pos.y + 0.1, pos.z);
        flyToTargetRing.visible = true;
      }
      canvasEl.style.cursor = 'crosshair';
      return;
    }

    // Placement mode ghost follow
    if (isPlacementActive) {
      const sz = ghostWrapper.userData?.baseSize || { x: 5, z: 5 };
      const normScale = ghostWrapper.userData?.normScale || 1.0;
      const hw = (sz.x * normScale * ghostScaleMultiplier) * 0.45;
      const hd = (sz.z * normScale * ghostScaleMultiplier) * 0.45;
      const pos = getGroundIntersection(e, hw, hd);
      if (pos) {
        ghostWrapper.position.set(pos.x, pos.y + ghostElevationOffset, pos.z);
        placementTargetRing.position.set(pos.x, pos.y + 0.08, pos.z);

        const slopeStatus = document.getElementById('placement-slope-status');
        if (pos.slopeInfo && !pos.slopeInfo.isValid) {
          placementRingMat.color.setHex(0xef4444); // Red indicator
          if (slopeStatus) {
            slopeStatus.style.background = '#fee2e2';
            slopeStatus.style.color = '#991b1b';
            slopeStatus.style.borderColor = '#ef4444';
            slopeStatus.textContent = pos.slopeInfo.isWater ? '⚠️ Water (Choose Dry Land)' : '⚠️ Cliff Side (Too Steep!)';
          }
        } else {
          placementRingMat.color.setHex(0x10b981); // Emerald green indicator
          if (slopeStatus) {
            slopeStatus.style.background = '#ecfdf5';
            slopeStatus.style.color = '#065f46';
            slopeStatus.style.borderColor = '#10b981';
            slopeStatus.textContent = '✓ Suitable Ground';
          }
        }
      }
      canvasEl.style.cursor = 'crosshair';
      return;
    }

    // Dragging placed model across the terrain
    if (isDraggingModel && draggedModel) {
      const sz = draggedModel.baseSize || { x: 5, z: 5 };
      const s = (draggedModel.normalizedScale || 1.0) * (draggedModel.userScaleMultiplier || 1.0);
      const hw = (sz.x * s) * 0.45;
      const hd = (sz.z * s) * 0.45;
      const pos = getGroundIntersection(e, hw, hd);
      if (pos) {
        draggedModel.wrapper.position.x = pos.x + dragOffset.x;
        draggedModel.wrapper.position.z = pos.z + dragOffset.z;
        const groundY = getSlopeCompensatedHeight(draggedModel.wrapper.position.x, draggedModel.wrapper.position.z, hw, hd);
        draggedModel.wrapper.position.y = groundY + (draggedModel.elevationOffset || 0);

        if (selectionRing) {
          selectionRing.position.set(draggedModel.wrapper.position.x, draggedModel.wrapper.position.y + 0.12, draggedModel.wrapper.position.z);
        }
      }
      return;
    }

    // Hover cursor
    if (placedModels.length > 0 && !isPlacementActive) {
      const rect = canvasEl.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const interactable = [];
      placedModels.forEach(m => {
        m.wrapper.traverse(c => {
          if (c.isMesh) interactable.push(c);
        });
      });
      const hits = raycaster.intersectObjects(interactable, false);
      canvasEl.style.cursor = hits.length > 0 ? 'grab' : 'default';
    }
  });

  window.addEventListener('pointerup', () => {
    if (isDraggingModel && draggedModel) {
      const sz = draggedModel.baseSize || { x: 5, z: 5 };
      const s = (draggedModel.normalizedScale || 1.0) * (draggedModel.userScaleMultiplier || 1.0);
      const hw = (sz.x * s) * 0.45;
      const hd = (sz.z * s) * 0.45;
      const slopeInfo = getFootprintSlopeInfo(draggedModel.wrapper.position.x, draggedModel.wrapper.position.z, hw, hd);
      if (slopeInfo.isCliff) {
        showSaveToast('⚠️ Warning: Dropped on a cliff side! Please move to flatter ground.');
      } else if (slopeInfo.isWater) {
        showSaveToast('⚠️ Warning: Dropped in water! Please move to dry ground.');
      }
      isDraggingModel = false;
      window.isModelDragging = false;
      draggedModel = null;
      canvasEl.style.cursor = 'default';
      saveToStorage();
    }
  });

  // Revalidates all placed models when terrain reloads or regenerates.
  // Any building that ends up on a steep cliff side or in water is safely removed!
  function revalidatePlacedModelsOnTerrainReload() {
    if (placedModels.length === 0) return;
    const toKeep = [];
    placedModels.forEach(m => {
      const sz = m.baseSize || { x: 5, z: 5 };
      const s = (m.normalizedScale || 1.0) * (m.userScaleMultiplier || 1.0);
      const hw = (sz.x * s) * 0.45;
      const hd = (sz.z * s) * 0.45;
      const x = m.wrapper.position.x;
      const z = m.wrapper.position.z;
      const slopeInfo = getFootprintSlopeInfo(x, z, hw, hd);
      if (slopeInfo.isCliff || slopeInfo.isWater) {
        console.warn(`[Model Placer] Removed building "${m.cleanName}" because terrain reloaded and created a cliff side at (${x.toFixed(1)}, ${z.toFixed(1)})`);
        if (m.mixer) m.mixer.stopAllAction();
        scene.remove(m.wrapper);
      } else {
        m.wrapper.position.y = slopeInfo.elevation + (m.elevationOffset || 0);
        toKeep.push(m);
      }
    });
    if (toKeep.length !== placedModels.length) {
      placedModels = toKeep;
      window.placedModels = placedModels;
      saveToStorage();
    }
  }
  window.revalidatePlacedModels = revalidatePlacedModelsOnTerrainReload;

  // Hotkey support (R to rotate, Esc to exit)
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
      if (isPlacementActive) {
        ghostRotationY += Math.PI / 4;
        ghostWrapper.rotation.y = ghostRotationY;
      } else if (selectedModel) {
        selectedModel.wrapper.rotation.y += Math.PI / 4;
        saveToStorage();
      }
    } else if (e.key === 'Escape') {
      if (isFlyToActive) {
        cancelFlyToMode();
      } else if (isPlacementActive) {
        cancelPlacementMode();
      } else if (selectedModel) {
        selectModel(null);
      } else if (modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    }
  });

  // Frame update
  function update(delta) {
    // Spin preview model inside catalog modal
    if (modal && modal.style.display === 'flex' && previewCurrentModel && previewRenderer && previewScene && previewCamera) {
      previewCurrentModel.rotation.y += delta * 0.9;
      previewRenderer.render(previewScene, previewCamera);
    }

    // Update animations for placed models
    if (placedModels.length > 0) {
      placedModels.forEach(m => {
        if (m.mixer) m.mixer.update(delta);
      });
    }
  }

  loadCatalogs();
  loadFromStorage();

  const api = {
    startPlacementMode,
    cancelPlacementMode,
    openPickerModal,
    startFlyToMode,
    cancelFlyToMode,
    selectModel,
    clearAll,
    saveToStorage,
    revalidatePlacedModels: revalidatePlacedModelsOnTerrainReload,
    update
  };
  window.modelPlacer = api;

  return api;
}
