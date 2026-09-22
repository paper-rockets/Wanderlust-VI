// ==========================================
// 8. INPUTS (Keyboard, Touch & Joystick)
// ==========================================
export const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
export const touchState = { x: 0, y: 0, boost: false, brake: false };
export let uiVisible = true;

    // ==========================================
    // 8. INPUTS (Keyboard & Touch)
    // ==========================================

    let pcControlsShown = false;

    window.addEventListener('keydown', e => {
        if (!pcControlsShown && e.key !== 'F12' && e.key !== 'F5') {
            const touchEl = document.getElementById('touch-controls');
            if (touchEl) touchEl.style.display = 'none';
            const hintEl = document.getElementById('pc-controls-hint');
            if (hintEl) {
                hintEl.style.display = 'block';
                setTimeout(() => { hintEl.style.opacity = '0'; }, 10000);
            }
            pcControlsShown = true;
        }

        if(e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys.w = true;
        if(e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys.s = true;
        if(e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys.a = true;
        if(e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys.d = true;
        if(e.key === 'Shift') keys.shift = true;
        if(e.key === ' ') keys.space = true;
        if(e.key.toLowerCase() === 'h') {
            uiVisible = !uiVisible;
            if (typeof gui !== 'undefined') gui.domElement.style.display = uiVisible ? 'block' : 'none';


        }
        if(e.key.toLowerCase() === 'v') {
            isModelVisible = !isModelVisible;
            updateModelVisibility();
        }
    });
    window.addEventListener('keyup', e => {
        if(e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys.w = false;
        if(e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys.s = false;
        if(e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys.a = false;
        if(e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys.d = false;
        if(e.key === 'Shift') keys.shift = false;
        if(e.key === ' ') keys.space = false;
    });



    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');
    let activeTouchId = null;
    const maxRadius = 40;

    joyBase.style.opacity = '0'; // Hide by default
    joyBase.style.pointerEvents = 'none';

    let initialPinchDist = null;
    let initialZoomDist = null;

    window.addEventListener('touchstart', e => {
        if (e.target.tagName !== 'CANVAS') return; // Ignore touches on UI buttons
        e.preventDefault();

        if (e.touches.length === 1) {
            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier;

            // Move joyBase to touch point
            joyBase.style.left = (touch.clientX - 50) + 'px';
            joyBase.style.top = (touch.clientY - 50) + 'px';
            joyBase.style.bottom = 'auto';
            joyBase.style.opacity = '1';

            updateJoystick(touch);
        } else if (e.touches.length === 2) {
            resetJoystick();

            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist = Math.sqrt(dx*dx + dy*dy);
            initialZoomDist = window.cameraZoomDist || 14.0;
        }
    }, {passive: false});

    window.addEventListener('touchmove', e => {
        if (e.target.tagName !== 'CANVAS') return;
        e.preventDefault();

        if (e.touches.length === 2 && initialPinchDist !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.sqrt(dx*dx + dy*dy);

            const z = initialZoomDist * (initialPinchDist / Math.max(1, newDist));
            window.cameraZoomDist = Math.max(2.0, Math.min(100.0, z));

            const zoomToggle = document.getElementById('zoom-toggle');
            if (zoomToggle) {
                zoomToggle.innerText = window.cameraZoomDist > 25.0 ? 'Zoom In' : 'Zoom Out';
            }
        } else {
            for(let touch of e.changedTouches) {
                if(touch.identifier === activeTouchId) updateJoystick(touch);
            }
        }
    }, {passive: false});

    const resetJoystick = () => {
        activeTouchId = null;
        touchState.x = 0; touchState.y = 0;
        joyKnob.style.transform = `translate(-50%, -50%)`;
        joyBase.style.opacity = '0';
    };

    window.addEventListener('touchend', e => {
        for(let touch of e.changedTouches) {
            if(touch.identifier === activeTouchId) resetJoystick();
        }
        if (e.touches.length < 2) {
            initialPinchDist = null;
        }
    });
    window.addEventListener('touchcancel', e => {
        resetJoystick();
        initialPinchDist = null;
    });

    function updateJoystick(touch) {
        const rect = joyBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        touchState.x = dx / maxRadius;
        touchState.y = dy / maxRadius;
    }

    const boostBtn = document.getElementById('boost-btn');
    const startBoost = (e) => { e.preventDefault(); touchState.boost = true; boostBtn.style.transform = 'scale(0.9)'; };
    const resetBoost = (e) => { e.preventDefault(); touchState.boost = false; boostBtn.style.transform = 'scale(1)'; };
    boostBtn.addEventListener('touchstart', startBoost);
    boostBtn.addEventListener('mousedown', startBoost);
    boostBtn.addEventListener('touchend', resetBoost);
    boostBtn.addEventListener('touchcancel', resetBoost);
    boostBtn.addEventListener('mouseup', resetBoost);
    boostBtn.addEventListener('mouseleave', resetBoost);

export function getInputState() {
    return {
        forward: true,
        up: keys.w || touchState.y < -0.1,
        down: keys.s || touchState.y > 0.1,
        left: keys.a || touchState.x < -0.1,
        right: keys.d || touchState.x > 0.1,
        isBoosting: keys.shift || touchState.boost,
        isBraking: keys.space || touchState.brake
    };
}
