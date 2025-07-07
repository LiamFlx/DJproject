/**
 * AudioPlaybackService - Unified service for audio playback
 * This service provides a high-level interface for playing audio
 */

import { Track } from '../types';
import { EnhancedAudioService } from './EnhancedAudioService';
import { AudioStateManager, AudioState } from './AudioStateManager';
import { AudioCacheManager } from './AudioCacheManager';
import { generateProceduralAudio } from '../lib/audioUtils';

class AudioPlaybackServiceClass {
  private currentTrackId: string | null = null;
  private queue: Track[] = [];
  private history: Track[] = [];
  private isInitialized = false;
  private stateListeners = new Set<(state: AudioState) => void>();
  private queueListeners = new Set<(queue: Track[]) => void>();
  private historyListeners = new Set<(history: Track[]) => void>();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🎵 Initializing AudioPlaybackService...');
      
      // Initialize EnhancedAudioService
      await EnhancedAudioService.initialize();
      
      // Initialize AudioCacheManager
      await AudioCacheManager.initialize();
      
      // Add state listener
      EnhancedAudioService.addStateListener((trackId, state) => {
        if (trackId === this.currentTrackId) {
          this.notifyStateListeners(state);
        }
      });
      
      this.isInitialized = true;
      console.log('✅ AudioPlaybackService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AudioPlaybackService:', error);
      throw error;
    }
  }

  /**
   * Play a track
   */
  async play(track: Track): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const trackId = track.id.toString();
      
      // Check if track has a URL
      if (!track.url) {
        console.log(`🎵 Track ${trackId} has no URL, generating procedural audio...`);
        track.url = await generateProceduralAudio();
      }
      
      // Try to get from cache first
      const cachedUrl = await AudioCacheManager.getFromCache(trackId);
      if (cachedUrl) {
        console.log(`🎵 Using cached audio for track ${trackId}`);
        track.url = cachedUrl;
      } else if (track.url) {
        // Cache the audio for future use
        console.log(`🎵 Caching audio for track ${trackId}`);
        const newUrl = await AudioCacheManager.cacheAudio(trackId, track.url);
        if (newUrl) {
          track.url = newUrl;
        }
      }
      
      // Get audio element
      EnhancedAudioService.getAudioElement(trackId, track);
      
      // Play the track
      await EnhancedAudioService.play(trackId);
      
      // Update current track
      this.currentTrackId = trackId;
      
      // Add to history
      this.addToHistory(track);
    } catch (error) {
      console.error('❌ Failed to play track:', error);
      throw error;
    }
  }

  /**
   * Pause the current track
   */
  pause(): void {
    if (this.currentTrackId) {
      EnhancedAudioService.pause(this.currentTrackId);
    }
  }

  /**
   * Stop the current track
   */
  stop(): void {
    if (this.currentTrackId) {
      EnhancedAudioService.pause(this.currentTrackId);
      EnhancedAudioService.setCurrentTime(this.currentTrackId, 0);
    }
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    if (this.currentTrackId) {
      EnhancedAudioService.setCurrentTime(this.currentTrackId, time);
    }
  }

  /**
   * Set the volume
   */
  setVolume(volume: number): void {
    if (this.currentTrackId) {
      EnhancedAudioService.setVolume(this.currentTrackId, volume);
    }
  }

  /**
   * Add a track to the queue
   */
  addToQueue(track: Track): void {
    this.queue.push(track);
    this.notifyQueueListeners();
  }

  /**
   * Remove a track from the queue
   */
  removeFromQueue(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      this.queue.splice(index, 1);
      this.notifyQueueListeners();
    }
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
    this.notifyQueueListeners();
  }

  /**
   * Play the next track in the queue
   */
  async playNext(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const nextTrack = this.queue.shift();
    this.notifyQueueListeners();
    
    if (nextTrack) {
      await this.play(nextTrack);
    }
  }

  /**
   * Add a track to the history
   */
  private addToHistory(track: Track): void {
    // Add to the beginning of the history
    this.history.unshift(track);
    
    // Limit history to 50 items
    if (this.history.length > 50) {
      this.history.pop();
    }
    
    this.notifyHistoryListeners();
  }

  /**
   * Get the current state
   */
  getCurrentState(): AudioState | null {
    if (!this.currentTrackId) return null;
    return EnhancedAudioService.getState(this.currentTrackId);
  }

  /**
   * Get the current track
   */
  getCurrentTrack(): Track | null {
    if (!this.currentTrackId) return null;
    
    // Find the track in history
    return this.history[0] || null;
  }

  /**
   * Get the queue
   */
  getQueue(): Track[] {
    return [...this.queue];
  }

  /**
   * Get the history
   */
  getHistory(): Track[] {
    return [...this.history];
  }

  /**
   * Add a state listener
   */
  addStateListener(listener: (state: AudioState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Add a queue listener
   */
  addQueueListener(listener: (queue: Track[]) => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  /**
   * Add a history listener
   */
  addHistoryListener(listener: (history: Track[]) => void): () => void {
    this.historyListeners.add(listener);
    return () => this.historyListeners.delete(listener);
  }

  /**
   * Notify state listeners
   */
  private notifyStateListeners(state: AudioState): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Notify queue listeners
   */
  private notifyQueueListeners(): void {
    const queue = this.getQueue();
    this.queueListeners.forEach(listener => {
      try {
        listener(queue);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Notify history listeners
   */
  private notifyHistoryListeners(): void {
    const history = this.getHistory();
    this.historyListeners.forEach(listener => {
      try {
        listener(history);
      } catch (error) {
        console.error('Error in history listener:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    EnhancedAudioService.destroy();
    this.stateListeners.clear();
    this.queueListeners.clear();
    this.historyListeners.clear();
    this.currentTrackId = null;
    this.queue = [];
    this.history = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const AudioPlaybackService = new AudioPlaybackServiceClass();