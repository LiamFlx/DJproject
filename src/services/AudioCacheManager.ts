/**
 * AudioCacheManager - Handles caching of audio files for offline playback
 * This service provides a unified interface for caching and retrieving audio files
 */

import localforage from 'localforage';

// Configuration
const CACHE_NAME = 'audio-cache';
const CACHE_VERSION = 1;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB

// Initialize localforage
const audioCache = localforage.createInstance({
  name: 'DJ-Sensee',
  storeName: CACHE_NAME,
  description: 'Audio file cache for offline playback'
});

// Metadata store
const metadataCache = localforage.createInstance({
  name: 'DJ-Sensee',
  storeName: 'audio-metadata',
  description: 'Metadata for cached audio files'
});

// Types
interface CacheMetadata {
  trackId: string;
  url: string;
  size: number;
  timestamp: number;
  expires: number;
  mimeType: string;
  version: number;
}

class AudioCacheManagerClass {
  private initialized = false;
  private cacheSize = 0;
  private metadata: Map<string, CacheMetadata> = new Map();

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🎵 Initializing audio cache manager...');
    
    try {
      // Load metadata
      await this.loadMetadata();
      
      // Clean expired items
      await this.cleanExpiredItems();
      
      this.initialized = true;
      console.log(`✅ Audio cache initialized with ${this.metadata.size} items (${this.formatSize(this.cacheSize)})`);
    } catch (error) {
      console.error('❌ Failed to initialize audio cache:', error);
    }
  }

  /**
   * Load metadata from storage
   */
  private async loadMetadata(): Promise<void> {
    try {
      const keys = await metadataCache.keys();
      
      let totalSize = 0;
      for (const key of keys) {
        const metadata = await metadataCache.getItem<CacheMetadata>(key);
        if (metadata) {
          this.metadata.set(key, metadata);
          totalSize += metadata.size;
        }
      }
      
      this.cacheSize = totalSize;
      console.log(`🎵 Loaded metadata for ${this.metadata.size} cached items`);
    } catch (error) {
      console.error('❌ Failed to load cache metadata:', error);
    }
  }

  /**
   * Clean expired items from cache
   */
  private async cleanExpiredItems(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Find expired items
    this.metadata.forEach((metadata, key) => {
      if (metadata.expires < now) {
        expiredKeys.push(key);
      }
    });
    
    if (expiredKeys.length === 0) return;
    
    console.log(`🧹 Cleaning ${expiredKeys.length} expired items from cache...`);
    
    // Remove expired items
    for (const key of expiredKeys) {
      await this.removeFromCache(key);
    }
    
    console.log(`✅ Removed ${expiredKeys.length} expired items from cache`);
  }

  /**
   * Add an item to the cache
   */
  async cacheAudio(trackId: string, url: string): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    try {
      // Skip if already cached
      if (this.metadata.has(trackId)) {
        const metadata = this.metadata.get(trackId)!;
        console.log(`🎵 Track ${trackId} already cached (${this.formatSize(metadata.size)})`);
        return URL.createObjectURL(await audioCache.getItem<Blob>(trackId));
      }
      
      // Skip for data URLs and blob URLs
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        console.log(`⏩ Skipping cache for ${url.substring(0, 30)}...`);
        return url;
      }
      
      console.log(`🎵 Caching audio for track ${trackId} from ${url.substring(0, 30)}...`);
      
      // Fetch the audio file
      const response = await fetch(url, { mode: 'cors' });
      
      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch audio: ${response.status} ${response.statusText}`);
        return url;
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Check if we need to make room in the cache
      if (this.cacheSize + blob.size > MAX_CACHE_SIZE) {
        await this.makeRoomInCache(blob.size);
      }
      
      // Store the blob
      await audioCache.setItem(trackId, blob);
      
      // Update metadata
      const metadata: CacheMetadata = {
        trackId,
        url,
        size: blob.size,
        timestamp: Date.now(),
        expires: Date.now() + CACHE_EXPIRY,
        mimeType: blob.type,
        version: CACHE_VERSION
      };
      
      await metadataCache.setItem(trackId, metadata);
      this.metadata.set(trackId, metadata);
      this.cacheSize += blob.size;
      
      console.log(`✅ Cached audio for track ${trackId} (${this.formatSize(blob.size)})`);
      
      // Return object URL
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`❌ Failed to cache audio for track ${trackId}:`, error);
      return url;
    }
  }

  /**
   * Get an item from the cache
   */
  async getFromCache(trackId: string): Promise<string | null> {
    if (!this.initialized) await this.initialize();
    
    try {
      // Check if item exists in cache
      if (!this.metadata.has(trackId)) {
        console.log(`⚠️ Track ${trackId} not found in cache`);
        return null;
      }
      
      // Get the blob
      const blob = await audioCache.getItem<Blob>(trackId);
      
      if (!blob) {
        console.warn(`⚠️ Blob for track ${trackId} not found in cache`);
        return null;
      }
      
      // Update metadata
      const metadata = this.metadata.get(trackId)!;
      metadata.timestamp = Date.now();
      metadata.expires = Date.now() + CACHE_EXPIRY;
      await metadataCache.setItem(trackId, metadata);
      
      console.log(`✅ Retrieved track ${trackId} from cache (${this.formatSize(metadata.size)})`);
      
      // Return object URL
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`❌ Failed to get track ${trackId} from cache:`, error);
      return null;
    }
  }

  /**
   * Remove an item from the cache
   */
  async removeFromCache(trackId: string): Promise<void> {
    try {
      // Check if item exists in cache
      if (!this.metadata.has(trackId)) {
        return;
      }
      
      // Get metadata
      const metadata = this.metadata.get(trackId)!;
      
      // Remove from storage
      await audioCache.removeItem(trackId);
      await metadataCache.removeItem(trackId);
      
      // Update metadata map
      this.metadata.delete(trackId);
      this.cacheSize -= metadata.size;
      
      console.log(`🗑️ Removed track ${trackId} from cache (${this.formatSize(metadata.size)})`);
    } catch (error) {
      console.error(`❌ Failed to remove track ${trackId} from cache:`, error);
    }
  }

  /**
   * Make room in the cache for a new item
   */
  private async makeRoomInCache(requiredSize: number): Promise<void> {
    // Sort items by timestamp (oldest first)
    const items = Array.from(this.metadata.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let freedSpace = 0;
    const removedItems: string[] = [];
    
    // Remove items until we have enough space
    for (const [key, metadata] of items) {
      if (this.cacheSize - freedSpace + requiredSize <= MAX_CACHE_SIZE) {
        break;
      }
      
      // Remove item
      await audioCache.removeItem(key);
      await metadataCache.removeItem(key);
      
      // Update metadata
      this.metadata.delete(key);
      freedSpace += metadata.size;
      removedItems.push(key);
    }
    
    this.cacheSize -= freedSpace;
    
    if (removedItems.length > 0) {
      console.log(`🧹 Removed ${removedItems.length} items from cache to free up ${this.formatSize(freedSpace)}`);
    }
  }

  /**
   * Clear the entire cache
   */
  async clearCache(): Promise<void> {
    try {
      console.log('🧹 Clearing audio cache...');
      
      // Clear storage
      await audioCache.clear();
      await metadataCache.clear();
      
      // Reset metadata
      this.metadata.clear();
      this.cacheSize = 0;
      
      console.log('✅ Audio cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear audio cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    itemCount: number;
    totalSize: number;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;
    
    this.metadata.forEach(metadata => {
      if (metadata.timestamp < oldestTimestamp) {
        oldestTimestamp = metadata.timestamp;
      }
      if (metadata.timestamp > newestTimestamp) {
        newestTimestamp = metadata.timestamp;
      }
    });
    
    return {
      itemCount: this.metadata.size,
      totalSize: this.cacheSize,
      oldestItem: oldestTimestamp !== Number.MAX_SAFE_INTEGER ? new Date(oldestTimestamp) : null,
      newestItem: newestTimestamp !== 0 ? new Date(newestTimestamp) : null
    };
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

// Export singleton instance
export const AudioCacheManager = new AudioCacheManagerClass();