import React from 'react';
import { SlidersHorizontal, Music, BrainCircuit, Home, User, Cloud, CloudOff, Loader2, Radio } from 'lucide-react';
import { AppMode } from '../types';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface NavigationDockProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  user: SupabaseUser | null;
  onShowAuth: (mode: 'signin' | 'signup') => void;
  onShowProfile: () => void;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export const NavigationDock: React.FC<NavigationDockProps> = ({ 
  mode, 
  setMode, 
  user, 
  onShowAuth, 
  onShowProfile,
  isOnline,
  syncStatus,
}) => {
  const navItems = [
    { id: 'studio' as AppMode, label: 'Magic Studio', icon: <SlidersHorizontal /> },
    { id: 'live' as AppMode, label: 'Live Decks', icon: <Music /> },
    { id: 'producer' as AppMode, label: 'Magic Producer', icon: <BrainCircuit /> }
  ];

  return (
    <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex justify-between items-center border-b border-gray-700/30">
      <div className="flex items-center gap-4">
        <div 
          className="flex items-center gap-3 cursor-pointer group transition-all duration-200"
          onClick={() => setMode('landing')}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300 group-hover:scale-105">
              <Music className="text-white group-hover:animate-pulse" size={22} />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-cyan-300 transition-all duration-300">
              DJ-Sensee
            </h1>
            <p className="text-xs text-gray-400 font-medium tracking-wide">AI COPILOT</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 bg-gray-900/80 border border-gray-600/50 rounded-xl p-1.5 backdrop-blur-sm">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 ${
              mode === item.id 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <span className={mode === item.id ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Sync Status */}
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${
          isOnline 
            ? 'text-green-400 bg-green-900/20 border-green-500/30' 
            : 'text-red-400 bg-red-900/20 border-red-500/30'
        }`}>
          {syncStatus === 'syncing' ? (
            <Loader2 className="animate-spin" size={12} />
          ) : isOnline ? (
            <Cloud size={12} />
          ) : (
            <CloudOff size={12} />
          )}
          <span className="hidden sm:inline">
            {syncStatus === 'syncing' ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-500/30 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <span className="hidden lg:inline font-medium">AI Brain: Optimal</span>
          <span className="lg:hidden font-medium">AI</span>
        </div>
        
        {/* User Menu */}
        {user ? (
          <button
            onClick={onShowProfile}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50 transition-all duration-200 border border-gray-600/30"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={14} />
            </div>
            <span className="hidden lg:inline text-gray-300 text-sm font-medium">
              {user.email?.split('@')[0]}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onShowAuth('signin')}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
          >
            Sign In
          </button>
        )}
        
        <button
          onClick={() => setMode('landing')}
          className="p-2.5 rounded-lg hover:bg-gray-700/50 transition-all duration-200 border border-gray-600/30 text-gray-300 hover:text-white"
          title="Go to home"
        >
          <Home className="text-gray-300" />
        </button>
      </div>
    </header>
  );
};