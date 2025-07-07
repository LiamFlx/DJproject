import localforage from 'localforage';
import * as mmb from 'music-metadata-browser';
import { Track } from '../types';
import { generateProceduralAudio } from '../lib/audioUtils';

// Configuration
const LIBRARY_VERSION = '1.0.0';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 1 day
const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a'];

// Storage keys
const STORAGE_KEYS = {
  LIBRARY: 'music-library',
  METADATA: 'music-metadata',
  BACKUP: 'music-library-backup',
  LAST_BACKUP: 'last-backup-time',
  CONFIG: 'library-config',
  LAST_SCAN: 'last-scan-time'
};

// Types
interface LibraryStats {
  totalTracks: number;
  totalDuration: number;
  genres: Record<string, number>;
  artists: Record<string, number>;
  lastUpdated: number;
  version: string;
}

interface LibraryConfig {
  autoBackup: boolean;
  autoOrganize: boolean;
  preferredFormat: string;
  storageQuota: number;
  version: string;
}

export class MusicLibraryManager {
  private tracks: Map<string, Track> = new Map();
  private stats: LibraryStats;
  private config: LibraryConfig;
  private isInitialized = false;
  private isInitializing = false;
  private listeners: Set<() => void> = new Set();
  private fallbackTracks: Track[] = [];

  constructor() {
    // Initialize stats
    this.stats = {
      totalTracks: 0,
      totalDuration: 0,
      genres: {},
      artists: {},
      lastUpdated: Date.now(),
      version: LIBRARY_VERSION
    };

    // Initialize config
    this.config = {
      autoBackup: true,
      autoOrganize: true,
      preferredFormat: 'mp3',
      storageQuota: 500 * 1024 * 1024, // 500MB
      version: LIBRARY_VERSION
    };

    // Initialize localforage
    localforage.config({
      name: 'DJ-Sensee',
      storeName: 'music_library',
      description: 'DJ-Sensee Music Library Storage'
    });
  }

  /**
   * Initialize the music library
   */
  async initialize(fallbackTracks?: Track[]): Promise<boolean> {
    if (this.isInitialized || this.isInitializing) {
      console.log('🎵 Music library already initialized or initializing');
      return this.isInitialized;
    }

    this.isInitializing = true;
    console.log('🎵 Initializing music library...');

    try {
      // Store fallback tracks
      if (fallbackTracks && fallbackTracks.length > 0) {
        this.fallbackTracks = fallbackTracks;
        console.log(`🎵 Stored ${fallbackTracks.length} fallback tracks`);
      }

      // Load config
      await this.loadConfig();

      // Load library from storage
      const success = await this.loadLibrary();
      
      // Schedule auto-backup if enabled
      if (this.config.autoBackup) {
        this.scheduleBackup();
      }

      this.isInitialized = success;
      this.isInitializing = false;
      
      // Notify listeners
      this.notifyListeners();
      
      console.log(`✅ Music library initialized with ${this.tracks.size} tracks`);
      return success;
    } catch (error) {
      console.error('❌ Failed to initialize music library:', error);
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Load library from storage
   */
  private async loadLibrary(): Promise<boolean> {
    try {
      console.log('🎵 Loading music library from storage...');
      
      // Load library data
      const libraryData = await localforage.getItem<Record<string, Track>>(STORAGE_KEYS.LIBRARY);
      
      if (libraryData) {
        // Convert to Map
        this.tracks = new Map(Object.entries(libraryData));
        console.log(`✅ Loaded ${this.tracks.size} tracks from storage`);
        
        // Update stats
        this.updateStats();
        return true;
      } else {
        console.log('⚠️ No library data found in storage');
        
        // Use fallback tracks if available
        if (this.fallbackTracks.length > 0) {
          console.log(`🎵 Using ${this.fallbackTracks.length} fallback tracks`);
          this.fallbackTracks.forEach(track => {
            this.tracks.set(track.id.toString(), track);
          });
          
          // Update stats
          this.updateStats();
          
          // Save to storage
          await this.saveLibrary();
          return true;
        }
        
        // Create empty library
        console.log('🎵 Creating empty library');
        await this.saveLibrary();
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to load library:', error);
      
      // Use fallback tracks if available
      if (this.fallbackTracks.length > 0) {
        console.log(`🎵 Using ${this.fallbackTracks.length} fallback tracks after load failure`);
        this.fallbackTracks.forEach(track => {
          this.tracks.set(track.id.toString(), track);
        });
        
        // Update stats
        this.updateStats();
        return true;
      }
      
      return false;
    }
  }

  /**
   * Save library to storage
   */
  private async saveLibrary(): Promise<void> {
    try {
      console.log(`🎵 Saving ${this.tracks.size} tracks to storage...`);
      
      // Convert Map to object
      const libraryData = Object.fromEntries(this.tracks.entries());
      
      // Save to storage
      await localforage.setItem(STORAGE_KEYS.LIBRARY, libraryData);
      
      // Update stats
      this.updateStats();
      
      // Save stats
      await localforage.setItem(STORAGE_KEYS.METADATA, this.stats);
      
      console.log('✅ Library saved successfully');
    } catch (error) {
      console.error('❌ Failed to save library:', error);
    }
  }

  /**
   * Load config from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const config = await localforage.getItem<LibraryConfig>(STORAGE_KEYS.CONFIG);
      
      if (config) {
        this.config = { ...this.config, ...config };
        console.log('✅ Loaded library configuration');
      } else {
        console.log('⚠️ No configuration found, using defaults');
        await this.saveConfig();
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
    }
  }

  /**
   * Save config to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.CONFIG, this.config);
      console.log('✅ Configuration saved');
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
    }
  }

  /**
   * Update library stats
   */
  private updateStats(): void {
    const genres: Record<string, number> = {};
    const artists: Record<string, number> = {};
    let totalDuration = 0;

    this.tracks.forEach(track => {
      // Update genres
      if (track.genre) {
        genres[track.genre] = (genres[track.genre] || 0) + 1;
      }
      
      // Update artists
      artists[track.artist] = (artists[track.artist] || 0) + 1;
      
      // Update duration
      totalDuration += track.duration || 0;
    });

    this.stats = {
      totalTracks: this.tracks.size,
      totalDuration,
      genres,
      artists,
      lastUpdated: Date.now(),
      version: LIBRARY_VERSION
    };
  }

  /**
   * Schedule automatic backup
   */
  private scheduleBackup(): void {
    // Check when the last backup was made
    localforage.getItem<number>(STORAGE_KEYS.LAST_BACKUP).then(lastBackup => {
      const now = Date.now();
      
      if (!lastBackup || (now - lastBackup) > BACKUP_INTERVAL) {
        console.log('🎵 Creating automatic backup...');
        this.createBackup().then(() => {
          console.log('✅ Automatic backup created');
        });
      } else {
        const nextBackup = lastBackup + BACKUP_INTERVAL;
        console.log(`ℹ️ Next automatic backup scheduled in ${Math.round((nextBackup - now) / (1000 * 60 * 60))} hours`);
      }
    });
  }

  /**
   * Create a backup of the library
   */
  async createBackup(): Promise<void> {
    try {
      // Convert Map to object
      const libraryData = Object.fromEntries(this.tracks.entries());
      
      // Create backup object
      const backup = {
        library: libraryData,
        stats: this.stats,
        config: this.config,
        timestamp: Date.now(),
        version: LIBRARY_VERSION
      };
      
      // Save backup
      await localforage.setItem(STORAGE_KEYS.BACKUP, backup);
      
      // Update last backup time
      await localforage.setItem(STORAGE_KEYS.LAST_BACKUP, Date.now());
      
      console.log('✅ Backup created successfully');
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      console.log('🎵 Restoring from backup...');
      
      // Load backup
      const backup = await localforage.getItem<any>(STORAGE_KEYS.BACKUP);
      
      if (!backup) {
        console.warn('⚠️ No backup found');
        return false;
      }
      
      // Restore library
      this.tracks = new Map(Object.entries(backup.library));
      
      // Restore stats
      this.stats = backup.stats;
      
      // Restore config
      this.config = backup.config;
      
      // Save to storage
      await this.saveLibrary();
      await this.saveConfig();
      
      console.log(`✅ Restored ${this.tracks.size} tracks from backup created on ${new Date(backup.timestamp).toLocaleString()}`);
      
      // Notify listeners
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Add a track to the library
   */
  async addTrack(track: Track): Promise<boolean> {
    try {
      // Validate track
      if (!track.id || !track.title || !track.artist) {
        console.warn('⚠️ Invalid track data:', track);
        return false;
      }
      
      // Add to library
      this.tracks.set(track.id.toString(), track);
      
      // Save library
      await this.saveLibrary();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log(`✅ Added track "${track.title}" by ${track.artist} to library`);
      return true;
    } catch (error) {
      console.error('❌ Failed to add track:', error);
      return false;
    }
  }

  /**
   * Add multiple tracks to the library
   */
  async addTracks(tracks: Track[]): Promise<number> {
    try {
      let addedCount = 0;
      
      // Add each track
      for (const track of tracks) {
        // Validate track
        if (!track.id || !track.title || !track.artist) {
          console.warn('⚠️ Skipping invalid track:', track);
          continue;
        }
        
        // Add to library
        this.tracks.set(track.id.toString(), track);
        addedCount++;
      }
      
      // Save library
      await this.saveLibrary();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log(`✅ Added ${addedCount} tracks to library`);
      return addedCount;
    } catch (error) {
      console.error('❌ Failed to add tracks:', error);
      return 0;
    }
  }

  /**
   * Remove a track from the library
   */
  async removeTrack(trackId: string): Promise<boolean> {
    try {
      // Check if track exists
      if (!this.tracks.has(trackId)) {
        console.warn(`⚠️ Track ${trackId} not found in library`);
        return false;
      }
      
      // Remove from library
      this.tracks.delete(trackId);
      
      // Save library
      await this.saveLibrary();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log(`✅ Removed track ${trackId} from library`);
      return true;
    } catch (error) {
      console.error('❌ Failed to remove track:', error);
      return false;
    }
  }

  /**
   * Get a track from the library
   */
  getTrack(trackId: string): Track | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Get all tracks from the library
   */
  getAllTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Search for tracks in the library
   */
  searchTracks(query: string): Track[] {
    if (!query) return this.getAllTracks();
    
    const normalizedQuery = query.toLowerCase();
    
    return Array.from(this.tracks.values()).filter(track => 
      track.title.toLowerCase().includes(normalizedQuery) ||
      track.artist.toLowerCase().includes(normalizedQuery) ||
      (track.album && track.album.toLowerCase().includes(normalizedQuery)) ||
      (track.genre && track.genre.toLowerCase().includes(normalizedQuery))
    );
  }

  /**
   * Filter tracks by criteria
   */
  filterTracks(criteria: Partial<Track>): Track[] {
    return Array.from(this.tracks.values()).filter(track => {
      for (const [key, value] of Object.entries(criteria)) {
        if (track[key as keyof Track] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Import tracks from files
   */
  async importFromFiles(files: File[]): Promise<number> {
    try {
      console.log(`🎵 Importing ${files.length} files...`);
      
      let importedCount = 0;
      const importPromises: Promise<void>[] = [];
      
      for (const file of files) {
        // Check if file is supported
        if (!this.isSupportedFormat(file.type)) {
          console.warn(`⚠️ Unsupported file format: ${file.type} for ${file.name}`);
          continue;
        }
        
        importPromises.push(this.processAudioFile(file).then(track => {
          if (track) {
            this.tracks.set(track.id.toString(), track);
            importedCount++;
          }
        }));
      }
      
      // Wait for all imports to complete
      await Promise.all(importPromises);
      
      // Save library
      await this.saveLibrary();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log(`✅ Imported ${importedCount} tracks`);
      return importedCount;
    } catch (error) {
      console.error('❌ Failed to import files:', error);
      return 0;
    }
  }

  /**
   * Process an audio file and extract metadata
   */
  private async processAudioFile(file: File): Promise<Track | null> {
    try {
      console.log(`🎵 Processing file: ${file.name}`);
      
      // Create object URL
      const url = URL.createObjectURL(file);
      
      // Extract metadata
      const metadata = await mmb.parseBlob(file);
      
      // Create track object
      const track: Track = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album,
        duration: metadata.format.duration || 0,
        url,
        bpm: metadata.common.bpm?.toString() || '120',
        key: metadata.common.key || 'C',
        energy: 70, // Default value
        danceability: 70, // Default value
        valence: 70, // Default value
        genre: metadata.common.genre?.[0]?.toLowerCase() || 'unknown',
        year: metadata.common.year,
        sourceUsed: 'local'
      };
      
      console.log(`✅ Processed file: ${file.name} → "${track.title}" by ${track.artist}`);
      return track;
    } catch (error) {
      console.error(`❌ Failed to process file ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Check if file format is supported
   */
  private isSupportedFormat(mimeType: string): boolean {
    return SUPPORTED_FORMATS.includes(mimeType);
  }

  /**
   * Generate a procedural track
   */
  async generateProceduralTrack(options: {
    title?: string;
    artist?: string;
    genre?: string;
    duration?: number;
    bpm?: number;
  } = {}): Promise<Track> {
    try {
      console.log('🎵 Generating procedural track...');
      
      // Generate audio
      const url = await generateProceduralAudio(
        options.genre === 'ambient' ? 220 : 440,
        options.duration || 30,
        options.genre === 'techno' ? 'sawtooth' : 'sine'
      );
      
      // Create track object
      const track: Track = {
        id: `procedural_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: options.title || `Procedural Track ${Math.floor(Math.random() * 1000)}`,
        artist: options.artist || 'DJ-Sensee AI',
        duration: options.duration || 30,
        url,
        bpm: options.bpm?.toString() || '120',
        key: 'C',
        energy: 70,
        danceability: 70,
        valence: 70,
        genre: options.genre || 'electronic',
        year: new Date().getFullYear(),
        sourceUsed: 'procedural'
      };
      
      console.log(`✅ Generated procedural track: "${track.title}"`);
      return track;
    } catch (error) {
      console.error('❌ Failed to generate procedural track:', error);
      
      // Return a minimal track as fallback
      return {
        id: `procedural_fallback_${Date.now()}`,
        title: 'Procedural Fallback',
        artist: 'DJ-Sensee AI',
        duration: 30,
        bpm: '120',
        key: 'C',
        energy: 70,
        genre: 'electronic',
        sourceUsed: 'procedural'
      };
    }
  }

  /**
   * Get library statistics
   */
  getStats(): LibraryStats {
    return this.stats;
  }

  /**
   * Get library configuration
   */
  getConfig(): LibraryConfig {
    return this.config;
  }

  /**
   * Update library configuration
   */
  async updateConfig(updates: Partial<LibraryConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await this.saveConfig();
      console.log('✅ Configuration updated');
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
    }
  }

  /**
   * Add a listener for library changes
   */
  addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of library changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Check if the library is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clear the entire library
   */
  async clearLibrary(): Promise<boolean> {
    try {
      console.log('🎵 Clearing music library...');
      
      // Create backup before clearing
      await this.createBackup();
      
      // Clear tracks
      this.tracks.clear();
      
      // Save empty library
      await this.saveLibrary();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log('✅ Library cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear library:', error);
      return false;
    }
  }
}

// Export singleton instance
export const musicLibrary = new MusicLibraryManager();