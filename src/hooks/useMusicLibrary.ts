import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types';
import { musicLibrary } from '../services/MusicLibraryManager';

interface MusicLibraryState {
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
}

interface MusicLibraryFilters {
  searchQuery?: string;
  genre?: string;
  bpmRange?: [number, number];
  energyRange?: [number, number];
}

export function useMusicLibrary(initialFilters?: MusicLibraryFilters) {
  const [state, setState] = useState<MusicLibraryState>({
    tracks: [],
    isLoading: true,
    error: null
  });
  
  const [filters, setFilters] = useState<MusicLibraryFilters>(initialFilters || {});
  
  // Initialize library
  useEffect(() => {
    let mounted = true;
    
    const initLibrary = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        // Initialize library
        const success = await musicLibrary.initialize();
        
        if (!mounted) return;
        
        if (success) {
          // Get all tracks
          const allTracks = musicLibrary.getAllTracks();
          setState({
            tracks: allTracks,
            isLoading: false,
            error: null
          });
        } else {
          setState({
            tracks: [],
            isLoading: false,
            error: 'Failed to initialize music library'
          });
        }
      } catch (error) {
        if (!mounted) return;
        
        setState({
          tracks: [],
          isLoading: false,
          error: `Error initializing library: ${error}`
        });
      }
    };
    
    initLibrary();
    
    // Add listener for library changes
    const unsubscribe = musicLibrary.addListener(() => {
      if (mounted) {
        const allTracks = musicLibrary.getAllTracks();
        setState(prev => ({
          ...prev,
          tracks: allTracks
        }));
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  
  // Apply filters when they change
  useEffect(() => {
    if (!musicLibrary.isReady()) return;
    
    let filteredTracks = musicLibrary.getAllTracks();
    
    // Apply search query
    if (filters.searchQuery) {
      filteredTracks = musicLibrary.searchTracks(filters.searchQuery);
    }
    
    // Apply genre filter
    if (filters.genre && filters.genre !== 'all') {
      filteredTracks = filteredTracks.filter(track => 
        track.genre?.toLowerCase() === filters.genre?.toLowerCase()
      );
    }
    
    // Apply BPM range
    if (filters.bpmRange) {
      filteredTracks = filteredTracks.filter(track => {
        const bpm = parseInt(track.bpm || '0');
        return bpm >= filters.bpmRange![0] && bpm <= filters.bpmRange![1];
      });
    }
    
    // Apply energy range
    if (filters.energyRange) {
      filteredTracks = filteredTracks.filter(track => 
        (track.energy || 0) >= filters.energyRange![0] && 
        (track.energy || 0) <= filters.energyRange![1]
      );
    }
    
    setState(prev => ({
      ...prev,
      tracks: filteredTracks
    }));
  }, [filters]);
  
  // Add tracks
  const addTracks = useCallback(async (tracks: Track[]): Promise<number> => {
    return await musicLibrary.addTracks(tracks);
  }, []);
  
  // Remove track
  const removeTrack = useCallback(async (trackId: string): Promise<boolean> => {
    return await musicLibrary.removeTrack(trackId);
  }, []);
  
  // Import from files
  const importFromFiles = useCallback(async (files: File[]): Promise<number> => {
    return await musicLibrary.importFromFiles(files);
  }, []);
  
  // Generate procedural track
  const generateProceduralTrack = useCallback(async (options?: any): Promise<Track> => {
    return await musicLibrary.generateProceduralTrack(options);
  }, []);
  
  // Update filters
  const updateFilters = useCallback((newFilters: Partial<MusicLibraryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  // Create backup
  const createBackup = useCallback(async (): Promise<void> => {
    await musicLibrary.createBackup();
  }, []);
  
  // Restore from backup
  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    return await musicLibrary.restoreFromBackup();
  }, []);
  
  // Get library stats
  const getStats = useCallback(() => {
    return musicLibrary.getStats();
  }, []);
  
  return {
    ...state,
    filters,
    updateFilters,
    clearFilters,
    addTracks,
    removeTrack,
    importFromFiles,
    generateProceduralTrack,
    createBackup,
    restoreFromBackup,
    getStats
  };
}