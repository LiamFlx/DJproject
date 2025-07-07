// src/services/AudioSynthEngine.ts

export type DrumType = 'kick' | 'snare' | 'hihat';

export class AudioSynthEngine {
  static createDrumSound(
    audioContext: AudioContext,
    type: DrumType,
    genre: string = 'house'
  ): AudioBuffer {
    const sampleRate = audioContext.sampleRate;

    const genreSettings = {
      house: { kick: { freq: 60, decay: 8, length: 0.5 }, snare: { decay: 15, length: 0.2 }, hihat: { decay: 40, length: 0.1 } },
      techno: { kick: { freq: 70, decay: 12, length: 0.4 }, snare: { decay: 25, length: 0.15 }, hihat: { decay: 60, length: 0.08 } },
      ambient: { kick: { freq: 45, decay: 4, length: 0.8 }, snare: { decay: 8, length: 0.4 }, hihat: { decay: 20, length: 0.2 } },
      trance: { kick: { freq: 65, decay: 10, length: 0.45 }, snare: { decay: 20, length: 0.18 }, hihat: { decay: 50, length: 0.09 } }
    };

    const settings = genreSettings[genre as keyof typeof genreSettings] || genreSettings.house;
    const typeSettings = settings[type];
    const length = Math.floor(sampleRate * typeSettings.length);
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'kick':
          sample = Math.sin(2 * Math.PI * typeSettings.freq * t * Math.exp(-t * 2)) * Math.exp(-t * typeSettings.decay);
          sample += Math.sin(2 * Math.PI * typeSettings.freq * 0.5 * t) * Math.exp(-t * typeSettings.decay * 1.5) * 0.3;
          break;
        case 'snare':
          sample = (Math.random() * 2 - 1) * Math.exp(-t * typeSettings.decay);
          if (genre === 'house' || genre === 'trance') {
            sample += Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 30) * 0.3;
          }
          break;
        case 'hihat':
          sample = (Math.random() * 2 - 1) * Math.exp(-t * typeSettings.decay) * 0.4;
          if (genre === 'techno') {
            sample += Math.sin(2 * Math.PI * 8000 * t) * Math.exp(-t * 80) * 0.2;
          }
          break;
      }

      data[i] = Math.tanh(sample * 0.4); // Soft clipping
    }

    return buffer;
  }

  static playNote(
    audioContext: AudioContext,
    frequency: number,
    duration: number,
    gainNode: GainNode,
    startTime: number,
    waveform: OscillatorType = 'sine',
    filterFreq?: number
  ): void {
    const osc = audioContext.createOscillator();
    const env = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, startTime);

    if (filterFreq) {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, startTime);
      filter.Q.setValueAtTime(5, startTime);
    }

    // ADSR envelope
    const attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.2;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.3, startTime + attack);
    env.gain.exponentialRampToValueAtTime(0.3 * sustain, startTime + attack + decay);
    env.gain.setValueAtTime(0.3 * sustain, startTime + duration - release);
    env.gain.linearRampToValueAtTime(0.001, startTime + duration);

    // Connection
    osc.connect(filterFreq ? filter : env);
    if (filterFreq) filter.connect(env);
    env.connect(gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  static playChord(
    audioContext: AudioContext,
    notes: number[],
    gainNode: GainNode,
    startTime: number,
    genre: string = 'house'
  ): void {
    notes.forEach((note, index) => {
      const delay = index * 0.02;
      const frequency = this.noteToFrequency(note, 3); // 3rd octave
      this.playNote(
        audioContext,
        frequency,
        7.5 - delay,
        gainNode,
        startTime + delay,
        genre === 'ambient' ? 'sine' : 'sawtooth',
        genre === 'techno' ? 1000 : 1500
      );
    });
  }

  static playDrum(
    audioContext: AudioContext,
    buffer: AudioBuffer,
    gainNode: GainNode,
    startTime: number,
    volume: number = 1.0
  ): void {
    const source = audioContext.createBufferSource();
    const drumGain = audioContext.createGain();

    drumGain.gain.value = volume * 0.3;
    source.buffer = buffer;
    source.connect(drumGain);
    drumGain.connect(gainNode);
    source.start(startTime);
  }

  static noteToFrequency(note: number, octave: number): number {
    return 440 * Math.pow(2, (note + (octave - 4) * 12) / 12);
  }
}
