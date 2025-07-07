# Supabase Integration Plan for DJ-Sensee

## Phase 1: User Authentication (Minimal)
```sql
-- Users table (extends Supabase auth.users)
create table public.dj_profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  preferred_genres text[],
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced', 'professional')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table dj_profiles enable row level security;

create policy "Users can view their own profile"
  on dj_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on dj_profiles for update
  using (auth.uid() = id);
```

## Phase 2: Playlist Storage
```sql
-- Playlists table
create table public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  tracks jsonb not null default '[]'::jsonb,
  is_public boolean default false,
  genre text,
  duration_minutes integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table playlists enable row level security;

create policy "Users can manage their own playlists"
  on playlists for all
  using (auth.uid() = user_id);

create policy "Anyone can view public playlists"
  on playlists for select
  using (is_public = true);
```

## Phase 3: Performance Analytics
```sql
-- DJ Sessions table
create table public.dj_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  session_name text not null,
  venue text,
  playlist_id uuid references playlists(id),
  performance_metrics jsonb not null default '{}'::jsonb,
  mix_history jsonb not null default '[]'::jsonb,
  session_duration_minutes integer,
  crowd_response_avg numeric(3,1),
  technical_score numeric(3,1),
  creativity_score numeric(3,1),
  started_at timestamptz default now(),
  ended_at timestamptz
);

alter table dj_sessions enable row level security;

create policy "Users can manage their own sessions"
  on dj_sessions for all
  using (auth.uid() = user_id);
```

## Integration Points in Current Code

### 1. Replace localStorage with Supabase
```typescript
// Current: localStorage.setItem('dj-sensee-playlist', JSON.stringify(playlist))
// New: await supabase.from('playlists').upsert({ user_id, tracks: playlist })

// Current: const saved = localStorage.getItem('dj-sensee-onboarding')
// New: const { data } = await supabase.from('dj_profiles').select('*').single()
```

### 2. Add Authentication to App.tsx
```typescript
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Add auth state management
const [session, setSession] = useState(null)
```

### 3. Cloud Sync for Playlists
```typescript
// In MagicSetBuilderPanel.tsx
const savePlaylistToCloud = async (playlist: Track[]) => {
  if (!session?.user) return;
  
  await supabase.from('playlists').insert({
    user_id: session.user.id,
    name: `Generated Set ${new Date().toLocaleDateString()}`,
    tracks: playlist,
    genre: extractGenreFromPlaylist(playlist)
  });
};
```

### 4. Performance Analytics Storage
```typescript
// In MagicDecks.tsx
const saveSessionMetrics = async (sessionData: SessionState) => {
  if (!session?.user) return;
  
  await supabase.from('dj_sessions').insert({
    user_id: session.user.id,
    session_name: sessionData.sessionName,
    performance_metrics: metrics,
    mix_history: sessionData.mixHistory,
    crowd_response_avg: sessionData.crowdResponse,
    technical_score: metrics.technicalScore,
    creativity_score: metrics.creativityScore
  });
};
```

## Edge Functions Use Cases

### 1. Music API Proxy
```typescript
// supabase/functions/music-search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { query, genre } = await req.json()
  
  // Proxy requests to Spotify/YouTube Music APIs
  // Add rate limiting, caching, API key management
  
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  })
})
```

### 2. AI Playlist Generation
```typescript
// supabase/functions/generate-playlist/index.ts
serve(async (req) => {
  const { prompt, userPreferences } = await req.json()
  
  // Use OpenAI API to analyze prompt
  // Generate intelligent track suggestions
  // Return curated playlist
  
  return new Response(JSON.stringify(playlist))
})
```

### 3. Real-time Crowd Analytics
```typescript
// supabase/functions/crowd-analytics/index.ts
serve(async (req) => {
  const { sessionId, metrics } = await req.json()
  
  // Process real-time crowd response data
  // Update live analytics dashboard
  // Send recommendations back to DJ
  
  return new Response(JSON.stringify(insights))
})
```

## Migration Strategy

1. **Keep current localStorage as fallback**
2. **Add Supabase as enhancement layer**
3. **Gradual feature migration**
4. **Maintain offline functionality**

```typescript
// Hybrid approach
const savePlaylist = async (playlist: Track[]) => {
  // Always save locally first
  localStorage.setItem('dj-sensee-playlist', JSON.stringify(playlist));
  
  // Try to sync to cloud if authenticated
  if (session?.user) {
    try {
      await supabase.from('playlists').upsert({
        user_id: session.user.id,
        tracks: playlist
      });
    } catch (error) {
      console.warn('Cloud sync failed, using local storage');
    }
  }
};
```