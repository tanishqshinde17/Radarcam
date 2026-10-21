// Web Audio API and Speech Synthesis Service

class SoundService {
  private audioCtx: AudioContext | null = null;
  private lastAlertTime = 0;
  private lastSpokenText = '';
  private lastSpokenTime = 0;

  private initAudio() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Play a warning chime (double beep)
  playWarningBeep() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Tone 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(1567.98, now + 0.32);
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio playback not permitted or failed', e);
    }
  }

  // Play an urgent alarm for overspeeding
  playOverspeedAlarm() {
    const currentMs = Date.now();
    if (currentMs - this.lastAlertTime < 2500) return; // Throttle
    this.lastAlertTime = currentMs;

    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      for (let i = 0; i < 3; i++) {
        const startTime = now + i * 0.12;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, startTime);
        osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.08);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.09);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.09);
      }
    } catch (e) {
      console.warn('Alarm audio failed', e);
    }
  }

  // Play gentle confirmation sound when passing radar
  playPassChime() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.25); // B5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio pass chime failed', e);
    }
  }

  // Voice speech synthesis
  speak(text: string, force = false) {
    if (!('speechSynthesis' in window)) return;

    const now = Date.now();
    // Don't repeat the exact same text within 8 seconds unless forced
    if (!force && this.lastSpokenText === text && now - this.lastSpokenTime < 8000) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech to remain timely
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly faster for driving urgency
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      this.lastSpokenText = text;
      this.lastSpokenTime = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  }
}

export const soundService = new SoundService();
