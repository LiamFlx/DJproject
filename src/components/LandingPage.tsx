import React from 'react';
import { Music, Sparkles, Zap, User, LogIn, Headphones, Radio, Volume2 } from 'lucide-react';
import { AppMode } from '../types';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface LandingPageProps {
  setMode: (mode: AppMode) => void;
  onStartOnboarding: () => void;
  isFirstTime: boolean;
  onShowAuth: (mode: 'signin' | 'signup') => void;
  user: SupabaseUser | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  setMode, 
  onStartOnboarding, 
  isFirstTime,
  onShowAuth,
  user
}) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-purple-900/10 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Enhanced auth buttons */}
      <div className="fixed top-6 right-6 z-20 flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3 glass-panel rounded-full px-6 py-3 border border-purple-500/30 shadow-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={16} />
            </div>
            <span className="text-white font-medium">
              {user.email?.split('@')[0]}
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => onShowAuth('signin')}
              className="px-6 py-3 glass-panel text-gray-300 hover:text-white transition-all flex items-center gap-2 rounded-xl border border-gray-600/30 hover:border-purple-500/50 group"
            >
              <LogIn size={16} className="group-hover:animate-pulse" />
              Sign In
            </button>
            <button
              onClick={() => onShowAuth('signup')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 font-semibold"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
      
      {/* Enhanced animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-600/10 rounded-full mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      {/* Enhanced content */}
      <div className="z-10 text-center flex flex-col items-center max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl">
              <Music className="text-white animate-spin-slow" size={40} />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full animate-ping"></div>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-white to-cyan-400">
            DJ-Sensee
          </h1>
        </div>
        
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-400 leading-tight">
          Your AI Copilot for<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
            Every DJ Set
          </span>
        </h2>
        
        <p className="text-xl md:text-2xl mb-12 text-gray-300 max-w-3xl leading-relaxed">
          One sleek, modular, intelligent dashboard that evolves with you. 
          Create, perform, and analyze with cutting-edge AI assistance.
          {user && (
            <span className="block mt-4 text-purple-300 font-medium">
              Welcome back! Your data syncs automatically to the cloud.
            </span>
          )}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 mb-16">
          {isFirstTime && (
            <button
              onClick={onStartOnboarding}
              className="group px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl hover:shadow-purple-500/40 flex items-center gap-4 btn-glow animate-pulse-glow"
            >
              <Zap className="group-hover:animate-spin" size={28} />
              Get Started - 30 Seconds
            </button>
          )}
          
          <button
            onClick={() => setMode('studio')}
            className={`group px-10 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl hover:shadow-purple-500/40 flex items-center gap-4 btn-glow ${
              isFirstTime ? '' : 'animate-pulse-glow'
            }`}
          >
            <Sparkles className="group-hover:animate-spin" size={28} />
            {isFirstTime ? 'Skip to Studio' : 'Enter Magic Studio'}
          </button>
          
          <button
            onClick={() => setMode('live')}
            className="group px-10 py-5 glass-panel border-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400 text-xl font-bold rounded-2xl transition-all flex items-center gap-4 btn-glow hover:shadow-cyan-400/30"
          >
            <Headphones className="group-hover:animate-pulse" size={28} />
            Start Mixing
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="glass-panel rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all group hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-pulse">
              <Zap className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-purple-400">AI-Powered</h3>
            <p className="text-gray-300 leading-relaxed">Real-time mood detection, smart track suggestions, and intelligent mixing assistance</p>
          </div>
          
          <div className="glass-panel rounded-2xl p-8 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-pulse">
              <Radio className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-cyan-400">Cloud Sync</h3>
            <p className="text-gray-300 leading-relaxed">Your playlists, sessions, and preferences sync seamlessly across all devices</p>
          </div>
          
          <div className="glass-panel rounded-2xl p-8 border border-pink-500/20 hover:border-pink-500/40 transition-all group hover:scale-105">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:animate-pulse">
              <Volume2 className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-pink-400">Intuitive</h3>
            <p className="text-gray-300 leading-relaxed">Beautiful interface designed for creativity with professional-grade mixing tools</p>
          </div>
        </div>
        
        {!user && (
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Sign up to save your playlists, sync across devices, and unlock advanced AI features for the ultimate DJ experience
            </p>
          </div>
        )}
      </div>
    </div>
  );
};