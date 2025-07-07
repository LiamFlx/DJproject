import React, { useState } from 'react';
import { Play, Star, Heart, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { Track } from '../types';

interface TrackQueueProps {
  playlist: Track[];
  currentTrackIndex: number;
  onTrackSelect: (index: number) => void;
  onMarkFavorite: (trackId: string | number) => void;
  onMarkSuccessful: (trackId: string | number) => void;
}

export const TrackQueue: React.FC<TrackQueueProps> = ({
  playlist,
  currentTrackIndex,
  onTrackSelect,
  onMarkFavorite,
  onMarkSuccessful
}) => {
  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());
  const [successful, setSuccessful] = useState<Set<string | number>>(new Set());

  const handleMarkFavorite = (trackId: string | number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(trackId)) {
      newFavorites.delete(trackId);
    } else {
      newFavorites.add(trackId);
    }
    setFavorites(newFavorites);
    onMarkFavorite(trackId);
  };

  const handleMarkSuccessful = (trackId: string | number) => {
    const newSuccessful = new Set(successful);
    if (newSuccessful.has(trackId)) {
      newSuccessful.delete(trackId);
    } else {
      newSuccessful.add(trackId);
    }
    setSuccessful(newSuccessful);
    onMarkSuccessful(trackId);
  };

  const getCompatibilityColor = (track: Track, currentTrack?: Track) => {
    if (!currentTrack) return 'border-gray-600';
    
    const bpmDiff = Math.abs(parseInt(track.bpm) - parseInt(currentTrack.bpm));
    if (bpmDiff <= 5) return 'border-green-500';
    if (bpmDiff <= 15) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Play className="text-cyan-400" size={20} />
          Track Queue
        </h3>
        <button className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/40 transition-all">
          <Plus size={16} className="text-purple-300" />
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
        {playlist.map((track, index) => {
          const isPlaying = index === currentTrackIndex;
          const isNext = index === currentTrackIndex + 1;
          const isFavorite = favorites.has(track.id);
          const isSuccessful = successful.has(track.id);
          
          return (
            <div
              key={track.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isPlaying 
                  ? 'bg-purple-900/50 border-purple-500' 
                  : isNext
                  ? 'bg-cyan-900/30 border-cyan-500/50'
                  : `bg-gray-800/50 ${getCompatibilityColor(track, playlist[currentTrackIndex])}`
              }`}
              onClick={() => onTrackSelect(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isPlaying && (
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    )}
                    {isNext && (
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    )}
                    <p className="font-semibold text-white text-sm truncate">
                      {track.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{track.bpm} BPM</span>
                    <span className="text-xs text-gray-500">{track.key}</span>
                    {isSuccessful && (
                      <div className="flex items-center gap-1">
                        <RotateCcw className="text-green-400" size={10} />
                        <span className="text-xs text-green-400">Success</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkFavorite(track.id);
                    }}
                    className={`p-1 rounded transition-all ${
                      isFavorite 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-gray-500 hover:text-red-400'
                    }`}
                  >
                    <Heart size={12} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSuccessful(track.id);
                    }}
                    className={`p-1 rounded transition-all ${
                      isSuccessful 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-gray-500 hover:text-green-400'
                    }`}
                  >
                    <Star size={12} fill={isSuccessful ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <button className="w-full px-3 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-purple-300 text-sm rounded-lg hover:from-purple-600/40 hover:to-cyan-600/40 transition-all">
          Generate Smart Playlist
        </button>
      </div>
    </div>
  );
};