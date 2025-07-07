// src/services/SmartMetadataService.ts

import {
  AudioTrack,
  EnhancedTrack,
  MusicPattern
} from '../types/AudioTypes';

export class SmartMetadataService {
  private static readonly GENRE_CHARACTERISTICS = {
    house: { 
      bpmRange: [120, 130], energy: 75, mood: 'uplifting', danceability: 0.85,
      drumPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      bassPattern: [0, 2, 4, 2],
      chordProgression: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 6, 1]]
    },
    techno: { 
      bpmRange: [125, 140], energy: 85, mood: 'driving', danceability: 0.90,
      drumPattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      bassPattern: [0, 0, 3, 0],
      chordProgression: [[0, 2, 4], [0, 2, 4], [1, 3, 5], [1, 3, 5]]
    },
    ambient: { 
      bpmRange: [60, 100], energy: 35, mood: 'atmospheric', danceability: 0.40,
      drumPattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      bassPattern: [0, 7, 3, 5],
      chordProgression: [[0, 2, 4, 6], [1, 3, 5, 0], [2, 4, 6, 1], [3, 5, 0, 2]]
    },
    trance: { 
      bpmRange: [128, 138], energy: 90, mood: 'euphoric', danceability: 0.88,
      drumPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      bassPattern: [0, 0, 2, 4],
      chordProgression: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]]
    },
    'progressive house': {
      bpmRange: [120, 128], energy: 70, mood: 'building', danceability: 0.75,
      drumPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      bassPattern: [0, 2, 4, 5],
      chordProgression: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 6, 1]]
    }
  };

  private static readonly MOOD_ADJUSTMENTS = {
    energetic: { energyBoost: 15, tempoIncrease: 5 },
    chill: { energyBoost: -20, tempoIncrease: -10 },
    uplifting: { energyBoost: 10, tempoIncrease: 2 },
    dark: { energyBoost: -10, tempoIncrease: -5 },
    euphoric: { energyBoost: 20, tempoIncrease: 8 }
  };

  static enhanceTrackMetadata(track: AudioTrack): EnhancedTrack {
    const hash = this.generateHash(track.title + track.artist);
    const genre = this.detectGenre(track);
    const characteristics = this.GENRE_CHARACTERISTICS[genre] || this.GENRE_CHARACTERISTICS.house;

    return {
      ...track,
      bpm: track.bpm || this.generateBPM(characteristics, hash).toString(),
      key: track.key || this.generateKey(hash),
      genre,
      energy: track.energy || this.calculateEnergy(characteristics, track),
      mood: track.mood || characteristics.mood,
      danceability: track.danceability || characteristics.danceability,
      analysisConfidence: 0.85 + (hash % 15) / 100 // 85–100% confidence
    };
  }

  static generateMusicPattern(track: EnhancedTrack): MusicPattern {
    const genre = track.genre.toLowerCase();
    const characteristics = this.GENRE_CHARACTERISTICS[genre] || this.GENRE_CHARACTERISTICS.house;
    const hash = this.generateHash(track.id);
    const moodAdjustment = this.MOOD_ADJUSTMENTS[track.mood] || { energyBoost: 0, tempoIncrease: 0 };

    const adjustedTempo = parseInt(track.bpm) + moodAdjustment.tempoIncrease;
    const adjustedIntensity = Math.max(0.1, Math.min(1.0, (track.energy + moodAdjustment.energyBoost) / 100));

    return {
      drums: this.generateDynamicDrumPattern(characteristics.drumPattern, hash, adjustedIntensity),
      bass: this.generateDynamicBassPattern(characteristics.bassPattern, hash, track.key),
      melody: this.generateDynamicMelody(hash, track.key, adjustedIntensity),
      chords: characteristics.chordProgression,
      tempo: adjustedTempo,
      intensity: adjustedIntensity
    };
  }

  private static detectGenre(track: AudioTrack): string {
    const combined = `${track.title.toLowerCase()} ${track.artist.toLowerCase()}`;
    if (combined.includes('ambient') || combined.includes('drone') || combined.includes('atmospheric')) return 'ambient';
    if (combined.includes('techno') || combined.includes('minimal') || combined.includes('industrial')) return 'techno';
    if (combined.includes('trance') || combined.includes('uplifting') || combined.includes('psy')) return 'trance';
    if (combined.includes('progressive')) return 'progressive house';
    return track.genre?.toLowerCase() || 'house';
  }

  private static generateBPM(characteristics: any, hash: number): number {
    const [min, max] = characteristics.bpmRange;
    return min + (hash % (max - min + 1));
  }

  private static generateKey(hash: number): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['major', 'minor'];
    const key = keys[hash % keys.length];
    const mode = modes[Math.floor(hash / keys.length) % modes.length];
    return `${key} ${mode}`;
  }

  private static calculateEnergy(characteristics: any, track: AudioTrack): number {
    let energy = characteristics.energy;
    const title = track.title.toLowerCase();
    if (title.includes('intro') || title.includes('outro')) energy -= 20;
    if (title.includes('peak') || title.includes('drop') || title.includes('climax')) energy += 15;
    if (title.includes('breakdown') || title.includes('ambient')) energy -= 10;
    return Math.max(10, Math.min(100, energy));
  }

  private static generateDynamicDrumPattern(basePattern: number[], hash: number, intensity: number): number[] {
    const pattern = [...basePattern];
    if (intensity > 0.7) {
      for (let i = 1; i < pattern.length; i += 4) {
        if ((hash + i) % 3 === 0) pattern[i] = 1;
      }
    }
    if (intensity < 0.4) {
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === 1 && (hash + i) % 4 === 0) pattern[i] = 0;
      }
    }
    return pattern;
  }

  private static generateDynamicBassPattern(basePattern: number[], hash: number, key: string): number[] {
    const keyNumber = this.keyToNumber(key);
    return basePattern.map(note => (note + keyNumber) % 12);
  }

  private static generateDynamicMelody(hash: number, key: string, intensity: number): number[] {
    const scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10]
    };
    const isMinor = key.includes('minor');
    const scale = scales[isMinor ? 'minor' : 'major'];
    const keyNumber = this.keyToNumber(key);

    const melody: number[] = [];
    const noteCount = intensity > 0.6 ? 16 : 8;
    for (let i = 0; i < noteCount; i++) {
      const scaleIndex = (hash + i * 3) % scale.length;
      const note = (scale[scaleIndex] + keyNumber) % 12;
      melody.push(note);
    }
    return melody;
  }

  private static keyToNumber(key: string): number {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    return noteMap[key.split(' ')[0]] || 0;
  }

  private static generateHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
