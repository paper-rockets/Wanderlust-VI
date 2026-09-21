import * as THREE from 'three';

// ============================================================================
// FLIGHT VISUAL JUICE: WINGTIP VAPOR TRAILS & HIGH-SPEED WIND STREAKS
// Built with pre-allocated Float32 buffers for zero garbage collection
// ============================================================================

export function initFlightEffects(scene, camera, playerGrp, params) {
    // ------------------------------------------------------------------------
    // 1. SOFT VAPOR TRAIL TEXTURE (Procedural 64x16 soft gradient)
    // ------------------------------------------------------------------------
    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = 64;
    trailCanvas.height = 16;
    const tCtx = trailCanvas.getContext('2d');
    const grad = tCtx.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(235, 245, 255, 0.70)');
    grad.addColorStop(0.8, 'rgba(210, 235, 255, 0.25)');
    grad.addColorStop(1, 'rgba(200, 225, 255, 0.0)');
    tCtx.fillStyle = grad;
    tCtx.fillRect(0, 0, 64, 16);

    // Soft vertical feather
    const vGrad = tCtx.createLinearGradient(0, 0, 0, 16);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0)');
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.fillStyle = vGrad;
    tCtx.fillRect(0, 0, 64, 16);

    const trailTex = new THREE.CanvasTexture(trailCanvas);
    trailTex.wrapS = THREE.ClampToEdgeWrapping;
    trailTex.wrapT = THREE.ClampToEdgeWrapping;

    const trailMat = new THREE.MeshBasicMaterial({
        map: trailTex,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide
    });

    // ------------------------------------------------------------------------
    // 2. DUAL RIBBON TRAIL MESH (Left & Right Wingtips / Broom)
    // ------------------------------------------------------------------------
    const TRAIL_SEGMENTS = 28; // Number of history nodes
    const VERTS_PER_TRAIL = (TRAIL_SEGMENTS + 1) * 2;
    const TOTAL_VERTS = VERTS_PER_TRAIL * 2; // Left + Right trails

    const trailPositions = new Float32Array(TOTAL_VERTS * 3);
    const trailUVs = new Float32Array(TOTAL_VERTS * 2);
    const trailIndices = [];

    // Pre-build index buffer
    function buildIndices(startVertOffset) {
        for (let i = 0; i < TRAIL_SEGMENTS; i++) {
            const v0 = startVertOffset + i * 2;
            const v1 = v0 + 1;
            const v2 = v0 + 2;
            const v3 = v0 + 3;
            trailIndices.push(v0, v1, v2);
            trailIndices.push(v1, v3, v2);
        }
    }
    buildIndices(0);
    buildIndices(VERTS_PER_TRAIL);

    // Pre-calculate UVs (u: 0 at head to 1 at tail, v: 0 on top, 1 on bottom)
    function buildUVs(offset) {
        for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
            const u = i / TRAIL_SEGMENTS;
            trailUVs[(offset + i * 2) * 2 + 0] = u;
            trailUVs[(offset + i * 2) * 2 + 1] = 0.0;
            trailUVs[(offset + i * 2 + 1) * 2 + 0] = u;
            trailUVs[(offset + i * 2 + 1) * 2 + 1] = 1.0;
        }
    }
    buildUVs(0);
    buildUVs(VERTS_PER_TRAIL);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('uv', new THREE.BufferAttribute(trailUVs, 2));
    trailGeo.setIndex(trailIndices);

    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.frustumCulled = false;
    trailMesh.renderOrder = 200;
    scene.add(trailMesh);

    // Ring buffer history for left and right emitters
    const leftHistory = [];
    const rightHistory = [];
    for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
        leftHistory.push(new THREE.Vector3(0, -9999, 0));
        rightHistory.push(new THREE.Vector3(0, -9999, 0));
    }

    const _scratchLeftEmitter = new THREE.Vector3();
    const _scratchRightEmitter = new THREE.Vector3();
    const _scratchUp = new THREE.Vector3();
    const _scratchFwd = new THREE.Vector3();
    const _scratchStreakPos = new THREE.Vector3();
    const _scratchStreakTail = new THREE.Vector3();

    let currentTrailOpacity = 0.0;

    // ------------------------------------------------------------------------
    // 3. SPEED WIND STREAKS (Subtle breeze streaks streaming past camera)
    // ------------------------------------------------------------------------
    const STREAK_COUNT = 32;
    const streakPositions = new Float32Array(STREAK_COUNT * 2 * 3);
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));

    const streakMat = new THREE.LineBasicMaterial({
        color: 0xeef6ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const streakLines = new THREE.LineSegments(streakGeo, streakMat);
    streakLines.frustumCulled = false;
    streakLines.renderOrder = 205;
    scene.add(streakLines);

    // Per-streak local relative offset and length
    const streakData = [];
    for (let i = 0; i < STREAK_COUNT; i++) {
        streakData.push({
            x: (Math.random() - 0.5) * 16,
            y: (Math.random() - 0.5) * 10 - 0.5,
            z: Math.random() * 25 - 12,
            length: 1.8 + Math.random() * 3.2,
            speedMult: 0.85 + Math.random() * 0.45
        });
    }

    let currentStreakOpacity = 0.0;

    // ------------------------------------------------------------------------
    // UPDATE LOOP
    // ------------------------------------------------------------------------
    function update(dt, velocity, turnVelocity, isBoosting, currentPitch) {
        if (!playerGrp) return;

        const trailsEnabled = params.enableVaporTrails !== false;
        const streaksEnabled = params.enableSpeedStreaks !== false;

        // Determine active intensity from flight dynamics
        // Trails trigger on steep dives, sharp banking, or boosting
        const diveFactor = Math.max(0, -currentPitch * 1.5);
        const bankFactor = Math.min(1.0, Math.abs(turnVelocity) * 2.2);
        const speedFactor = Math.max(0, (velocity - 21.0) / 18.0);
        const boostFactor = isBoosting ? 1.0 : 0.0;

        const targetTrailAlpha = trailsEnabled
            ? Math.min(0.85, Math.max(diveFactor * 0.6, bankFactor * 0.5, speedFactor * 0.75, boostFactor * 0.9))
            : 0.0;

        currentTrailOpacity = THREE.MathUtils.lerp(currentTrailOpacity, targetTrailAlpha, dt * 6.0);
        trailMat.opacity = currentTrailOpacity;
        trailMesh.visible = currentTrailOpacity > 0.01;

        if (trailMesh.visible) {
            // Compute emitter offsets based on whether model has wide wings or broom
            const activeId = window.activeFlightModelId || 'kiki';
            const isPlane = ['savoia', 'mitsubishi', 'sopwith', 'sikorsky'].includes(activeId);
            const wingSpread = isPlane ? 2.3 : (activeId === 'whale' ? 2.8 : 0.65);
            const wingY = isPlane ? 0.2 : -0.2;
            const wingZ = isPlane ? -0.2 : 0.9;
            const ribbonWidth = isPlane ? 0.38 : 0.26;

            _scratchLeftEmitter.set(-wingSpread, wingY, wingZ).applyQuaternion(playerGrp.quaternion).add(playerGrp.position);
            _scratchRightEmitter.set(wingSpread, wingY, wingZ).applyQuaternion(playerGrp.quaternion).add(playerGrp.position);
            _scratchUp.set(0, ribbonWidth * 0.5, 0).applyQuaternion(playerGrp.quaternion);

            // Shift history down
            for (let i = TRAIL_SEGMENTS; i > 0; i--) {
                leftHistory[i].copy(leftHistory[i - 1]);
                rightHistory[i].copy(rightHistory[i - 1]);
            }
            leftHistory[0].copy(_scratchLeftEmitter);
            rightHistory[0].copy(_scratchRightEmitter);

            // Populate left trail positions
            for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
                const lp = leftHistory[i];
                const taper = (1.0 - (i / TRAIL_SEGMENTS) * 0.7);
                const wx = _scratchUp.x * taper;
                const wy = _scratchUp.y * taper;
                const wz = _scratchUp.z * taper;

                const v0 = i * 2;
                const v1 = i * 2 + 1;

                trailPositions[v0 * 3 + 0] = lp.x + wx;
                trailPositions[v0 * 3 + 1] = lp.y + wy;
                trailPositions[v0 * 3 + 2] = lp.z + wz;

                trailPositions[v1 * 3 + 0] = lp.x - wx;
                trailPositions[v1 * 3 + 1] = lp.y - wy;
                trailPositions[v1 * 3 + 2] = lp.z - wz;
            }

            // Populate right trail positions
            const rOffset = VERTS_PER_TRAIL;
            for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
                const rp = rightHistory[i];
                const taper = (1.0 - (i / TRAIL_SEGMENTS) * 0.7);
                const wx = _scratchUp.x * taper;
                const wy = _scratchUp.y * taper;
                const wz = _scratchUp.z * taper;

                const v0 = rOffset + i * 2;
                const v1 = rOffset + i * 2 + 1;

                trailPositions[v0 * 3 + 0] = rp.x + wx;
                trailPositions[v0 * 3 + 1] = rp.y + wy;
                trailPositions[v0 * 3 + 2] = rp.z + wz;

                trailPositions[v1 * 3 + 0] = rp.x - wx;
                trailPositions[v1 * 3 + 1] = rp.y - wy;
                trailPositions[v1 * 3 + 2] = rp.z - wz;
            }

            trailGeo.attributes.position.needsUpdate = true;
        }

        // --------------------------------------------------------------------
        // Speed Wind Streaks Update
        // --------------------------------------------------------------------
        const targetStreakAlpha = streaksEnabled && (velocity > 21.0 || isBoosting)
            ? Math.min(0.65, Math.max((velocity - 21.0) / 22.0, boostFactor * 0.7))
            : 0.0;

        currentStreakOpacity = THREE.MathUtils.lerp(currentStreakOpacity, targetStreakAlpha, dt * 5.0);
        streakMat.opacity = currentStreakOpacity;
        streakLines.visible = currentStreakOpacity > 0.01;

        if (streakLines.visible) {
            _scratchFwd.set(0, 0, -1).applyQuaternion(playerGrp.quaternion);
            const streamSpeed = velocity * dt * 1.5;

            for (let i = 0; i < STREAK_COUNT; i++) {
                const sd = streakData[i];
                // Move streak backwards along flight path
                sd.z += streamSpeed * sd.speedMult;
                if (sd.z > 14) {
                    sd.z = -16 - Math.random() * 8;
                    sd.x = (Math.random() - 0.5) * 16;
                    sd.y = (Math.random() - 0.5) * 10 - 0.5;
                }

                _scratchStreakPos.set(sd.x, sd.y, sd.z).applyQuaternion(playerGrp.quaternion).add(playerGrp.position);
                _scratchStreakTail.copy(_scratchStreakPos).addScaledVector(_scratchFwd, -sd.length);

                const v0 = i * 2;
                const v1 = i * 2 + 1;

                streakPositions[v0 * 3 + 0] = _scratchStreakPos.x;
                streakPositions[v0 * 3 + 1] = _scratchStreakPos.y;
                streakPositions[v0 * 3 + 2] = _scratchStreakPos.z;

                streakPositions[v1 * 3 + 0] = _scratchStreakTail.x;
                streakPositions[v1 * 3 + 1] = _scratchStreakTail.y;
                streakPositions[v1 * 3 + 2] = _scratchStreakTail.z;
            }

            streakGeo.attributes.position.needsUpdate = true;
        }
    }

    return {
        update,
        trailMesh,
        streakLines,
        setTrailsVisible: (v) => { trailMesh.visible = v; },
        setStreaksVisible: (v) => { streakLines.visible = v; }
    };
}
