// src/services/AudioPlaybackManager.ts

import { AudioSynthEngine } from './AudioSynthEngine';
import { EnhancedTrack, MusicPattern } from '../types/AudioTypes';

export interface MusicPlayer {
  isPlaying: boolean;
  gainNode: GainNode | null;
  scheduledEvents: number[];
  currentPattern: MusicPattern | null;
  startTime: number;
}

export class AudioPlaybackManager {
  private static readonly LOOKAHEAD = 25.0; // ms
  private static readonly SCHEDULE_AHEAD = 0.1; // sec

  static startPlayback(
    audioContext: AudioContext,
    trackId: string,
    player: MusicPlayer,
    track: EnhancedTrack,
    scheduleNoteFn: (
      beat: number,
      time: number,
      gainNode: GainNode,
      track: EnhancedTrack,
      pattern: MusicPattern,
      drumSounds: Record<string, AudioBuffer>
    ) => void,
    createDrumBuffersFn: () => Record<string, AudioBuffer>
  ): void {
    if (!player || !player.currentPattern || !player.gainNode) return;

    const pattern = player.currentPattern;
    const beatDuration = 60 / pattern.tempo;
    const drumBuffers = createDrumBuffersFn();

    let nextNoteTime = audioContext.currentTime;
    let currentBeat = 0;

    player.isPlaying = true;
    player.startTime = audioContext.currentTime;

    const scheduler = () => {
      if (!player.isPlaying) return;

      while (nextNoteTime < audioContext.currentTime + AudioPlaybackManager.SCHEDULE_AHEAD) {
        scheduleNoteFn(
          currentBeat,
          nextNoteTime,
          player.gainNode!,
          track,
          pattern,
          drumBuffers
        );
        nextNoteTime += beatDuration;
        currentBeat = (currentBeat + 1) % 32;
      }

      const timeoutId = window.setTimeout(scheduler, AudioPlaybackManager.LOOKAHEAD);
      player.scheduledEvents.push(timeoutId);
    };

    scheduler();
  }

  static stopPlayback(player: MusicPlayer): void {
    if (!player) return;
    player.isPlaying = false;
    player.scheduledEvents.forEach(id => clearTimeout(id));
    player.scheduledEvents = [];
  }

  static scheduleNote(
    audioContext: AudioContext,
    beat: number,
    time: number,
    gainNode: GainNode,
    track: EnhancedTrack,
    pattern: MusicPattern,
    drumBuffers: Record<string, AudioBuffer>
  ): void {
    const sixteenth = beat % 16;
    const eighth = beat % 8;
    const quarter = beat % 4;

    // Kicks
    if (pattern.drums[sixteenth]) {
      AudioSynthEngine.playDrum(audioContext, drumBuffers.kick, gainNode, time, 1.0);
    }

    // Snares
    if (quarter === 1 || quarter === 3) {
      AudioSynthEngine.playDrum(audioContext, drumBuffers.snare, gainNode, time, 0.7);
    }

    // Hi-hats
    if (sixteenth % 2 === 1) {
      AudioSynthEngine.playDrum(audioContext, drumBuffers.hihat, gainNode, time, 0.5);
    }

    // Bass
    if (beat % 2 === 0) {
      const bassNote = pattern.bass[(eighth / 2) % pattern.bass.length];
      const bassFreq = AudioSynthEngine.noteToFrequency(bassNote, 2);
      AudioSynthEngine.playNote(audioContext, bassFreq, 1.8, gainNode, time, 'sawtooth', 300);
    }

    // Melody
    if (beat % 4 === 0 && pattern.intensity > 0.5) {
      const melodyNote = pattern.melody[quarter % pattern.melody.length];
      const melodyFreq = AudioSynthEngine.noteToFrequency(melodyNote, 5);
      AudioSynthEngine.playNote(audioContext, melodyFreq, 3.5, gainNode, time, 'sine', 2000);
    }

    // Chords
    if (beat % 8 === 0) {
      const chordIndex = Math.floor(beat / 8) % pattern.chords.length;
      AudioSynthEngine.playChord(audioContext, pattern.chords[chordIndex], gainNode, time, track.genre);
    }
  }
}
