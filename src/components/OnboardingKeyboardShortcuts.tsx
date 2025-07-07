import React, { useState, useEffect } from 'react';
import { Keyboard, X, ArrowRight, CheckCircle, Play, SkipForward, Volume2 } from 'lucide-react';

interface OnboardingKeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingKeyboardShortcuts: React.FC<OnboardingKeyboardShortcutsProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const shortcuts = [
    {
      key: 'Space',
      action: 'Play/Pause',
      description: 'Start or stop music playback',
      icon: <Play size={16} />,
      demo: 'Press Space to play/pause any track'
    },
    {
      key: 'Ctrl + →',
      action: 'Next Track',
      description: 'Skip to the next song in your playlist',
      icon: <SkipForward size={16} />,
      demo: 'Hold Ctrl and press right arrow'
    },
    {
      key: 'Ctrl + ←',
      action: 'Previous Track',
      description: 'Go back to the previous song',
      icon: <SkipForward size={16} className="rotate-180" />,
      demo: 'Hold Ctrl and press left arrow'
    },
    {
      key: 'Ctrl + ↑/↓',
      action: 'Volume Control',
      description: 'Adjust volume up or down',
      icon: <Volume2 size={16} />,
      demo: 'Hold Ctrl and use up/down arrows'
    },
    {
      key: 'Ctrl + M',
      action: 'Mute/Unmute',
      description: 'Toggle audio mute',
      icon: <Volume2 size={16} />,
      demo: 'Hold Ctrl and press M'
    }
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentShortcut = shortcuts[currentStep];
      if (!currentShortcut) return;

      let matched = false;

      switch (currentShortcut.key) {
        case 'Space':
          if (e.code === 'Space') matched = true;
          break;
        case 'Ctrl + →':
          if (e.ctrlKey && e.code === 'ArrowRight') matched = true;
          break;
        case 'Ctrl + ←':
          if (e.ctrlKey && e.code === 'ArrowLeft') matched = true;
          break;
        case 'Ctrl + ↑/↓':
          if (e.ctrlKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) matched = true;
          break;
        case 'Ctrl + M':
          if (e.ctrlKey && e.code === 'KeyM') matched = true;
          break;
      }

      if (matched) {
        e.preventDefault();
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        
        if (currentStep < shortcuts.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 500);
        } else {
          setTimeout(() => onComplete(), 1000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentStep, onComplete]);

  if (!isOpen) return null;

  const currentShortcut = shortcuts[currentStep];
  const isCompleted = completedSteps.has(currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-purple-400 font-semibold">Step {currentStep + 1} of {shortcuts.length}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / shortcuts.length) * 100}%` }}
              />
            </div>
          </div>
          
          <p className="text-gray-300 text-lg">
            Learn essential keyboard shortcuts to control your music like a pro DJ!
          </p>
        </div>

        {/* Current Shortcut */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              {currentShortcut.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{currentShortcut.action}</h3>
              <p className="text-gray-300">{currentShortcut.description}</p>
            </div>
            {isCompleted && (
              <CheckCircle className="text-green-400 ml-auto" size={24} />
            )}
          </div>
          
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">Press this key combination:</div>
              <kbd className="px-4 py-2 bg-gray-700 text-white rounded-lg text-lg font-mono shadow-lg">
                {currentShortcut.key}
              </kbd>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-purple-300 font-medium">{currentShortcut.demo}</p>
            {!isCompleted && (
              <p className="text-gray-400 text-sm mt-2">Try it now to continue!</p>
            )}
          </div>
        </div>

        {/* All Shortcuts Overview */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-gray-300">All Shortcuts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  index === currentStep ? 'bg-purple-600/20 border border-purple-500/50' :
                  completedSteps.has(index) ? 'bg-green-600/20 border border-green-500/50' :
                  'bg-gray-800/50 border border-gray-600/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    completedSteps.has(index) ? 'bg-green-600' :
                    index === currentStep ? 'bg-purple-600' :
                    'bg-gray-600'
                  }`}>
                    {completedSteps.has(index) ? (
                      <CheckCircle size={16} />
                    ) : (
                      shortcut.icon
                    )}
                  </div>
                  <span className="text-white font-medium text-sm">{shortcut.action}</span>
                </div>
                <kbd className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Skip Tutorial
          </button>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{completedSteps.size} of {shortcuts.length} completed</span>
            {completedSteps.size === shortcuts.length && (
              <button
                onClick={onComplete}
                className="ml-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2"
              >
                Complete Tutorial
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};