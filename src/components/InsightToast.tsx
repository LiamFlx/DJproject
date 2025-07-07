import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { useNeuralCueLink } from '../contexts/NeuralCueLinkContext';

export const InsightToast: React.FC = () => {
  const { toasts } = useNeuralCueLink();
  const [visibleToasts, setVisibleToasts] = useState<any[]>([]);
  const [appliedToasts, setAppliedToasts] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Don't show any toasts - keep them hidden
    setVisibleToasts([]);
  }, [toasts]);

  const handleDismiss = (toastId: number) => {
    setVisibleToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const handleApply = (toastId: number) => {
    setAppliedToasts(prev => new Set([...prev, toastId]));
    // Auto-dismiss after applying
    setTimeout(() => {
      setVisibleToasts(prev => prev.filter(toast => toast.id !== toastId));
    }, 1500);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {visibleToasts.map((toast) => {
        const isApplied = appliedToasts.has(toast.id);
        
        return (
          <div 
            key={toast.id} 
            className={`glass-panel p-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in-fast max-w-sm transition-all ${
              isApplied ? 'bg-green-900/30 border-green-500/50' : ''
            }`}
          >
            <span className="text-cyan-400 text-lg">{toast.icon}</span>
            <p className="text-sm text-gray-200 flex-grow">{toast.message}</p>
            
            <div className="flex gap-1 ml-2">
              {!isApplied && (
                <button
                  onClick={() => handleApply(toast.id)}
                  className="p-1 rounded hover:bg-green-600/20 text-green-400 hover:text-green-300 transition-all"
                  title="Apply suggestion"
                >
                  <Check size={14} />
                </button>
              )}
              {isApplied && (
                <div className="p-1 text-green-400">
                  <Check size={14} />
                </div>
              )}
              <button
                onClick={() => handleDismiss(toast.id)}
                className="p-1 rounded hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-all"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};