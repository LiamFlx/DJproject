export type AppMode = 'landing' | 'studio' | 'live' | 'producer';

export interface Track {
  id: string | number;
  title: string;
  artist: string;
  duration: number;
  bpm: string;
  key: string;
  energy: number;
  genre: string;
}
