import { supabase, testSupabaseConnection } from '../lib/supabase';

/**
 * Gracefully attempts to reconnect to Supabase.
 *
 * @param maxAttempts - Number of retry attempts before giving up (default: 3)
 * @param initialDelay - Delay in ms before first retry (default: 1000ms)
 * @returns Promise<boolean> - Resolves to true if reconnected successfully, else false
 */
export async function reconnectSupabase(
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<boolean> {
  if (!supabase) {
    console.warn('[Supabase] ⚠️ Client unavailable – skipping reconnect attempt.');
    return false;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.info(`[Supabase] 🔁 Reconnect attempt ${attempt}/${maxAttempts}...`);
    try {
      const connected = await testSupabaseConnection(true);
      if (connected) {
        console.info('[Supabase] ✅ Reconnection successful.');
        return true;
      }
    } catch (err) {
      console.error(`[Supabase] ❌ Reconnection attempt ${attempt} failed:`, err);
    }

    const delay = initialDelay * attempt;
    console.log(`[Supabase] ⏳ Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.warn('[Supabase] ❌ All reconnection attempts failed.');
  return false;
}
