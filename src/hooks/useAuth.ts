import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    if (isSupabaseAvailable() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      console.warn('Supabase not available, auth functionality will be limited');
      setLoading(false);
      return () => {};
    }
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: new Error('Supabase not available') };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: new Error('Supabase not available') };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: new Error('Supabase not available') };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseAvailable() || !supabase) {
      return { error: new Error('Supabase not available') };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}