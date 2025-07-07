import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Zap, Music, Play, Pause, SkipForward, Volume2, 
  Shuffle, Heart, Download, Share2, Settings, Search, Plus,
  X, Trash2, Clock, TrendingUp, Target, Wand2, RefreshCw,
  ChevronDown, ChevronUp, Filter, SortAsc, Grid, List as ListIcon,
  Brain, Lightbulb, Users, Mic
} from 'lucide-react';
import { Track, AppMode } from '../types';
import { initialPlaylist } from '../data/mockData';
import { UnifiedAudioPlayer } from './UnifiedAudioPlayer';
import { useAuth } from '../hooks/useAuth';
import { useEnhancedSupabaseSync } from '../hooks/useEnhancedSupabaseSync';
import { EnhancedNeuralCueLinkService } from '../services/EnhancedNeuralCueLinkService';

interface EnhancedMagicSetBuilderPanelProps {
  setPlaylist: (playlist: Track[]) => void;
  setMode: (mode: AppMode) => void;
  initialPlaylist: Track[];
  onPreviewTrack?: (track: Track) => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
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

interface GenerationOptions {
  genre: string;
  mood: string;
  energy: 'low' | 'medium' | 'high' | 'progressive';
  duration: number;
  bpmRange: [number, number];
  keyCompatibility: boolean;
  includeVocals: boolean;
  targetAudience: 'club' | 'festival' | 'radio' | 'underground';
  crowdAnalysis: boolean;
  aiPersonalization: boolean;
}

interface AIRecommendation {
  track: Track;
  confidence: number;
  reason: string;
  category: 'energy' | 'flow' | 'crowd' | 'personal';
}

const GENRES = [
  'House', 'Deep House', 'Tech House', 'Progressive House',
  'Techno', 'Minimal Techno', 'Acid Techno',
  'Trance', 'Progressive Trance', 'Uplifting Trance',
  'Electronic', 'Ambient', 'Downtempo', 'Synthwave',
  'Drum & Bass', 'Dubstep', 'Future Bass'
];

const MOODS = [
  'Energetic', 'Euphoric', 'Dark', 'Uplifting', 'Melancholic',
  'Aggressive', 'Peaceful', 'Mysterious', 'Romantic', 'Epic'
];

export const EnhancedMagicSetBuilderPanel: React.FC<EnhancedMagicSetBuilderPanelProps> = ({
  setPlaylist,
  setMode,
  initialPlaylist,
  onPreviewTrack,
  isLoading = false,
  setIsLoading,
  globalPlaybackState,
  globalPlaybackHandlers
}) => {
  const { user } = useAuth();
  const { savePlaylist, loadPlaylists } = useEnhancedSupabaseSync();

  // Generation state
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Track[]>([]);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    genre: 'House',
    mood: 'Progressive',
    energy: 'progressive',
    duration: 60,
    bpmRange: [120, 130],
    keyCompatibility: true,
    includeVocals: true,
    targetAudience: 'club',
    crowdAnalysis: true,
    aiPersonalization: true
  });
  const [textPrompt, setTextPrompt] = useState('');
  const [showTextPrompt, setShowTextPrompt] = useState(true);

  // AI state
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [crowdInsights, setCrowdInsights] = useState<string[]>([]);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<string[]>([]);

  // UI state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'bpm' | 'energy' | 'ai_score'>('ai_score');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [showAIInsights, setShowAIInsights] = useState(true);

  // Calculate AI score for tracks
  const calculateAIScore = useCallback((track: Track): number => {
    let score = 50; // Base score
    
    // Energy appropriateness
    const targetEnergy = getTargetEnergyForTime();
    const energyDiff = Math.abs((track.energy || 50) - targetEnergy);
    score += Math.max(0, 20 - energyDiff);
    
    // Genre preference
    if (generationOptions.aiPersonalization && user) {
      // Simulate user preference matching
      score += Math.random() * 20;
    }
    
    // BPM compatibility
    const [minBpm, maxBpm] = generationOptions.bpmRange;
    const trackBpm = parseInt(track.bpm || '120');
    if (trackBpm >= minBpm && trackBpm <= maxBpm) {
      score += 15;
    }
    
    // Crowd analysis factor
    if (generationOptions.crowdAnalysis) {
      score += Math.random() * 15; // Simulate crowd preference
    }
    
    return Math.min(100, Math.max(0, score));
  }, [generationOptions, user]);

  const getTargetEnergyForTime = (): number => {
    const hour = new Date().getHours();
    if (hour < 22) return 40; // Early evening
    if (hour < 24) return 70; // Prime time
    if (hour < 2) return 85;  // Peak time
    return 60; // Late night
  };

  // Filtered and sorted playlist with AI scoring
  const processedPlaylist = useMemo(() => {
    let tracks = [...generatedPlaylist];

    // Add AI scoring to tracks
    tracks = tracks.map(track => ({
      ...track,
      aiScore: calculateAIScore(track)
    }));

    // Filter
    if (searchQuery) {
      tracks = tracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterBy !== 'all') {
      tracks = tracks.filter(track => track.genre?.toLowerCase() === filterBy.toLowerCase());
    }

    // Sort with AI-enhanced options
    tracks.sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'artist': return a.artist.localeCompare(b.artist);
        case 'bpm': return parseInt(a.bpm || '0') - parseInt(b.bpm || '0');
        case 'energy': return (a.energy || 0) - (b.energy || 0);
        case 'ai_score': return ((b as any).aiScore || 0) - ((a as any).aiScore || 0);
        default: return 0;
      }
    });

    return tracks;
  }, [generatedPlaylist, searchQuery, filterBy, sortBy]);

  // Initialize with initial playlist if available
  useEffect(() => {
    if (initialPlaylist.length > 0 && generatedPlaylist.length === 0) {
      setGeneratedPlaylist(initialPlaylist);
    }
  }, [initialPlaylist, generatedPlaylist.length]);

  // Initialize AI service with user preferences
  useEffect(() => {
    const initializeAI = async () => {
      try {
        await EnhancedNeuralCueLinkService.initialize(user?.user_metadata);
        generateAIRecommendations();
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };

    if (user) {
      initializeAI();
    }

    return () => {
      EnhancedNeuralCueLinkService.destroy();
    };
  }, [user]);

  // Generate AI recommendations
  const generateAIRecommendations = useCallback(async () => {
    if (!generationOptions.aiPersonalization) return;

    // Simulate AI analysis
    const recommendations: AIRecommendation[] = [];
    
    // Energy-based recommendation
    recommendations.push({
      track: generateSmartTrack('energy'),
      confidence: 0.92,
      reason: 'Perfect energy progression for current time',
      category: 'energy'
    });

    // Flow-based recommendation
    recommendations.push({
      track: generateSmartTrack('flow'),
      confidence: 0.87,
      reason: 'Maintains harmonic flow with previous tracks',
      category: 'flow'
    });

    // Crowd-based recommendation
    if (generationOptions.crowdAnalysis) {
      recommendations.push({
        track: generateSmartTrack('crowd'),
        confidence: 0.83,
        reason: 'High crowd engagement potential',
        category: 'crowd'
      });
    }

    setAiRecommendations(recommendations);

    // Generate insights
    setCrowdInsights([
      'Peak time approaching - consider higher energy tracks',
      'Crowd responds well to vocal elements',
      'Dance floor density optimal for progression'
    ]);

    setPersonalizedSuggestions([
      'Your style favors smooth transitions - key matching enabled',
      'Based on your history, progressive builds work well',
      'Consider adding a signature track for personal touch'
    ]);
  }, [generationOptions]);

  const generateSmartTrack = (category: string): Track => {
    const baseTrack = {
      id: Date.now() + Math.random(),
      duration: 180 + Math.random() * 120,
      genre: generationOptions.genre.toLowerCase(),
      year: 2020 + Math.floor(Math.random() * 4),
      useProceduralFallback: true
    };

    switch (category) {
      case 'energy':
        return {
          ...baseTrack,
          title: 'Energy Surge (AI Recommended)',
          artist: 'Neural Beats',
          bpm: (generationOptions.bpmRange[1] + 5).toString(),
          key: 'Am',
          energy: Math.min(100, getTargetEnergyForTime() + 15),
          danceability: 90,
          valence: 80
        };
      case 'flow':
        return {
          ...baseTrack,
          title: 'Harmonic Flow (AI Curated)',
          artist: 'Flow State',
          bpm: Math.round((generationOptions.bpmRange[0] + generationOptions.bpmRange[1]) / 2).toString(),
          key: 'Dm',
          energy: getTargetEnergyForTime(),
          danceability: 85,
          valence: 70
        };
      case 'crowd':
        return {
          ...baseTrack,
          title: 'Crowd Pleaser (AI Selected)',
          artist: 'Vibe Collective',
          bpm: generationOptions.bpmRange[1].toString(),
          key: 'C',
          energy: 85,
          danceability: 95,
          valence: 90
        };
      default:
        return baseTrack as Track;
    }
  };

  // Enhanced AI-powered playlist generation
  const generatePlaylist = useCallback(async () => {
    if (setIsLoading) setIsLoading(true);

    try {
      // Simulate advanced AI generation
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

      const trackCount = Math.ceil(generationOptions.duration / 4);
      const newTracks: Track[] = [];

      // Generate tracks with AI intelligence
      for (let i = 0; i < trackCount; i++) {
        const progressRatio = i / (trackCount - 1);
        
        const track: Track = {
          id: Date.now() + i,
          title: generateIntelligentTitle(i, progressRatio),
          artist: generateArtistForGenre(generationOptions.genre),
          album: `${generationOptions.genre} Collection`,
          duration: 180 + Math.random() * 120,
          bpm: generateIntelligentBPM(i, progressRatio),
          key: generateHarmonicKey(i),
          energy: generateIntelligentEnergy(i, progressRatio),
          danceability: 70 + Math.random() * 30,
          valence: getMoodValence(generationOptions.mood) + (Math.random() - 0.5) * 20,
          genre: generationOptions.genre.toLowerCase(),
          year: 2020 + Math.floor(Math.random() * 4),
          useProceduralFallback: true
        };

        newTracks.push(track);
      }

      // Apply AI enhancements
      const enhancedTracks = await applyAIEnhancements(newTracks);
      
      setGeneratedPlaylist(enhancedTracks);
      setPlaylist(enhancedTracks);

      // Update AI service with new playlist
      EnhancedNeuralCueLinkService.updatePlaylist(enhancedTracks, 0);

      // Generate new recommendations
      generateAIRecommendations();

      console.log(`🧠 AI generated ${enhancedTracks.length} intelligent tracks`);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      if (setIsLoading) setIsLoading(false);
    }
  }, [generationOptions, setPlaylist, setIsLoading, generateAIRecommendations]);

  const generateIntelligentTitle = (index: number, progress: number): string => {
    const energyLevel = generationOptions.energy === 'progressive' 
      ? Math.floor(progress * 4) 
      : ['low', 'medium', 'high'].indexOf(generationOptions.energy);
    
    const titlesByEnergy = [
      ['Gentle Start', 'Warm Embrace', 'Soft Landing'],
      ['Building Momentum', 'Rising Tide', 'Gathering Force'],
      ['Peak Energy', 'Maximum Drive', 'Euphoric Heights'],
      ['Cosmic Journey', 'Transcendent', 'Beyond Limits']
    ];
    
    const titles = titlesByEnergy[Math.min(3, energyLevel)] || titlesByEnergy[1];
    const baseTitle = titles[Math.floor(Math.random() * titles.length)];
    const suffix = '(AI Enhanced)';
    
    return `${baseTitle} ${suffix}`;
  };

  const generateIntelligentBPM = (index: number, progress: number): string => {
    const [min, max] = generationOptions.bpmRange;
    let bpm: number;

    if (generationOptions.energy === 'progressive') {
      // Intelligent progression with slight variations
      bpm = min + (max - min) * progress;
      bpm += (Math.random() - 0.5) * 4; // Add slight variation
    } else {
      bpm = min + Math.random() * (max - min);
    }

    // Ensure BPM makes sense for genre
    const genreBPMRanges = {
      'house': [120, 130],
      'techno': [125, 135],
      'trance': [130, 140],
      'ambient': [60, 100]
    };

    const genreRange = genreBPMRanges[generationOptions.genre.toLowerCase()] || [120, 130];
    bpm = Math.max(genreRange[0], Math.min(genreRange[1], bpm));

    return Math.round(bpm).toString();
  };

  const generateHarmonicKey = (index: number): string => {
    if (!generationOptions.keyCompatibility) {
      const keys = ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
      return keys[Math.floor(Math.random() * keys.length)];
    }

    // Use Camelot wheel for harmonic progression
    const camelotWheel = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Fm', 'Cm', 'Gm', 'Dm'];
    const startIndex = index % camelotWheel.length;
    
    // Allow movement by ±1 or ±7 (perfect fifth) for harmonic mixing
    const harmonicMoves = [-1, 0, 1, -7, 7];
    const move = harmonicMoves[Math.floor(Math.random() * harmonicMoves.length)];
    const newIndex = (startIndex + move + camelotWheel.length) % camelotWheel.length;
    
    return camelotWheel[newIndex];
  };

  const generateIntelligentEnergy = (index: number, progress: number): number => {
    let baseEnergy: number;

    switch (generationOptions.energy) {
      case 'low': 
        baseEnergy = 20 + Math.random() * 30;
        break;
      case 'medium': 
        baseEnergy = 40 + Math.random() * 30;
        break;
      case 'high': 
        baseEnergy = 70 + Math.random() * 30;
        break;
      case 'progressive':
        baseEnergy = 30 + progress * 60;
        break;
    }

    // Add time-of-day intelligence
    const targetEnergy = getTargetEnergyForTime();
    const timeAdjustment = (targetEnergy - 50) * 0.3;
    
    // Add crowd analysis if enabled
    let crowdAdjustment = 0;
    if (generationOptions.crowdAnalysis) {
      crowdAdjustment = (Math.random() - 0.5) * 20; // Simulate crowd preference
    }

    return Math.max(0, Math.min(100, baseEnergy + timeAdjustment + crowdAdjustment));
  };

  const applyAIEnhancements = async (tracks: Track[]): Promise<Track[]> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return tracks.map((track, index) => ({
      ...track,
      // Add AI confidence score
      aiConfidence: 0.7 + Math.random() * 0.3,
      // Add transition recommendations
      transitionTips: generateTransitionTips(track, tracks[index + 1]),
      // Add crowd prediction
      crowdPrediction: Math.random() > 0.3 ? 'positive' : 'neutral'
    }));
  };

  const generateTransitionTips = (currentTrack: Track, nextTrack?: Track): string[] => {
    if (!nextTrack) return [];
    
    const tips: string[] = [];
    
    const currentBPM = parseInt(currentTrack.bpm || '120');
    const nextBPM = parseInt(nextTrack.bpm || '120');
    const bpmDiff = Math.abs(currentBPM - nextBPM);
    
    if (bpmDiff <= 3) {
      tips.push('Perfect BPM match - seamless transition possible');
    } else if (bpmDiff <= 8) {
      tips.push('Good BPM compatibility - use pitch adjustment');
    } else {
      tips.push('Large BPM difference - consider using effects or cuts');
    }
    
    if (currentTrack.key === nextTrack.key) {
      tips.push('Same key - harmonic mixing opportunity');
    }
    
    return tips;
  };

  const generateArtistForGenre = (genre: string): string => {
    const artistsByGenre = {
      'House': ['Deep House Collective', 'House Nation', 'Groove Masters'],
      'Techno': ['Techno Alliance', 'Underground Sound', 'Digital Pulse'],
      'Trance': ['Trance Unity', 'Euphoric Minds', 'Progressive Soul'],
      'Electronic': ['Synth Wave', 'Electronic Dreams', 'Digital Harmony']
    };
    
    const artists = artistsByGenre[genre] || artistsByGenre['House'];
    return artists[Math.floor(Math.random() * artists.length)];
  };

  const getMoodValence = (mood: string): number => {
    const valenceMap: { [key: string]: number } = {
      'energetic': 80, 'euphoric': 90, 'dark': 20, 'uplifting': 85,
      'melancholic': 25, 'aggressive': 60, 'peaceful': 70, 'mysterious': 40,
      'romantic': 75, 'epic': 80
    };
    return valenceMap[mood.toLowerCase()] || 60;
  };

  // Track management with AI insights
  const handleTrackSelect = (index: number) => {
    setSelectedTracks(prev => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const removeSelectedTracks = () => {
    const newPlaylist = generatedPlaylist.filter((_, index) => !selectedTracks.has(index));
    setGeneratedPlaylist(newPlaylist);
    setPlaylist(newPlaylist);
    setSelectedTracks(new Set());
    
    // Update AI service
    EnhancedNeuralCueLinkService.updatePlaylist(newPlaylist, 0);
  };

  const addAIRecommendation = (recommendation: AIRecommendation) => {
    const newPlaylist = [...generatedPlaylist, recommendation.track];
    setGeneratedPlaylist(newPlaylist);
    setPlaylist(newPlaylist);
    
    // Remove from recommendations
    setAiRecommendations(prev => prev.filter(r => r.track.id !== recommendation.track.id));
    
    // Update AI service
    EnhancedNeuralCueLinkService.updatePlaylist(newPlaylist, newPlaylist.length - 1);
  };

  const handleSavePlaylist = async () => {
    if (!user || !generatedPlaylist.length) return;
    
    const playlistName = prompt('Enter playlist name:') || `AI Generated Set ${new Date().toLocaleDateString()}`;
    
    try {
      await savePlaylist({
        name: playlistName,
        tracks: generatedPlaylist,
        description: `AI-generated ${generationOptions.genre} set with ${generationOptions.mood} mood`,
        genre: generationOptions.genre,
        mood: generationOptions.mood,
        isPublic: false,
        metadata: {
          aiGenerated: true,
          generationOptions,
          aiScore: processedPlaylist.reduce((sum, track) => sum + ((track as any).aiScore || 0), 0) / processedPlaylist.length
        }
      });
      console.log('✅ AI-enhanced playlist saved successfully');
    } catch (error) {
      console.error('Failed to save playlist:', error);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">AI Magic Set</h2>
            <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-semibold">
              Enhanced
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIInsights(!showAIInsights)}
              className={`p-2 rounded-lg transition-all ${
                showAIInsights ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle AI insights"
            >
              <Lightbulb size={16} />
            </button>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              title="Advanced options"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* AI Insights Panel */}
        {showAIInsights && (
          <div className="mb-6 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Brain className="text-cyan-400" size={18} />
              AI Insights & Recommendations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Crowd Insights */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <Users size={14} />
                  Crowd Analysis
                </h4>
                {crowdInsights.map((insight, index) => (
                  <div key={index} className="text-xs text-gray-300 p-2 bg-cyan-900/20 rounded">
                    {insight}
                  </div>
                ))}
              </div>

              {/* Personalized Suggestions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <Target size={14} />
                  Personal Style
                </h4>
                {personalizedSuggestions.map((suggestion, index) => (
                  <div key={index} className="text-xs text-gray-300 p-2 bg-purple-900/20 rounded">
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            {aiRecommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-300 flex items-center gap-2">
                  <Sparkles size={14} />
                  AI Track Recommendations
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {aiRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{rec.track.title}</p>
                        <p className="text-xs text-gray-400">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-green-400">Confidence: {Math.round(rec.confidence * 100)}%</span>
                          <span className="text-xs text-gray-500 capitalize">{rec.category}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addAIRecommendation(rec)}
                        className="ml-3 px-3 py-1 bg-green-600/20 border border-green-500/30 text-green-300 text-xs rounded hover:bg-green-600/40 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Text Prompt Generation */}
        {showTextPrompt && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="text-purple-400" size={18} />
              AI Set Generator
              <div className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded-full">
                Enhanced
              </div>
            </h3>
            
            <textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Describe your set: 'Progressive house journey from 120 to 130 BPM with emotional breakdown at 45 minutes' or 'High energy festival vibes with crowd interaction peaks'"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              rows={3}
            />
            
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={generatePlaylist}
                disabled={isLoading || !textPrompt.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 btn-glow"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    AI Generating Magic...
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Generate with AI
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowTextPrompt(false)}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all"
              >
                Quick Mode
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Quick Generation Options */}
        {!showTextPrompt && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick AI Options</h3>
              <button
                onClick={() => setShowTextPrompt(true)}
                className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded hover:bg-purple-600/40 transition-all"
              >
                AI Prompt
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                <select
                  value={generationOptions.genre}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {GENRES.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">AI Features</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={generationOptions.crowdAnalysis}
                      onChange={(e) => setGenerationOptions(prev => ({ ...prev, crowdAnalysis: e.target.checked }))}
                      className="rounded"
                    />
                    Crowd Analysis
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={generationOptions.aiPersonalization}
                      onChange={(e) => setGenerationOptions(prev => ({ ...prev, aiPersonalization: e.target.checked }))}
                      className="rounded"
                    />
                    AI Personalization
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                <select
                  value={generationOptions.duration}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={generatePlaylist}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 btn-glow"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    AI Generating...
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    Create AI Set
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg animate-fade-in-fast">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Energy Progression</label>
                <select
                  value={generationOptions.energy}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, energy: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low Energy</option>
                  <option value="medium">Medium Energy</option>
                  <option value="high">High Energy</option>
                  <option value="progressive">AI Progressive Build</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Venue</label>
                <select
                  value={generationOptions.targetAudience}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="club">Club</option>
                  <option value="festival">Festival</option>
                  <option value="radio">Radio</option>
                  <option value="underground">Underground</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">BPM Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="60"
                    max="200"
                    value={generationOptions.bpmRange[0]}
                    onChange={(e) => setGenerationOptions(prev => ({ 
                      ...prev, 
                      bpmRange: [parseInt(e.target.value), prev.bpmRange[1]] 
                    }))}
                    className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    min="60"
                    max="200"
                    value={generationOptions.bpmRange[1]}
                    onChange={(e) => setGenerationOptions(prev => ({ 
                      ...prev, 
                      bpmRange: [prev.bpmRange[0], parseInt(e.target.value)] 
                    }))}
                    className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={generationOptions.keyCompatibility}
                    onChange={(e) => setGenerationOptions(prev => ({ ...prev, keyCompatibility: e.target.checked }))}
                    className="rounded"
                  />
                  Harmonic Key Matching
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={generationOptions.includeVocals}
                    onChange={(e) => setGenerationOptions(prev => ({ ...prev, includeVocals: e.target.checked }))}
                    className="rounded"
                  />
                  Include Vocal Tracks
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Go Live Button */}
        {generatedPlaylist.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setMode('live')}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 btn-glow"
            >
              <Play size={18} />
              Start Live AI Session
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Generated Playlist */}
      {generatedPlaylist.length > 0 && (
        <div className="p-6">
          {/* Enhanced Playlist Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">
                AI Generated Set ({processedPlaylist.length} tracks)
              </h3>
              <div className="flex items-center gap-2">
                <Clock className="text-gray-400" size={14} />
                <span className="text-sm text-gray-400">
                  {Math.round(processedPlaylist.reduce((sum, track) => sum + (track.duration || 180), 0) / 60)} min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="text-purple-400" size={14} />
                <span className="text-sm text-purple-400">
                  AI Score: {Math.round(processedPlaylist.reduce((sum, track) => sum + ((track as any).aiScore || 0), 0) / processedPlaylist.length)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-all"
                title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? <ListIcon size={14} /> : <Grid size={14} />}
              </button>
              
              {selectedTracks.size > 0 && (
                <button
                  onClick={removeSelectedTracks}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-500 transition-all flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Remove ({selectedTracks.size})
                </button>
              )}
              
              {user && (
                <button
                  onClick={handleSavePlaylist}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-500 transition-all flex items-center gap-1"
                >
                  <Download size={12} />
                  Save AI Set
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ai_score">AI Score</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="bpm">BPM</option>
              <option value="energy">Energy</option>
            </select>
          </div>

          {/* Enhanced Track List */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
            {processedPlaylist.map((track, index) => {
              const originalIndex = generatedPlaylist.findIndex(t => t.id === track.id);
              const isSelected = selectedTracks.has(originalIndex);
              const aiScore = (track as any).aiScore || 0;

              return (
                <div
                  key={track.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-900/30' 
                      : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                  onClick={() => handleTrackSelect(originalIndex)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Music className="text-white" size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{track.title}</h4>
                      <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{track.bpm} BPM</span>
                        <span>{track.key}</span>
                        <span>{Math.round(track.energy || 0)}% Energy</span>
                        <span className="text-purple-400">AI: {Math.round(aiScore)}%</span>
                        <span>{Math.round((track.duration || 180) / 60)}:{String(Math.round((track.duration || 180) % 60)).padStart(2, '0')}</span>
                      </div>
                      
                      {/* AI Insights */}
                      {(track as any).transitionTips && (track as any).transitionTips.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-cyan-400">
                            💡 {(track as any).transitionTips[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewTrack?.(track);
                        }}
                        className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                        title="Preview track"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle favorite logic here
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Add to favorites"
                      >
                        <Heart size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Energy Visualization */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={16} />
              AI Energy Curve Analysis
            </h4>
            <div className="h-16 bg-gray-700 rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 flex items-end">
                {processedPlaylist.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex-1 bg-gradient-to-t from-purple-600 to-cyan-400 mx-0.5 rounded-t transition-all relative group"
                    style={{ height: `${(track.energy || 0)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {track.title} - {Math.round(track.energy || 0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-center">
              Hover over bars to see track details
            </div>
          </div>
        </div>
      )}
    </div>
  );
};