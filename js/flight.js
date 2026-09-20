import * as THREE from 'three';
import { getWorldHeight } from './world.js';

// ==========================================
// FLIGHT CONTROLS, CAMERA RIG & PHYSICS
// ==========================================

export function initFlight(scene, camera, renderer, playerGrp, playerVisuals, starField, params) {
    let velocity = 15.0;
    let pitch = 0, yaw = 0, roll = 0;
    const BASE_FOV = 60;

    // --- Camera Rig Hierarchy ---
    const cameraBase = new THREE.Group();
    scene.add(cameraBase);

    const cameraPivot = new THREE.Group();
    cameraPivot.rotation.order = 'YXZ';
    cameraBase.add(cameraPivot);

    camera.position.set(0, 4, 12);
    cameraPivot.add(camera);

    // --- Pan Event Listeners (Handles Mouse & Mobile Touch Screen) ---
    let isDragging = false;
    let previousPointerPos = { x: 0, y: 0 };

    const onPointerDown = (event) => {
        isDragging = true;
        previousPointerPos = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event) => {
        if (!isDragging) return;
        const deltaX = event.clientX - previousPointerPos.x;
        const deltaY = event.clientY - previousPointerPos.y;

        // Orbit the pivot
        cameraPivot.rotation.y -= deltaX * 0.004;
        cameraPivot.rotation.x -= deltaY * 0.004;

        // Clamp vertical look to prevent the camera from flipping upside down
        cameraPivot.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 6, cameraPivot.rotation.x));

        previousPointerPos = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = () => isDragging = false;

    // Target the render canvas wrapper to parse inputs properly
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // --- Movement Variables ---
    const moveSpeed = 18;
    const turnAcceleration = 0.55;
    const maxTurnSpeed = 0.45;
    const maxBankAngle = Math.PI / 7;
    const maxPitchAngle = Math.PI / 4;

    let currentYaw = 0;
    let currentPitch = 0;
    let currentRoll = 0;
    let turnVelocity = 0;
    let isFlightPaused = false;
    let cameraZoomDist = window.cameraZoomDist || 14.0;
    window.cameraZoomDist = cameraZoomDist;

    function setFlightHeading(y) {
        currentYaw = y;
        turnVelocity = 0;
        if (playerGrp) playerGrp.rotation.set(0, y, 0, 'YXZ');
        if (cameraBase) cameraBase.quaternion.setFromEuler(new THREE.Euler(0, y, 0, 'YXZ'));
        window.currentYaw = currentYaw;
    }
    window.setFlightHeading = setFlightHeading;

    // Pause toggle UI hook
    const pauseToggleBtn = document.getElementById('pause-toggle');
    if (pauseToggleBtn) {
        pauseToggleBtn.addEventListener('click', () => {
            isFlightPaused = !isFlightPaused;
            pauseToggleBtn.innerHTML = isFlightPaused
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>';
        });
    }

    // Wheel zoom
    window.addEventListener('wheel', (e) => {
        if (window.editorState && window.editorState.isEditorMode) return;
        cameraZoomDist += Math.sign(e.deltaY) * 4.0;
        cameraZoomDist = Math.max(0.5, Math.min(100.0, cameraZoomDist));
        window.cameraZoomDist = cameraZoomDist;
    }, { passive: true });

    const targetQuaternion = new THREE.Quaternion();
    const eulerRotation = new THREE.Euler(0, 0, 0, 'YXZ');
    const baseTargetQuat = new THREE.Quaternion();

    // Pre-allocated scratch variables for zero-GC render and physics loops
    const _scratchMovementDirection = new THREE.Vector3();
    const _scratchZeroQuat = new THREE.Quaternion();
    const _scratchIdealCamPos = new THREE.Vector3();
    const _scratchPlayerPos = new THREE.Vector3();
    const _scratchDirToCam = new THREE.Vector3();

    function tickMovement(delta, inputState, character, globalVelocity, isWindOn) {
        // Steering
        if (inputState.left) {
            turnVelocity += turnAcceleration * delta;
        } else if (inputState.right) {
            turnVelocity -= turnAcceleration * delta;
        } else {
            turnVelocity = THREE.MathUtils.lerp(turnVelocity, 0, 3.5 * delta);
        }

        turnVelocity = Math.max(-maxTurnSpeed, Math.min(maxTurnSpeed, turnVelocity));
        currentYaw += turnVelocity * delta;
        window.currentYaw = currentYaw;

        // Banking
        let targetRoll = (turnVelocity / maxTurnSpeed) * maxBankAngle;
        if (isWindOn) {
            const t = performance.now() * 0.001;
            targetRoll += Math.sin(t * 0.7) * 0.045 + Math.sin(t * 1.3 + 1.2) * 0.025;
        }
        currentRoll = THREE.MathUtils.lerp(currentRoll, targetRoll, 1.5 * delta);

        // Altitude Control
        let targetPitch = 0; // Default (level flight)
        if (inputState.up) {
            targetPitch = maxPitchAngle;
        } else if (inputState.down) {
            targetPitch = -maxPitchAngle;
        }
        currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 1.5 * delta);

        // Apply Rotations
        eulerRotation.set(currentPitch, currentYaw, currentRoll, 'YXZ');
        targetQuaternion.setFromEuler(eulerRotation);

        // Soft camera auto-leveling
        if (!inputState.left && !inputState.right && !inputState.up && !inputState.down) {
            character.quaternion.slerp(targetQuaternion, 1.2 * delta);
        } else {
            character.quaternion.slerp(targetQuaternion, 5.0 * delta);
        }

        // Forward Flight & Speed Boost
        _scratchMovementDirection.set(0, 0, -1);
        _scratchMovementDirection.applyQuaternion(character.quaternion);

        let activeSpeed = globalVelocity;
        character.position.addScaledVector(_scratchMovementDirection, activeSpeed * delta);

        const capyTarget = window.capyFlyTarget;
        if (capyTarget && capyTarget.placed) {
            const cp = capyTarget.mesh.position;
            const orbitRadius = 25;
            const orbitHeight = cp.y + 15;
            const dx = cp.x - character.position.x;
            const dz = cp.z - character.position.z;
            const distToCapy = Math.hypot(dx, dz);
            if (distToCapy > orbitRadius) {
                const flySpeed = Math.min(activeSpeed * 0.35, 20);
                character.position.x += (dx / distToCapy) * flySpeed * delta;
                character.position.z += (dz / distToCapy) * flySpeed * delta;
                character.position.y += (orbitHeight - character.position.y) * 2 * delta;
            } else {
                const orbitAngle = Math.atan2(character.position.z - cp.z, character.position.x - cp.x);
                const orbitSpeed = 0.3;
                const newAngle = orbitAngle + orbitSpeed * delta;
                character.position.x = cp.x + Math.cos(newAngle) * orbitRadius;
                character.position.z = cp.z + Math.sin(newAngle) * orbitRadius;
                character.position.y += (orbitHeight - character.position.y) * 2 * delta;
                character.lookAt(cp.x, cp.y + 5, cp.z);
            }
            if (inputState.up || inputState.down || inputState.left || inputState.right) {
                window.capyFlyTarget = null;
            }
        }

        // Anti-Clipping Floor Constraint (Metric calculation)
        const minimumFlightHeight = 18;
        if (character.position.y < minimumFlightHeight) {
            character.position.y = minimumFlightHeight;
        }

        // Camera Base Tracking
        cameraBase.position.copy(character.position);

        eulerRotation.set(0, currentYaw, 0, 'YXZ');
        baseTargetQuat.setFromEuler(eulerRotation);

        cameraBase.quaternion.slerp(baseTargetQuat, 2.8 * delta);

        // Auto-leveling for camera tilt
        camera.quaternion.slerp(_scratchZeroQuat, 2.0 * delta);
    }

    function updateFlight(dt, inputState, isWindOn, isBoosting, isBraking) {
        const targetSpeed = isBraking ? 0.0 : (isBoosting ? 250.0 : 18.0);
        velocity += (targetSpeed - velocity) * dt * (isBraking ? 3.0 : (isBoosting ? 1.5 : 1.0));

        if (!isFlightPaused) {
            tickMovement(dt, inputState, playerGrp, velocity, isWindOn);
        }

        const groundY = getWorldHeight(playerGrp.position.x, playerGrp.position.z);
        playerGrp.position.y = Math.min(Math.max(playerGrp.position.y, 18), 3500);
        cameraBase.position.lerp(playerGrp.position, dt * 7.0);

        // Smooth camera zoom & distance
        if (window.cameraZoomDist !== undefined) cameraZoomDist = window.cameraZoomDist;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraZoomDist, dt * 5.0);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, cameraZoomDist * 0.33, dt * 5.0);

        if (starField) starField.position.copy(playerGrp.position);

        const targetMinY = groundY + 55;
        if (playerGrp.position.y < targetMinY) {
            const depth = targetMinY - playerGrp.position.y;
            const swoopPitch = Math.min(Math.PI / 4, depth / 40.0);
            currentPitch = THREE.MathUtils.lerp(currentPitch, swoopPitch, dt * 3.0);
            playerGrp.rotation.set(currentPitch, currentYaw, 0, 'YXZ');

            if (playerGrp.position.y < groundY + 15) {
                playerGrp.position.y += (groundY + 15 - playerGrp.position.y) * dt * 5.0;
            }
        }

        playerGrp.position.y = Math.min(Math.max(playerGrp.position.y, 18), 3500);
        cameraBase.position.lerp(playerGrp.position, dt * 7.0);
        if (starField) starField.position.copy(playerGrp.position);

        if (playerVisuals) {
            playerVisuals.rotation.x = THREE.MathUtils.lerp(playerVisuals.rotation.x, 0, dt * 5.0);
        }

        camera.fov = THREE.MathUtils.lerp(camera.fov, isBoosting ? BASE_FOV + 12 : BASE_FOV, dt * 5.0);
        if (!window.isPhotoMode) {
            camera.up.set(0, 1, 0);
            camera.rotation.z = 0;
        }
        camera.updateProjectionMatrix();

        return {
            velocity,
            currentYaw,
            currentPitch,
            currentRoll,
            isFlightPaused
        };
    }

    return {
        cameraBase,
        cameraPivot,
        tickMovement,
        updateFlight,
        setFlightHeading,
        getVelocity: () => velocity,
        getCurrentYaw: () => currentYaw,
        isPaused: () => isFlightPaused
    };
}
