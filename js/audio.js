export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = false;
        this.noiseBuffer = null;
        this._freqsPowerup = [440, 554, 659, 880];
        this._freqsPowerupEnd = [880, 659, 554, 440];
        this._freqsZone = [523.25, 783.99];
    }
    init(enabled) {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            const bufferSize = this.ctx.sampleRate * 2.0;
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.15;
                b6 = white * 0.115926;
            }

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4;

            const compressor = this.ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
            compressor.knee.setValueAtTime(40, this.ctx.currentTime);
            compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            compressor.attack.setValueAtTime(0, this.ctx.currentTime);
            compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

            this.masterGain.connect(compressor);
            compressor.connect(this.ctx.destination);
        }

        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.enabled = enabled;
    }
    _playTone(frequency, duration, type = 'sine', targetFrequency = null, volume = 0.3, startTime = 0, useLinear = false) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime + startTime;
        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);

        if (targetFrequency) {
            if (useLinear) oscillator.frequency.linearRampToValueAtTime(targetFrequency, now + duration);
            else oscillator.frequency.exponentialRampToValueAtTime(targetFrequency, now + duration);
        }

        gain.gain.setValueAtTime(volume, now);
        if (useLinear) gain.gain.linearRampToValueAtTime(0, now + duration);
        else gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.connect(gain).connect(this.masterGain);
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
    _playNoise(duration, volume = 0.4) {
        if (!this.enabled || !this.ctx || !this.noiseBuffer) return;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const gain = this.ctx.createGain();

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(gain).connect(this.masterGain);
        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }
    playJump() { this._playTone(150, 0.2, 'sine', 400, 0.5); }
    playSpring() { this._playTone(100, 0.1, 'square', 600, 0.3); }
    playCoin() { this._playTone(880, 0.2, 'triangle', 1320, 0.2); }
    playPowerup() {
        for (let i = 0; i < this._freqsPowerup.length; i++) { this._playTone(this._freqsPowerup[i], 0.2, 'sawtooth', null, 0.1, i * 0.05); }
    }
    playPowerupEnd() {
        for (let i = 0; i < this._freqsPowerupEnd.length; i++) { this._playTone(this._freqsPowerupEnd[i], 0.15, 'sine', null, 0.1, i * 0.05); }
    }
    playHit() { this._playNoise(0.1, 0.4); this._playTone(80, 0.15, 'square', 20, 0.3, 0, true); }
    playZoneChange() {
        for (let i = 0; i < this._freqsZone.length; i++) { this._playTone(this._freqsZone[i], 0.8, 'sine', null, 0.2, i * 0.1); }
    }
}
