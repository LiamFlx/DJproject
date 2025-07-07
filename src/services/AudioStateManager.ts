/**
 * AudioStateManager - Centralized state management for audio playback
 * This service provides a unified interface for managing audio state
 */

import { Track } from '../types';

// Types
export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  buffered: number;
  retryCount: number;
}

export interface PlaybackSession {
  id: string;
  startTime: number;
  tracks: Track[];
  currentIndex: number;
  totalPlayTime: number;
  skipCount: number;
  repeatCount: number;
}

class AudioStateManagerClass {
  private audioStates = new Map<string, AudioState>();
  private stateListeners = new Set<(trackId: string, state: AudioState) => void>();
  private currentSession: PlaybackSession | null = null;
  private masterVolume = 0.8;

  /**
   * Get the state for a track
   */
  getState(trackId: string): AudioState | null {
    return this.audioStates.get(trackId) || null;
  }

  /**
   * Update the state for a track
   */
  updateState(trackId: string, updates: Partial<AudioState>): void {
    const currentState = this.audioStates.get(trackId);
    
    if (currentState) {
      // Update state
      const newState = { ...currentState, ...updates };
      this.audioStates.set(trackId, newState);
      
      // Notify listeners
      this.notifyListeners(trackId, newState);
    } else {
      // Create new state
      const defaultState: AudioState = {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: this.masterVolume,
        isMuted: false,
        isLoading: true,
        isReady: false,
        error: null,
        buffered: 0,
        retryCount: 0
      };
      
      const newState = { ...defaultState, ...updates };
      this.audioStates.set(trackId, newState);
      
      // Notify listeners
      this.notifyListeners(trackId, newState);
    }
  }

  /**
   * Initialize state for a track
   */
  initializeState(trackId: string, track: Track): void {
    const defaultState: AudioState = {
      isPlaying: false,
      currentTime: 0,
      duration: track.duration || 0,
      volume: this.masterVolume,
      isMuted: false,
      isLoading: true,
      isReady: false,
      error: null,
      buffered: 0,
      retryCount: 0
    };
    
    this.audioStates.set(trackId, defaultState);
    
    // Notify listeners
    this.notifyListeners(trackId, defaultState);
  }

  /**
   * Remove state for a track
   */
  removeState(trackId: string): void {
    this.audioStates.delete(trackId);
  }

  /**
   * Add a state listener
   */
  addStateListener(listener: (trackId: string, state: AudioState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(trackId: string, state: AudioState): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(trackId, state);
      } catch (error) {
        console.error(`Error in state listener for track ${trackId}:`, error);
      }
    });
  }

  /**
   * Start a new playback session
   */
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
    
    console.log(`📊 Started playback session: ${sessionId} with ${tracks.length} tracks`);
    return sessionId;
  }

  /**
   * End the current playback session
   */
  endSession(): PlaybackSession | null {
    const session = this.currentSession;
    this.currentSession = null;
    
    if (session) {
      console.log(`📊 Ended playback session: ${session.id}, duration: ${Math.round((Date.now() - session.startTime) / 1000)}s`);
    }
    
    return session;
  }

  /**
   * Update the current session
   */
  updateSession(action: 'play' | 'pause' | 'skip' | 'seek' | 'complete', trackId: string, position: number): void {
    if (!this.currentSession) return;
    
    switch (action) {
      case 'play':
        // Update current index
        const trackIndex = this.currentSession.tracks.findIndex(t => t.id.toString() === trackId);
        if (trackIndex !== -1) {
          this.currentSession.currentIndex = trackIndex;
        }
        break;
      case 'skip':
        this.currentSession.skipCount++;
        break;
      case 'complete':
        // Track completed successfully
        break;
    }
  }

  /**
   * Set the master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get the master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Clear all state
   */
  clearAll(): void {
    this.audioStates.clear();
    this.currentSession = null;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      activeStates: this.audioStates.size,
      listeners: this.stateListeners.size,
      session: this.currentSession ? {
        id: this.currentSession.id,
        trackCount: this.currentSession.tracks.length,
        currentIndex: this.currentSession.currentIndex,
        duration: Math.round((Date.now() - this.currentSession.startTime) / 1000)
      } : null,
      masterVolume: this.masterVolume
    };
  }
}

// Export singleton instance
export const AudioStateManager = new AudioStateManagerClass();