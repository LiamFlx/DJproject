import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  ChevronUp, ChevronDown, Music, Heart, Shuffle, Repeat,
  MoreHorizontal, Maximize2, Minimize2, List, Grid
} from 'lucide-react';
import { Track } from '../types';
import { AudioService } from '../services/AudioService';

interface UnifiedAudioPlayerProps {
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek?: (time: number) => void;
  onTrackSelect?: (index: number) => void;
  mode?: 'compact' | 'standard' | 'expanded' | 'floating' | 'persistent';
  className?: string;
  showPlaylist?: boolean;
  autoAdapt?: boolean;
}

export const UnifiedAudioPlayer: React.FC<UnifiedAudioPlayerProps> = ({
  playlist,
  currentTrackIndex,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onNext,
  onPrevious,
  onVolumeChange,
  onSeek,
  onTrackSelect,
  mode: initialMode = 'standard',
  className = '',
  showPlaylist = false,
  autoAdapt = true
}) => {
  const [playerMode, setPlayerMode] = useState(initialMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [showQueue, setShowQueue] = useState(showPlaylist);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const playerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const currentTrack = playlist[currentTrackIndex] || null;

  // Auto-adapt mode based on screen size and context
  useEffect(() => {
    if (!autoAdapt) return;

    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setPlayerMode('compact');
      } else if (width < 1024) {
        setPlayerMode('standard');
      } else {
        setPlayerMode(playerMode === 'floating' ? 'floating' : 'expanded');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoAdapt, playerMode]);

  // Floating player drag functionality
  useEffect(() => {
    if (playerMode !== 'floating') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 120;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Persistent player body class management
  useEffect(() => {
    if (playerMode === 'persistent') {
      document.body.classList.add('has-persistent-player');
      if (isExpanded) {
        document.body.classList.add('expanded');
      } else {
        document.body.classList.remove('expanded');
      }
    } else {
      document.body.classList.remove('has-persistent-player', 'expanded');
    }

    return () => {
      document.body.classList.remove('has-persistent-player', 'expanded');
    };
  }, [playerMode, isExpanded]);

  // Format time utility
  const formatTime = useCallback((time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Progress bar interaction
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !onSeek || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    
    onSeek(Math.max(0, Math.min(duration, newTime)));
  }, [duration, onSeek]);

  // Volume controls
  const handleVolumeToggle = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      const newVolume = volume > 0 ? volume : 0.8;
      onVolumeChange(newVolume);
      console.log(`🔊 Unmuted, volume set to: ${newVolume}`);
      onVolumeChange(newVolume);
      console.log(`🔊 Unmuted, volume set to: ${newVolume}`);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
      console.log('🔇 Muted audio');
      console.log('🔇 Muted audio');
    }
  }, [isMuted, volume, onVolumeChange]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setIsMuted(clampedVolume === 0);
    console.log(`🔊 Volume changed to: ${clampedVolume}`);
    console.log(`🔊 Volume changed to: ${clampedVolume}`);
    onVolumeChange(clampedVolume);
  }, [onVolumeChange]);

  // Control toggles
  const toggleShuffle = useCallback(() => {
    setIsShuffled(!isShuffled);
  }, [isShuffled]);

  const toggleRepeat = useCallback(() => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  }, [repeatMode]);

  // Drag handlers for floating mode
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (playerMode !== 'floating' || !playerRef.current) return;
    
    const rect = playerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, [playerMode]);

  // Render different modes
  const renderCompactPlayer = () => (
    <div className={`glass-panel rounded-xl p-3 ${className}`}>
      <div className="flex items-center gap-3">
        {currentTrack && (
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Music className="text-white" size={16} />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {currentTrack ? (
            <>
              <h4 className="text-white font-medium truncate text-sm">{currentTrack.title}</h4>
              <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">No track selected</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={onPlayPause}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-500 transition-all"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            onClick={onNext}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <SkipForward size={14} />
          </button>

          <button
            onClick={() => setPlayerMode('standard')}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            title="Expand player"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {currentTrack && (
        <div className="mt-2">
          <div 
            ref={progressRef}
            className="h-1 bg-gray-700 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStandardPlayer = () => (
    <div className={`glass-panel rounded-2xl p-6 space-y-4 ${className}`}>
      {/* Track Info with Animation */}
      {currentTrack && (
        <div className="text-center space-y-3 animate-fade-in">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Music className="text-white" size={32} />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{currentTrack.title}</h3>
            <p className="text-gray-300">{currentTrack.artist}</p>
            {currentTrack.album && (
              <p className="text-gray-400 text-sm">{currentTrack.album}</p>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div 
          ref={progressRef}
          className="h-2 bg-gray-700 rounded-full cursor-pointer group relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleShuffle}
          className={`p-2 rounded-full transition-all ${
            isShuffled 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Shuffle size={16} />
        </button>

        <button
          onClick={onPrevious}
          className="p-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          <SkipBack size={18} />
        </button>

        <button
          onClick={onPlayPause}
          className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={onNext}
          className="p-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          <SkipForward size={18} />
        </button>

        <button
          onClick={toggleRepeat}
          className={`p-2 rounded-full transition-all relative ${
            repeatMode !== 'none'
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Repeat size={16} />
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white text-purple-500 text-xs rounded-full flex items-center justify-center font-bold">
              1
            </span>
          )}
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleVolumeToggle}
          className="p-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <span className="text-sm text-gray-400 w-10 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Player Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-lg transition-all ${
              showQueue ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle queue"
          >
            <List size={14} />
          </button>
          
          <button
            onClick={() => setPlayerMode('expanded')}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            title="Expand player"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        <div className="text-gray-400">
          Track {currentTrackIndex + 1} of {playlist.length}
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
            <Heart size={14} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Queue */}
      {showQueue && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Up Next</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {playlist.slice(currentTrackIndex + 1, currentTrackIndex + 6).map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-all"
                onClick={() => onTrackSelect?.(currentTrackIndex + 1 + index)}
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                  <Music className="text-gray-400" size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{track.title}</p>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderExpandedPlayer = () => (
    <div className={`glass-panel rounded-2xl p-8 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Now Playing</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlayerMode('floating')}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            title="Float player"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setPlayerMode('standard')}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            title="Standard view"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Large Track Display */}
      {currentTrack && (
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <Music className="text-white" size={48} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-2">{currentTrack.title}</h3>
            <p className="text-xl text-gray-300 mb-2">{currentTrack.artist}</p>
            {currentTrack.album && (
              <p className="text-gray-400">{currentTrack.album}</p>
            )}
            
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              {currentTrack.bpm && <span>{currentTrack.bpm} BPM</span>}
              {currentTrack.key && <span>{currentTrack.key}</span>}
              {currentTrack.genre && <span className="capitalize">{currentTrack.genre}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Progress */}
      <div className="space-y-3">
        <div 
          ref={progressRef}
          className="h-3 bg-gray-700 rounded-full cursor-pointer group relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translateX(-50%) translateY(-50%)' }}
          />
        </div>
        
        <div className="flex justify-between text-lg text-gray-300">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={toggleShuffle}
          className={`p-3 rounded-full transition-all ${
            isShuffled 
              ? 'bg-purple-500 text-white shadow-lg' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Shuffle size={20} />
        </button>

        <button
          onClick={onPrevious}
          className="p-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          <SkipBack size={24} />
        </button>

        <button
          onClick={onPlayPause}
          className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-400 hover:to-pink-400 transition-all shadow-xl hover:scale-105"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        <button
          onClick={onNext}
          className="p-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          <SkipForward size={24} />
        </button>

        <button
          onClick={toggleRepeat}
          className={`p-3 rounded-full transition-all relative ${
            repeatMode !== 'none'
              ? 'bg-purple-500 text-white shadow-lg' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Repeat size={20} />
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-purple-500 text-xs rounded-full flex items-center justify-center font-bold">
              1
            </span>
          )}
        </button>
      </div>

      {/* Enhanced Volume */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleVolumeToggle}
          className="p-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
        >
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <span className="text-lg text-gray-300 w-12 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Full Queue */}
      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Playlist</h4>
          <span className="text-sm text-gray-400">{playlist.length} tracks</span>
        </div>
        
        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
          {playlist.map((track, index) => (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                index === currentTrackIndex
                  ? 'bg-purple-900/50 border border-purple-500/50'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => onTrackSelect?.(index)}
            >
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                {index === currentTrackIndex && isPlaying ? (
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                ) : (
                  <Music className="text-gray-400" size={16} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  index === currentTrackIndex ? 'text-purple-300' : 'text-white'
                }`}>
                  {track.title}
                </p>
                <p className="text-sm text-gray-400 truncate">{track.artist}</p>
              </div>
              
              <div className="text-sm text-gray-500">
                {formatTime(track.duration || 180)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFloatingPlayer = () => (
    <div
      ref={playerRef}
      className={`fixed z-50 transition-all duration-300 ${
        isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '300px'
      }}
    >
      <div className="glass-panel rounded-2xl border border-purple-500/30 shadow-2xl backdrop-blur-xl bg-black/60 overflow-hidden">
        {/* Drag Handle */}
        <div
          className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing border-b border-gray-700/50"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <Music className="text-purple-400" size={16} />
            <span className="text-sm text-white font-medium">DJ Player</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPlayerMode('expanded')}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Expand"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={() => setPlayerMode('standard')}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              title="Dock"
            >
              <Minimize2 size={12} />
            </button>
          </div>
        </div>

        {/* Compact Player Content */}
        <div className="p-4">
          {currentTrack && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Music className="text-white" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold text-sm truncate">{currentTrack.title}</h4>
                  <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <div className="mb-3">
                <div 
                  className="h-1 bg-gray-700 rounded-full cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onPrevious}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
                >
                  <SkipBack size={16} />
                </button>

                <button
                  onClick={onPlayPause}
                  className="p-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white rounded-full transition-all shadow-lg"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <button
                  onClick={onNext}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersistentPlayer = () => (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
      isExpanded ? 'h-80' : 'h-20'
    }`}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent backdrop-blur-xl border-t border-gray-700/30" />
      
      <div className="relative h-full flex flex-col">
        {/* Expanded Content */}
        {isExpanded && currentTrack && (
          <div className="flex-1 px-6 pt-6 pb-2">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl">
                  <Music className="text-white" size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate mb-1">{currentTrack.title}</h3>
                  <p className="text-gray-300 truncate mb-2">{currentTrack.artist}</p>
                  {currentTrack.album && (
                    <p className="text-sm text-gray-400 truncate">{currentTrack.album}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div 
                    ref={progressRef}
                    className="h-2 bg-gray-700 rounded-full cursor-pointer group relative overflow-hidden"
                    onClick={handleProgressClick}
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleVolumeToggle}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  
                  <div className="w-32">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Bar */}
        <div className="h-20 px-6 flex items-center justify-between bg-black/60 backdrop-blur-sm border-t border-gray-700/30">
          <div className="flex items-center gap-4 flex-1 min-w-0 max-w-xs">
            {currentTrack && (
              <>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <Music className="text-white" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate text-sm">{currentTrack.title}</h4>
                  <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onPrevious}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={onPlayPause}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full transition-all shadow-lg hover:scale-105"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={onNext}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className={`flex-1 min-w-0 mx-6 ${isExpanded ? 'hidden md:block' : ''}`}>
            {currentTrack && (
              <div 
                className="h-1 bg-gray-700 rounded-full cursor-pointer group relative overflow-hidden"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-150"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={handleVolumeToggle}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="w-20">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white transition-all rounded-full hover:bg-gray-700/50"
            >
              {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // No track fallback
  if (!currentTrack && playerMode !== 'persistent') {
    return (
      <div className={`glass-panel rounded-2xl p-8 text-center ${className} animate-fade-in`}>
        <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-400">No tracks available</p>
        <p className="text-sm text-gray-500 mt-2">
          Generate a playlist in Magic Studio to start playing
        </p>
      </div>
    );
  }

  // Render based on mode
  switch (playerMode) {
    case 'compact':
      return renderCompactPlayer();
    case 'expanded':
      return renderExpandedPlayer();
    case 'floating':
      return renderFloatingPlayer();
    case 'persistent':
      return renderPersistentPlayer();
    default:
      return renderStandardPlayer();
  }
};