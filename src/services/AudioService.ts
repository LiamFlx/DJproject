// src/AudioService.ts

import { SmartMetadataService } from "./SmartMetadataService";
import { AudioSynthEngine } from "./AudioSynthEngine";
import { AudioPlaybackManager, MusicPlayer } from "./AudioPlaybackManager";
import { AudioAnalysisService } from "./AudioAnalysisService";
import { AudioPreloader } from "./AudioPreloader";
import { AudioStateManager } from "./AudioStateManager";
import { AudioTrack, EnhancedTrack, AudioState } from "../types/AudioTypes";

class AudioServiceClass {
  private audioStates = new Map<string, AudioState>();
  private audioElements = new Map<string, HTMLAudioElement>();
  private musicPlayers = new Map<string, MusicPlayer>();
  private trackData = new Map<string, EnhancedTrack>();
  private preloadedTracks = new Set<string>();

  private stateManager = AudioStateManager;

  constructor() {
    this.stateManager.inject(
      this.audioStates,
      this.musicPlayers,
      this.trackData,
      this.audioElements,
      this.preloadedTracks
    );
  }

  getAudioElement(trackId: string, track: AudioTrack): HTMLAudioElement {
    const enhancedTrack = SmartMetadataService.enhanceTrackMetadata(track);
    this.trackData.set(trackId, enhancedTrack);

    const audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.8;

    this.audioElements.set(trackId, audio);
    this.audioStates.set(trackId, {
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      volume: 0.8,
      isLoading: true,
      error: null,
      isReady: false,
      retryCount: 0,
      buffered: 0
    });

    this.generateMusic(trackId, enhancedTrack);

    return audio;
  }

  private async generateMusic(trackId: string, track: EnhancedTrack): Promise<void> {
    try {
      const ctx = this.stateManager.getContext();
      const pattern = SmartMetadataService.generateMusicPattern(track);

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.8;
      gainNode.connect(ctx.destination);

      const drumBuffers = {
        kick: AudioSynthEngine.createDrumSound(ctx, 'kick', track.genre),
        snare: AudioSynthEngine.createDrumSound(ctx, 'snare', track.genre),
        hihat: AudioSynthEngine.createDrumSound(ctx, 'hihat', track.genre)
      };

      this.musicPlayers.set(trackId, {
        isPlaying: false,
        gainNode,
        scheduledEvents: [],
        currentPattern: pattern,
        startTime: 0
      });

      this.stateManager.updateState(trackId, {
        isReady: true,
        isLoading: false,
        buffered: 100
      });

      console.log(`✅ Pattern ready for ${track.title} (${pattern.tempo} BPM)`);
    } catch (error) {
      console.error(`❌ Pattern generation failed: ${trackId}`, error);
      this.stateManager.updateState(trackId, {
        error: 'Music generation failed',
        isLoading: false,
        isReady: false
      });
    }
  }

  async play(trackId: string): Promise<void> {
    const ctx = this.stateManager.getContext();
    const player = this.musicPlayers.get(trackId);
    const track = this.trackData.get(trackId);

    if (!player || !track || !ctx) {
      console.warn(`❗ Missing playback data for ${trackId}`);
      return;
    }

    AudioPlaybackManager.stopPlayback(player); // stop previous
    AudioPlaybackManager.startPlayback(
      ctx,
      trackId,
      player,
      track,
      AudioPlaybackManager.scheduleNote,
      () => ({
        kick: AudioSynthEngine.createDrumSound(ctx, 'kick', track.genre),
        snare: AudioSynthEngine.createDrumSound(ctx, 'snare', track.genre),
        hihat: AudioSynthEngine.createDrumSound(ctx, 'hihat', track.genre)
      })
    );

    this.stateManager.updateState(trackId, { isPlaying: true });
  }

  pause(trackId: string): void {
    const player = this.musicPlayers.get(trackId);
    if (player) {
      AudioPlaybackManager.stopPlayback(player);
      this.stateManager.updateState(trackId, { isPlaying: false });
    }
  }

  stop(trackId: string): void {
    this.pause(trackId);
    this.stateManager.setCurrentTime(trackId, 0);
  }

  setVolume(trackId: string, volume: number): void {
    this.stateManager.setVolume(trackId, volume);
  }

  setCurrentTime(trackId: string, time: number): void {
    this.stateManager.setCurrentTime(trackId, time);
  }

  async preload(tracks: AudioTrack[]): Promise<void> {
    await AudioPreloader.preloadTracks(
      tracks,
      this.getAudioElement.bind(this),
      (id) => this.audioStates.get(id)?.isReady === true,
      (id) => this.preloadedTracks.add(id)
    );
  }

  async analyze(trackId: string) {
    const ctx = this.stateManager.getContext();
    const player = this.musicPlayers.get(trackId);
    return AudioAnalysisService.analyzeAudio(ctx, player!);
  }

  dispose(trackId: string): void {
    this.stateManager.disposeTrack(trackId);
  }

  disposeAll(): void {
    this.stateManager.disposeAll();
  }

  getState(trackId: string): AudioState | null {
    return this.stateManager.getState(trackId);
  }

  getTrackData(trackId: string): EnhancedTrack | null {
    return this.stateManager.getTrack(trackId);
  }

  getMasterVolume(): number {
    return this.stateManager.getMasterVolume();
  }

  getDebugInfo() {
    return this.stateManager.getDebugInfo();
  }
}

export const AudioService = new AudioServiceClass();
