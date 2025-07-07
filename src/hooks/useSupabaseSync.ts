import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseAvailable, testSupabaseConnection, type Playlist, type DJSession, type UserPreferences } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Track } from '../types';

export function useSupabaseSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Test Supabase connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isSupabaseAvailable()) {
        const connected = await testSupabaseConnection();
        setSupabaseConnected(connected);
        if (!connected) {
          console.warn('⚠️ Supabase connection failed. Using offline mode.');
        }
      }
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save playlist to Supabase
  const savePlaylist = useCallback(async (
    name: string,
    tracks: Track[],
    options: {
      description?: string;
      isPublic?: boolean;
      genre?: string;
      mood?: string;
      tags?: string[];
    } = {}
  ) => {
    if (!user || !isOnline || !supabaseConnected || !isSupabaseAvailable()) {
      // Save to localStorage as fallback
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const newPlaylist = {
        id: `local_${Date.now()}`,
        name,
        tracks,
        ...options,
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      localPlaylists.push(newPlaylist);
      localStorage.setItem('dj-sensee-playlists', JSON.stringify(localPlaylists));
      return { data: newPlaylist, error: null };
    }

    setSyncStatus('syncing');
    
    try {
      const duration = tracks.reduce((total, track) => total + (track.duration || 180), 0) / 60;
      
      const { data, error } = await supabase!
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          description: options.description,
          tracks: tracks,
          is_public: options.isPublic || false,
          genre: options.genre,
          mood: options.mood,
          tags: options.tags || [],
          duration_minutes: Math.round(duration),
          energy_progression: 'maintain',
        })
        .select()
        .single();

      setSyncStatus('idle');
      
      if (error) throw error;
      
      console.log('💾 Playlist saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      setSyncStatus('error');
      console.error('Failed to save playlist:', error);
      
      // Fallback to localStorage on error
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      const newPlaylist = {
        id: `local_${Date.now()}`,
        name,
        tracks,
        ...options,
        created_at: new Date().toISOString(),
        user_id: 'local'
      };
      localPlaylists.push(newPlaylist);
      localStorage.setItem('dj-sensee-playlists', JSON.stringify(localPlaylists));
      
      return { data: null, error };
    }
  }, [user, isOnline, supabaseConnected]);

  // Load user playlists
  const loadPlaylists = useCallback(async (): Promise<Playlist[]> => {
    if (!user || !isOnline || !supabaseConnected || !isSupabaseAvailable()) {
      // Load from localStorage
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      return localPlaylists;
    }

    try {
      const { data, error } = await supabase!
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Failed to load playlists:', error);
      // Fallback to localStorage
      const localPlaylists = JSON.parse(localStorage.getItem('dj-sensee-playlists') || '[]');
      return localPlaylists;
    }
  }, [user, isOnline, supabaseConnected]);

  // Save DJ session
  const saveSession = useCallback(async (sessionData: {
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
  }) => {
    if (!user || !isOnline || !supabaseConnected || !isSupabaseAvailable()) {
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
      return { data: newSession, error: null };
    }

    setSyncStatus('syncing');

    try {
      const { data, error } = await supabase!
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
          ended_at: new Date().toISOString()
        })
        .select()
        .single();

      setSyncStatus('idle');
      
      if (error) throw error;
      
      console.log('📊 Session saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      setSyncStatus('error');
      console.error('Failed to save session:', error);
      
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
      
      return { data: null, error };
    }
  }, [user, isOnline, supabaseConnected]);

  // Save user preferences
  const savePreferences = useCallback(async (preferences: {
    onboardingData?: Record<string, any>;
    appSettings?: Record<string, any>;
    audioSettings?: Record<string, any>;
    uiPreferences?: Record<string, any>;
    aiPreferences?: Record<string, any>;
  }) => {
    if (!user || !isOnline || !supabaseConnected || !isSupabaseAvailable()) {
      // Save to localStorage as fallback
      localStorage.setItem('dj-sensee-preferences', JSON.stringify(preferences));
      return { data: preferences, error: null };
    }

    setSyncStatus('syncing');

    try {
      const { data, error } = await supabase!
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

      setSyncStatus('idle');
      
      if (error) throw error;
      
      console.log('⚙️ Preferences saved to Supabase:', data);
      return { data, error: null };
    } catch (error) {
      setSyncStatus('error');
      console.error('Failed to save preferences:', error);
      
      // Fallback to localStorage
      localStorage.setItem('dj-sensee-preferences', JSON.stringify(preferences));
      
      return { data: null, error };
    }
  }, [user, isOnline, supabaseConnected]);

  // Load user preferences
  const loadPreferences = useCallback(async (): Promise<UserPreferences | null> => {
    if (!user || !isOnline || !supabaseConnected || !isSupabaseAvailable()) {
      // Load from localStorage
      const localPrefs = localStorage.getItem('dj-sensee-preferences');
      return localPrefs ? JSON.parse(localPrefs) : null;
    }

    try {
      const { data, error } = await supabase!
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Fallback to localStorage
      const localPrefs = localStorage.getItem('dj-sensee-preferences');
      return localPrefs ? JSON.parse(localPrefs) : null;
    }
  }, [user, isOnline, supabaseConnected]);

  return {
    isOnline,
    supabaseConnected,
    syncStatus,
    savePlaylist,
    loadPlaylists,
    saveSession,
    savePreferences,
    loadPreferences,
  };
}