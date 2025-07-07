import React, { useState } from 'react';
import { Ruler, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { GoalSetter } from './GoalSetter';

export const StudioEnhancementPanel: React.FC = () => {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const togglePanel = (panelId: string) => {
    setExpandedPanel(expandedPanel === panelId ? null : panelId);
  };

  const panels = [
    {
      id: 'track-intelligence',
      title: 'Track Intelligence',
      icon: <Ruler className="text-cyan-400" size={20} />,
      summary: 'AI-powered track analysis',
      description: 'Scan tracks for key, energy, and mood compatibility.',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Scan tracks for key, energy, and mood compatibility.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="text-gray-400">Analyzed Tracks</div>
              <div className="text-cyan-400 font-semibold">1,247</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <div className="text-gray-400">Key Matches</div>
              <div className="text-green-400 font-semibold">89%</div>
            </div>
          </div>
          <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all btn-glow">
            Analyze Library
          </button>
        </div>
      )
    },
    {
      id: 'fx-palette',
      title: 'FX Palette',
      icon: <Palette className="text-purple-400" size={20} />,
      summary: 'Signature effects ready',
      description: 'Select signature effects and transitions for your set.',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Select signature effects and transitions for your set.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['Reverb', 'Filter', 'Echo', 'Flanger'].map(fx => (
              <button 
                key={fx}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-all"
              >
                {fx}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-3">
            <span className="text-purple-400 font-semibold">4/8</span> effects configured
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-3">
      {panels.map((panel) => (
        <div key={panel.id} className="glass-panel rounded-xl overflow-hidden">
          {/* Collapsed Header */}
          <div 
            className="p-4 cursor-pointer hover:bg-gray-800/30 transition-all"
            onClick={() => togglePanel(panel.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {panel.icon}
                <h4 className="text-md font-bold text-white">{panel.title}</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{panel.summary}</span>
                {expandedPanel === panel.id ? (
                  <ChevronUp className="text-gray-400" size={16} />
                ) : (
                  <ChevronDown className="text-gray-400" size={16} />
                )}
              </div>
            </div>

            {/* Quick Description (Always Visible) */}
            <p className="text-xs text-gray-500 mt-2">{panel.description}</p>
          </div>

          {/* Expanded Content */}
          {expandedPanel === panel.id && (
            <div className="px-4 pb-4 animate-fade-in-fast border-t border-gray-700/50">
              <div className="mt-4">
                {panel.content}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Enhanced Goal Setter as separate component */}
      <GoalSetter />
    </div>
  );
};