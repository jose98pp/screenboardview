/**
 * Web Audio API synthesizer for instant, zero-asset sound effects
 * Perfect for OBS overlays and scoreboard controllers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundEffectType = 
  | 'buzzer' 
  | 'whistle' 
  | 'point' 
  | 'goal' 
  | 'fanfare' 
  | 'tick' 
  | 'click';

export function playSound(type: SoundEffectType, volume: number = 0.6) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'buzzer': {
        // Authentic loud electronic sports buzzer (sawtooth dual frequency)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const buzzerGain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(140, now);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(145, now);

        buzzerGain.gain.setValueAtTime(0.7, now);
        buzzerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

        osc1.connect(buzzerGain);
        osc2.connect(buzzerGain);
        buzzerGain.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
        break;
      }

      case 'whistle': {
        // Dual-tone vibrating referee whistle
        const osc = ctx.createOscillator();
        const whistleGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);
        
        // Tremolo / flutter
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(35, now);
        lfoGain.gain.setValueAtTime(150, now);
        lfo.connect(osc.frequency);

        whistleGain.gain.setValueAtTime(0, now);
        whistleGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        whistleGain.gain.setValueAtTime(0.5, now + 0.35);
        whistleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

        osc.connect(whistleGain);
        whistleGain.connect(masterGain);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.55);
        osc.stop(now + 0.55);
        break;
      }

      case 'point': {
        // Bright friendly point chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'goal': {
        // Deep stadium celebration horn
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, now); // A3
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(330, now); // E4

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.8, now + 0.08);
        gain.gain.setValueAtTime(0.8, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
        break;
      }

      case 'fanfare': {
        // Victory trumpet arpeggio
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          const startTime = now + idx * 0.12;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0.4, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + (idx === 3 ? 0.8 : 0.25));

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + (idx === 3 ? 0.8 : 0.25));
        });
        break;
      }

      case 'tick': {
        // Mechanical clock tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'click': {
        // Subtle UI click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.03);
        break;
      }
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}
