import React, { useState, useEffect } from 'react';
import { Track, AppMode } from '../types';
import { EnhancedMagicSetBuilderPanel } from '../components/EnhancedMagicSetBuilderPanel';
import { StudioEnhancementPanel } from '../components/StudioEnhancementPanel';
import { MusicLibraryManager } from '../components/MusicLibraryManager';
import { MusicPlayerKeyboardShortcuts } from '../components/MusicPlayerKeyboardShortcuts';
import { PlaylistImportExport } from '../components/PlaylistImportExport';
import { UnifiedAudioPlayer } from '../components/UnifiedAudioPlayer';
import { Music, Sparkles, Zap } from 'lucide-react';

interface MagicStudioProps {
  setPlaylist: (playlist: Track[]) => void;
  setMode: (mode: AppMode) => void;
  initialPlaylist: Track[];
  globalPlaybackState?: {
    currentTrackIndex: number;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
  };
  globalPlaybackHandlers?: {
    onPlayPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onVolumeChange: (volume: number) => void;
  };
}

const MagicStudio: React.FC<MagicStudioProps> = ({ 
  setPlaylist, 
  setMode, 
  initialPlaylist,
  globalPlaybackState,
  globalPlaybackHandlers
}) => {
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  
  // Initialize with initial playlist if available
  useEffect(() => {
    if (initialPlaylist.length > 0 && currentPlaylist.length === 0) {
      setCurrentPlaylist(initialPlaylist);
    }
  }, [initialPlaylist, currentPlaylist.length]);

  const handlePlaylistUpdate = (newPlaylist: Track[]) => {
    setCurrentPlaylist(newPlaylist);
    setPlaylist(newPlaylist);
  };

  const handleImportPlaylist = (importedTracks: Track[]) => {
    const mergedPlaylist = [...currentPlaylist, ...importedTracks];
    handlePlaylistUpdate(mergedPlaylist);
  };
  
  const handlePreviewTrack = (track: Track) => {
    setPreviewTrack(track);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 p-6 animate-fade-in">
      <div className="space-y-6">
        <MusicLibraryManager 
          onTracksSelected={(selectedTracks) => {
            handlePlaylistUpdate(selectedTracks);
          }}
        />
        
        <EnhancedMagicSetBuilderPanel 
          setPlaylist={handlePlaylistUpdate} 
          setMode={setMode} 
          initialPlaylist={initialPlaylist}
          onPreviewTrack={handlePreviewTrack}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          globalPlaybackState={globalPlaybackState}
          globalPlaybackHandlers={globalPlaybackHandlers}
        />
      </div>
      
      <div className="space-y-6">
        {/* Music Player */}
        {currentPlaylist.length > 0 ? (
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Music className="text-purple-400" size={20} />
              AI Enhanced Playlist
            </h3>
            <UnifiedAudioPlayer
              playlist={previewTrack ? [previewTrack] : currentPlaylist}
              currentTrackIndex={0}
              isPlaying={globalPlaybackState?.isPlaying || false}
              currentTime={globalPlaybackState?.currentTime || 0}
              duration={globalPlaybackState?.duration || 0}
              volume={globalPlaybackState?.volume || 0.8}
              onPlayPause={globalPlaybackHandlers?.onPlayPause || (() => {})}
              onNext={globalPlaybackHandlers?.onNext || (() => {})}
              onPrevious={globalPlaybackHandlers?.onPrevious || (() => {})}
              onVolumeChange={globalPlaybackHandlers?.onVolumeChange || (() => {})}
              mode="compact"
              autoAdapt={false}
            />
            <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
              <Sparkles className="text-purple-400" size={12} />
              <span>{currentPlaylist.length} AI-enhanced tracks ready</span>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-4 text-center">
            <Music className="mx-auto text-gray-500 mb-3" size={32} />
            <p className="text-gray-400 mb-2">No tracks selected</p>
            <p className="text-xs text-gray-500">Select tracks from the library or generate a set</p>
          </div>
        )}
        
        {/* Import/Export */}
        <PlaylistImportExport
          onImport={handleImportPlaylist}
          onExport={() => {}}
          currentPlaylist={currentPlaylist}
        />
        
        {/* Keyboard Shortcuts */}
        <MusicPlayerKeyboardShortcuts />
        
        <StudioEnhancementPanel />
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-t-transparent border-purple-400 rounded-full animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={24} />
            </div>
            <p className="text-xl font-semibold text-white">Generating your magical set...</p>
            <p className="text-purple-300">This may take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
};


export default MagicStudio;