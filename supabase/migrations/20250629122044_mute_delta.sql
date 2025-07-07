/*
  # Create DJ Profiles and Core Tables

  1. New Tables
    - `dj_profiles` - User profiles extending Supabase auth
    - `playlists` - User playlists with tracks
    - `dj_sessions` - Performance session tracking
    - `user_preferences` - App preferences and settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Public read access for shared playlists

  3. Features
    - User profile management
    - Playlist storage and sharing
    - Session analytics tracking
    - Preference synchronization
*/

-- DJ Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS dj_profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  preferred_genres text[] DEFAULT '{}',
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')) DEFAULT 'beginner',
  avatar_url text,
  location text,
  website text,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dj_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON dj_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON dj_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON dj_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT false,
  genre text,
  duration_minutes integer,
  energy_progression text CHECK (energy_progression IN ('build', 'maintain', 'decline')) DEFAULT 'maintain',
  target_bpm integer,
  mood text,
  tags text[] DEFAULT '{}',
  play_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own playlists"
  ON playlists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public playlists"
  ON playlists FOR SELECT
  USING (is_public = true);

-- DJ Sessions table for performance analytics
CREATE TABLE IF NOT EXISTS dj_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name text NOT NULL,
  venue text,
  playlist_id uuid REFERENCES playlists(id),
  performance_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  mix_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_duration_minutes integer,
  crowd_response_avg numeric(3,1),
  technical_score numeric(3,1),
  creativity_score numeric(3,1),
  energy_levels jsonb DEFAULT '[]'::jsonb,
  favorite_tracks text[] DEFAULT '{}',
  successful_transitions jsonb DEFAULT '[]'::jsonb,
  notes text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE dj_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
  ON dj_sessions FOR ALL
  USING (auth.uid() = user_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  onboarding_data jsonb DEFAULT '{}'::jsonb,
  app_settings jsonb DEFAULT '{}'::jsonb,
  audio_settings jsonb DEFAULT '{}'::jsonb,
  ui_preferences jsonb DEFAULT '{}'::jsonb,
  ai_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Playlist likes table (for social features)
CREATE TABLE IF NOT EXISTS playlist_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, playlist_id)
);

ALTER TABLE playlist_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own likes"
  ON playlist_likes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes for public playlists"
  ON playlist_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_likes.playlist_id 
      AND playlists.is_public = true
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_dj_profiles_updated_at 
  BEFORE UPDATE ON dj_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlists_genre ON playlists(genre);
CREATE INDEX IF NOT EXISTS idx_dj_sessions_user_id ON dj_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dj_sessions_started_at ON dj_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);