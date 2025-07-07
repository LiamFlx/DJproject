import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Music, Mic, MicOff, Play, Pause, Volume2, Radio, Zap, Target, TrendingUp, Settings } from 'lucide-react';

import { Track, AppMode } from '../types';
import { WebAudioService } from '../services/WebAudioService';
import { EnhancedAudioService } from '../services/EnhancedAudioService';
import { EnhancedNeuralCueLinkService } from '../services/EnhancedNeuralCueLinkService';
import { TrackPreloader } from '../components/TrackPreloader';
import { RealTimeWaveform } from '../components/RealTimeWaveform';
import { AdvancedMixer } from '../components/AdvancedMixer';
import { LiveAudioVisualizer } from '../components/LiveAudioVisualizer';
import { PerformanceAnalyzer } from '../components/PerformanceAnalyzer';
import { AudioAnalyzer } from '../components/AudioAnalyzer';
import { TrackQueue } from '../components/TrackQueue';
import { UnifiedAudioPlayer } from '../components/UnifiedAudioPlayer';

interface MagicDecksProps {
  setMode: (mode: AppMode) => void;
  playlist: Track[];
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

const MagicDecks: React.FC<MagicDecksProps> = ({ 
  setMode, 
  playlist, 
  globalPlaybackState, 
  globalPlaybackHandlers 
}) => {
  // State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [preloadedTracks, setPreloadedTracks] = useState<Track[]>([]);
  const [isPlaylistReady, setIsPlaylistReady] = useState(false);
  const [webAudioEnabled, setWebAudioEnabled] = useState(false);
  const [showAdvancedMixer, setShowAdvancedMixer] = useState(false);

  // Decks and playing state
  const [currentTrackA, setCurrentTrackA] = useState<Track>();
  const [currentTrackB, setCurrentTrackB] = useState<Track>();
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);

  // Audio analysis state
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

  // Preload playlist on first load
  useEffect(() => {
    if (playlist.length > 0 && !isPlaylistReady) {
      setIsPlaylistReady(true);
      setCurrentTrackIndex(0);
    }
  }, [playlist, isPlaylistReady]);

  // Initialize Web Audio API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('🎵 Initializing Web Audio API and Enhanced Audio Service...');
        await WebAudioService.initialize();
        await EnhancedAudioService.initialize();
        console.log('✅ Audio services initialized successfully');
        if (mounted) setWebAudioEnabled(true);
      } catch {
        console.error('❌ Failed to initialize audio services');
        setWebAudioEnabled(false);
      }
    })();

    return () => {
      mounted = false;
      WebAudioService.dispose();
      EnhancedAudioService.destroy();
    };
  }, []);

  // Load tracks into decks when web audio enabled or current track changes
  useEffect(() => {
    if (webAudioEnabled && currentTrack) {
      console.log('🎵 Loading tracks into decks:', currentTrack.title);
      setCurrentTrackA(currentTrack);
      setCurrentTrackB(playlist[currentTrackIndex + 1]);
    }
  }, [webAudioEnabled, currentTrack, currentTrackIndex, playlist]);

  // Generate AI suggestions based on analysis
  useEffect(() => {
    if (analysisData && isRecording) {
      const suggestions = [];
      
      if (analysisData.energy < 30) {
        suggestions.push("🔥 Energy is low - consider adding a high-energy track");
      }
      if (analysisData.bpm > 0 && currentTrack?.bpm) {
        const bpmDiff = Math.abs(analysisData.bpm - parseInt(currentTrack.bpm));
        if (bpmDiff > 10) {
          suggestions.push("🎵 BPM mismatch detected - sync recommended");
        }
      }
      if (analysisData.volume > 0.8) {
        suggestions.push("🔊 Volume levels high - consider adjusting gain");
      }
      
      setAiSuggestions(suggestions.slice(0, 3));
    }
  }, [analysisData, isRecording, currentTrack]);

  // Callbacks for UI interaction
  const handleTrackSelect = useCallback((index: number) => {
    setCurrentTrackIndex(index);
  }, []);

  const handleTrackChange = useCallback((track: Track, index: number) => {
    setCurrentTrackIndex(index);
  }, []);

  const handleToggleRecording = () => setIsRecording((r) => !r);

  const handleMarkFavorite = useCallback((trackId: string | number) => {
    // TODO: implement favorites logic
  }, []);

  const handleMarkSuccessful = useCallback((trackId: string | number) => {
    // TODO: implement successful track logic
  }, []);

  const handlePreloadComplete = useCallback((tracks: Track[]) => {
    setPreloadedTracks(tracks);
    setIsPlaylistReady(true);
  }, []);

  const handleCrossfaderChange = (position: number) => {
    // TODO: implement crossfader logic
  };

  const handleAnalysisUpdate = useCallback((data: any) => {
    setAnalysisData(data);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Track Preloader */}
      <TrackPreloader tracks={playlist} onPreloadComplete={handlePreloadComplete} maxPreload={5} />

      {/* Main DJ Interface */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Recording Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Radio className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Live DJ Session</h1>
              <p className="text-gray-400">Real-time mixing with AI assistance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Recording Toggle */}
            <button
              onClick={handleToggleRecording}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
              {isRecording ? 'Recording Live' : 'Start Recording'}
            </button>
            
            {/* Advanced Mixer Toggle */}
            <button
              onClick={() => setShowAdvancedMixer(!showAdvancedMixer)}
              className={`p-3 rounded-xl transition-all ${
                showAdvancedMixer 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Advanced Mixer"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Main DJ Player - Prominent Position */}
        <div className="glass-panel rounded-2xl p-8 mb-8 border-2 border-purple-500/30">
          <div className="flex items-center gap-3 mb-6">
            <Music className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Enhanced DJ Player</h2>
            {isRecording && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-semibold">LIVE</span>
              </div>
            )}
          </div>
          
          <UnifiedAudioPlayer
            playlist={playlist}
            currentTrackIndex={globalPlaybackState?.currentTrackIndex || 0}
            isPlaying={globalPlaybackState?.isPlaying || false}
            currentTime={globalPlaybackState?.currentTime || 0}
            duration={globalPlaybackState?.duration || 0}
            volume={globalPlaybackState?.volume || 0.8}
            onPlayPause={globalPlaybackHandlers?.onPlayPause || (() => {})}
            onNext={globalPlaybackHandlers?.onNext || (() => {})}
            onPrevious={globalPlaybackHandlers?.onPrevious || (() => {})}
            onVolumeChange={globalPlaybackHandlers?.onVolumeChange || (() => {})}
            onTrackSelect={handleTrackChange}
            mode="expanded"
            showPlaylist={true}
            autoAdapt={true}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          
          {/* Left Column - Waveforms and Mixer */}
          <div className="space-y-6">
            
            {/* Dual Deck Waveforms */}
            {webAudioEnabled && (
              <div className="glass-panel rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="text-cyan-400" />
                  Dual Deck Waveforms
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentTrackA && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-purple-400">Deck A</h4>
                        <div className="flex items-center gap-2">
                          {isPlayingA && <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>}
                          <span className="text-sm text-gray-400">{currentTrackA.title}</span>
                        </div>
                      </div>
                      <RealTimeWaveform
                        track={currentTrackA}
                        channelId="channelA"
                        isPlaying={isPlayingA}
                        progress={50}
                        height={120}
                      />
                    </div>
                  )}
                  
                  {currentTrackB && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-cyan-400">Deck B</h4>
                        <div className="flex items-center gap-2">
                          {isPlayingB && <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>}
                          <span className="text-sm text-gray-400">{currentTrackB.title}</span>
                        </div>
                      </div>
                      <RealTimeWaveform
                        track={currentTrackB}
                        channelId="channelB"
                        isPlaying={isPlayingB}
                        progress={0}
                        height={120}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advanced Mixer */}
            {showAdvancedMixer && webAudioEnabled && (
              <AdvancedMixer
                trackA={currentTrackA}
                trackB={currentTrackB}
                isPlayingA={isPlayingA}
                isPlayingB={isPlayingB}
                onCrossfaderChange={handleCrossfaderChange}
              />
            )}

            {/* Live Audio Visualizer (when Web Audio not available) */}
            {!webAudioEnabled && (
              <LiveAudioVisualizer
                isRecording={isRecording}
                onAnalysisUpdate={handleAnalysisUpdate}
                visualizationMode="waveform"
                colorScheme="rainbow"
                className="min-h-[300px]"
              />
            )}
          </div>

          {/* Right Column - Analysis and Controls */}
          <div className="space-y-6">
            
            {/* AI Suggestions Panel */}
            {isRecording && aiSuggestions.length > 0 && (
              <div className="glass-panel rounded-xl p-4 border border-yellow-500/30">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="text-yellow-400" />
                  AI Suggestions
                </h3>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Audio Analysis */}
            <div className="glass-panel rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-purple-400" />
                Live Analysis
              </h3>
              
              <AudioAnalyzer
                isRecording={isRecording}
                onAnalysisUpdate={handleAnalysisUpdate}
                mode="live"
              />
            </div>

            {/* Performance Analyzer */}
            <PerformanceAnalyzer
              currentTrack={currentTrackA ?? currentTrack}
              nextTrack={currentTrackB ?? playlist[currentTrackIndex + 1]}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
            />

            {/* Track Queue */}
            <TrackQueue
              playlist={playlist}
              currentTrackIndex={currentTrackIndex}
              onTrackSelect={handleTrackSelect}
              onMarkFavorite={handleMarkFavorite}
              onMarkSuccessful={handleMarkSuccessful}
            />

            {/* Session Status */}
            <div className="glass-panel rounded-xl p-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <Music className="text-cyan-400" size={20} />
                Session Status
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Tracks:</span>
                  <span className="text-white font-semibold">{playlist.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Track:</span>
                  <span className="text-white font-semibold">{currentTrackIndex + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Preloaded:</span>
                  <span className="text-green-400 font-semibold">{preloadedTracks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Web Audio:</span>
                  <span className={`font-semibold ${webAudioEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                    {webAudioEnabled ? 'Professional' : 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recording:</span>
                  <span className={`font-semibold ${isRecording ? 'text-red-400' : 'text-gray-400'}`}>
                    {isRecording ? 'Active' : 'Standby'}
                  </span>
                </div>
                
                {analysisData && (
                  <>
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Live BPM:</span>
                        <span className="text-purple-400 font-semibold">
                          {analysisData.bpm > 0 ? `${analysisData.bpm}` : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Energy Level:</span>
                        <span className="text-cyan-400 font-semibold">
                          {Math.round(analysisData.energy)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="fixed top-4 right-4 z-50">
          <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-3 border border-red-500/50">
            <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-400 font-semibold">Recording Live Session</span>
          </div>
        </div>
      )}

      {/* Web Audio Status */}
      {webAudioEnabled && (
        <div className="fixed bottom-4 left-4 z-20">
          <div className="glass-panel rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-semibold">Professional Audio Active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export { MagicDecks };
export default MagicDecks;