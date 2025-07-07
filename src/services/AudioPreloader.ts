// src/services/AudioPreloader.ts

import { AudioTrack } from '../types/AudioTypes';
import { SmartMetadataService } from './SmartMetadataService';
import { AudioServiceClass } from '../AudioService'; // circular reference-safe if imported lazily

export class AudioPreloader {
  static async preloadTracks(
    tracks: AudioTrack[],
    getAudioElement: (trackId: string, track: AudioTrack) => HTMLAudioElement,
    isReady: (trackId: string) => boolean,
    markPreloaded: (trackId: string) => void
  ): Promise<void> {
    console.log(`🎵 Preloading ${tracks.length} tracks...`);

    const preloadPromises = tracks.map(async track => {
      try {
        getAudioElement(track.id, track);
        markPreloaded(track.id);

        return new Promise<void>((resolve) => {
          const waitUntilReady = () => {
            if (isReady(track.id)) {
              resolve();
            } else {
              setTimeout(waitUntilReady, 100);
            }
          };
          waitUntilReady();
        });
      } catch (err) {
        console.warn(`⚠️ Failed to preload ${track.title}:`, err);
      }
    });

    await Promise.all(preloadPromises);
    console.log(`✅ Preloading complete: ${tracks.length} tracks processed`);
  }
}
