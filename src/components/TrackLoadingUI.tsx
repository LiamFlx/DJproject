import React from 'react';
import { Loader2, Music, AlertCircle } from 'lucide-react';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  errors: string[];
}

interface TrackLoadingUIProps {
  loadingState: LoadingState;
}

export const TrackLoadingUI: React.FC<TrackLoadingUIProps> = ({ loadingState }) => {
  const { isLoading, progress, message, errors } = loadingState;

  if (!isLoading && errors.length === 0) return null;

  return (
    <div className="flex items-center justify-center min-h-full w-full">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div 
              className="absolute inset-0 rounded-full border-4 border-t-transparent border-purple-500 animate-spin"
              style={{ 
                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                transform: `rotate(${progress * 3.6}deg)` 
              }}
            ></div>
            <Music className="text-purple-400" size={32} />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {message || 'Loading tracks...'}
        </h3>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div 
            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          ></div>
        </div>
        
        <p className="text-gray-400 text-sm">
          {progress < 100 && progress > 0
            ? `${Math.round(progress)}% complete` 
            : 'Finalizing...'}
        </p>
        
        {errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-400" size={16} />
              <h4 className="text-sm font-semibold text-red-300">
                Issues detected
              </h4>
            </div>
            <ul className="space-y-1 text-xs text-red-300">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          This may take a moment depending on your connection
        </div>
      </div>
    </div>
  );
};