import { LOW_GFX } from './config.js';

// ==========================================
// AUDIO ENGINE & PROCEDURAL AMBIENT MUSIC
// ==========================================
    // ==========================================
    // 9. AUDIO
    // ==========================================

    class BiplaneEngineAudio {
        constructor(audioCtx = null, outputNode = null) {
            this.audioCtx = audioCtx;
            this.outputNode = outputNode || (audioCtx ? audioCtx.destination : null);
            this.noiseBuffer = null;
            this.masterGain = null; this.cylinderGain = null; this.noiseGain = null; this.subGain = null;
            this.cylinderFilter = null; this.noiseFilter = null;
            this.osc1 = null; this.osc2 = null; this.subOsc = null;
            this.lfoOsc = null; this.lfoGain = null; this.noiseSource = null;
            this.isRunning = false; this.isActive = false; this.isEnabled = true; this.isMuted = false;
            this.targetFade = 0.0; this.currentFade = 0.0; this.currentRpm = 0.35;
            this.volume = 0.038; this.clock = 0;
            if (this.audioCtx) this._setupNodes();
        }
        setAudioContext(audioCtx, outputNode = null) {
            if (this.audioCtx === audioCtx && this.masterGain) return;
            this.destroy(); this.audioCtx = audioCtx;
            this.outputNode = outputNode || (audioCtx ? audioCtx.destination : null);
            this.noiseBuffer = null;
            if (this.audioCtx) { this._setupNodes(); if (this.isActive && this.isEnabled && !this.isMuted) { this.targetFade = 1.0; this._startNodes(); } }
        }
        _createNoiseBuffer() {
            if (!this.audioCtx || this.noiseBuffer) return;
            const sr = this.audioCtx.sampleRate, sz = sr * 1.5;
            this.noiseBuffer = this.audioCtx.createBuffer(1, sz, sr);
            const d = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        }
        _setupNodes() {
            if (!this.audioCtx) return;
            if (!this.outputNode) this.outputNode = this.audioCtx.destination;
            this._createNoiseBuffer();
            this.masterGain = this.audioCtx.createGain(); this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime); this.masterGain.connect(this.outputNode);
            this.cylinderFilter = this.audioCtx.createBiquadFilter(); this.cylinderFilter.type = 'lowpass'; this.cylinderFilter.frequency.setValueAtTime(200, this.audioCtx.currentTime); this.cylinderFilter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);
            this.cylinderGain = this.audioCtx.createGain(); this.cylinderGain.gain.setValueAtTime(0.65, this.audioCtx.currentTime);
            this.noiseFilter = this.audioCtx.createBiquadFilter(); this.noiseFilter.type = 'bandpass'; this.noiseFilter.frequency.setValueAtTime(240, this.audioCtx.currentTime); this.noiseFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
            this.noiseGain = this.audioCtx.createGain(); this.noiseGain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
            this.subGain = this.audioCtx.createGain(); this.subGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
            this.cylinderFilter.connect(this.cylinderGain); this.cylinderGain.connect(this.masterGain);
            this.noiseFilter.connect(this.noiseGain); this.noiseGain.connect(this.masterGain);
            this.subGain.connect(this.masterGain);
        }
        setEnabled(v) { this.isEnabled = !!v; this._updateTargetFade(); }
        setMuted(v)   { this.isMuted   = !!v; this._updateTargetFade(); }
        setActive(v)  { this.isActive  = !!v; this._updateTargetFade(); }
        _updateTargetFade() {
            const s = this.isActive && this.isEnabled && !this.isMuted;
            this.targetFade = s ? 1.0 : 0.0;
            if (s && !this.isRunning && this.audioCtx) this._startNodes();
        }
        _startNodes() {
            if (this.isRunning || !this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
            if (!this.masterGain) this._setupNodes();
            const t = this.audioCtx.currentTime;
            this.osc1 = this.audioCtx.createOscillator(); this.osc1.type = 'sawtooth'; this.osc1.frequency.setValueAtTime(62, t);
            this.osc2 = this.audioCtx.createOscillator(); this.osc2.type = 'triangle'; this.osc2.frequency.setValueAtTime(63.2, t);
            this.subOsc = this.audioCtx.createOscillator(); this.subOsc.type = 'sine'; this.subOsc.frequency.setValueAtTime(31, t);
            this.osc1.connect(this.cylinderFilter); this.osc2.connect(this.cylinderFilter); this.subOsc.connect(this.subGain);
            this.lfoOsc = this.audioCtx.createOscillator(); this.lfoOsc.type = 'sine'; this.lfoOsc.frequency.setValueAtTime(28, t);
            this.lfoGain = this.audioCtx.createGain(); this.lfoGain.gain.setValueAtTime(0.35, t);
            this.cylinderGain.gain.setValueAtTime(0.65, t);
            this.lfoOsc.connect(this.lfoGain); this.lfoGain.connect(this.cylinderGain.gain);
            if (this.noiseBuffer) { this.noiseSource = this.audioCtx.createBufferSource(); this.noiseSource.buffer = this.noiseBuffer; this.noiseSource.loop = true; this.noiseSource.connect(this.noiseFilter); this.noiseSource.start(t); }
            this.osc1.start(t); this.osc2.start(t); this.subOsc.start(t); this.lfoOsc.start(t);
            this.isRunning = true;
        }
        _stopNodes() {
            if (!this.isRunning || !this.audioCtx) return;
            const t = this.audioCtx.currentTime;
            try { this.osc1?.stop(t); this.osc2?.stop(t); this.subOsc?.stop(t); this.lfoOsc?.stop(t); this.noiseSource?.stop(t); } catch(e) {}
            try { this.osc1?.disconnect(); this.osc2?.disconnect(); this.subOsc?.disconnect(); this.lfoOsc?.disconnect(); this.lfoGain?.disconnect(); this.noiseSource?.disconnect(); } catch(e) {}
            this.osc1 = this.osc2 = this.subOsc = this.lfoOsc = this.lfoGain = this.noiseSource = null;
            this.isRunning = false;
        }
        update(dt = 0.016, isBoosting = false, isBraking = false, isPaused = false, speed = 18.0, camDist = 12.0, turnRate = 0.0, pitchRate = 0.0) {
            const shouldPlay = this.isActive && this.isEnabled && !this.isMuted;
            this.targetFade = shouldPlay ? 1.0 : 0.0;
            if (this.targetFade <= 0.001 && this.currentFade <= 0.001) { if (this.isRunning) this._stopNodes(); return; }
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended' && shouldPlay) this.audioCtx.resume().catch(() => {});
            this.clock += dt;
            const fadeRate = shouldPlay ? 1.5 : 2.5;
            this.currentFade += (this.targetFade - this.currentFade) * Math.min(dt * fadeRate, 1.0);
            if (!this.isRunning && this.currentFade > 0.01) this._startNodes();
            let targetRpm = 0.35;
            if (isPaused || isBraking) { targetRpm = 0.05; }
            else if (isBoosting) { targetRpm = 1.0; }
            else if (speed !== undefined) { targetRpm = 0.15 + Math.max(0, Math.min(1, (speed - 5) / 25)) * 0.4; }
            const rpmLerp = isBoosting ? 4.5 : 2.5;
            this.currentRpm += (targetRpm - this.currentRpm) * Math.min(dt * rpmLerp, 1.0);
            if (!this.isRunning) return;
            const t = this.audioCtx.currentTime, sm = 0.06;
            const distRatio = Math.max(4.0, camDist) / 12.0;
            const distGain = Math.min(1.85, Math.max(0.12, 1.0 / Math.pow(distRatio, 0.65)));
            const distFS   = Math.min(1.4,  Math.max(0.38, 1.0 / Math.pow(distRatio, 0.38)));
            const rpmJitter = Math.sin(this.clock * 0.9) * 0.022 + Math.sin(this.clock * 2.8) * 0.014 + Math.sin(this.clock * 6.3) * 0.007;
            const maneuverLoad = Math.min(0.18, (Math.abs(turnRate) + Math.abs(pitchRate)) * 0.12);
            const rpm = Math.max(0.02, Math.min(1.0, this.currentRpm + rpmJitter + maneuverLoad));
            const engineFreq = 45 + rpm * 54;
            const pulseFreq  = 19 + rpm * 25 + Math.sin(this.clock * 1.7) * 1.5;
            const detune = 0.4 + Math.sin(this.clock * 0.5) * 0.6;
            const airTurb = Math.sin(this.clock * 2.1) * 22 + Math.sin(this.clock * 5.4) * 14;
            const cutoff  = Math.max(80,  (175 + rpm * 125) * distFS);
            const nCutoff = Math.max(100, (215 + rpm * 120 + airTurb) * distFS);
            if (this.osc1) this.osc1.frequency.setTargetAtTime(engineFreq, t, sm);
            if (this.osc2) this.osc2.frequency.setTargetAtTime(engineFreq * 1.018 + detune, t, sm);
            if (this.subOsc) this.subOsc.frequency.setTargetAtTime(engineFreq * 0.5, t, sm);
            if (this.lfoOsc) this.lfoOsc.frequency.setTargetAtTime(pulseFreq, t, sm);
            if (this.cylinderFilter) this.cylinderFilter.frequency.setTargetAtTime(cutoff, t, sm);
            if (this.noiseFilter) this.noiseFilter.frequency.setTargetAtTime(nCutoff, t, sm);
            const pauseMul = isPaused ? 0.15 : 1.0;
            const dynGain  = (0.026 + rpm * 0.022) * (this.volume / 0.038) * distGain;
            if (this.masterGain) this.masterGain.gain.setTargetAtTime(dynGain * this.currentFade * pauseMul, t, sm);
        }
        destroy() {
            this.setActive(false); this._stopNodes();
            if (this.masterGain) { try { this.masterGain.disconnect(); } catch(e) {} }
        }
    }

    let audioCtx;
    let windGain, windFilter;
    let biplaneEngine = null;

    function initAudio() {
        if (audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        audioCtx = new AudioContext();

        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        windFilter = audioCtx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 400;

        windGain = audioCtx.createGain();
        windGain.gain.value = 0;

        noiseSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(audioCtx.destination);

        noiseSource.start();

        if (!biplaneEngine) {
            biplaneEngine = new BiplaneEngineAudio(audioCtx, audioCtx.destination);
        } else {
            biplaneEngine.setAudioContext(audioCtx, audioCtx.destination);
        }
    }



    // ==========================================
    // 10. PROCEDURAL AMBIENT MUSIC
    // ==========================================
    let musicGain, reverbNode;
    let isMusicPlaying = false;
    let currentTrack = 0;
    let nextNoteTime = 0;
    let musicTimerID;

    let chordIndex = 0;
    let sequenceTime = 0;
    let arpIndex = 0;

    const tracks = [
        {
            name: "Spirited Winds",
            chords: [
                [174.61, 220.00, 261.63, 329.63], // Fmaj7
                [196.00, 246.94, 293.66, 349.23], // G7
                [164.81, 196.00, 246.94, 293.66], // Em7
                [220.00, 261.63, 329.63, 392.00]  // Am7
            ],
            speed: 2400,
            stepSpeed: 300,
            padOsc: 'triangle',
            leadOsc: 'sine'
        },
        {
            name: "Summer Clouds",
            chords: [
                [261.63, 329.63, 392.00, 493.88], // Cmaj7
                [196.00, 246.94, 293.66, 392.00], // G
                [220.00, 261.63, 329.63, 392.00], // Am7
                [174.61, 220.00, 261.63, 329.63]  // Fmaj7
            ],
            speed: 3200,
            stepSpeed: 400,
            padOsc: 'sawtooth',
            leadOsc: 'triangle'
        },
        {
            name: "Evening Whispers",
            chords: [
                [220.00, 261.63, 329.63, 493.88], // Am9
                [174.61, 220.00, 261.63, 392.00], // Fmaj9
                [261.63, 329.63, 392.00, 493.88], // Cmaj7
                [164.81, 207.65, 246.94, 293.66]  // E7
            ],
            speed: 2800,
            stepSpeed: 350,
            padOsc: 'sine',
            leadOsc: 'sine'
        },
        {
            name: "Wandering Spirits",
            chords: [
                [261.63, 329.63, 392.00, 523.25], // C
                [174.61, 220.00, 261.63, 349.23], // F
                [196.00, 246.94, 293.66, 392.00], // G
                [220.00, 261.63, 329.63, 440.00]  // Am
            ],
            speed: 2000,
            stepSpeed: 250,
            padOsc: 'triangle',
            leadOsc: 'triangle'
        },
        {
            name: "Star Ocean",
            chords: [
                [293.66, 369.99, 440.00, 554.37], // Dmaj7
                [220.00, 277.18, 329.63, 415.30], // Amaj7
                [246.94, 293.66, 369.99, 440.00], // Bm7
                [196.00, 246.94, 293.66, 369.99]  // Gmaj7
            ],
            speed: 4000,
            stepSpeed: 500,
            padOsc: 'sine',
            leadOsc: 'triangle'
        },
        {
            name: "Floating Islands",
            chords: [
                [207.65, 261.63, 311.13, 392.00], // Abmaj7
                [233.08, 293.66, 349.23, 440.00], // Bbmaj7
                [261.63, 329.63, 392.00, 493.88], // Cmaj7
                [261.63, 329.63, 392.00, 493.88]  // Cmaj7 (held)
            ],
            speed: 4500,
            stepSpeed: 500,
            padOsc: 'triangle',
            leadOsc: 'sine'
        },
        {
            name: "Mystic Journey",
            chords: [
                [196.00, 233.08, 293.66, 349.23], // Gm7
                [174.61, 220.00, 261.63, 329.63], // Fmaj7
                [155.56, 196.00, 233.08, 293.66], // Ebmaj7
                [146.83, 185.00, 220.00, 293.66]  // D7
            ],
            speed: 3600,
            stepSpeed: 450,
            padOsc: 'sine',
            leadOsc: 'triangle'
        },
        {
            name: "Gentle Breeze",
            chords: [
                [329.63, 415.30, 493.88, 622.25], // Emaj7
                [277.18, 349.23, 415.30, 554.37], // Dbmaj7
                [246.94, 311.13, 369.99, 493.88], // Bmaj7
                [220.00, 277.18, 329.63, 440.00]  // Amaj7
            ],
            speed: 3000,
            stepSpeed: 300,
            padOsc: 'sine',
            leadOsc: 'sine'
        }
    ];

    const arpPatterns = [
        [0, 1, 2, 3, 2, 1],
        [0, 2, 1, 3, 2, 3],
        [0, 1, 2, 1],
        [1, 2, 3, 2]
    ];

    function createReverb() {
        const length = audioCtx.sampleRate * (LOW_GFX ? 0.5 : 4);
        const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
        for (let i = 0; i < 2; i++) {
            const channel = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 3);
            }
        }
        const convolver = audioCtx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    function playNote(freq, time, duration, oscType, isPad = false) {
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = oscType;
        osc.frequency.value = freq;

        filter.type = 'lowpass';

        if (isPad) {
            filter.frequency.value = 600;
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.04, time + duration * 0.4);
            env.gain.linearRampToValueAtTime(0.001, time + duration);
        } else {
            filter.frequency.setValueAtTime(1200, time);
            filter.frequency.exponentialRampToValueAtTime(400, time + duration);
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.1, time + 0.05); // Quick attack
            env.gain.exponentialRampToValueAtTime(0.001, time + duration);
        }

        osc.connect(filter);
        filter.connect(env);
        env.connect(musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    function scheduleNotes() {
        if (!isMusicPlaying || !audioCtx) return;
        const track = tracks[currentTrack];

        // Prevent massive scheduling clump if tab was inactive
        if (nextNoteTime < audioCtx.currentTime - 0.5) {
            nextNoteTime = audioCtx.currentTime + 0.1;
        }

        while (nextNoteTime < audioCtx.currentTime + 0.2) {

            // On chord change
            if (sequenceTime % track.speed === 0) {
                const chord = track.chords[chordIndex % track.chords.length];

                // Play pad for the chord
                chord.forEach(freq => {
                    playNote(freq / 2, nextNoteTime, track.speed / 1000 * 1.5, track.padOsc, true);
                });
            }

            const chord = track.chords[chordIndex % track.chords.length];
            const pattern = arpPatterns[chordIndex % arpPatterns.length];

            // Music box arpeggio step
            if (sequenceTime % track.stepSpeed === 0) {
                const arpFreq = chord[pattern[arpIndex % pattern.length]] * 2; // Up one octave
                playNote(arpFreq, nextNoteTime, track.stepSpeed / 1000 * 2.0, track.leadOsc, false);
                arpIndex++;

                // Occasional slow melody note
                if (Math.random() > 0.7) {
                    const melFreq = chord[Math.floor(Math.random() * chord.length)] * 4; // Up two octaves
                    playNote(melFreq, nextNoteTime, track.speed / 1000 * 0.8, track.leadOsc, false);
                }
            }

            // Timing
            nextNoteTime += track.stepSpeed / 1000;
            sequenceTime += track.stepSpeed;

            if (sequenceTime >= track.speed) {
                sequenceTime = 0;
                chordIndex++;
                arpIndex = 0;
            }
        }
        musicTimerID = setTimeout(scheduleNotes, 50);
    }

    document.getElementById('top-music-btn').addEventListener('click', () => {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        if (!musicGain) {
            musicGain = audioCtx.createGain();
            musicGain.gain.value = 0.5;
            reverbNode = createReverb();
            musicGain.connect(reverbNode);
            reverbNode.connect(audioCtx.destination);
            musicGain.connect(audioCtx.destination);
        }

        isMusicPlaying = !isMusicPlaying;
        document.getElementById('top-music-btn').style.opacity = isMusicPlaying ? '1' : '0.65';
        if (isMusicPlaying) {
            sequenceTime = 0;
            chordIndex = 0;
            arpIndex = 0;
            nextNoteTime = audioCtx.currentTime + 0.1;
            scheduleNotes();
        } else {
            clearTimeout(musicTimerID);
        }
    });

    document.getElementById('track-toggle').addEventListener('click', () => {
        currentTrack = (currentTrack + 1) % tracks.length;
        document.getElementById('track-toggle').innerText = "Track: " + tracks[currentTrack].name;

        sequenceTime = 0;
        chordIndex = 0;
        arpIndex = 0;
        nextNoteTime = audioCtx.currentTime + 0.1;
    });

    const _engineBtnEl = document.getElementById('top-engine-btn');
    if (_engineBtnEl) {
        _engineBtnEl.addEventListener('click', () => {
            if (!biplaneEngine) return;
            biplaneEngine.setEnabled(!biplaneEngine.isEnabled);
            _engineBtnEl.style.opacity = biplaneEngine.isEnabled ? '1' : '0.65';
        });
    }

    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });

export {
    BiplaneEngineAudio,
    audioCtx,
    biplaneEngine,
    windGain,
    windFilter,
    initAudio,
    scheduleNotes
};
