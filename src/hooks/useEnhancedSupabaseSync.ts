import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseAvailable, testSupabaseConnection } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Track } from '../types';
import { reconnectSupabase } from '../utils/supabaseReconnect';

interface SyncState {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime: number | null;
  pendingOperations: number;
  errorMessage: string | null;
}

interface PlaylistData {
  id?: string;
  name: string;
  tracks: Track[];
  description?: string;
  isPublic?: boolean;
  genre?: string;
  mood?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface SessionData {
  sessionName: string;
  venue?: string;
  playlistId?: string;
  performanceMetrics: Record<string, any>;
  mixHistory: any[];
  durationMinutes?: number;
  crowdResponse?: number;
  technicalScore?: number;
  creativityScore?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

interface UserPreferences {
  onboardingData?: Record<string, any>;
  appSettings?: Record<string, any>;
  audioSettings?: Record<string, any>;
  uiPreferences?: Record<string, any>;
  aiPreferences?: Record<string, any>;
}

export function useEnhancedSupabaseSync() {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncStatus: 'idle',
    lastSyncTime: null,
    pendingOperations: 0,
    errorMessage: null
  });
  
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const syncQueueRef = useRef<Array<() => Promise<void>>>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Test Supabase connection on mount and network changes
  useEffect(() => {
    const checkConnection = async () => {
      if (isSupabaseAvailable()) {
        const connected = await testSupabaseConnection();
        setSupabaseConnected(connected);
        if (!connected) {
          console.warn('⚠️ Supabase connection failed. Using offline mode.');
          setSyncState(prev => ({ 
            ...prev, 
            syncStatus: 'error', 
            errorMessage: 'Database connection failed' 
          }));
        } else {
          setSyncState(prev => ({ 
            ...prev, 
            syncStatus: 'idle', 
            errorMessage: null 
          }));
        }
      }
    };
    
    checkConnection();
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      processSyncQueue();
    };
    
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queued sync operations when coming back online
  const processSyncQueue = useCallback(async () => {
    if (!syncState.isOnline || !supabaseConnected || syncQueueRef.current.length === 0) {
      return;
    }

    setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      while (syncQueueRef.current.length > 0) {
        const operation = syncQueueRef.current.shift();
        if (operation) {
          await operation();
          setSyncState(prev => ({ 
            ...prev, 
            pendingOperations: Math.max(0, prev.pendingOperations - 1) 
          }));
        }
      }
      
      setSyncState(prev => ({ 
        ...prev, 
        syncStatus: 'success', 
        lastSyncTime: Date.now(),
        errorMessage: null 
      }));
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      setSyncState(prev => ({ 
        ...prev, 
        syncStatus: 'error', 
        errorMessage: 'Sync failed' 
      }));
    }
  }, [syncState.isOnline, supabaseConnected]);

  // Enhanced error handling with retry logic
  const handleSyncError = useCallback((error: any, operation: () => Promise<void>) => {
    console.error('Sync operation failed:', error);
    
    // Add to retry queue
    syncQueueRef.current.push(operation);
    setSyncState(prev => ({ 
      ...prev, 
      pendingOperations: prev.pendingOperations + 1,
      syncStatus: 'error',
      errorMessage: error.message || 'Sync failed'
    }));

    // Retry after delay
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = setTimeout(() => {
      if (syncState.isOnline && supabaseConnected) {
        processSyncQueue();
      }
    }, 5000);
  }, [syncState.isOnline, supabaseConnected, processSyncQueue]);

  // Enhanced playlist operations
  const savePlaylist = useCallback(async (playlistData: PlaylistData) => {
    const operation = async () => {
      if (!user || !isSupabaseAvailable() || !supabase) {
        throw new Error('User not authenticated or Supabase not available');
      }

      const duration = playlistData.tracks.reduce((total, track) => total + (track.duration || 180), 0) / 60;
      
      const { data, error } = await supabase
        .from('playlists')
        .upsert({
          id: playlistData.id,
          user_id: user.id,
          name: playlistData.name,
          description: playlistData.description,
          tracks: playlistData.tracks,
          is_public: playlistData.isPublic || false,
          genre: playlistData.genre,
          mood: playlistData.mood,
          tags: playlistData.tags || [],
          duration_minutes: Math.round(duration),
          ...playlistData.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    if (!syncState.isOnline || !supabaseConnected) {
      // Save to localStorage as fallback
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const newPlaylist = {
        id: playlistData.id || `local_${Date.now()}`,
        ...playlistData,
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      localPlaylists.push(newPlaylist);
      localStorage.setItem('dj-sensee-playlists', JSON.stringify(localPlaylists));
      
      // Queue for later sync
      syncQueueRef.current.push(operation);
      setSyncState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
      
      return { data: newPlaylist, error: null };
    }

    setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const data = await operation();
      setSyncState(prev => ({ 
        ...prev, 
        syncStatus: 'success', 
        lastSyncTime: Date.now(),
        errorMessage: null 
      }));
      console.log('💾 Playlist saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      handleSyncError(error, operation);
      
      // Fallback to localStorage
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const newPlaylist = {
        id: playlistData.id || `local_${Date.now()}`,
        ...playlistData,
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      localPlaylists.push(newPlaylist);
      localStorage.setItem('dj-sensee-playlists', JSON.stringify(localPlaylists));
      
      return { data: newPlaylist, error };
    }
  }, [user, syncState.isOnline, supabaseConnected, handleSyncError]);

  // Load playlists with real-time updates
  const loadPlaylists = useCallback(async () => {
    if (!user || !syncState.isOnline || !supabaseConnected || !isSupabaseAvailable() || !supabase) {
      // Load from localStorage
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      return localPlaylists;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Merge with local playlists
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const mergedPlaylists = [...(data || []), ...localPlaylists.filter((p: any) => p.user_id === 'local')];
      
      return mergedPlaylists;
    } catch (error) {
      console.error('Failed to load playlists:', error);
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      return localPlaylists;
    }
  }, [user, syncState.isOnline, supabaseConnected]);

  // Delete playlist
  const deletePlaylist = useCallback(async (playlistId: string) => {
    const operation = async () => {
      if (!user || !isSupabaseAvailable() || !supabase) {
        throw new Error('User not authenticated or Supabase not available');
      }

      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
    };

    if (!syncState.isOnline || !supabaseConnected) {
      // Remove from localStorage
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const filteredPlaylists = localPlaylists.filter((p: any) => p.id !== playlistId);
      localStorage.setItem('dj-sensee-playlists', JSON.stringify(filteredPlaylists));
      
      // Queue for later sync
      syncQueueRef.current.push(operation);
      setSyncState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
      
      return { error: null };
    }

    try {
      await operation();
      console.log('🗑️ Playlist deleted from Supabase');
      return { error: null };
    } catch (error) {
      handleSyncError(error, operation);
      return { error };
    }
  }, [user, syncState.isOnline, supabaseConnected, handleSyncError]);

  // Enhanced session operations
  const saveSession = useCallback(async (sessionData: SessionData) => {
    const operation = async () => {
      if (!user || !isSupabaseAvailable() || !supabase) {
        throw new Error('User not authenticated or Supabase not available');
      }

      const { data, error } = await supabase
        .from('dj_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionData.sessionName,
          venue: sessionData.venue,
          playlist_id: sessionData.playlistId,
          performance_metrics: sessionData.performanceMetrics,
          mix_history: sessionData.mixHistory,
          session_duration_minutes: sessionData.durationMinutes,
          crowd_response_avg: sessionData.crowdResponse,
          technical_score: sessionData.technicalScore,
          creativity_score: sessionData.creativityScore,
          notes: sessionData.notes,
          ended_at: new Date().toISOString(),
          ...sessionData.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    if (!syncState.isOnline || !supabaseConnected) {
      // Save to localStorage as fallback
      const localSessions = JSON.parse(localStorage.getItem('dj-sensee-sessions') || '[]');
      const newSession = {
        id: `local_${Date.now()}`,
        ...sessionData,
        user_id: 'local',
        started_at: new Date().toISOString()
      };
      localSessions.push(newSession);
      localStorage.setItem('dj-sensee-sessions', JSON.stringify(localSessions));
      
      // Queue for later sync
      syncQueueRef.current.push(operation);
      setSyncState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
      
      return { data: newSession, error: null };
    }

    setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const data = await operation();
      setSyncState(prev => ({ 
        ...prev, 
        syncStatus: 'success', 
        lastSyncTime: Date.now(),
        errorMessage: null 
      }));
      console.log('📊 Session saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      handleSyncError(error, operation);
      
      // Fallback to localStorage
      const localSessions = JSON.parse(localStorage.getItem('dj-sensee-sessions') || '[]');
      const newSession = {
        id: `local_${Date.now()}`,
        ...sessionData,
        user_id: 'local',
        started_at: new Date().toISOString()
      };
      localSessions.push(newSession);
      localStorage.setItem('dj-sensee-sessions', JSON.stringify(localSessions));
      
      return { data: newSession, error };
    }
  }, [user, syncState.isOnline, supabaseConnected, handleSyncError]);

  // Enhanced preferences operations
  const savePreferences = useCallback(async (preferences: UserPreferences) => {
    const operation = async () => {
      if (!user || !isSupabaseAvailable() || !supabase) {
        throw new Error('User not authenticated or Supabase not available');
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          onboarding_data: preferences.onboardingData || {},
          app_settings: preferences.appSettings || {},
          audio_settings: preferences.audioSettings || {},
          ui_preferences: preferences.uiPreferences || {},
          ai_preferences: preferences.aiPreferences || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    if (!syncState.isOnline || !supabaseConnected) {
      // Save to localStorage as fallback
      localStorage.setItem('dj-sensee-preferences', JSON.stringify(preferences));
      
      // Queue for later sync
      syncQueueRef.current.push(operation);
      setSyncState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));
      
      return { data: preferences, error: null };
    }

    setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      const data = await operation();
      setSyncState(prev => ({ 
        ...prev, 
        syncStatus: 'success', 
        lastSyncTime: Date.now(),
        errorMessage: null 
      }));
      console.log('⚙️ Preferences saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      handleSyncError(error, operation);
      
      // Fallback to localStorage
      localStorage.setItem('dj-sensee-preferences', JSON.stringify(preferences));
      
      return { data: preferences, error };
    }
  }, [user, syncState.isOnline, supabaseConnected, handleSyncError]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user || !syncState.isOnline || !supabaseConnected || !isSupabaseAvailable() || !supabase) {
      // Load from localStorage
      const localPrefs = localStorage.getItem('dj-sensee-preferences');
      return localPrefs ? JSON.parse(localPrefs) : null;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Merge with local preferences if cloud data doesn't exist
      if (!data) {
        const localPrefs = localStorage.getItem('dj-sensee-preferences');
        return localPrefs ? JSON.parse(localPrefs) : null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      const localPrefs = localStorage.getItem('dj-sensee-preferences');
      return localPrefs ? JSON.parse(localPrefs) : null;
    }
  }, [user, syncState.isOnline, supabaseConnected]);

  // Real-time subscriptions
  const subscribeToPlaylists = useCallback((callback: (playlists: any[]) => void) => {
    if (!user || !supabaseConnected || !isSupabaseAvailable() || !supabase) {
      return () => {};
    }

    const subscription = supabase
      .channel('playlists')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'playlists',
          filter: `user_id=eq.${user.id}`
        }, 
        async () => {
          const playlists = await loadPlaylists();
          callback(playlists);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabaseConnected, loadPlaylists]);

  // Sync status helpers
  const forceSyncNow = useCallback(async () => {
    if (syncState.isOnline && supabaseConnected) {
      await processSyncQueue();
    }
  }, [syncState.isOnline, supabaseConnected, processSyncQueue]);

  const clearSyncQueue = useCallback(() => {
    syncQueueRef.current = [];
    setSyncState(prev => ({ ...prev, pendingOperations: 0 }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection status
    isOnline: syncState.isOnline,
    supabaseConnected,
    syncStatus: syncState.syncStatus,
    lastSyncTime: syncState.lastSyncTime,
    pendingOperations: syncState.pendingOperations,
    errorMessage: syncState.errorMessage,
    
    // Playlist operations
    savePlaylist,
    loadPlaylists,
    deletePlaylist,
    subscribeToPlaylists,
    
    // Session operations
    saveSession,
    
    // Preferences operations
    savePreferences,
    loadPreferences,
    
    // Sync control
    forceSyncNow,
    clearSyncQueue,
    processSyncQueue,
    reconnectSupabase
  };
}