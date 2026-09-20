import { worldLayout, getBiomeAt, getWorldHeight, _mapName } from './world.js';
import { snoise } from './noise.js';

// ==========================================
// 2D WORLD MAP CANVAS & INTERACTIVE TELEPORTATION
// ==========================================
    // 2D World Map Canvas & Interactive Teleportation
    let _mapEl = null;
    let _mapCanvas = null;
    let _mapCtx = null;
    let _mapTooltip = null;
    let _bgMapCanvas = null;
    let _lastMapDrawTime = 0;
    let _hoverMapPos = null;
    let _mapOpen = false;

    function _setMapOpen(open) {
        _mapOpen = open;
        if (!_mapEl) return;
        _mapEl.classList.toggle('map-open', open);
        _mapEl.classList.toggle('map-compass', !open);
        _hoverMapPos = null;
        if (_mapTooltip) _mapTooltip.style.display = 'none';
        _drawWorldMap(true);
        const icon = document.getElementById('map-toggle-icon');
        const btn  = document.getElementById('map-toggle-btn');
        if (btn) btn.title = open ? 'Minimize map' : 'Expand map';
        if (icon) icon.innerHTML = open
            ? '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
            : '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
    }

    function initMapUI() {
        _mapEl = document.getElementById('world-map');
        _mapCanvas = document.getElementById('map-canvas');
        _mapTooltip = document.getElementById('map-tooltip');

        if (_mapEl) _mapEl.classList.add('map-compass');

        const _mapToggleBtn = document.getElementById('map-toggle-btn');
        if (_mapToggleBtn) {
            _mapToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                _setMapOpen(!_mapOpen);
            });
        }

        const _bottomHud = document.getElementById('bottom-left-hud');
        if (_bottomHud) {
            _bottomHud.addEventListener('click', (e) => {
                if (!_mapOpen) { e.stopPropagation(); _setMapOpen(true); }
            });
        }
        const _hudMapIcon = document.getElementById('hud-map-icon');
        if (_hudMapIcon) {
            _hudMapIcon.addEventListener('click', (e) => {
                e.stopPropagation(); _setMapOpen(!_mapOpen);
            });
        }

        if (_mapCanvas) {
            _mapCtx = _mapCanvas.getContext('2d');

            _mapCanvas.addEventListener('mousemove', (e) => {
                if (!_mapOpen) return;
                const rect = _mapCanvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                _hoverMapPos = { x: mouseX, y: mouseY };

                const view = _mapView();
                const targetX = view.cx + ((mouseX / rect.width) - 0.5) * 2.0 * view.half;
                const targetZ = view.cz + ((mouseY / rect.height) - 0.5) * 2.0 * view.half;

                const b = getBiomeAt(targetX, targetZ);
                const isNearCapyHaven = Math.hypot(targetX - (-1200), targetZ - (-800)) < 400;
                let distKm = 0;
                if ((typeof playerGrp !== 'undefined' ? playerGrp : window.playerGrp)) {
                    const dx = targetX - playerGrp.position.x;
                    const dz = targetZ - playerGrp.position.z;
                    distKm = (Math.sqrt(dx * dx + dz * dz) / 1000).toFixed(1);
                }

                if (_mapTooltip) {
                    _mapTooltip.style.display = 'block';
                    _mapTooltip.style.left = `${mouseX}px`;
                    _mapTooltip.style.top = `${mouseY}px`;
                    const place = isNearCapyHaven ? 'Capybara Haven' : (b && !b.isOcean ? _mapName(b) : 'Open sea');
                    _mapTooltip.textContent = `${place} · ${distKm} km`;
                }
            });

            _mapCanvas.addEventListener('mouseleave', () => {
                _hoverMapPos = null;
                if (_mapTooltip) _mapTooltip.style.display = 'none';
            });

            _mapCanvas.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!_mapOpen) { _setMapOpen(true); return; }
                const rect = _mapCanvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const view = _mapView();
                const targetX = view.cx + ((mouseX / rect.width) - 0.5) * 2.0 * view.half;
                const targetZ = view.cz + ((mouseY / rect.height) - 0.5) * 2.0 * view.half;

                if ((typeof playerGrp !== 'undefined' ? playerGrp : window.playerGrp)) {
                    const targetGroundY = getWorldHeight(targetX, targetZ);
                    const targetAlt = Math.max(90, targetGroundY + 55);
                    playerGrp.position.set(targetX, targetAlt, targetZ);

                    if (typeof lastTerrainGridX !== 'undefined') lastTerrainGridX = -9999;
                    if (typeof lastTerrainGridZ !== 'undefined') lastTerrainGridZ = -9999;

                    const curB = getBiomeAt(targetX, targetZ);
                    if (typeof navParams !== 'undefined' && typeof navFolder !== 'undefined' && curB) {
                        navParams.biome = curB.name;
                        navFolder.controllersRecursive().forEach(c => c.updateDisplay());
                    }
                }
                _setMapOpen(false);
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'm' || e.key === 'M') _setMapOpen(!_mapOpen);
            else if (e.key === 'Escape' && _mapOpen) _setMapOpen(false);
        });
        document.addEventListener('click', (e) => {
            if (_mapOpen && _mapEl && !_mapEl.contains(e.target)) _setMapOpen(false);
        });
    }
    initMapUI();

    // Procedural Island Contour Generator (evaluates noise warping along polar perimeter)
    function _getIslandContourPoints(isl, toMapX, toMapY, scaleRatio = 1.0, numPoints = 48) {
        const points = [];
        const cosR = Math.cos(isl.rotation);
        const sinR = Math.sin(isl.rotation);

        for (let i = 0; i < numPoints; i++) {
            const th = (i / numPoints) * Math.PI * 2;
            const elx = Math.cos(th) * isl.radiusX * scaleRatio;
            const elz = Math.sin(th) * isl.radiusZ * scaleRatio;

            const wx = isl.centerX + (elx * cosR - elz * sinR);
            const wz = isl.centerZ + (elx * sinR + elz * cosR);

            // Sample domain warp to match 3D coastline
            const seedOff = isl.noiseSeed;
            const warp1 = snoise(wx * 0.00045 + seedOff, wz * 0.00045 + seedOff) * 0.22;
            const warp2 = snoise(wx * 0.0012 - seedOff, wz * 0.0012 + seedOff) * 0.10;
            const coastNoise = snoise(wx * 0.0035 + seedOff * 2, wz * 0.0035 - seedOff * 2) * 0.05;
            const warpFactor = Math.max(0.60, 1.0 - (warp1 + warp2 + coastNoise));

            const warpedWx = isl.centerX + (elx * warpFactor * cosR - elz * warpFactor * sinR);
            const warpedWz = isl.centerZ + (elx * warpFactor * sinR + elz * warpFactor * cosR);

            points.push({
                x: toMapX(warpedWx),
                y: toMapY(warpedWz)
            });
        }
        return points;
    }

    function _drawPolygonPath(ctx, points) {
        if (!points || points.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }

    // Square map window fitted around all islands (instead of the whole mostly-empty world)
    let _mapViewCache = null, _mapViewIslands = null;
    function _mapView() {
        if (_mapViewIslands === worldLayout.islands && _mapViewCache) return _mapViewCache;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const isl of worldLayout.islands) {
            const r = isl.maxRadius * 1.25;
            minX = Math.min(minX, isl.centerX - r); maxX = Math.max(maxX, isl.centerX + r);
            minZ = Math.min(minZ, isl.centerZ - r); maxZ = Math.max(maxZ, isl.centerZ + r);
        }
        _mapViewIslands = worldLayout.islands;
        _mapViewCache = { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, half: Math.max(maxX - minX, maxZ - minZ) / 2 * 1.05 };
        _bgMapCanvas = null; // new layout: repaint the islands
        return _mapViewCache;
    }

    
    // Soft painted palette per biome: [land, highland]
    const _MAP_PAINT = {
        ghibli_land: ['#9cc57a', '#7fae5f'],
        ghibli_isles: ['#9cc57a', '#7fae5f'],
        archipelago: ['#bcd48e', '#9dbd70'],
        misty_mountains: ['#b3ae9f', '#97917f'],
        misty_mountains_2: ['#b3ae9f', '#97917f'],
        crystal_land: ['#a9cdd6', '#88b5c2'],
        magical_sanctuary: ['#c9b1cf', '#ad91b6'],
    };

    function _renderStaticMapBackground(W, H) {
        if (!_bgMapCanvas) {
            _bgMapCanvas = document.createElement('canvas');
        }
        _bgMapCanvas.width = W;
        _bgMapCanvas.height = H;
        const bgCtx = _bgMapCanvas.getContext('2d');
        if (!bgCtx) return;
        const k = W / 150; // line/label scale relative to the small map

        // Sea
        bgCtx.fillStyle = '#a9ccd3';
        bgCtx.fillRect(0, 0, W, H);

        const view = _mapView();
        const toMapX = (wx) => ((wx - view.cx) / (view.half * 2.0) + 0.5) * W;
        const toMapY = (wz) => ((wz - view.cz) / (view.half * 2.0) + 0.5) * H;

        // Islands: small ones first so the big ones sit on top
        const sortedIslands = [...worldLayout.islands].sort((a, b) => (a.isMajor ? 1 : 0) - (b.isMajor ? 1 : 0));
        sortedIslands.forEach(isl => {
            const [land, high] = _MAP_PAINT[isl.biomeId] || ['#b8cc92', '#9ab575'];
            const shorePts = _getIslandContourPoints(isl, toMapX, toMapY, 1.0, 36);
            _drawPolygonPath(bgCtx, shorePts);
            bgCtx.fillStyle = land;
            bgCtx.fill();
            bgCtx.strokeStyle = '#e6dcb8'; // pale sandy shoreline
            bgCtx.lineWidth = Math.max(0.8, 1.1 * k);
            bgCtx.stroke();

            if (isl.isMajor) {
                const ridgePts = _getIslandContourPoints(isl, toMapX, toMapY, 0.5, 28);
                _drawPolygonPath(bgCtx, ridgePts);
                bgCtx.fillStyle = high;
                bgCtx.fill();
            }
        });

        // Names only on the big map
        if (W < 300) return;
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';
        bgCtx.font = `italic 600 ${Math.round(13 * k / 2.4)}px Georgia, 'Times New Roman', serif`;
        bgCtx.lineJoin = 'round';
        worldLayout.islands.filter(isl => isl.isMajor).forEach(isl => {
            const name = _mapName(isl.biome);
            const mx = toMapX(isl.centerX);
            const my = toMapY(isl.centerZ);
            bgCtx.strokeStyle = 'rgba(245, 238, 218, 0.85)';
            bgCtx.lineWidth = 3 * k / 2.4;
            bgCtx.strokeText(name, mx, my);
            bgCtx.fillStyle = '#4a3b24';
            bgCtx.fillText(name, mx, my);
        });
    }

    function _drawCompass() {
        if (!_mapCanvas) _mapCanvas = document.getElementById('map-canvas');
        if (_mapCanvas && !_mapCtx) _mapCtx = _mapCanvas.getContext('2d');
        if (!_mapCanvas || !_mapCtx) return;
        const rect = _mapCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const wantW = Math.max(1, Math.round(rect.width * dpr));
        const wantH = Math.max(1, Math.round(rect.height * dpr));
        if (_mapCanvas.width !== wantW || _mapCanvas.height !== wantH) { _mapCanvas.width = wantW; _mapCanvas.height = wantH; }
        const W = _mapCanvas.width, H = _mapCanvas.height;
        const cx = W / 2, cy = H / 2, r = Math.min(cx, cy) * 0.96;
        const yaw = (typeof currentYaw !== 'undefined' ? currentYaw : (window.currentYaw || 0));
        const ctx = _mapCtx;
        ctx.clearRect(0, 0, W, H);

        // Background — parchment circle matching the map panel
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        const bg = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy, r);
        bg.addColorStop(0, 'rgba(248, 240, 220, 0.98)');
        bg.addColorStop(1, 'rgba(220, 205, 175, 0.99)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // Outer ring
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(91, 74, 48, 0.35)';
        ctx.lineWidth = 1.5 * dpr; ctx.stroke();

        // Rotating rose
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-yaw);

        // Inner tick ring
        ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(91, 74, 48, 0.12)'; ctx.lineWidth = dpr; ctx.stroke();

        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const isCard = i % 8 === 0, isOrd = i % 4 === 0 && !isCard;
            const outerR = r * 0.93;
            const tickLen = isCard ? r * 0.22 : (isOrd ? r * 0.13 : r * 0.07);
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -outerR); ctx.lineTo(0, -(outerR - tickLen));
            ctx.strokeStyle = (isCard && i === 0) ? 'rgba(180, 40, 30, 0.9)' : (isCard ? 'rgba(91, 74, 48, 0.75)' : 'rgba(91, 74, 48, 0.28)');
            ctx.lineWidth = (isCard ? 2 : (isOrd ? 1.2 : 0.7)) * dpr;
            ctx.stroke();
            if (isCard) {
                const labels = ['N','E','S','W'];
                ctx.fillStyle = i === 0 ? '#b52020' : 'rgba(74, 58, 36, 0.9)';
                ctx.font = `bold ${Math.round(r * 0.2)}px -apple-system,BlinkMacSystemFont,sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(labels[i / 8], 0, -(outerR - r * 0.36));
            }
            ctx.restore();
        }
        ctx.restore();

        // Fixed heading triangle at 12-o'clock (warm gold/brown)
        const triY = -(r * 0.87);
        ctx.save(); ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.moveTo(0, triY - 5 * dpr);
        ctx.lineTo(5 * dpr, triY + 5 * dpr);
        ctx.lineTo(-5 * dpr, triY + 5 * dpr);
        ctx.closePath();
        ctx.fillStyle = 'rgba(180, 120, 20, 0.95)'; ctx.fill();
        ctx.restore();

        // Center cap
        ctx.save(); ctx.translate(cx, cy);
        ctx.beginPath(); ctx.arc(0, 0, 4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(91, 74, 48, 0.6)'; ctx.fill();
        ctx.restore();
    }

    function _drawWorldMap(force) {
        const now = performance.now();
        if (!force && now - _lastMapDrawTime < 66) return;
        _lastMapDrawTime = now;

        if (!_mapOpen) { _drawCompass(); return; }

        if (!_mapCanvas) _mapCanvas = document.getElementById('map-canvas');
        if (_mapCanvas && !_mapCtx) _mapCtx = _mapCanvas.getContext('2d');
        if (!_mapCanvas || !_mapCtx) return;

        // Match the canvas backing size to its on-screen size (sharp on HiDPI, re-renders when opened)
        const rect = _mapCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const wantW = Math.max(1, Math.round(rect.width * dpr));
        const wantH = Math.max(1, Math.round(rect.height * dpr));
        if (_mapCanvas.width !== wantW || _mapCanvas.height !== wantH) {
            _mapCanvas.width = wantW;
            _mapCanvas.height = wantH;
        }
        const W = _mapCanvas.width, H = _mapCanvas.height;
        const k = W / 150;

        _mapView(); // refreshes (and drops the painted background) if the island layout changed
        if (!_bgMapCanvas || _bgMapCanvas.width !== W || _bgMapCanvas.height !== H) {
            _renderStaticMapBackground(W, H);
        }

        _mapCtx.clearRect(0, 0, W, H);
        if (_bgMapCanvas) _mapCtx.drawImage(_bgMapCanvas, 0, 0);

        if (_hoverMapPos) {
            _mapCtx.strokeStyle = 'rgba(74, 59, 36, 0.6)';
            _mapCtx.lineWidth = 1.2 * dpr;
            _mapCtx.beginPath();
            _mapCtx.arc(_hoverMapPos.x * dpr, _hoverMapPos.y * dpr, 7 * dpr, 0, Math.PI * 2);
            _mapCtx.stroke();
        }

        if ((typeof playerGrp !== 'undefined' ? playerGrp : window.playerGrp)) {
            const view = _mapView();
            const px = ((playerGrp.position.x - view.cx) / (view.half * 2.0) + 0.5) * W;
            const pz = ((playerGrp.position.z - view.cz) / (view.half * 2.0) + 0.5) * H;
            const yaw = (typeof currentYaw !== 'undefined' ? currentYaw : (window.currentYaw || 0));
            const size = Math.max(4 * dpr, 3.2 * k);

            // Simple red arrow for Kiki
            _mapCtx.save();
            _mapCtx.translate(px, pz);
            _mapCtx.rotate(-yaw);
            _mapCtx.fillStyle = '#c0392b';
            _mapCtx.strokeStyle = '#fbf6e8';
            _mapCtx.lineWidth = 1.2 * dpr;
            _mapCtx.beginPath();
            _mapCtx.moveTo(0, -size * 1.4);
            _mapCtx.lineTo(size, size);
            _mapCtx.lineTo(0, size * 0.45);
            _mapCtx.lineTo(-size, size);
            _mapCtx.closePath();
            _mapCtx.stroke();
            _mapCtx.fill();
            _mapCtx.restore();

            const badgeEl = document.getElementById('map-biome-badge');
            if (badgeEl) {
                const curB = getBiomeAt(playerGrp.position.x, playerGrp.position.z);
                const text = curB && !curB.isOcean ? _mapName(curB) : 'Open sea';
                if (badgeEl.textContent !== text) badgeEl.textContent = text;
            }
        }
    }

export {
    _mapEl,
    _mapCanvas,
    _mapCtx,
    _mapOpen,
    _setMapOpen,
    initMapUI,
    _getIslandContourPoints,
    _drawPolygonPath,
    _mapView,
    _MAP_PAINT,
    _renderStaticMapBackground,
    _drawCompass,
    _drawWorldMap
};
