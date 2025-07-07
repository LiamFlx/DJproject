import { Track } from '../types';
import { musicLibrary } from './MusicLibraryManager';
import { generateProceduralAudio } from '../lib/audioUtils';

/**
 * Unified service for music library operations
 * This service acts as a facade for the MusicLibraryManager
 */
class MusicLibraryServiceClass {
  /**
   * Get all tracks from the library
   */
  async getAllTracks(): Promise<Track[]> {
    // Ensure library is initialized
    if (!musicLibrary.isReady()) {
      await musicLibrary.initialize();
    }
    
    return musicLibrary.getAllTracks();
  }
  
  /**
   * Search for tracks in the library
   */
  async searchTracks(query: string): Promise<Track[]> {
    // Ensure library is initialized
    if (!musicLibrary.isReady()) {
      await musicLibrary.initialize();
    }
    
    return musicLibrary.searchTracks(query);
  }
  
  /**
   * Generate a procedural track
   */
  async generateTrack(options: {
    title?: string;
    artist?: string;
    genre?: string;
    duration?: number;
    bpm?: number;
  } = {}): Promise<Track> {
    return await musicLibrary.generateProceduralTrack(options);
  }
  
  /**
   * Create a fallback track with procedural audio
   */
  async createFallbackTrack(title: string = 'Fallback Track'): Promise<Track> {
    try {
      const url = await generateProceduralAudio();
      
      return {
        id: `fallback_${Date.now()}`,
        title,
        artist: 'DJ-Sensee',
        duration: 30,
        url,
        bpm: '120',
        key: 'C',
        energy: 50,
        genre: 'electronic',
        sourceUsed: 'procedural'
      };
    } catch (error) {
      console.error('Failed to create fallback track:', error);
      
      // Return minimal track without URL
      return {
        id: `fallback_${Date.now()}`,
        title,
        artist: 'DJ-Sensee',
        duration: 30,
        bpm: '120',
        key: 'C',
        energy: 50,
        genre: 'electronic',
        sourceUsed: 'procedural'
      };
    }
  }
  
  /**
   * Import tracks from files
   */
  async importFiles(files: File[]): Promise<Track[]> {
    // Ensure library is initialized
    if (!musicLibrary.isReady()) {
      await musicLibrary.initialize();
    }
    
    const count = await musicLibrary.importFromFiles(files);
    return musicLibrary.getAllTracks().slice(-count);
  }
  
  /**
   * Create a backup of the library
   */
  async backup(): Promise<void> {
    await musicLibrary.createBackup();
  }
  
  /**
   * Restore from backup
   */
  async restore(): Promise<boolean> {
    return await musicLibrary.restoreFromBackup();
  }
}

export const MusicLibraryService = new MusicLibraryServiceClass();