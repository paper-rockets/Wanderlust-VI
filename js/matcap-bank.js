import {
  ALL_MATERIAL_PRESETS,
  PRESET_CATEGORIES,
  getMatcapTexture,
  createMatCap
} from './shaders/materialPresets.js';
import { setTreeMatcap, getTreeMatcapState } from './trees.js';
import { setCrystalTerrainMatcap, getCrystalTerrainMatcapState } from './terrain.js';
import { getBiomeAt } from './world.js';

let bankModal = null;
let currentTarget = 'crystal'; // 'trees' | 'crystal'
let currentTreePresetId = null;
let currentCrystalPresetId = null;
let currentSearchQuery = '';
let currentCategory = 'All';
let currentTreeTint = 0.35;
let currentCrystalReplace = 1.0; // 1.0 = 100% full replacement of terrain shader

export function initMatcapBank() {
  if (document.getElementById('matcap-bank-modal')) return;

  const style = document.createElement('style');
  style.textContent = `
    #matcap-bank-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(94vw, 880px);
      max-height: 85vh;
      background: rgba(14, 18, 27, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: none;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }
    #matcap-bank-modal.is-open {
      display: flex;
    }
    .mc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
      gap: 12px;
      flex-wrap: wrap;
    }
    .mc-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .mc-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .mc-target-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9px;
      padding: 3px;
      gap: 4px;
    }
    .mc-target-tab {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 7px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mc-target-tab:hover {
      color: #ffffff;
    }
    .mc-target-tab.is-active.is-trees {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.35);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .mc-target-tab.is-active.is-crystal {
      background: rgba(168, 85, 247, 0.25);
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.45);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .mc-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
      font-weight: 600;
    }
    .mc-active-pill {
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 12px;
      background: rgba(192, 132, 252, 0.15);
      color: #c084fc;
      border: 1px solid rgba(192, 132, 252, 0.3);
      font-weight: 600;
    }
    .mc-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
      margin-left: auto;
    }
    .mc-close-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .mc-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(0, 0, 0, 0.2);
    }
    .mc-search-input {
      flex: 1 1 180px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      padding: 7px 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .mc-search-input:focus {
      border-color: #38bdf8;
    }
    .mc-category-select {
      background: #1e2533;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      padding: 7px 10px;
      outline: none;
      cursor: pointer;
    }
    .mc-tint-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .mc-tint-wrap input[type="range"] {
      width: 80px;
      cursor: pointer;
    }
    .mc-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mc-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }
    .mc-btn-reset {
      background: rgba(239, 68, 68, 0.18);
      border-color: rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }
    .mc-btn-reset:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #ffffff;
    }
    .mc-grid-container {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 18px 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 14px;
      max-height: calc(85vh - 145px);
    }
    .mc-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .mc-card:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    }
    .mc-card.is-active {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
    }
    .mc-card.is-active.is-crystal-active {
      border-color: #c084fc;
      background: rgba(168, 85, 247, 0.16);
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.4);
    }
    .mc-sphere-preview {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0,0,0,0.5);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      margin-bottom: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }
    .mc-card-name {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .mc-card-cat {
      font-size: 9.5px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
  `;
  document.head.appendChild(style);

  bankModal = document.createElement('div');
  bankModal.id = 'matcap-bank-modal';
  bankModal.setAttribute('role', 'dialog');
  bankModal.setAttribute('aria-modal', 'true');

  bankModal.innerHTML = `
    <div class="mc-header">
      <div class="mc-title-group">
        <span class="mc-title">MatCap Shader Bank</span>
        <div class="mc-target-tabs">
          <button class="mc-target-tab" id="mc-target-trees" data-target="trees" title="Style cartoon tree foliage">Cartoon Trees</button>
          <button class="mc-target-tab is-active is-crystal" id="mc-target-crystal" data-target="crystal" title="Replace full terrain shader in Crystal Land">Crystal Land Ground</button>
        </div>
        <span class="mc-badge" id="mc-count-badge">${ALL_MATERIAL_PRESETS.length} Shaders</span>
        <span class="mc-active-pill" id="mc-active-indicator">Crystal Ground: Default</span>
      </div>
      <button class="mc-close-btn" id="mc-close-btn" title="Close Bank (Esc)">&times;</button>
    </div>
    <div class="mc-toolbar">
      <input type="text" class="mc-search-input" id="mc-search-input" placeholder="Search shaders (e.g. Toon, Gold, Opal, Jade)..." />
      <select class="mc-category-select" id="mc-category-select" aria-label="Category">
        ${PRESET_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
      <div class="mc-tint-wrap">
        <span id="mc-slider-label">Ground Replace:</span>
        <input type="range" id="mc-tint-slider" min="0" max="1" step="0.05" value="1.0" title="Full Terrain Shader Replacement Influence (100% = Pure MatCap)" />
        <span id="mc-tint-val">100%</span>
      </div>
      <button class="mc-btn mc-btn-reset" id="mc-reset-btn" title="Reset current target to default">Reset to Default</button>
      <a href="shaders.html" target="_blank" rel="noopener noreferrer" class="mc-btn" title="Open standalone 3D interactive reviewer in a new tab">3D Reviewer ↗</a>
    </div>
    <div class="mc-grid-container" id="mc-grid-container"></div>
  `;

  document.body.appendChild(bankModal);

  // Wire events
  document.getElementById('mc-close-btn').addEventListener('click', closeMatcapBank);
  document.getElementById('mc-reset-btn').addEventListener('click', () => {
    applyPreset(null);
  });

  document.getElementById('mc-target-trees').addEventListener('click', () => {
    setTarget('trees');
  });

  document.getElementById('mc-target-crystal').addEventListener('click', () => {
    setTarget('crystal');
  });

  const searchInput = document.getElementById('mc-search-input');
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    renderGrid();
  });

  const categorySelect = document.getElementById('mc-category-select');
  categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    renderGrid();
  });

  const tintSlider = document.getElementById('mc-tint-slider');
  const tintVal = document.getElementById('mc-tint-val');
  tintSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    tintVal.textContent = Math.round(val * 100) + '%';
    if (currentTarget === 'trees') {
      currentTreeTint = val;
      const activeState = getTreeMatcapState();
      if (activeState.active && activeState.texture) {
        setTreeMatcap(activeState.texture, currentTreeTint);
      }
    } else {
      currentCrystalReplace = val;
      const activeState = getCrystalTerrainMatcapState();
      if (activeState.active && activeState.texture) {
        setCrystalTerrainMatcap(activeState.texture, currentCrystalReplace);
      }
    }
  });

  // Keyboard shortcut: Esc closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bankModal && bankModal.classList.contains('is-open')) {
      closeMatcapBank();
    }
  });

  renderGrid();
  setTarget('crystal');
}

function setTarget(target) {
  currentTarget = target;
  const treesBtn = document.getElementById('mc-target-trees');
  const crystalBtn = document.getElementById('mc-target-crystal');
  const sliderLabel = document.getElementById('mc-slider-label');
  const slider = document.getElementById('mc-tint-slider');
  const sliderVal = document.getElementById('mc-tint-val');

  if (target === 'trees') {
    if (treesBtn) treesBtn.className = 'mc-target-tab is-active is-trees';
    if (crystalBtn) crystalBtn.className = 'mc-target-tab';
    if (sliderLabel) sliderLabel.textContent = 'Tree Tint:';
    if (slider) {
      slider.value = currentTreeTint;
      slider.title = 'Tree Foliage Tint Influence';
    }
    if (sliderVal) sliderVal.textContent = Math.round(currentTreeTint * 100) + '%';
  } else {
    if (treesBtn) treesBtn.className = 'mc-target-tab';
    if (crystalBtn) crystalBtn.className = 'mc-target-tab is-active is-crystal';
    if (sliderLabel) sliderLabel.textContent = 'Ground Replace:';
    if (slider) {
      slider.value = currentCrystalReplace;
      slider.title = 'Full Terrain Shader Replacement Influence (100% = Pure MatCap)';
    }
    if (sliderVal) sliderVal.textContent = Math.round(currentCrystalReplace * 100) + '%';
  }
  updateActiveIndicator();
  updateCardSelections();
}

function applyPreset(preset) {
  if (currentTarget === 'trees') {
    if (!preset) {
      setTreeMatcap(null);
      currentTreePresetId = null;
    } else {
      const tex = getMatcapTexture(preset);
      setTreeMatcap(tex, currentTreeTint);
      currentTreePresetId = preset.id;
    }
  } else {
    // Crystal Land Ground
    if (!preset) {
      setCrystalTerrainMatcap(null);
      currentCrystalPresetId = null;
    } else {
      const tex = getMatcapTexture(preset);
      setCrystalTerrainMatcap(tex, currentCrystalReplace);
      currentCrystalPresetId = preset.id;
    }
  }
  updateActiveIndicator();
  updateCardSelections();
}

function updateActiveIndicator() {
  const activeIndicator = document.getElementById('mc-active-indicator');
  if (!activeIndicator) return;

  if (currentTarget === 'trees') {
    if (!currentTreePresetId) {
      activeIndicator.textContent = 'Trees: Default';
      activeIndicator.style.color = '#94a3b8';
      activeIndicator.style.borderColor = 'rgba(148, 163, 184, 0.25)';
      activeIndicator.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
    } else {
      const p = ALL_MATERIAL_PRESETS.find(x => x.id === currentTreePresetId);
      activeIndicator.textContent = `Trees: ${p ? p.name : currentTreePresetId}`;
      activeIndicator.style.color = '#38bdf8';
      activeIndicator.style.borderColor = 'rgba(56, 189, 248, 0.35)';
      activeIndicator.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
    }
  } else {
    if (!currentCrystalPresetId) {
      activeIndicator.textContent = 'Crystal Ground: Default';
      activeIndicator.style.color = '#94a3b8';
      activeIndicator.style.borderColor = 'rgba(148, 163, 184, 0.25)';
      activeIndicator.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
    } else {
      const p = ALL_MATERIAL_PRESETS.find(x => x.id === currentCrystalPresetId);
      activeIndicator.textContent = `Crystal Ground: ${p ? p.name : currentCrystalPresetId}`;
      activeIndicator.style.color = '#c084fc';
      activeIndicator.style.borderColor = 'rgba(192, 132, 252, 0.35)';
      activeIndicator.style.backgroundColor = 'rgba(192, 132, 252, 0.15)';
    }
  }
}

function updateCardSelections() {
  const activeId = currentTarget === 'trees' ? currentTreePresetId : currentCrystalPresetId;
  const cards = document.querySelectorAll('.mc-card');
  cards.forEach(card => {
    if (card.dataset.id === activeId) {
      card.classList.add('is-active');
      if (currentTarget === 'crystal') {
        card.classList.add('is-crystal-active');
      } else {
        card.classList.remove('is-crystal-active');
      }
    } else {
      card.classList.remove('is-active', 'is-crystal-active');
    }
  });
}

function renderGrid() {
  const container = document.getElementById('mc-grid-container');
  if (!container) return;

  const filtered = ALL_MATERIAL_PRESETS.filter(p => {
    const matchesCat = currentCategory === 'All' || p.category === currentCategory;
    const matchesQuery = !currentSearchQuery ||
      p.name.toLowerCase().includes(currentSearchQuery) ||
      (p.category && p.category.toLowerCase().includes(currentSearchQuery)) ||
      (p.description && p.description.toLowerCase().includes(currentSearchQuery));
    return matchesCat && matchesQuery;
  });

  const countBadge = document.getElementById('mc-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${ALL_MATERIAL_PRESETS.length}`;
  }

  container.innerHTML = '';

  filtered.forEach(preset => {
    const activeId = currentTarget === 'trees' ? currentTreePresetId : currentCrystalPresetId;
    const card = document.createElement('div');
    card.className = `mc-card ${preset.id === activeId ? 'is-active' : ''}`;
    if (preset.id === activeId && currentTarget === 'crystal') {
      card.classList.add('is-crystal-active');
    }
    card.dataset.id = preset.id;
    card.title = `${preset.name} (${preset.category || 'Shader'})\nClick to apply`;

    const sphere = document.createElement('div');
    sphere.className = 'mc-sphere-preview';
    const previewUrl = preset.url || (typeof preset.generate === 'function' ? createMatCap(preset.generate) : '');
    if (previewUrl) {
      sphere.style.backgroundImage = `url("${previewUrl}")`;
    }

    const name = document.createElement('div');
    name.className = 'mc-card-name';
    name.textContent = preset.name;

    const cat = document.createElement('div');
    cat.className = 'mc-card-cat';
    cat.textContent = preset.category || 'Shader';

    card.appendChild(sphere);
    card.appendChild(name);
    card.appendChild(cat);

    card.addEventListener('click', () => {
      applyPreset(preset);
    });

    container.appendChild(card);
  });
}

export function openMatcapBank() {
  initMatcapBank();
  if (bankModal) {
    // Auto-detect if player is currently in Crystal Land
    let isCrystalLand = false;
    if (typeof window !== 'undefined' && window.playerGrp) {
      const b = getBiomeAt(window.playerGrp.position.x, window.playerGrp.position.z);
      if (b && b.id === 'crystal_land') isCrystalLand = true;
    }
    const topBiome = document.getElementById('top-biome-select')?.value;
    if (topBiome === 'Crystal Land') isCrystalLand = true;

    setTarget(isCrystalLand ? 'crystal' : currentTarget);

    bankModal.classList.add('is-open');
    const searchInput = document.getElementById('mc-search-input');
    if (searchInput) searchInput.focus();
  }
}

export function closeMatcapBank() {
  if (bankModal) {
    bankModal.classList.remove('is-open');
  }
}

export function toggleMatcapBank() {
  if (bankModal && bankModal.classList.contains('is-open')) {
    closeMatcapBank();
  } else {
    openMatcapBank();
  }
}

window.openMatcapBank = openMatcapBank;
window.closeMatcapBank = closeMatcapBank;
window.toggleMatcapBank = toggleMatcapBank;
