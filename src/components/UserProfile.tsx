import React, { useState, useEffect } from 'react';
import { User, Settings, LogOut, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseSync } from '../hooks/useSupabaseSync';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const { isOnline, syncStatus, loadPreferences, savePreferences } = useSupabaseSync();
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadUserPreferences();
    }
  }, [isOpen, user]);

  const loadUserPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await loadPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          >
            ×
          </button>
        </div>

        {user && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {preferences?.onboarding_data?.username || user.email?.split('@')[0] || 'DJ'}
                </h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {isOnline ? (
                    <Cloud className="text-green-400" size={14} />
                  ) : (
                    <CloudOff className="text-red-400" size={14} />
                  )}
                  <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? 'Connected' : 'Offline'}
                  </span>
                  {syncStatus === 'syncing' && (
                    <Loader2 className="text-purple-400 animate-spin" size={12} />
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            {preferences && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {preferences.app_settings?.total_sessions || 0}
                  </div>
                  <div className="text-xs text-gray-400">Sessions</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-cyan-400">
                    {preferences.app_settings?.total_playlists || 0}
                  </div>
                  <div className="text-xs text-gray-400">Playlists</div>
                </div>
              </div>
            )}

            {/* Experience Level */}
            {preferences?.onboarding_data?.musicStyle && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Music Style</h4>
                <span className="inline-block px-3 py-1 bg-purple-600/20 text-purple-300 text-sm rounded-full">
                  {preferences.onboarding_data.musicStyle}
                </span>
              </div>
            )}

            {/* Favorite Artist */}
            {preferences?.onboarding_data?.favoriteArtist && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Favorite Artist</h4>
                <p className="text-white">{preferences.onboarding_data.favoriteArtist}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg transition-colors">
                <Settings size={18} />
                Settings
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-purple-400" size={24} />
          </div>
        )}
      </div>
    </div>
  );
};