import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppMode, Track } from './types';
import { NeuralCueLinkProvider } from './contexts/NeuralCueLinkContext';
import { EnhancedNeuralCueLinkService } from './services/EnhancedNeuralCueLinkService';
import { musicLibrary } from './services/MusicLibraryManager';
import { EnhancedAudioService } from './services/EnhancedAudioService';
import { AnalyticsService } from './services/AnalyticsService';
import { OptimizationEngine } from './services/OptimizationEngine';
import { ErrorMonitoringService } from './services/ErrorMonitoringService';
import { useAuth } from './hooks/useAuth';
import { useEnhancedSupabaseSync } from './hooks/useEnhancedSupabaseSync';
import { NavigationDock } from './components/NavigationDock';
import { diagnoseAudioIssues, fixCommonAudioIssues, forceAudioPlayback } from './utils/audioDebugger';
import { InsightToast } from './components/InsightToast';
import { TrackLoadingUI } from './components/TrackLoadingUI';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { LandingPage } from './components/LandingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { UnifiedAudioPlayer } from './components/UnifiedAudioPlayer';
import { ErrorBoundary } from './components/ErrorBoundary';


// Import OnboardingData type for proper typing
import type { OnboardingData } from './components/OnboardingFlow';

// Import default exported pages correctly
import MagicStudio from './pages/MagicStudio';
import MagicDecks from './pages/MagicDecks';
import MagicProducer from './pages/MagicProducer';

// Import audio library with Supabase support
import { 
  initialPlaylist, 
  ALTERNATIVE_AUDIO_SOURCES
} from './services/TrackLibraryService';
import { generateProceduralAudio } from './lib/audioUtils';
import { supabase, testSupabaseConnection } from './lib/supabase';

// Constants
const STORAGE_KEYS = {
  ONBOARDING: 'dj-sensee-onboarding',
  USER_PREFERENCES: 'dj-sensee-preferences',
  PLAYLIST: 'dj-sensee-playlist',
  SUPABASE_MODE: 'dj-sensee-supabase-mode',
  TRACK_CACHE: 'dj-sensee-track-cache',
  FILTER_PREFERENCES: 'dj-sensee-filters',
} as const;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // ms
const CACHE_DURATION = 3600000; // 1 hour in ms

// Types for enhanced functionality
interface TrackCache {
  tracks: Track[];
  timestamp: number;
  source: 'supabase' | 'demo' | 'procedural';
}

interface FilterState {
  genre?: string;
  bpmRange?: [number, number];
  energyRange?: [number, number];
  searchQuery?: string;
  sortBy?: 'title' | 'artist' | 'bpm' | 'energy' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  errors: string[];
}

// Fallback tracks for demo mode
const DEMO_TRACKS: Track[] = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Free Music Archive',
    album: 'Creative Commons',
    duration: 180,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    bpm: 128,
    key: 'C',
    energy: 75,
    danceability: 80,
    valence: 85,
    genre: 'electronic',
    year: 2023,
    waveform: [],
    sourceUsed: 'demo',
    license: 'CC-BY',
    streamingRights: true
  },
  {
    id: 2,
    title: 'Night Drive',
    artist: 'Demo Artist',
    album: 'Sample Pack',
    duration: 240,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    bpm: 124,
    key: 'Am',
    energy: 70,
    danceability: 75,
    valence: 60,
    genre: 'house',
    year: 2023,
    waveform: [],
    sourceUsed: 'demo',
    license: 'Royalty-Free',
    streamingRights: true
  },
  {
    id: 3,
    title: 'Electric Dreams',
    artist: 'Synth Master',
    album: 'Digital Age',
    duration: 195,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    bpm: 132,
    key: 'Dm',
    energy: 85,
    danceability: 90,
    valence: 70,
    genre: 'techno',
    year: 2023,
    waveform: [],
    sourceUsed: 'demo',
    license: 'Commercial',
    streamingRights: true
  }
];

export default function App() {
  // Attempt to reconnect to Supabase and fix audio issues on app load
  const { reconnectSupabase } = useEnhancedSupabaseSync();

  useEffect(() => {
    // Try to reconnect to Supabase
    reconnectSupabase().then(connected => {
      console.log(`Supabase connection ${connected ? 'established' : 'failed'}`);
    });
    
    // Add click handler to force audio context activation
    const handleUserInteraction = () => {
      forceAudioPlayback();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Diagnose and fix audio issues
    const diagnose = async () => {
      const diagnosis = diagnoseAudioIssues();
      console.log('🔊 Audio diagnosis:', diagnosis);
      
      if (diagnosis.issues.length > 0) {
        console.warn('⚠️ Audio issues detected:', diagnosis.issues);
        const fixed = await fixCommonAudioIssues();
        console.log(`${fixed ? '✅' : '❌'} Audio fixes ${fixed ? 'applied' : 'failed'}`);
      }
    };
    
    diagnose();
  }, []);

  const [mode, setMode] = useState<AppMode>('landing');
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [filteredPlaylist, setFilteredPlaylist] = useState<Track[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [playerMode, setPlayerMode] = useState<'hidden' | 'persistent' | 'floating'>('hidden');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    message: 'Initializing...',
    errors: []
  });
  const [supabaseMode, setSupabaseMode] = useState<'auto' | 'forced' | 'disabled'>('auto');
  const [filterState, setFilterState] = useState<FilterState>({});
  const [isRealtime, setIsRealtime] = useState(false);

  // Global playback state
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // Refs for realtime subscriptions
  const realtimeChannelRef = useRef<any>(null);
  const retryCountRef = useRef<Record<string, number>>({});

  const [isFirstTime, setIsFirstTime] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEYS.ONBOARDING);
    } catch (error) {
      console.warn('localStorage access failed:', error);
      return true;
    }
  });

  // Auth and sync hooks
  const { user, loading: authLoading } = useAuth();
  const { savePreferences, loadPreferences, isOnline, syncStatus } = useEnhancedSupabaseSync();

  // Helper function to extract metadata from audio file
  const extractAudioMetadata = useCallback(async (url: string, filename?: string): Promise<Partial<Track>> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = url;
      
      const metadata: Partial<Track> = {};
      
      // Extract from filename if available
      if (filename) {
        const nameWithoutExt = filename.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
        
        // Try various filename patterns
        // Pattern 1: "Artist - Title"
        if (nameWithoutExt.includes(' - ')) {
          const [artist, title] = nameWithoutExt.split(' - ', 2);
          metadata.artist = artist.trim().replace(/_/g, ' ');
          metadata.title = title.trim().replace(/_/g, ' ');
        }
        // Pattern 2: "Artist_Title_BPM"
        else if (nameWithoutExt.includes('_')) {
          const parts = nameWithoutExt.split('_');
          if (parts.length >= 2) {
            metadata.artist = parts[0].replace(/-/g, ' ');
            metadata.title = parts[1].replace(/-/g, ' ');
            if (parts[2] && /^\d+$/.test(parts[2])) {
              metadata.bpm = parseInt(parts[2]);
            }
          }
        }
        // Pattern 3: Just title
        else {
          metadata.title = nameWithoutExt.replace(/[-_]/g, ' ');
          metadata.artist = 'Unknown Artist';
        }
        
        // Extract year from filename if present (e.g., "Title (2023)")
        const yearMatch = nameWithoutExt.match(/\((\d{4})\)/);
        if (yearMatch) {
          metadata.year = parseInt(yearMatch[1]);
        }
        
        // Extract genre if in brackets [Genre]
        const genreMatch = nameWithoutExt.match(/\[([^\]]+)\]/);
        if (genreMatch) {
          metadata.genre = genreMatch[1].toLowerCase();
        }
      }
      
      // Real-time duration detection
      audio.addEventListener('loadedmetadata', () => {
        metadata.duration = audio.duration || 0;
        
        // Estimate BPM from duration if not set
        if (!metadata.bpm && metadata.duration) {
          // Simple heuristic: most electronic music is 120-140 BPM
          metadata.bpm = 128; // Default, could be analyzed properly
        }
        
        resolve(metadata);
      });
      
      audio.addEventListener('error', () => {
        console.warn('Failed to load audio metadata:', url);
        resolve(metadata);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(metadata);
      }, 5000);
      
      audio.load();
    });
  }, []);

  // Retry helper with exponential backoff
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    retryKey: string,
    maxAttempts: number = MAX_RETRY_ATTEMPTS
  ): Promise<T | null> => {
    const attempts = retryCountRef.current[retryKey] || 0;
    
    try {
      const result = await fn();
      retryCountRef.current[retryKey] = 0; // Reset on success
      return result;
    } catch (error) {
      retryCountRef.current[retryKey] = attempts + 1;
      
      if (attempts < maxAttempts) {
        const delay = RETRY_DELAY * Math.pow(2, attempts); // Exponential backoff
        console.log(`Retry ${attempts + 1}/${maxAttempts} for ${retryKey} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retryKey, maxAttempts);
      } else {
        console.error(`Max retries reached for ${retryKey}:`, error);
        setLoadingState(prev => ({
          ...prev,
          errors: [...prev.errors, `Failed: ${retryKey}`]
        }));
        return null;
      }
    }
  }, []);

  // Fetch tracks from Supabase with retry and caching
  const fetchSupabaseTracks = useCallback(async (): Promise<Track[]> => {
    if (!supabase || supabaseMode === 'disabled') {
      console.log('📀 Supabase disabled, using demo tracks');
      return DEMO_TRACKS;
    }

    // Check cache first
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.TRACK_CACHE);
      if (cachedData) {
        const cache: TrackCache = JSON.parse(cachedData);
        if (Date.now() - cache.timestamp < CACHE_DURATION && cache.source === 'supabase') {
          console.log('📀 Using cached Supabase tracks');
          return cache.tracks;
        }
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }

    setLoadingState(prev => ({ ...prev, message: 'Connecting to Supabase...' }));

    const fetchTracks = async () => {
      const { data: fileList, error: listError } = await supabase
        .storage
        .from('tracks')
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (listError || !fileList?.length) {
        throw listError || new Error('No files found in Supabase.');
      }

      setLoadingState(prev => ({ 
        ...prev, 
        message: `Found ${fileList.length} files, loading...`,
        progress: 10 
      }));

      const tracks: Track[] = [];
      const totalFiles = fileList.filter(f => f.name.match(/\.(mp3|wav|ogg|m4a)$/i)).length;
      let processedFiles = 0;

      await Promise.all(
        fileList
          .filter(file => file.name.match(/\.(mp3|wav|ogg|m4a)$/i))
          .map(async (file, idx) => {
            try {
              // Get signed URL with retry
              const signedUrlData = await retryWithBackoff(async () => {
                const { data, error } = await supabase
                  .storage
                  .from('tracks')
                  .createSignedUrl(file.name, 3600); // 1 hour expiry
                
                if (error || !data?.signedUrl) throw error || new Error('No signed URL');
                return data;
              }, `signedUrl-${file.name}`);

              if (!signedUrlData) return;

              // Extract metadata with real-time duration
              const metadata = await extractAudioMetadata(signedUrlData.signedUrl, file.name);

              if (!metadata.duration || metadata.duration < 5) {
                console.warn(`⚠️ Skipped ${file.name}: Invalid duration`);
                return;
              }

              // Create track with all metadata
              const track: Track = {
                id: `supabase-${file.id || idx}-${Date.now()}`,
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                artist: metadata.artist || 'Unknown Artist',
                album: 'Supabase Library',
                duration: metadata.duration,
                url: signedUrlData.signedUrl,
                bpm: metadata.bpm || 128,
                key: 'Am', // Could be analyzed
                energy: Math.floor(Math.random() * 30) + 70, // Could be analyzed
                danceability: Math.floor(Math.random() * 20) + 75,
                valence: Math.floor(Math.random() * 30) + 60,
                genre: metadata.genre || 'electronic',
                year: metadata.year || new Date().getFullYear(),
                sourceUsed: 'supabase',
                license: 'custom',
                streamingRights: true,
                fileSize: file.metadata?.size,
                uploadedAt: file.created_at,
                waveform: [] // Could be generated
              };

              tracks.push(track);
              processedFiles++;
              
              setLoadingState(prev => ({ 
                ...prev, 
                progress: 10 + (processedFiles / totalFiles) * 80,
                message: `Loading track ${processedFiles}/${totalFiles}...`
              }));

            } catch (err) {
              console.error(`Failed to load ${file.name}:`, err);
              setLoadingState(prev => ({
                ...prev,
                errors: [...prev.errors, `Failed: ${file.name}`]
              }));
            }
          })
      );

      // Sort tracks by upload date (newest first) then by title
      tracks.sort((a, b) => {
        if (a.uploadedAt && b.uploadedAt) {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        return a.title.localeCompare(b.title);
      });

      console.log(`✅ Loaded ${tracks.length} tracks from Supabase`);
      
      // Cache the results
      const cache: TrackCache = {
        tracks,
        timestamp: Date.now(),
        source: 'supabase'
      };
      localStorage.setItem(STORAGE_KEYS.TRACK_CACHE, JSON.stringify(cache));

      return tracks;
    };

    const tracks = await retryWithBackoff(fetchTracks, 'fetchSupabaseTracks');
    return tracks || DEMO_TRACKS;
  }, [supabaseMode, extractAudioMetadata, retryWithBackoff]);

  // Set up Supabase realtime subscription for live sync
  const setupRealtimeSync = useCallback(() => {
    if (!supabase || !isRealtime || supabaseMode === 'disabled') return;

    console.log('🔄 Setting up realtime sync...');

    // Clean up existing subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Subscribe to storage changes
    const channel = supabase
      .channel('storage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'storage',
          table: 'objects',
          filter: `bucket_id=eq.tracks`
        },
        async (payload) => {
          console.log('📡 Storage change detected:', payload);
          
          // Refresh tracks on any change
          const newTracks = await fetchSupabaseTracks();
          setPlaylist(newTracks);
          applyFilters(newTracks, filterState);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }, [supabase, isRealtime, supabaseMode, fetchSupabaseTracks, filterState]);

  // Apply filters and sorting to playlist
  const applyFilters = useCallback((tracks: Track[], filters: FilterState) => {
    let filtered = [...tracks];

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query)
      );
    }

    // Genre filter
    if (filters.genre && filters.genre !== 'all') {
      filtered = filtered.filter(track => track.genre === filters.genre);
    }

    // BPM range
    if (filters.bpmRange) {
      filtered = filtered.filter(track => 
        track.bpm >= filters.bpmRange![0] && track.bpm <= filters.bpmRange![1]
      );
    }

    // Energy range
    if (filters.energyRange) {
      filtered = filtered.filter(track => 
        track.energy >= filters.energyRange![0] && track.energy <= filters.energyRange![1]
      );
    }

    // Sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[filters.sortBy!];
        const bVal = b[filters.sortBy!];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return filters.sortOrder === 'desc' 
            ? bVal.localeCompare(aVal)
            : aVal.localeCompare(bVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return filters.sortOrder === 'desc' 
            ? bVal - aVal
            : aVal - bVal;
        }
        
        return 0;
      });
    }

    setFilteredPlaylist(filtered);
    
    // Save filter preferences
    localStorage.setItem(STORAGE_KEYS.FILTER_PREFERENCES, JSON.stringify(filters));
  }, []);

  // Load tracks on mount
  useEffect(() => {
    let mounted = true;
    
    const loadTracks = async () => {
      setLoadingState({
        isLoading: true,
        progress: 0,
        message: 'Initializing music library...',
        errors: []
      });

      try {
        console.log('🎵 Initializing music library...');
        setLoadingState(prev => ({ 
          ...prev, 
          progress: 20,
          message: 'Initializing music library...'
        }));
        
        // Initialize music library with fallback tracks
        const fallbackTracks = ALTERNATIVE_AUDIO_SOURCES.map((url, index) => ({
          id: `fallback_${index}`,
          title: `Fallback Track ${index + 1}`,
          artist: 'DJ-Sensee',
          album: 'Fallback Collection',
          duration: 180,
          url,
          bpm: '128',
          key: 'C',
          energy: 70,
          danceability: 75,
          valence: 65,
          genre: 'electronic',
          year: new Date().getFullYear(),
          sourceUsed: 'fallback'
        }));
        
        await musicLibrary.initialize(fallbackTracks);
        
        setLoadingState(prev => ({ 
          ...prev, 
          progress: 50,
          message: 'Loading tracks...'
        }));
        
        // Get tracks from library
        let tracks = musicLibrary.getAllTracks();
        
        // If library is empty, try fetching from Supabase
        if (tracks.length === 0) {
          try {
            console.log('🎵 Library empty, fetching from Supabase...');
            setLoadingState(prev => ({ 
              ...prev, 
              message: 'Connecting to cloud library...'
            }));
            
            const supabaseTracks = await fetchSupabaseTracks();
            
            // Add tracks to library
            await musicLibrary.addTracks(supabaseTracks);
            
            // Get updated tracks
            tracks = musicLibrary.getAllTracks();
          } catch (fetchError) {
            console.error('Failed to fetch tracks from Supabase:', fetchError);
            
            // Generate procedural tracks as last resort
            setLoadingState(prev => ({ 
              ...prev, 
              message: 'Generating demo tracks...'
            }));
            
            const proceduralTracks: Track[] = [];
            for (let i = 0; i < 5; i++) {
              const track = await musicLibrary.generateProceduralTrack({
                title: `Demo Track ${i + 1}`,
                genre: ['house', 'techno', 'ambient', 'trance', 'electronic'][i % 5],
                duration: 30 + Math.random() * 120
              });
              proceduralTracks.push(track);
            }
            
            // Add tracks to library
            await musicLibrary.addTracks(proceduralTracks);
            
            // Get updated tracks
            tracks = musicLibrary.getAllTracks();
          }
        }
        
        if (mounted) {
          setPlaylist(tracks);
          applyFilters(tracks, filterState);
          setLoadingState({
            isLoading: false,
            progress: 100,
            message: 'Ready!',
            errors: []
          });
        }
      } catch (error) {
        console.error('Failed to initialize music library:', error);
        
        if (mounted) {
          try {
            // Generate a single procedural track as absolute last resort
            const proceduralUrl = await generateProceduralAudio();
            const fallbackTrack: Track = {
              id: 'procedural-fallback',
              title: 'Demo Audio (Offline Mode)',
              artist: 'Procedural Engine',
              album: 'Offline',
              duration: 30,
              url: proceduralUrl,
              bpm: '120',
              key: 'C',
              energy: 50,
              danceability: 60,
              valence: 50,
              genre: 'experimental',
              year: new Date().getFullYear(),
              sourceUsed: 'procedural'
            };
            
            setPlaylist([fallbackTrack]);
            setFilteredPlaylist([fallbackTrack]);
            setLoadingState({
              isLoading: false,
              progress: 100,
              message: 'Offline mode',
              errors: ['Failed to connect to music library']
            });
          } catch (fallbackError) {
            setLoadingState({
              isLoading: false,
              progress: 100,
              message: 'Failed to load music',
              errors: ['Critical error: Unable to create audio']
            });
          }
        }
      }
    };

    loadTracks();

    return () => {
      mounted = false;
    };
  }, [fetchSupabaseTracks, applyFilters, filterState]);

  // Set up realtime sync when enabled
  useEffect(() => {
    if (isRealtime) {
      setupRealtimeSync();
    }

    return () => {
      if (realtimeChannelRef.current && supabase) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [isRealtime, setupRealtimeSync, supabase]);

  // Helper function to ensure audio element exists
  const ensureAudioElement = useCallback((track: Track) => {
    if (!track) return null;
    
    const audio = EnhancedAudioService.getAudioElement(track.id.toString(), track);
    if (audio) {
      console.log(`🎵 Audio element ready for: ${track.title}`);
    }
    return audio;
  }, []);

  // Update filter state handler
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filterState, ...newFilters };
    setFilterState(updatedFilters);
    applyFilters(playlist, updatedFilters);
  }, [filterState, playlist, applyFilters]);

  // Global playback handlers
  const handleGlobalPlayPause = useCallback(async () => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length === 0 || currentTrackIndex >= playlistToUse.length) return;
    
    if (currentTrackIndex < 0) {
      setCurrentTrackIndex(0);
      return;
    }

    const currentTrack = playlistToUse[currentTrackIndex];
    if (!currentTrack) return;

    console.log(`🎵 Play/Pause requested for: ${currentTrack.title}`);

    try {
      if (isPlaying) {
        EnhancedAudioService.pause(currentTrack.id.toString());
        setIsPlaying(false);
        
        AnalyticsService.trackPlayback(currentTrack, 'pause', currentTime);
      } else {
        ensureAudioElement(currentTrack);
        await EnhancedAudioService.play(currentTrack.id.toString());
        setIsPlaying(true);
        
        AnalyticsService.trackPlayback(currentTrack, 'play', currentTime);
      }
    } catch (error) {
      console.error('Global playback error:', error);
      setIsPlaying(!isPlaying);
    }
  }, [filteredPlaylist, playlist, currentTrackIndex, isPlaying, currentTime, ensureAudioElement]);

  const handleGlobalPlay = useCallback(async () => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length === 0 || currentTrackIndex >= playlistToUse.length) return;
    
    if (currentTrackIndex < 0) {
      setCurrentTrackIndex(0);
      return;
    }
    
    const currentTrack = playlistToUse[currentTrackIndex];
    if (!currentTrack) return;

    try {
      ensureAudioElement(currentTrack);
      await EnhancedAudioService.play(currentTrack.id.toString());
      setIsPlaying(true);
      
      AnalyticsService.trackPlayback(currentTrack, 'play', 0);
    } catch (error) {
      console.error('Global play error:', error);
      setIsPlaying(true);
    }
  }, [filteredPlaylist, playlist, currentTrackIndex, ensureAudioElement]);

  const handleGlobalNext = useCallback(() => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length === 0) return;
    
    const prevTrack = playlistToUse[currentTrackIndex];
    const nextIndex = (currentTrackIndex + 1) % playlistToUse.length;
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
    
    if (prevTrack) {
      AnalyticsService.trackPlayback(prevTrack, 'skip', currentTime);
    }
    
    if (isPlaying) {
      setTimeout(async () => {
        const nextTrack = playlistToUse[nextIndex];
        if (nextTrack) {
          if (prevTrack && nextTrack) {
            AnalyticsService.trackMix(prevTrack, nextTrack, 'manual', 0.5);
            OptimizationEngine.addTransitionFeedback(
              prevTrack.id.toString(),
              nextTrack.id.toString(),
              70,
              'manual',
              0.5,
              true
            );
          }
          
          try {
            ensureAudioElement(nextTrack);
            await EnhancedAudioService.play(nextTrack.id.toString());
          } catch (error) {
            console.error('Error playing next track:', error);
            setIsPlaying(true);
          }
        }
      }, 100);
    }
  }, [filteredPlaylist, playlist, currentTrackIndex, isPlaying, currentTime, ensureAudioElement]);

  const handleGlobalPrevious = useCallback(() => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length === 0) return;
    
    const prevTrack = playlistToUse[currentTrackIndex];
    const prevIndex = (currentTrackIndex - 1 + playlistToUse.length) % playlistToUse.length;
    setCurrentTrackIndex(prevIndex);
    setCurrentTime(0);
    
    if (prevTrack) {
      AnalyticsService.trackPlayback(prevTrack, 'skip', currentTime);
    }
    
    if (isPlaying) {
      setTimeout(async () => {
        const prevTrack = playlistToUse[prevIndex];
        if (prevTrack) {
          try {
            ensureAudioElement(prevTrack);
            await EnhancedAudioService.play(prevTrack.id.toString());
          } catch (error) {
            console.error('Error playing previous track:', error);
            setIsPlaying(true);
          }
        }
      }, 100);
    }
  }, [filteredPlaylist, playlist, currentTrackIndex, isPlaying, currentTime, ensureAudioElement]);

  const handleGlobalVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length > 0 && currentTrackIndex < playlistToUse.length) {
      const currentTrack = playlistToUse[currentTrackIndex];
      if (currentTrack) {
        EnhancedAudioService.setVolume(currentTrack.id.toString(), newVolume);
      }
    }
  }, [filteredPlaylist, playlist, currentTrackIndex]);

  const handleStartOnboarding = useCallback(() => {
    console.log('🚀 Starting onboarding flow');
    setShowOnboarding(true);
  }, []);

  const handleOnboardingComplete = useCallback(
    (data: OnboardingData) => {
      try {
        const onboardingData = {
          ...data,
          completedAt: new Date().toISOString(),
          version: '1.0.0',
        };

        localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(onboardingData));

        if (user) {
          savePreferences({
            onboardingData,
            appSettings: { onboardingCompleted: true },
          });
        }

        console.log('✅ Onboarding completed successfully:', data);

        setShowOnboarding(false);
        setIsFirstTime(false);
        setPlayerMode('persistent');
        setMode('studio');
      } catch (error) {
        console.error('❌ Failed to save onboarding data:', error);
        setShowOnboarding(false);
        setIsFirstTime(false);
        setPlayerMode('persistent');
        setMode('studio');
      }
    },
    [user, savePreferences]
  );

  const handleModeChange = useCallback(
    (newMode: AppMode) => {
      console.log(`🔄 Mode change: ${mode} → ${newMode}`);
      setMode(newMode);
      
      if (newMode === 'live' && playlist.length > 0) {
        setPlayerMode('persistent');
      }
    },
    [mode, playlist.length]
  );

  const handlePlaylistUpdate = useCallback((newPlaylist: Track[]) => {
    console.log(`🎵 Playlist updated: ${newPlaylist.length} tracks`);
    setPlaylist(newPlaylist);
    applyFilters(newPlaylist, filterState);
    
    if (newPlaylist.length > 0) {
      OptimizationEngine.setPlaylist(newPlaylist);
    }
  }, [filterState, applyFilters]);

  const handleShowAuth = useCallback((mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  }, []);

  const handleSeek = useCallback((time: number) => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length > 0 && currentTrackIndex < playlistToUse.length) {
      console.log(`🎵 Seeking to: ${time.toFixed(2)}s`);
      
      if (playlistToUse[currentTrackIndex]) {
        AnalyticsService.trackPlayback(
          playlistToUse[currentTrackIndex],
          'play',
          time
        );
      }
      
      const currentTrack = playlistToUse[currentTrackIndex];
      if (currentTrack) {
        EnhancedAudioService.setCurrentTime(currentTrack.id.toString(), time);
        setCurrentTime(time);
      }
    }
  }, [filteredPlaylist, playlist, currentTrackIndex]);

  // Initialize AI Service once on mount
  useEffect(() => {
    let mounted = true;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    const initializeService = async () => {
      try {
        if (mounted) {
          console.log('🎵 Starting initialization of all services...');
          
          console.log('🎵 Testing Supabase connection...');
          
          const connected = await testSupabaseConnection();
          console.log(`🔌 Supabase connection: ${connected ? '✅ Connected' : '❌ Offline'}`);
          
          console.log('🎵 Initializing EnhancedAudioService...');
          // Initialize audio first to ensure it's ready
          await EnhancedAudioService.initialize();
          console.log('✅ EnhancedAudioService initialized');

          // Initialize all services in parallel
          await Promise.all([
            // Initialize AI services with user data if available
            EnhancedNeuralCueLinkService.initialize(user?.user_metadata).catch(err => {
              console.warn('Neural service initialization warning:', err);
            }),
            
            // Initialize analytics
            AnalyticsService.initialize(user?.id, {
              enabled: true,
              anonymizeData: !user
            }),
            
            // Initialize optimization engine
            OptimizationEngine.initialize({
              enabled: true,
              realTimeAnalysis: true
            }),
            
            // Initialize error monitoring
            ErrorMonitoringService.initialize(sessionId)
          ]);
          
          console.log('🧠 All services initialized successfully!');
          
          // Force an audio context activation on user interaction
          const activateAudio = () => {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            context.resume().then(() => {
              console.log('🔊 Audio context activated by user interaction');
              document.removeEventListener('click', activateAudio);
              document.removeEventListener('touchstart', activateAudio);
            });
          };
          
          document.addEventListener('click', activateAudio);
          document.addEventListener('touchstart', activateAudio);
        }
      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };
    
    initializeService();

    return () => {
      mounted = false;
      EnhancedNeuralCueLinkService.destroy();
      EnhancedAudioService.destroy();
      AnalyticsService.destroy();
      OptimizationEngine.destroy();
      ErrorMonitoringService.destroy();
    };
  }, [user?.id, user?.user_metadata]);

  // Load user preferences after auth
  useEffect(() => {
    if (user && !authLoading) {
      const loadUserPrefs = async () => {
        try {
          const preferences = await loadPreferences();
          if (preferences?.onboarding_data) {
            setIsFirstTime(false);
            setPlayerMode('persistent');
            console.log('✅ Loaded user preferences');
          }
        } catch (error) {
          console.warn('Failed to load user preferences:', error);
        }
      };
      loadUserPrefs();
    }
  }, [user, authLoading, loadPreferences]);

  // Auto-load playlist when entering live mode
  useEffect(() => {
    if (mode === 'live' && playlist.length === 0 && !loadingState.isLoading) {
      console.log('🎵 Auto-loading playlist for live mode');
      if (playlist.length === 0) {
        console.log('🎵 Using demo tracks for live mode');
        setPlaylist(DEMO_TRACKS);
        setFilteredPlaylist(DEMO_TRACKS); 
      }
      setPlayerMode('persistent');
    }
  }, [mode, playlist.length, loadingState.isLoading]);

  // Auto-start music in live mode
  useEffect(() => {
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    if (playlistToUse.length > 0 && currentTrackIndex < playlistToUse.length && mode === 'live' && !isPlaying) {
      const currentTrack = playlistToUse[currentTrackIndex];
      if (currentTrack && !isPlaying && !loadingState.isLoading) {
        console.log('🎵 Auto-starting music in live mode:', currentTrack.title);
        ensureAudioElement(currentTrack);
        setTimeout(() => {
          console.log('🎵 Triggering auto-play in live mode');
          handleGlobalPlay();
        }, 1000);
      }
    }
  }, [filteredPlaylist, playlist, currentTrackIndex, mode, isPlaying, loadingState.isLoading, ensureAudioElement, handleGlobalPlay]);

  // Track progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
      if (playlistToUse.length > 0 && currentTrackIndex < playlistToUse.length && currentTrackIndex >= 0) {
        const currentTrack = playlistToUse[currentTrackIndex];
        if (currentTrack) {
          const audioState = EnhancedAudioService.getState(currentTrack.id.toString());
          if (audioState) {
            setCurrentTime(audioState.currentTime);
            setDuration(audioState.duration);
            
            if (audioState.isPlaying !== isPlaying) {
              setIsPlaying(audioState.isPlaying);
            }
            
            if (audioState.currentTime >= audioState.duration - 0.5 && audioState.duration > 0 && audioState.isPlaying) {
              AnalyticsService.trackPlayback(
                currentTrack,
                'complete',
                audioState.duration
              );
              
              handleGlobalNext();
            }
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [filteredPlaylist, playlist, currentTrackIndex, isPlaying, handleGlobalNext]);

  // Save playlist to localStorage
  useEffect(() => {
    if (playlist.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.PLAYLIST, JSON.stringify(playlist));
        console.log(`💾 Saved ${playlist.length} tracks to cache`);
      } catch (error) {
        console.error('Failed to save playlist:', error);
      }
    }
  }, [playlist]);

  // Load Supabase mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.SUPABASE_MODE) as typeof supabaseMode;
    if (savedMode) {
      setSupabaseMode(savedMode);
    }
  }, []);

  // Memoized render of mode
  const renderMode = useMemo(() => {
    const globalPlaybackState = {
      currentTrackIndex,
      isPlaying,
      currentTime,
      duration,
      volume
    };
    
    const globalPlaybackHandlers = {
      onPlayPause: handleGlobalPlayPause,
      onNext: handleGlobalNext,
      onPrevious: handleGlobalPrevious,
      onVolumeChange: handleGlobalVolumeChange
    };
    
    const playlistToUse = filteredPlaylist.length > 0 ? filteredPlaylist : playlist;
    
    // Show loading state
    if (loadingState.isLoading && mode !== 'landing') {
      return <TrackLoadingUI loadingState={loadingState} />;
    }
    
    switch (mode) {
      case 'studio':
        return (
          <MagicStudio
            setPlaylist={handlePlaylistUpdate}
            setMode={handleModeChange}
            initialPlaylist={playlistToUse.length > 0 ? playlistToUse : DEMO_TRACKS}
            globalPlaybackState={globalPlaybackState}
            globalPlaybackHandlers={globalPlaybackHandlers}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            isRealtime={isRealtime}
            onRealtimeToggle={setIsRealtime}
          />
        );
      case 'live':
        return (
          <MagicDecks 
            setMode={handleModeChange} 
            playlist={playlistToUse}
            globalPlaybackState={globalPlaybackState}
            globalPlaybackHandlers={globalPlaybackHandlers}
            filterState={filterState}
            onFilterChange={handleFilterChange}
          />
        );
      case 'producer':
        return (
          <MagicProducer 
            setMode={handleModeChange} 
            playlist={playlistToUse}
            filterState={filterState}
            onFilterChange={handleFilterChange}
          />
        );
      default:
        return (
          <LandingPage
            setMode={handleModeChange}
            onStartOnboarding={handleStartOnboarding}
            isFirstTime={isFirstTime}
            onShowAuth={handleShowAuth}
            user={user}
          />
        );
    }
  }, [
    mode,
    playlist,
    filteredPlaylist,
    isFirstTime,
    loadingState,
    user,
    handleModeChange,
    handlePlaylistUpdate,
    handleStartOnboarding,
    handleShowAuth,
    handleGlobalPlayPause,
    handleGlobalNext,
    handleGlobalPrevious,
    handleGlobalVolumeChange,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    filterState,
    handleFilterChange,
    isRealtime
  ]);

  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <NeuralCueLinkProvider>
          <OnboardingFlow onComplete={handleOnboardingComplete} setMode={handleModeChange} />
          <InsightToast />
        </NeuralCueLinkProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <NeuralCueLinkProvider>
        <main className="bg-black min-h-screen flex flex-col">
          {mode !== 'landing' && (
            <NavigationDock
              mode={mode}
              setMode={handleModeChange}
              user={user}
              onShowAuth={handleShowAuth}
              onShowProfile={() => setShowUserProfile(true)}
              isOnline={isOnline}
              syncStatus={syncStatus}
              supabaseMode={supabaseMode}
              onSupabaseModeChange={(mode) => {
                setSupabaseMode(mode);
                localStorage.setItem(STORAGE_KEYS.SUPABASE_MODE, mode);
              }}
              trackSource={playlist[0]?.sourceUsed}
              trackCount={filteredPlaylist.length || playlist.length}
              isRealtime={isRealtime}
              onRealtimeToggle={setIsRealtime}
            />
          )}
          <div className="flex-grow relative overflow-hidden">{renderMode}</div>
          <InsightToast />

          {/* Auth Modal */}
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
            mode={authMode} 
            onModeChange={setAuthMode} 
          />

          {/* User Profile Modal */}
          <UserProfile 
            isOpen={showUserProfile} 
            onClose={() => setShowUserProfile(false)} 
          />

          {/* Unified Audio Player */}
          {playerMode !== 'hidden' && (filteredPlaylist.length > 0 || playlist.length > 0) && (
            <UnifiedAudioPlayer
              playlist={filteredPlaylist.length > 0 ? filteredPlaylist : playlist}
              currentTrackIndex={currentTrackIndex}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              onPlayPause={handleGlobalPlayPause}
              onNext={handleGlobalNext}
              onPrevious={handleGlobalPrevious}
              onVolumeChange={handleGlobalVolumeChange}
              onSeek={handleSeek}
              onTrackSelect={(index) => setCurrentTrackIndex(index)}
              mode={playerMode}
              autoAdapt={true}
              trackSource={(filteredPlaylist[currentTrackIndex] || playlist[currentTrackIndex])?.sourceUsed}
            />
          )}
        </main>
      </NeuralCueLinkProvider>
    </ErrorBoundary>
  );
}