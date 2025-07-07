// src/types/AudioTypes.ts

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url?: string;
  preview_url?: string;
  duration?: number;
  bpm?: string;
  key?: string;
  genre?: string;
  energy?: number;
  mood?: string;
  danceability?: number;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  retryCount: number;
  buffered: number;
}

export interface MusicPattern {
  drums: number[];
  bass: number[];
  melody: number[];
  chords: number[][];
  tempo: number;
  intensity: number;
}

export interface EnhancedTrack extends AudioTrack {
  bpm: string;
  key: string;
  genre: string;
  energy: number;
  mood: string;
  danceability: number;
  analysisConfidence: number;
}
