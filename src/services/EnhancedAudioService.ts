// src/services/EnhancedAudioService.ts
import { Track } from '../types';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  volume: number;
  isMuted: boolean;
}

interface QueueItem {
  track: Track;
  index: number;
  addedAt: number;
}

interface PlaybackSession {
  id: string;
  startTime: number;
  tracks: Track[];
  currentIndex: number;
  totalPlayTime: number;
  skipCount: number;
  repeatCount: number;
}

class EnhancedAudioServiceClass {
  private audioElements: Record<string, HTMLAudioElement> = {};
  private states: Record<string, AudioState> = {};
  private queue: QueueItem[] = [];
  private history: Track[] = [];
  private currentSession: PlaybackSession | null = null;
  private crossfadeEnabled = false;
  private crossfadeDuration = 3000; // 3 seconds
  private offlineCache = new Map<string, Blob>();
  private progressListeners = new Set<(trackId: string, progress: number) => void>();
  private stateListeners = new Set<(trackId: string, state: AudioState) => void>();

  // Enhanced initialization with offline support
  async initialize(): Promise<void> {
    try {
      console.log('🎵 Initializing EnhancedAudioService...');
      console.log('🎵 Checking audio context availability...');
      // Initialize audio context for better browser compatibility
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        console.log(`🎵 Audio context created with state: ${ctx.state}`);
        if (ctx.state === 'suspended') {
          console.log('🎵 Audio context suspended, attempting to resume...');
          await ctx.resume();
          console.log(`🎵 After resume attempt, audio context state: ${ctx.state}`);
        }
        // Don't close the context as it's needed for audio playback
        console.log(`🎵 Audio context state: ${ctx.state}`);
      }

      // Load offline cache
      console.log('🎵 Attempting to load offline cache...');
      await this.loadOfflineCache();
      
      console.log('🎛️ Enhanced Audio Service initialized');
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  // Create or get audio element with enhanced features
  getAudioElement(trackId: string, track: Track): HTMLAudioElement {
    console.log(`🎵 getAudioElement called for track: "${track.title}" (ID: ${trackId})`);
    if (!this.audioElements[trackId]) {
      console.log(`🎵 Creating new audio element for: "${track.title || trackId}"`);
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = 0.8; // Ensure volume is set to a reasonable level
      
      // Set initial state
      this.states[trackId] = {
        isPlaying: false,
        currentTime: 0,
        duration: track.duration || 30, // Use track duration or default
        isReady: false,
        isLoading: true,
        error: null,
        volume: 0.8,
        isMuted: false
      };

      audio.onloadedmetadata = () => {
        console.log(`✅ Audio metadata loaded for: "${track.title || trackId}", duration: ${audio.duration}s`);
        this.setState(trackId, {
          duration: isFinite(audio.duration) ? audio.duration : (track.duration || 30),
          isReady: true,
          isLoading: false,
          error: null
        });
      };
      
      audio.oncanplaythrough = () => {
        console.log(`🎵 Audio ready to play: "${track.title || trackId}"`);
        this.setState(trackId, {
          isReady: true,
          isLoading: false,
          error: null
        });
      };
      
      audio.onerror = (e) => {
        const errorEvent = e as ErrorEvent;
        const errorCode = audio.error ? audio.error.code : 'unknown';
        const errorMessage = audio.error ? audio.error.message : 'Unknown error';
        
        console.warn(`❌ Audio load error for "${track.title || trackId}": Code ${errorCode}, Message: ${errorMessage}`);
        console.log(`🎵 Audio load failed, demo mode available for: "${track.title || trackId}"`);
        
        this.setState(trackId, {
          isReady: true, // Allow demo mode
          isLoading: false,
          error: null
        });
      };
      
      audio.ontimeupdate = () => {
        this.setState(trackId, {
          currentTime: audio.currentTime
        });
      };
      
      audio.onplay = () => {
        console.log(`▶️ Audio playing: "${track.title || trackId}"`);
        this.setState(trackId, { isPlaying: true });
      };
      
      audio.onpause = () => {
        console.log(`⏸️ Audio paused: "${track.title || trackId}"`);
        this.setState(trackId, { isPlaying: false });
      };
      
      audio.onended = () => {
        console.log(`⏹️ Audio ended: "${track.title || trackId}"`);
        this.setState(trackId, { 
          isPlaying: false,
          currentTime: 0
        });
      };

      this.audioElements[trackId] = audio;
      
      // Load the audio source
      this.loadAudioSource(trackId, track);
    } else {
      console.log(`🎵 Reusing existing audio element for: "${track.title || trackId}"`);
    }
    
    return this.audioElements[trackId];
  }

  // Enhanced audio source loading with offline cache
  private async loadAudioSource(trackId: string, track: Track): Promise<void> {
    const audio = this.audioElements[trackId];
    console.log(`🎵 Loading audio source for: ${track.title || trackId}${track.url ? ` from ${track.url.substring(0, 30)}...` : ' (no URL provided)'}`);
    
    // Check offline cache first
    const cachedBlob = this.offlineCache.get(trackId);
    if (cachedBlob) {
      console.log(`🎵 Found track ${trackId} in offline cache, creating object URL`);
      const objectUrl = URL.createObjectURL(cachedBlob);
      audio.src = objectUrl;
      audio.load();
      console.log(`🎵 Loaded from cache: "${track.title || trackId}", URL: ${objectUrl.substring(0, 30)}...`);
      return;
    }

    // Load from URL
    if (track.url) {
      try {
        console.log(`🎵 Attempting to load from URL: ${track.url.substring(0, 30)}...`);
        // Validate URL format
        if (!track.url.startsWith('http') && 
            !track.url.startsWith('blob:') && 
            !track.url.startsWith('data:') && 
            !track.url.startsWith('https://actions.google.com/')) {
          console.error(`🎵 Invalid URL format for ${track.title}: ${track.url.substring(0, 30)}...`);
          throw new Error(`Invalid URL format: ${track.url.substring(0, 30)}...`);
        }
        
        console.log(`🎵 Setting audio source for "${track.title || trackId}": ${track.url.substring(0, 30)}...`);
        audio.src = track.url;
        audio.volume = 0.8; // Ensure volume is set
        audio.muted = false; // Ensure not muted
        audio.load();
        
        // Cache for offline use (skip data URLs)
        console.log(`🎵 Checking if URL should be cached: ${!track.url.startsWith('data:') && !track.url.startsWith('blob:')}`);
        if (!track.url.startsWith('data:') && 
            !track.url.startsWith('blob:') && 
            !track.url.includes('localhost') && 
            !track.url.includes('127.0.0.1')) {
          console.log(`🎵 Caching track ${trackId} for offline use`);
          this.cacheTrack(trackId, track.url);
        } else {
          console.log(`🎵 Skipping cache for "${track.title || trackId}" - using blob/data URL`);
        }
      } catch (error) {
        console.warn(`❌ Failed to load "${track.title || trackId}":`, error);
        this.setState(trackId, {
          error: null,
          isLoading: false,
          isReady: true
        });
      }
    } else {
      // No URL provided, set ready for demo mode
      console.log(`⚠️ No URL provided for "${track.title || trackId}", using demo mode`);
      this.setState(trackId, {
        error: null,
        isLoading: false,
        isReady: true
      });
    }
  }

  // Cache track for offline playback with detailed logging
  private async cacheTrack(trackId: string, url: string): Promise<void> {
    console.log(`🎵 Starting cache process for track ${trackId}`);
    
    try {
      // Skip caching for blob and data URLs as they're already local resources
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        console.log(`⏩ Skipping cache for local resource: ${url.substring(0, 30)}...`);
        return;
      }
      
      console.log(`🎵 Fetching URL for caching: ${url.substring(0, 30)}...`);
      
      // Try different fetch approaches with fallbacks
      let response;
      try {
        console.log(`🔄 Attempt 1: Starting fetch with no-cors mode`);
        response = await fetch(url, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'force-cache'
        });
      } catch (fetchError) {
        console.warn(`⚠️ First fetch attempt failed:`, fetchError);
        console.log(`🔄 Attempt 2: Trying with default options`);
        response = await fetch(url);
      }
      
      console.log(`🎵 Fetch response status: ${response.status}`);
      
      // Check if response is opaque (no-cors mode)
      if (response.type === 'opaque') {
        console.log(`⚠️ Received opaque response (no-cors mode), using URL directly`);
        // We can't read from opaque responses, so we'll just use the URL directly
        return;
      } else if (!response.ok) {
        console.error(`❌ Fetch failed with status: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log(`✅ Fetch successful, status: ${response.status} ${response.statusText}`);
      console.log(`🔍 Response headers:`, Object.fromEntries([...response.headers.entries()]));
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log(`🎵 Content-Type: ${contentType || 'not specified'}`);
      
      if (contentType && !contentType.includes('audio/') && 
          !contentType.includes('application/octet-stream') && 
          !contentType.includes('video/')) {
        console.warn(`⚠️ Unexpected content type: ${contentType}, but continuing anyway`);
      }
      
      try {
        const blob = await response.blob();
        console.log(`🎵 Created blob of size: ${blob.size} bytes, type: ${blob.type}`);
        
        this.offlineCache.set(trackId, blob);
        console.log(`💾 Track ${trackId} cached successfully`);
        
        // Store in IndexedDB for persistence
        console.log(`🎵 Storing track ${trackId} in IndexedDB`);
        this.storeInIndexedDB(trackId, blob);
      } catch (blobError) {
        console.warn(`⚠️ Failed to create blob from response:`, blobError);
        // Continue without caching - the audio can still play from the original URL
      }
    } catch (error) {
      console.error(`❌ Failed to cache track ${trackId}:`, error);
      console.error(`❌ Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }

  // Store in IndexedDB for offline persistence
  private async storeInIndexedDB(trackId: string, blob: Blob): Promise<void> {
    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, skipping offline storage');
        return;
      }
      
      console.log(`🗄️ Attempting to store track ${trackId} in IndexedDB`);
      
      // Open database with error handling
      const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('DJ-Sensee-Audio', 1);
        
        request.onerror = (event) => {
          console.warn('IndexedDB error:', event);
          reject(new Error('Failed to open IndexedDB'));
        };
        
        request.onupgradeneeded = (event) => {
          console.log(`🗄️ Creating/upgrading IndexedDB`);
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('tracks')) {
            db.createObjectStore('tracks');
            console.log(`🗄️ Created 'tracks' object store`);
          }
        };
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log(`🗄️ IndexedDB opened successfully`);
          resolve(db);
        };
      });
      
      // Store blob in database
      const db = await dbPromise;
      try {
        console.log(`🗄️ Starting transaction to store track ${trackId}`);
        const transaction = db.transaction(['tracks'], 'readwrite');
        const store = transaction.objectStore('tracks');
        
        const putRequest = store.put(blob, trackId);
        
        putRequest.onsuccess = () => {
          console.log(`✅ Track ${trackId} stored in IndexedDB successfully`);
        };
        
        putRequest.onerror = (event) => {
          console.error(`❌ Failed to store track in IndexedDB:`, event);
        };
        
        transaction.oncomplete = () => {
          console.log(`🗄️ IndexedDB transaction completed`);
          db.close();
        };
      } catch (error) {
        console.warn('IndexedDB transaction failed:', error);
      }
    } catch (error) {
      console.warn('IndexedDB storage failed:', error);
    }
  }

  // Load offline cache from IndexedDB
  private async loadOfflineCache(): Promise<void> {
    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, skipping offline cache loading');
        return;
      }
      
      console.log(`🗄️ Attempting to load offline cache from IndexedDB`);
      
      // Open database with promise wrapper
      const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('DJ-Sensee-Audio', 1);
        
        request.onerror = (event) => {
          console.log('IndexedDB access denied or not available:', event);
          reject(new Error('IndexedDB access denied'));
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('tracks')) {
            db.createObjectStore('tracks');
          }
        };
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log(`🗄️ IndexedDB opened successfully for loading cache`);
          resolve(db);
        };
      });
      
      // Load cached tracks
      const db = await dbPromise;
      if (db.objectStoreNames.contains('tracks')) {
        console.log(`🗄️ Found 'tracks' object store, loading cached tracks`);
        const transaction = db.transaction(['tracks'], 'readonly');
        const store = transaction.objectStore('tracks');
        
        // Get all keys first
        const getAllKeysRequest = store.getAllKeys();
        const keys = await new Promise<IDBValidKey[]>((resolve) => {
          getAllKeysRequest.onsuccess = () => {
            console.log(`🗄️ Found ${getAllKeysRequest.result.length} cached tracks`);
            resolve(getAllKeysRequest.result);
          };
          getAllKeysRequest.onerror = (event) => {
            console.error(`❌ Failed to get keys from IndexedDB:`, event);
            resolve([]);
          };
        });
        
        console.log(`🗄️ Loading ${keys.length} tracks from IndexedDB cache`);
        
        // Load each blob by key
        let loadedCount = 0;
        for (const key of keys) {
          const getRequest = store.get(key);
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              this.offlineCache.set(key.toString(), getRequest.result);
              loadedCount++;
              console.log(`🗄️ Loaded track ${key} from IndexedDB (${loadedCount}/${keys.length})`);
            }
          };
          getRequest.onerror = (event) => {
            console.error(`❌ Failed to load track ${key} from IndexedDB:`, event);
          };
        }
        
        transaction.oncomplete = () => {
          console.log(`✅ Loaded ${loadedCount}/${keys.length} tracks from offline cache`);
          db.close();
        };
      } else {
        console.log(`🗄️ No 'tracks' object store found in IndexedDB`);
      }
    } catch (error) {
      console.warn('Failed to load offline cache:', error);
    }
  }

  // Enhanced play with session tracking and detailed logging
  async play(trackId: string, track?: Track): Promise<void> {
    // Auto-create audio element if it doesn't exist and track is provided
    if (!this.audioElements[trackId] && track) {  
      console.log(`🎵 Creating audio element for track: ${track.title}, URL: ${track.url ? track.url.substring(0, 30) + '...' : 'none'}`);
      this.getAudioElement(trackId, track);
    }
    
    const audio = this.audioElements[trackId];
    if (!audio || !trackId) {
      const errorMessage = `No audio element found for trackId: ${trackId}. Make sure to call getAudioElement first or provide track data.`;
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      console.log(`🎵 Attempting to play track: "${trackId}"`);
      console.log(`🎵 Audio element exists: ${!!audio}, Has source: ${!!audio?.src}, Source: ${audio?.src ? audio.src.substring(0, 30) + '...' : 'none'}`);
      this.setState(trackId, { isLoading: true });
      
      // Pause other tracks for single-player mode
      this.pauseAllExcept(trackId);
      
      if (!audio.src || audio.src === '') {
        console.log(`⚠️ No audio source, using simulated playback for: ${trackId}`);
        this.startSimulatedPlayback(trackId);
        return;
      }
      
      // Check if URL is valid and accessible
      if (audio.src.startsWith('http')) {
        try {
          // Test if the URL is accessible with a HEAD request
          console.log(`🔍 Testing audio URL accessibility: ${audio.src.substring(0, 30)}...`);
          const testResponse = await fetch(audio.src, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'force-cache'
          });
          console.log(`✅ URL test successful: ${testResponse.status}`);
        } catch (urlTestError) {
          console.warn(`⚠️ URL test failed, falling back to simulated playback:`, urlTestError);
          this.startSimulatedPlayback(trackId);
          return;
        }
      }
      
      // Force volume and unmute
      if (audio.volume === 0) {
        console.log(`🔊 Setting default volume to 0.8 for "${trackId}"`);
        audio.volume = 0.8;
      }
      
      if (audio.muted) {
        console.log(`🔊 Unmuting audio for "${trackId}"`);
        audio.muted = false;
      }
      
      // Log audio element state before playing
      console.log(`🔍 Audio element state before play for "${trackId}":`, {
        src: audio.src.substring(0, 50) + '...',
        readyState: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][audio.readyState] || audio.readyState,
        networkState: ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][audio.networkState] || audio.networkState,
        volume: audio.volume,
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime,
        duration: audio.duration,
        error: audio.error ? { code: audio.error.code, message: audio.error.message } : null
      });
      
      await audio.play();
      console.log(`✅ Successfully playing track: "${trackId}"`);
      
      this.setState(trackId, { 
        isLoading: false,
        isPlaying: true,
        error: null
      });
      
      // Log audio element state after successful play
      console.log(`🔍 Audio element state after play for "${trackId}":`, {
        readyState: audio.readyState,
        paused: audio.paused,
        currentTime: audio.currentTime
      });
    } catch (error) {
      console.warn(`❌ Audio playback error details:`, error);
      
      // Check if error is related to CORS
      if (error.name === 'NotAllowedError' || 
          error.message?.includes('CORS') || 
          error.message?.includes('cross-origin')) {
        console.warn(`⚠️ CORS issue detected, using simulated playback`);
      } else if (error.name === 'AbortError') {
        console.warn(`⚠️ Request aborted, using simulated playback`);
      } else if (error.name === 'NotSupportedError') {
        console.warn(`⚠️ Audio format not supported, using simulated playback`);
      }
      
      console.log(`🎵 Falling back to simulated playback for: "${trackId}"`);
      this.startSimulatedPlayback(trackId);
    }
  }

  // Pause all tracks except the specified one
  private pauseAllExcept(excludeTrackId: string): void {
    Object.keys(this.audioElements).forEach(trackId => {
      if (trackId !== excludeTrackId) {
        console.log(`⏸️ Auto-pausing track ${trackId} (not the current track)`);
        this.pause(trackId);
      }
    });
  }

  // Enhanced pause with logging
  pause(trackId: string): void {
    const audio = this.audioElements[trackId];
    if (!audio) {
      console.log(`⚠️ No audio element found for "${trackId}" when trying to pause`);
    } else {
      try {
        console.log(`⏸️ Attempting to pause track: "${trackId}"`);
        audio.pause();
        console.log(`✅ Successfully paused track: "${trackId}"`);
      } catch (error) {
        console.warn(`❌ Audio pause failed for "${trackId}":`, error);
      }
    }
    
    this.stopSimulatedPlayback(trackId);
    this.setState(trackId, { isPlaying: false });
  }

  // Enhanced simulated playback with detailed logging
  private startSimulatedPlayback(trackId: string): void {
    const state = this.states[trackId];
    if (!state) {
      console.warn(`No state found for track ${trackId}, cannot start simulated playback`);
      return;
    }
    
    console.log(`🎵 Starting simulated playback for track: ${trackId}`);
    
    this.setState(trackId, {
      isLoading: false,
      isPlaying: true,
      error: null
    });
    
    const duration = state.duration || 30;
    let currentTime = state.currentTime || 0;
    
    // Clear existing interval
    this.stopSimulatedPlayback(trackId);
    
    console.log(`⏱️ Simulating playback from ${currentTime}s to ${duration}s for "${trackId}"`);
    
    (this as any).intervals = (this as any).intervals || {};
    (this as any).intervals[trackId] = setInterval(() => {
      if (!this.states[trackId]?.isPlaying) {
        console.log(`🎵 Simulated playback stopped for track: ${trackId}`);
        this.stopSimulatedPlayback(trackId);
        return;
      }
      
      currentTime += 0.5;
      this.setState(trackId, { currentTime });
      
      // Notify progress listeners
      this.progressListeners.forEach(listener => {
        listener(trackId, currentTime);
      });
      
      if (currentTime >= duration) {
        console.log(`🎵 Simulated playback completed for track: ${trackId}`);
        this.stopSimulatedPlayback(trackId);
        this.setState(trackId, {
          isPlaying: false,
          currentTime: 0
        });
        this.handleTrackEnd(trackId);
      }
    }, 500);
    
    console.log(`✅ Simulated playback started for "${trackId}"`);
  }

  // Stop simulated playback with logging
  private stopSimulatedPlayback(trackId: string): void {
    if ((this as any).intervals?.[trackId]) {
      console.log(`⏹️ Stopping simulated playback interval for "${trackId}"`);
      clearInterval((this as any).intervals[trackId]);
      delete (this as any).intervals[trackId];
    }
  }

  // Queue management
  addToQueue(track: Track, index?: number): void {
    const queueItem: QueueItem = {
      track,
      index: index ?? this.queue.length,
      addedAt: Date.now()
    };
    
    if (index !== undefined) {
      this.queue.splice(index, 0, queueItem);
    } else {
      this.queue.push(queueItem);
    }
    
    console.log(`📝 Added to queue: "${track.title}"`);
  }

  removeFromQueue(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`🗑️ Removed from queue: "${removed.track.title}"`);
    }
  }

  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    console.log('🧹 Queue cleared');
  }

  // Crossfade functionality
  enableCrossfade(duration: number = 3000): void {
    this.crossfadeEnabled = true;
    this.crossfadeDuration = duration;
    console.log(`🎚️ Crossfade enabled: ${duration}ms`);
  }

  disableCrossfade(): void {
    this.crossfadeEnabled = false;
    console.log('🎚️ Crossfade disabled');
  }

  private shouldStartCrossfade(trackId: string, currentTime: number): boolean {
    const state = this.states[trackId];
    if (!state || !this.crossfadeEnabled) return false;
    
    const timeRemaining = state.duration - currentTime;
    return timeRemaining <= (this.crossfadeDuration / 1000) && this.queue.length > 0;
  }

  private async startCrossfade(currentTrackId: string): Promise<void> {
    if (this.queue.length === 0) return;
    
    const nextItem = this.queue[0];
    const nextTrackId = nextItem.track.id.toString();
    
    console.log(`🎚️ Starting crossfade from "${currentTrackId}" to "${nextTrackId}"`);
    
    // Start next track
    this.getAudioElement(nextTrackId, nextItem.track);
    await this.play(nextTrackId);
    
    // Fade out current, fade in next
    this.fadeOut(currentTrackId, this.crossfadeDuration);
    this.fadeIn(nextTrackId, this.crossfadeDuration);
    
    // Remove from queue
    this.removeFromQueue(0);
    
    console.log(`🎚️ Crossfading: ${currentTrackId} → ${nextTrackId}`);
  }

  private fadeOut(trackId: string, duration: number): void {
    const audio = this.audioElements[trackId];
    if (!audio) return;
    
    console.log(`🔉 Starting fade out for "${trackId}" over ${duration}ms`);
    
    const startVolume = audio.volume;
    const fadeStep = startVolume / (duration / 50);
    
    const fadeInterval = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - fadeStep);
      if (audio.volume <= 0) {
        clearInterval(fadeInterval);
        this.pause(trackId);
        audio.volume = startVolume; // Reset for next play
        console.log(`🔇 Fade out complete for "${trackId}"`);
      }
    }, 50);
  }

  private fadeIn(trackId: string, duration: number): void {
    const audio = this.audioElements[trackId];
    if (!audio) return;
    
    console.log(`🔈 Starting fade in for "${trackId}" over ${duration}ms`);
    
    const targetVolume = this.states[trackId]?.volume || 0.8;
    audio.volume = 0;
    const fadeStep = targetVolume / (duration / 50);
    
    const fadeInterval = setInterval(() => {
      audio.volume = Math.min(targetVolume, audio.volume + fadeStep);
      if (audio.volume >= targetVolume) {
        clearInterval(fadeInterval);
        console.log(`🔊 Fade in complete for "${trackId}"`);
      }
    }, 50);
  }

  // Session tracking
  startSession(tracks: Track[]): string {
    const sessionId = `session_${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      tracks,
      currentIndex: 0,
      totalPlayTime: 0,
      skipCount: 0,
      repeatCount: 0
    };
    
    console.log(`📊 Session started: ${sessionId} with ${tracks.length} tracks`);
    return sessionId;
  }

  endSession(): PlaybackSession | null {
    const session = this.currentSession;
    this.currentSession = null;
    
    if (session) {
      console.log(`📊 Session ended: ${session.id}, duration: ${(Date.now() - session.startTime) / 1000}s`);
    }
    
    return session;
  }

  private updateSession(trackId: string, action: 'play' | 'skip' | 'repeat'): void {
    if (!this.currentSession) return;
    
    console.log(`📊 Updating session with action: ${action} for track "${trackId}"`);
    
    switch (action) {
      case 'play':
        // Track play time will be updated in ontimeupdate
        break;
      case 'skip':
        this.currentSession.skipCount++;
        break;
      case 'repeat':
        this.currentSession.repeatCount++;
        break;
    }
  }

  // Event listeners
  addProgressListener(listener: (trackId: string, progress: number) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  addStateListener(listener: (trackId: string, state: AudioState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // Enhanced state management
  private setState(trackId: string, updates: Partial<AudioState>): void {
    if (this.states[trackId]) {
      this.states[trackId] = { ...this.states[trackId], ...updates };
      
      // Notify state listeners
      this.stateListeners.forEach(listener => {
        listener(trackId, this.states[trackId]);
      });
    }
  }

  // Handle track end with queue support
  private handleTrackEnd(trackId: string): void {
    console.log(`🎵 Track ended: "${trackId}"`);
    
    // Add to history
    const audio = this.audioElements[trackId];
    if (audio && audio.src) {
      // Find track info and add to history
      // This would need track lookup logic
      console.log(`📚 Adding track "${trackId}" to history`);
    }
    
    // Auto-play next in queue
    if (this.queue.length > 0) {
      const nextItem = this.queue[0];
      this.removeFromQueue(0);
      
      console.log(`🎵 Auto-playing next track in queue: "${nextItem.track.title}"`);
      
      setTimeout(() => {
        this.getAudioElement(nextItem.track.id.toString(), nextItem.track);
        this.play(nextItem.track.id.toString());
      }, 100);
    } else {
      console.log(`🎵 No more tracks in queue after "${trackId}"`);
    }
  }

  // Enhanced volume control
  setVolume(trackId: string, volume: number): void {
    const audio = this.audioElements[trackId];
    if (audio) {
      const clampedVolume = Math.min(1, Math.max(0, volume));
      console.log(`🔊 Setting volume for "${trackId}" to ${clampedVolume.toFixed(2)}`);
      audio.volume = clampedVolume;
    }
    this.setState(trackId, { volume });
  }

  setMute(trackId: string, muted: boolean): void {
    const audio = this.audioElements[trackId];
    if (audio) {
      console.log(`🔊 ${muted ? 'Muting' : 'Unmuting'} audio for "${trackId}"`);
      audio.muted = muted;
    }
    this.setState(trackId, { isMuted: muted });
  }

  // Enhanced seek with logging
  setCurrentTime(trackId: string, time: number): void {
    const audio = this.audioElements[trackId];
    const state = this.states[trackId];
    
    if (audio && audio.duration) {
      const clampedTime = Math.min(time, audio.duration);
      console.log(`⏱️ Seeking "${trackId}" to ${clampedTime.toFixed(2)}s`);
      audio.currentTime = clampedTime;
    } else {
      console.log(`⏱️ Setting simulated time for "${trackId}" to ${time.toFixed(2)}s`);
    }
    
    if (state) {
      this.setState(trackId, { currentTime: time });
    }
  }

  // Get enhanced state
  getState(trackId: string): AudioState | null {
    return this.states[trackId] || null;
  }

  // Get playback history
  getHistory(): Track[] {
    return [...this.history];
  }

  // Clear history
  clearHistory(): void {
    this.history = [];
    console.log('🧹 History cleared');
  }

  // Preload tracks with progress tracking and detailed logging
  async preloadTracks(tracks: Track[], onProgress?: (loaded: number, total: number) => void): Promise<void> {
    let loaded = 0;
    const total = tracks?.length || 0;
    
    if (!tracks || total === 0) {
      console.warn('⚠️ No tracks to preload');
      return;
    }
    
    console.log(`🎵 Starting preload of ${total} tracks...`);
    
    await Promise.all(tracks.map(async (track) => {
      try {
        const trackId = track.id.toString();
        console.log(`🎵 Preloading track: "${track.title}" (ID: ${trackId})`);
        
        const audio = this.getAudioElement(trackId, track);
        
        await new Promise<void>((resolve) => {
          if (audio.readyState >= 2) {
            console.log(`✅ Track "${track.title}" already loaded (readyState: ${audio.readyState})`);
            loaded++;
            onProgress?.(loaded, total);
            resolve();
          } else {
            console.log(`⏳ Waiting for track "${track.title}" to load...`);
            
            const timeout = setTimeout(() => {
              console.warn(`⚠️ Preload timeout for "${track.title}", continuing...`);
              loaded++;
              onProgress?.(loaded, total);
              resolve();
            }, 3000);
            
            audio.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              console.log(`✅ Track "${track.title}" metadata loaded`);
              loaded++;
              onProgress?.(loaded, total);
              resolve();
            }, { once: true });
            
            audio.addEventListener('error', (e) => {
              clearTimeout(timeout);
              const errorEvent = e as ErrorEvent;
              const errorCode = audio.error ? audio.error.code : 'unknown';
              const errorMessage = audio.error ? audio.error.message : 'Unknown error';
              
              console.warn(`⚠️ Failed to preload "${track.title}": Code ${errorCode}, Message: ${errorMessage}`);
              loaded++;
              onProgress?.(loaded, total);
              resolve(); // Don't reject, just continue
            }, { once: true });
          }
        });
      } catch (error) {
        console.error(`❌ Unexpected error preloading "${track.title}":`, error);
        loaded++;
        onProgress?.(loaded, total);
      }
    }));
    
    console.log(`✅ Preloaded ${loaded}/${total} tracks`);
  }

  // Cleanup with detailed logging
  destroy(): void {
    console.log(`🧹 Starting EnhancedAudioService cleanup...`);
    
    // Stop all intervals
    try {
      if ((this as any).intervals) {
        const intervalCount = Object.keys((this as any).intervals).length;
        console.log(`🧹 Cleaning up ${intervalCount} playback intervals`);
        
        Object.values((this as any).intervals).forEach((interval: any) => {
          clearInterval(interval);
        });
        (this as any).intervals = {};
      }
      
      // Cleanup audio elements
      const audioCount = Object.keys(this.audioElements).length;
      console.log(`🧹 Cleaning up ${audioCount} audio elements`);
      
      Object.entries(this.audioElements).forEach(([trackId, audio]) => {
        try {
          console.log(`🧹 Cleaning up audio for "${trackId}"`);
          audio.pause();
          audio.src = '';
          audio.load();
        } catch (error) {
          console.warn(`⚠️ Error cleaning up audio for "${trackId}":`, error);
        }
      });
      
      // Clear state
      this.audioElements = {};
      this.states = {};
      this.queue = [];
      this.history = [];
      this.currentSession = null;
      this.progressListeners.clear();
      this.stateListeners.clear();
      
      console.log('🧹 Enhanced Audio Service destroyed successfully');
    } catch (error) {
      console.error('❌ Error during EnhancedAudioService cleanup:', error);
    }
  }
}

export const EnhancedAudioService = new EnhancedAudioServiceClass();