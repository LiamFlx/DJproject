// src/services/AudioAnalysisService.ts

import { MusicPlayer } from './AudioPlaybackManager';

export class AudioAnalysisService {
  static async analyzeAudio(
    audioContext: AudioContext,
    player: MusicPlayer
  ): Promise<{
    peaks: number[];
    spectralCentroid: number;
    zeroCrossingRate: number;
    mfcc: number[];
  } | null> {
    if (!player?.gainNode || !audioContext) return null;

    try {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      const splitter = audioContext.createChannelSplitter(1);
      player.gainNode.connect(splitter);
      splitter.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Peak detection
      const peaks: number[] = [];
      for (let i = 1; i < dataArray.length - 1; i++) {
        if (dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1] && dataArray[i] > 100) {
          peaks.push(i);
        }
      }

      // Spectral centroid
      let weightedSum = 0;
      let magnitudeSum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        weightedSum += i * dataArray[i];
        magnitudeSum += dataArray[i];
      }
      const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

      // MFCC stub – simulate with first 13 FFT bins
      const mfcc = Array.from(dataArray.slice(0, 13));

      return {
        peaks,
        spectralCentroid,
        zeroCrossingRate: 0, // Placeholder
        mfcc
      };
    } catch (error) {
      console.error('Audio analysis failed:', error);
      return null;
    }
  }
}
