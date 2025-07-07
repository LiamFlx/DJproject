import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { OnboardingKeyboardShortcuts } from './OnboardingKeyboardShortcuts';

export const MusicPlayerKeyboardShortcuts: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const shortcuts = [
    { key: 'Space', action: 'Play/Pause' },
    { key: 'Ctrl + →', action: 'Next Track' },
    { key: 'Ctrl + ←', action: 'Previous Track' },
    { key: 'Ctrl + ↑', action: 'Volume Up' },
    { key: 'Ctrl + ↓', action: 'Volume Down' },
    { key: 'Ctrl + M', action: 'Mute/Unmute' },
    { key: 'Ctrl + S', action: 'Toggle Shuffle' },
    { key: 'Ctrl + R', action: 'Toggle Repeat' },
  ];

  return (
    <>
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Collapsed Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-800/30 transition-all"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="text-purple-400" size={20} />
              <h3 className="text-lg font-bold text-white">Shortcuts</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOnboarding(true);
                }}
                className="p-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded hover:bg-purple-600/40 transition-all"
                title="Learn shortcuts"
              >
                <HelpCircle size={14} />
              </button>
              {isExpanded ? (
                <ChevronUp className="text-gray-400" size={16} />
              ) : (
                <ChevronDown className="text-gray-400" size={16} />
              )}
            </div>
          </div>
          
          {/* Quick Preview (Always Visible) */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono">Space</kbd>
              <span className="text-gray-400">Play/Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono">Ctrl+→</kbd>
              <span className="text-gray-400">Next</span>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 animate-fade-in-fast border-t border-gray-700/50">
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-300">All Shortcuts</h4>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded hover:bg-purple-600/40 transition-all"
                >
                  Learn Interactively
                </button>
              </div>
              
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-800/30 rounded">
                    <span className="text-gray-300">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <p className="text-purple-300 text-sm">
                  💡 Pro tip: Use keyboard shortcuts to control music without taking your hands off the keyboard while DJing!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Interactive Onboarding Modal */}
      <OnboardingKeyboardShortcuts
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          // Could save completion status to localStorage here
        }}
      />
    </>
  );
};