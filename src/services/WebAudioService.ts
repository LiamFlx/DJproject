interface AudioAnalysis {
  bpm: number;
  key: string;
  energy: number;
  spectralCentroid: number;
  rms: number;
  zcr: number;
  mfcc: number[];
  tempo: number;
  loudness: number;
}

interface AudioEffect {
  id: string;
  name: string;
  type: 'filter' | 'reverb' | 'delay' | 'distortion' | 'compressor' | 'eq';
  enabled: boolean;
  parameters: Record<string, number>;
}

interface MixerChannel {
  id: string;
  gain: GainNode;
  eq: {
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
  };
  filter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  effects: AudioEffect[];
  analyser: AnalyserNode;
  source?: AudioBufferSourceNode;
}

class WebAudioServiceClass {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crossfader: GainNode | null = null;
  private channels = new Map<string, MixerChannel>();
  private analysisData = new Map<string, AudioAnalysis>();
  private isInitialized = false;

  // Audio analysis constants
  private readonly FFT_SIZE = 2048;
  private readonly SAMPLE_RATE = 44100;

  /** Initialize Web Audio Context and core nodes */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext =
        new (window.AudioContext || (window as any).webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.audioContext.destination);

      this.crossfader = this.audioContext.createGain();
      this.crossfader.connect(this.masterGain);

      this.isInitialized = true;
      console.log('🎛️ Web Audio API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error);
      throw error;
    }
  }

  /** Create a mixer channel with EQ, compressor, filters, and analyser */
  createChannel(channelId: string): MixerChannel {
    if (!this.audioContext) throw new Error('Web Audio API not initialized');

    const gain = this.audioContext.createGain();
    const compressor = this.audioContext.createDynamicsCompressor();
    const analyser = this.audioContext.createAnalyser();

    // 3-band EQ filters
    const lowEQ = this.audioContext.createBiquadFilter();
    lowEQ.type = 'lowshelf';
    lowEQ.frequency.value = 320;
    lowEQ.gain.value = 0;

    const midEQ = this.audioContext.createBiquadFilter();
    midEQ.type = 'peaking';
    midEQ.frequency.value = 1000;
    midEQ.Q.value = 1;
    midEQ.gain.value = 0;

    const highEQ = this.audioContext.createBiquadFilter();
    highEQ.type = 'highshelf';
    highEQ.frequency.value = 3200;
    highEQ.gain.value = 0;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.value = 1000;

    // Compressor settings for professional sound
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    analyser.fftSize = this.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;

    // Connect chain: filter → EQ (low→mid→high) → compressor → gain → analyser → crossfader
    filter.connect(lowEQ);
    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(compressor);
    compressor.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.crossfader!);

    const channel: MixerChannel = {
      id: channelId,
      gain,
      eq: { low: lowEQ, mid: midEQ, high: highEQ },
      filter,
      compressor,
      effects: [],
      analyser,
    };

    this.channels.set(channelId, channel);
    console.log(`🎛️ Created audio channel: ${channelId}`);

    return channel;
  }

  /** Load audio buffer into channel and start playback */
  async loadAndPlayTrack(channelId: string, audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) throw new Error('Web Audio API not initialized');

    let channel = this.channels.get(channelId);
    if (!channel) {
      channel = this.createChannel(channelId);
    }

    // Stop previous source if any
    if (channel.source) {
      try {
        channel.source.stop();
      } catch {
        // ignore if already stopped
      }
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(channel.filter);

    source.start(0);
    channel.source = source;

    this.startAnalysis(channelId);

    console.log(`▶️ Playing track on channel: ${channelId}`);
  }

  /** Start continuous analysis loop for channel */
  private startAnalysis(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    const analyser = channel.analyser;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const analysis = this.calculateAudioFeatures(freqData, timeData);
      this.analysisData.set(channelId, analysis);

      if (channel.source) {
        requestAnimationFrame(analyze);
      }
    };

    analyze();
  }

  /** Calculate audio features from frequency and time domain data */
  private calculateAudioFeatures(frequencyData: Uint8Array, timeData: Uint8Array): AudioAnalysis {
    // RMS (loudness)
    let rms = 0;
    for (let i = 0; i < timeData.length; i++) {
      const norm = (timeData[i] - 128) / 128;
      rms += norm * norm;
    }
    rms = Math.sqrt(rms / timeData.length);

    // Spectral centroid (brightness)
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const mag = frequencyData[i] / 255;
      const freq = (i * this.SAMPLE_RATE) / (2 * frequencyData.length);
      weightedSum += freq * mag;
      magnitudeSum += mag;
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Zero crossing rate (ZCR)
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] - 128) * (timeData[i - 1] - 128) < 0) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / timeData.length;

    // BPM estimation
    const bpm = this.estimateBPM(timeData);

    // Energy bands (simplified)
    const bassEnergy = this.getBandEnergy(frequencyData, 0, 4);
    const midEnergy = this.getBandEnergy(frequencyData, 4, 32);
    const highEnergy = this.getBandEnergy(frequencyData, 32, 128);
    const energy = Math.min(100, (bassEnergy + midEnergy + highEnergy) * 100);

    // Musical key estimation
    const key = this.estimateKey(frequencyData);

    // MFCC calculation (simplified)
    const mfcc = this.calculateMFCC(frequencyData);

    return {
      bpm,
      key,
      energy,
      spectralCentroid,
      rms,
      zcr,
      mfcc,
      tempo: bpm,
      loudness: rms * 100,
    };
  }

  /** Simple BPM detection by peak intervals */
  private estimateBPM(timeData: Uint8Array): number {
    const peaks: number[] = [];
    const threshold = 140;

    for (let i = 1; i < timeData.length - 1; i++) {
      if (
        timeData[i] > threshold &&
        timeData[i] > timeData[i - 1] &&
        timeData[i] > timeData[i + 1]
      ) {
        peaks.push(i);
      }
    }

    if (peaks.length < 2) return 120;

    let totalInterval = 0;
    for (let i = 1; i < peaks.length; i++) {
      totalInterval += peaks[i] - peaks[i - 1];
    }

    const avgInterval = totalInterval / (peaks.length - 1);
    const beatsPerSecond = this.SAMPLE_RATE / (avgInterval * 4);
    const bpm = Math.round(beatsPerSecond * 60);

    return Math.min(200, Math.max(60, bpm));
  }

  /** Calculate average energy in a frequency band */
  private getBandEnergy(frequencyData: Uint8Array, startBin: number, endBin: number): number {
    let energy = 0;
    for (let i = startBin; i < Math.min(endBin, frequencyData.length); i++) {
      energy += (frequencyData[i] / 255) ** 2;
    }
    return energy / (endBin - startBin);
  }

  /** Estimate musical key based on chroma */
  private estimateKey(frequencyData: Uint8Array): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const chroma = new Array(12).fill(0);

    for (let i = 1; i < frequencyData.length; i++) {
      const freq = (i * this.SAMPLE_RATE) / (2 * frequencyData.length);
      if (freq > 80 && freq < 2000) {
        const note = Math.round(12 * Math.log2(freq / 440)) % 12;
        const normalizedNote = ((note % 12) + 12) % 12;
        chroma[normalizedNote] += frequencyData[i] / 255;
      }
    }

    let maxChroma = 0;
    let dominantNote = 0;
    for (let i = 0; i < 12; i++) {
      if (chroma[i] > maxChroma) {
        maxChroma = chroma[i];
        dominantNote = i;
      }
    }

    const isMajor = chroma[(dominantNote + 4) % 12] > chroma[(dominantNote + 3) % 12];
    return keys[dominantNote] + (isMajor ? '' : 'm');
  }

  /** Simplified MFCC calculation */
  private calculateMFCC(frequencyData: Uint8Array): number[] {
    const mfcc: number[] = [];
    const numCoefficients = 13;

    for (let i = 0; i < numCoefficients; i++) {
      let coefficient = 0;
      for (let j = 0; j < frequencyData.length; j++) {
        coefficient += frequencyData[j] * Math.cos((Math.PI * i * j) / frequencyData.length);
      }
      mfcc.push(coefficient / frequencyData.length);
    }

    return mfcc;
  }

  /** Set gain (volume) for a channel (0 to 1) */
  setChannelGain(channelId: string, gain: number): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.gain.gain.value = Math.min(1, Math.max(0, gain));
    }
  }

  /** Set EQ band gain, input range 0-1 mapped to -12dB to +12dB */
  setEQ(channelId: string, band: 'low' | 'mid' | 'high', gain: number): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      const dbGain = (gain - 0.5) * 24;
      channel.eq[band].gain.value = dbGain;
    }
  }

  /** Set filter frequency and type */
  setFilter(channelId: string, frequency: number, type: BiquadFilterType = 'lowpass'): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.filter.type = type;
      channel.filter.frequency.value = Math.min(20000, Math.max(20, frequency));
    }
  }

  /** Crossfader position control (range -1 to +1) */
  setCrossfader(position: number): void {
    if (!this.crossfader) return;

    // This method could be expanded with actual crossfader gain curves
    this.crossfader.gain.value = 0.5; // Placeholder steady value
  }

  /** Add reverb effect (basic convolution) */
  addReverb(channelId: string, roomSize = 0.5, decay = 2): void {
    const channel = this.channels.get(channelId);
    if (!channel || !this.audioContext) return;

    const convolver = this.audioContext.createConvolver();
    convolver.buffer = this.createReverbImpulse(roomSize, decay);

    const wetGain = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    wetGain.gain.value = 0.3;
    dryGain.gain.value = 0.7;

    channel.compressor.disconnect();
    channel.compressor.connect(dryGain);
    channel.compressor.connect(convolver);
    convolver.connect(wetGain);

    const merger = this.audioContext.createChannelMerger(2);
    dryGain.connect(merger);
    wetGain.connect(merger);
    merger.connect(channel.gain);
  }

  /** Create impulse response buffer for reverb */
  private createReverbImpulse(roomSize: number, decay: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not available');

    const length = this.audioContext.sampleRate * decay;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const n = length - i;
        data[i] = (Math.random() * 2 - 1) * Math.pow(n / length, roomSize);
      }
    }

    return impulse;
  }

  /** Add delay effect with feedback */
  addDelay(channelId: string, delayTime = 0.3, feedback = 0.3): void {
    const channel = this.channels.get(channelId);
    if (!channel || !this.audioContext) return;

    const delay = this.audioContext.createDelay(1);
    const feedbackGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();

    delay.delayTime.value = delayTime;
    feedbackGain.gain.value = feedback;
    wetGain.gain.value = 0.3;

    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);

    channel.compressor.connect(delay);
    wetGain.connect(channel.gain);
  }

  /** Get current beat phase of a channel (0 to 1) */
  getBeatPhase(channelId: string): number {
    const analysis = this.analysisData.get(channelId);
    if (!analysis) return 0;

    const beatsPerSecond = analysis.bpm / 60;
    const currentTime = this.audioContext?.currentTime || 0;
    return (currentTime * beatsPerSecond) % 1;
  }

  /** Sync BPM of target channel to source channel */
  syncBPM(sourceChannelId: string, targetChannelId: string): void {
    const sourceAnalysis = this.analysisData.get(sourceChannelId);
    const targetChannel = this.channels.get(targetChannelId);

    if (!sourceAnalysis || !targetChannel || !targetChannel.source) return;

    const targetAnalysis = this.analysisData.get(targetChannelId);
    if (!targetAnalysis) return;

    const rateAdjustment = sourceAnalysis.bpm / targetAnalysis.bpm;
    targetChannel.source.playbackRate.value = rateAdjustment;

    console.log(`🎵 Synced BPM: ${targetAnalysis.bpm} → ${sourceAnalysis.bpm}`);
  }

  /** Get current audio analysis data */
  getAnalysis(channelId: string): AudioAnalysis | null {
    return this.analysisData.get(channelId) || null;
  }

  /** Get frequency spectrum data */
  getSpectrum(channelId: string): Uint8Array | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;

    const bufferLength = channel.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    channel.analyser.getByteFrequencyData(dataArray);

    return dataArray;
  }

  /** Get waveform time-domain data */
  getWaveform(channelId: string): Uint8Array | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;

    const bufferLength = channel.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    channel.analyser.getByteTimeDomainData(dataArray);

    return dataArray;
  }

  /** Clean up all resources */
  dispose(): void {
    this.channels.forEach(channel => {
      if (channel.source) {
        try {
          channel.source.stop();
        } catch {
          // ignore errors
        }
      }
    });

    this.channels.clear();
    this.analysisData.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.isInitialized = false;
    console.log('🧹 Web Audio Service disposed');
  }
}

export const WebAudioService = new WebAudioServiceClass();
