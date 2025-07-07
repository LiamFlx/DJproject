import React, { useEffect, useState } from 'react';
import { Track } from '../types';
import { AudioService } from '../services/AudioService';

interface TrackPreloaderProps {
  tracks: Track[];
  onPreloadComplete: (preloadedTracks: Track[]) => void;
  maxPreload?: number;
}

export const TrackPreloader: React.FC<TrackPreloaderProps> = ({
  tracks,
  onPreloadComplete,
  maxPreload = 3
}) => {
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [preloadedTracks, setPreloadedTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (tracks.length === 0) return;

    const preloadTracks = async () => {
      try {
        const tracksToPreload = tracks.slice(0, maxPreload);
        
        console.log(`🎵 Starting preload of ${tracksToPreload.length} tracks...`);
        
        // Use AudioService for better preloading
        await AudioService.preloadTracks(tracksToPreload);
        
        setPreloadedCount(tracksToPreload.length);
        setPreloadedTracks(tracksToPreload);
        onPreloadComplete(tracksToPreload);
        
        console.log(`✅ Preload complete!`);
      } catch (error) {
        console.error('Preload failed:', error);
        // Still call onPreloadComplete with available tracks
        onPreloadComplete(tracks.slice(0, maxPreload));
      }
    };

    preloadTracks();
  }, [tracks, maxPreload, onPreloadComplete]);

  // This component doesn't render anything visible
  return null;
};