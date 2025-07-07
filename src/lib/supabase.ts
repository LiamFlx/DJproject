import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Environment variables with secure fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Configuration validation
const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.length > 20;

// Connection state management
let connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
let lastConnectionCheck: number = 0;
const CONNECTION_CHECK_INTERVAL = 60000; // 60 seconds

// Logging configuration
const LOG_PREFIX = '[Supabase]';
const log = {
  info: (...args: any[]) => console.log(`${LOG_PREFIX} ℹ️`, ...args),
  warn: (...args: any[]) => console.warn(`${LOG_PREFIX} ⚠️`, ...args),
  error: (...args: any[]) => console.error(`${LOG_PREFIX} ❌`, ...args),
  success: (...args: any[]) => console.log(`${LOG_PREFIX} ✅`, ...args),
};

if (!isSupabaseConfigured) {
  log.warn('Supabase not configured properly. Running in offline mode.');
  log.warn('Check your .env file: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with enhanced configuration
export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'dj-sensee-auth',
        flowType: 'pkce', // More secure for SPAs
      },
      global: {
        headers: {
          'X-Client-Info': 'dj-sensee-app',
          'X-App-Version': '1.0.0',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    })
  : null;

// Helper to check if Supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null && isSupabaseConfigured;
};

// Enhanced connection testing with caching
export const testSupabaseConnection = async (forceCheck: boolean = false): Promise<boolean> => {
  if (!isSupabaseAvailable()) {
    console.log('Supabase unavailable, running in offline mode.');
    if (connectionState !== 'disconnected') {
      connectionState = 'disconnected';
    }
    return false;
  }

  // Use cached result if recent
  if (!forceCheck && Date.now() - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
    return connectionState === 'connected';
  }

  connectionState = 'connecting';
  
  try {
    console.log('Testing Supabase connection...');
    
    // Simple ping test with timeout
    const pingPromise = Promise.race([
      supabase!.from('user_preferences').select('count').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
    ]);
    
    const { error } = await pingPromise as any;
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found" which is fine
      throw error;
    }
    
    // If we get here, connection is successful
    connectionState = 'connected';
    lastConnectionCheck = Date.now();
    return true;
  } catch (err) {
    // Silently handle connection errors to prevent app crashes
    connectionState = 'disconnected';
    return false;
  }
};

// Get current connection state
export const getConnectionState = () => connectionState;

// Supabase health check with detailed status
export interface SupabaseHealthStatus {
  connected: boolean;
  auth: boolean;
  database: boolean;
  storage: boolean;
  realtime: boolean;
  latency?: number;
}

export const checkSupabaseHealth = async (): Promise<SupabaseHealthStatus> => {
  const health: SupabaseHealthStatus = {
    connected: false,
    auth: false,
    database: false,
    storage: false,
    realtime: false,
  };

  if (!isSupabaseAvailable()) {
    return health;
  }

  const startTime = Date.now();

  try {
    // Auth check
    const { data: { session } } = await supabase!.auth.getSession();
    health.auth = true; // If this call succeeds, auth service is working

    // Database check
    const { error: dbError } = await supabase!
      .from('user_preferences')
      .select('count')
      .limit(1);
    health.database = !dbError || dbError.code === 'PGRST116'; // No rows found is fine

    // Storage check
    const { error: storageError } = await supabase!
      .storage
      .from('tracks')
      .list('', { limit: 1 });
    health.storage = !storageError || storageError.message === 'The resource was not found';

    // Realtime check (create and immediately remove a channel)
    try {
      const channel = supabase!.channel('health-check');
      channel.subscribe();
      await new Promise(resolve => setTimeout(resolve, 500));
      supabase!.removeChannel(channel);
      health.realtime = true;
    } catch {
      health.realtime = false;
    }

    health.connected = health.database || health.storage;
    health.latency = Date.now() - startTime;

    return health;
  } catch (err) {
    log.error('Health check failed:', err);
    return health;
  }
};

// Database Types with enhanced typing
export interface DJProfile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  bio?: string;
  preferred_genres: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  avatar_url?: string;
  location?: string;
  website?: string;
  social_links: Record<string, string>;
  verified?: boolean;
  follower_count?: number;
  following_count?: number;
  total_sets?: number;
  total_plays?: number;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_image?: string;
  tracks: PlaylistTrack[];
  is_public: boolean;
  is_collaborative?: boolean;
  genre?: string;
  duration_minutes?: number;
  energy_progression: 'build' | 'maintain' | 'decline' | 'dynamic';
  target_bpm?: number;
  bpm_range?: [number, number];
  mood?: string;
  tags: string[];
  play_count: number;
  like_count: number;
  share_count?: number;
  last_played?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrack {
  track_id: string;
  position: number;
  added_at: string;
  added_by: string;
  cue_points?: CuePoint[];
  notes?: string;
}

export interface CuePoint {
  id: string;
  time: number;
  label: string;
  color?: string;
  type: 'hot_cue' | 'loop' | 'memory';
}

export interface DJSession {
  id: string;
  user_id: string;
  session_name: string;
  venue?: string;
  venue_type?: 'club' | 'festival' | 'private' | 'radio' | 'stream' | 'practice';
  playlist_id?: string;
  performance_metrics: PerformanceMetrics;
  mix_history: MixHistoryEntry[];
  session_duration_minutes?: number;
  crowd_response_avg?: number;
  technical_score?: number;
  creativity_score?: number;
  energy_levels: EnergyLevel[];
  favorite_tracks: string[];
  successful_transitions: TransitionEntry[];
  notes?: string;
  recording_url?: string;
  is_public?: boolean;
  started_at: string;
  ended_at?: string;
}

export interface PerformanceMetrics {
  avg_bpm: number;
  bpm_consistency: number;
  key_compatibility: number;
  energy_flow: number;
  mix_smoothness: number;
  crowd_engagement: number;
}

export interface MixHistoryEntry {
  timestamp: string;
  from_track_id: string;
  to_track_id: string;
  transition_type: 'cut' | 'fade' | 'eq' | 'effect' | 'scratch';
  duration_seconds: number;
  quality_score: number;
  notes?: string;
}

export interface EnergyLevel {
  timestamp: string;
  energy: number;
  crowd_response?: number;
}

export interface TransitionEntry {
  from_track_id: string;
  to_track_id: string;
  type: string;
  rating: number;
  timestamp: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  onboarding_data: OnboardingData;
  app_settings: AppSettings;
  audio_settings: AudioSettings;
  ui_preferences: UIPreferences;
  ai_preferences: AIPreferences;
  privacy_settings?: PrivacySettings;
  notification_settings?: NotificationSettings;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  completed: boolean;
  completed_at?: string;
  skipped_steps?: string[];
  preferences: {
    genres: string[];
    experience_level: string;
    goals: string[];
  };
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  auto_save: boolean;
  offline_mode: boolean;
  analytics_enabled: boolean;
  crash_reporting: boolean;
}

export interface AudioSettings {
  output_device?: string;
  buffer_size: number;
  sample_rate: number;
  crossfader_curve: 'linear' | 'logarithmic' | 'exponential';
  eq_settings: {
    low: number;
    mid: number;
    high: number;
  };
  master_volume: number;
  cue_volume: number;
  auto_gain: boolean;
  key_lock: boolean;
}

export interface UIPreferences {
  waveform_color: string;
  deck_layout: 'classic' | 'modern' | 'minimal';
  show_bpm: boolean;
  show_key: boolean;
  show_time_remaining: boolean;
  show_phase_meter: boolean;
  zoom_level: number;
}

export interface AIPreferences {
  suggestions_enabled: boolean;
  auto_mix_enabled: boolean;
  crowd_reading_enabled: boolean;
  energy_tracking: boolean;
  personalization_level: 'low' | 'medium' | 'high';
  preferred_mix_style: 'smooth' | 'aggressive' | 'creative';
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  share_play_history: boolean;
  share_analytics: boolean;
  allow_collaboration: boolean;
}

export interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  new_tracks: boolean;
  playlist_updates: boolean;
  performance_insights: boolean;
  social_interactions: boolean;
}

// Storage bucket types
export interface TrackFile {
  id: string;
  name: string;
  size: number;
  mimetype: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    duration?: number;
    bitrate?: number;
    sample_rate?: number;
    channels?: number;
    artist?: string;
    title?: string;
    album?: string;
    year?: number;
    genre?: string;
    bpm?: number;
    key?: string;
  };
}

// Realtime subscription helpers
export interface RealtimeConfig {
  channel: string;
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
}

export const subscribeToRealtime = (
  config: RealtimeConfig,
  callback: (payload: any) => void
): RealtimeChannel | null => {
  if (!isSupabaseAvailable()) {
    log.warn('Cannot subscribe to realtime - Supabase not available');
    return null;
  }

  const channel = supabase!.channel(config.channel);
  let isSubscribed = false;

  if (config.table) {
    // Database changes
    channel.on(
      'postgres_changes' as any,
      {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter,
      },
      callback
    );
  } else {
    // Broadcast events
    channel.on('broadcast', { event: config.event || '*' }, callback);
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      log.success(`Subscribed to realtime channel: ${config.channel}`);
      isSubscribed = true;
    } else if (status === 'CLOSED' && isSubscribed) {
      log.warn(`Realtime channel closed: ${config.channel}`);
    } else if (status === 'CHANNEL_ERROR') {
      log.error(`Realtime channel error: ${config.channel}`);
    }
  });

  return channel;
};

// Utility functions for common operations
export const uploadTrack = async (
  file: File,
  metadata?: Record<string, any>
): Promise<{ url: string; path: string } | null> => {
  if (!isSupabaseAvailable()) {
    log.error('Cannot upload track - Supabase not available');
    return null;
  }

  try {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase!.storage
      .from('tracks')
      .upload(fileName, file, {
        metadata,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase!.storage
      .from('tracks')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    log.error('Track upload failed:', err);
    return null;
  }
};

// Export connection monitoring
export const monitorConnection = (
  onConnect?: () => void,
  onDisconnect?: () => void
): (() => void) => {
  if (!isSupabaseAvailable()) return () => {};

  const interval = setInterval(async () => {
    const wasConnected = connectionState === 'connected';
    const isConnected = await testSupabaseConnection();

    if (!wasConnected && isConnected && onConnect) {
      onConnect();
    } else if (wasConnected && !isConnected && onDisconnect) {
      onDisconnect();
    }
  }, CONNECTION_CHECK_INTERVAL);

  return () => clearInterval(interval);
};

// Initialize connection test on module load
if (isSupabaseAvailable()) {
  // Defer initial connection test to prevent blocking app startup
  setTimeout(async () => {
    try {
      const connected = await testSupabaseConnection();
      if (connected) {
        console.log('Supabase connection established');
      } else {
        console.log('Running in offline mode - Supabase unavailable');
      }
    } catch (error) {
      // Silently handle connection errors
      connectionState = 'disconnected';
    }
  }, 2000);
} else {
  console.log('Supabase not configured - running in offline mode');
}