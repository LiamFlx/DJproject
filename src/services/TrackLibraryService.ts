// src/services/TrackLibraryService.ts

import { Track } from '../types';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { generateProceduralAudio } from '../lib/audioUtils';

type TrackMetadata = Omit<Track, 'url'> & { path: string };

const TRACK_BUCKET = 'tracks';
const SIGNED_URL_TTL = 3600;

export class TrackLibraryService {
  private static cache = new Map<string, string>();

  static async loadTracks(metadataList: TrackMetadata[]): Promise<Track[]> {
    const tracks: Track[] = [];

    for (const meta of metadataList) {
      try {
        const url = await this.getSignedURL(meta.path);
        if (!url) throw new Error('Signed URL missing');
        tracks.push({ ...meta, url });
      } catch (err) {
        console.warn(`❌ Failed to load ${meta.title}:`, err);
        const fallbackUrl = await generateProceduralAudio();
        tracks.push({ ...meta, url: fallbackUrl });
      }
    }

    return tracks;
  }

  static async getSignedURL(path: string): Promise<string | null> {
    if (this.cache.has(path)) return this.cache.get(path)!;
    
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase not available, cannot get signed URL');
      return null;
    }
    
    try {
      const { data, error } = await Promise.race([
        supabase.storage
          .from(TRACK_BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Signed URL timeout')), 5000)
        )
      ]);

      if (error) {
        console.error('Supabase signed URL error:', error.message);
        return null;
      }

      const signedUrl = data?.signedUrl || null;
      if (signedUrl) this.cache.set(path, signedUrl);
      return signedUrl;
    } catch (error) {
      console.warn('Failed to get signed URL:', error);
      return null;
    }
  }

  static async uploadTrack(file: File, metadata: Partial<Track>): Promise<Track | null> {
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase not available, cannot upload track');
      return null;
    }
    
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await Promise.race([
        supabase.storage
          .from(TRACK_BUCKET)
          .upload(fileName, file, { contentType: 'audio/mpeg' }),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 10000)
        )
      ]);

      if (uploadError) {
        console.error('Upload failed:', uploadError.message);
        return null;
      }

      const signedUrl = await this.getSignedURL(fileName);
      if (!signedUrl) return null;

      const duration = await this.getAudioDuration(signedUrl);

      return {
        id: fileName,
        url: signedUrl,
        title: metadata.title || file.name,
        artist: metadata.artist || 'Unknown Artist',
        album: metadata.album || 'Uploads',
        duration,
        bpm: metadata.bpm || 120,
        key: metadata.key || 'C',
        energy: metadata.energy || 60,
        danceability: metadata.danceability || 60,
        valence: metadata.valence || 60,
        genre: metadata.genre || 'unknown',
        year: metadata.year || new Date().getFullYear(),
        sourceUsed: 'supabase',
        license: metadata.license || 'unknown',
        streamingRights: true
      };
    } catch (error) {
      console.error('Track upload failed:', error);
      return null;
    }
  }

  static async getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.floor(audio.duration));
      });
      audio.addEventListener('error', () => {
        console.warn('⚠️ Failed to load metadata for:', url);
        resolve(0);
        audio.src = '';
      });
      
      // Add timeout to prevent hanging
      setTimeout(() => {
        console.warn('⚠️ Metadata loading timeout for:', url);
        resolve(0);
        audio.src = '';
      }, 5000);
      
      audio.load();
    });
  }
}

// Using free, publicly available audio samples
// These are from SoundHelix (free for testing) and other Creative Commons sources
export const initialPlaylist: Track[] = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Free Music Archive',
    album: 'Creative Commons',
    duration: 180,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    bpm: 128,
    key: 'C',
    energy: 75,
    danceability: 80,
    valence: 85,
    genre: 'electronic',
    year: 2023
  },
  {
    id: 2,
    title: 'Night Drive',
    artist: 'Demo Artist',
    album: 'Sample Pack',
    duration: 240,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    bpm: 124,
    key: 'Am',
    energy: 70,
    danceability: 75,
    valence: 60,
    genre: 'house',
    year: 2023
  },
  {
    id: 3,
    title: 'Electric Dreams',
    artist: 'Synth Master',
    album: 'Digital Age',
    duration: 195,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    bpm: 132,
    key: 'Dm',
    energy: 85,
    danceability: 90,
    valence: 70,
    genre: 'techno',
    year: 2023
  }
];

// Alternative free music sources for backup:
export const ALTERNATIVE_AUDIO_SOURCES = [
  // Free Music Archive (Creative Commons)
  'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Creative_Commons/Dead_Combo/CC_Affiliates_Mixtape_1/Dead_Combo_-_01_-_Povo_Que_Cas_Descalo.mp3',
  
  // Incompetech (Kevin MacLeod - Creative Commons)
  'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funk%20Game%20Loop.mp3',
  
  // Bensound (Royalty Free)
  'https://www.bensound.com/bensound-music/bensound-summer.mp3',
];