@@ .. @@
 CREATE TABLE IF NOT EXISTS dj_profiles (
   id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
   username text UNIQUE NOT NULL,
-  display_name text,
+  display_name text, 
   bio text,
   preferred_genres text[] DEFAULT '{}',
   experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')) DEFAULT 'beginner',
@@ .. @@
 CREATE POLICY "Users can view their own profile"
   ON dj_profiles FOR SELECT
   USING (auth.uid() = id);
-
+  
 CREATE POLICY "Users can update their own profile"
   ON dj_profiles FOR UPDATE
   USING (auth.uid() = id);
@@ .. @@
 CREATE POLICY "Users can insert their own profile"
   ON dj_profiles FOR INSERT
   WITH CHECK (auth.uid() = id);
-
+  
 -- Playlists table
 CREATE TABLE IF NOT EXISTS playlists (
@@ .. @@
 CREATE POLICY "Users can manage their own playlists"
   ON playlists FOR ALL
   USING (auth.uid() = user_id);
-
+  
 CREATE POLICY "Anyone can view public playlists"
   ON playlists FOR SELECT
   USING (is_public = true);
@@ .. @@
 CREATE POLICY "Users can manage their own sessions"
   ON dj_sessions FOR ALL
   USING (auth.uid() = user_id);
-
+  
 -- User preferences table
 CREATE TABLE IF NOT EXISTS user_preferences (
@@ .. @@
 CREATE POLICY "Users can manage their own preferences"
   ON user_preferences FOR ALL
   USING (auth.uid() = user_id);
-
+  
 -- Playlist likes table (for social features)
 CREATE TABLE IF NOT EXISTS playlist_likes (
@@ .. @@
 CREATE POLICY "Users can manage their own likes"
   ON playlist_likes FOR ALL
   USING (auth.uid() = user_id);
-
+  
 CREATE POLICY "Anyone can view likes for public playlists"
   ON playlist_likes FOR SELECT
   USING (
@@ .. @@
 CREATE TRIGGER update_playlists_updated_at 
   BEFORE UPDATE ON playlists 
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-
+  
 CREATE TRIGGER update_user_preferences_updated_at 
   BEFORE UPDATE ON user_preferences 
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-
+  
 -- Indexes for better performance
 CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
 CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public) WHERE is_public = true;
 CREATE INDEX IF NOT EXISTS idx_playlists_genre ON playlists(genre);
 CREATE INDEX IF NOT EXISTS idx_dj_sessions_user_id ON dj_sessions(user_id);
 CREATE INDEX IF NOT EXISTS idx_dj_sessions_started_at ON dj_sessions(started_at);
 CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);