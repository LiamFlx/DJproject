import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Radio, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Track } from '../types';

interface PerformanceAnalyzerProps {
  currentTrack?: Track;
  nextTrack?: Track;
  isRecording: boolean;
  onToggleRecording: () => void;
}

export const PerformanceAnalyzer: React.FC<PerformanceAnalyzerProps> = ({
  currentTrack,
  nextTrack,
  isRecording,
  onToggleRecording
}) => {
  const [crowdResponse, setCrowdResponse] = useState(85);
  const [mixQuality, setMixQuality] = useState(92);
  const [energyTrend, setEnergyTrend] = useState<'up' | 'down' | 'stable'>('up');
  const [showTransitionAlert, setShowTransitionAlert] = useState(true);
  const [transitionApplied, setTransitionApplied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCrowdResponse(prev => Math.max(60, Math.min(100, prev + (Math.random() - 0.5) * 10)));
      setMixQuality(prev => Math.max(70, Math.min(100, prev + (Math.random() - 0.5) * 8)));
      setEnergyTrend(['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getResponseColor = (value: number) => {
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityColor = (value: number) => {
    if (value >= 85) return 'text-green-400';
    if (value >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="text-purple-400" size={20} />
            <h3 className="text-lg font-bold text-white">Live Analysis</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleRecording();
              }}
              className={`p-2 rounded-lg transition-all ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {isRecording ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            {isExpanded ? (
              <ChevronUp className="text-gray-400" size={20} />
            ) : (
              <ChevronDown className="text-gray-400" size={20} />
            )}
          </div>
        </div>

        {/* Quick Summary (Always Visible) */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${crowdResponse >= 80 ? 'bg-green-400' : crowdResponse >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-400">Crowd:</span>
            <span className={`font-semibold ${getResponseColor(crowdResponse)}`}>
              {Math.round(crowdResponse)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-400" size={12} />
            <span className="text-gray-400">Quality:</span>
            <span className={`font-semibold ${getQualityColor(mixQuality)}`}>
              {Math.round(mixQuality)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className={`${energyTrend === 'up' ? 'text-green-400' : energyTrend === 'down' ? 'text-red-400' : 'text-yellow-400'}`} size={12} />
            <span className={`font-semibold text-xs ${energyTrend === 'up' ? 'text-green-400' : energyTrend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
              {energyTrend === 'up' ? 'Rising' : energyTrend === 'down' ? 'Falling' : 'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in-fast border-t border-gray-700/50">
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${crowdResponse >= 80 ? 'bg-green-400' : crowdResponse >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-400">Crowd Response</span>
              </div>
              <div className={`text-lg font-bold ${getResponseColor(crowdResponse)}`}>
                {Math.round(crowdResponse)}%
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="text-green-400" size={12} />
                <span className="text-xs text-gray-400">Mix Quality</span>
              </div>
              <div className={`text-lg font-bold ${getQualityColor(mixQuality)}`}>
                {Math.round(mixQuality)}%
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className={`${energyTrend === 'up' ? 'text-green-400' : energyTrend === 'down' ? 'text-red-400' : 'text-yellow-400'}`} size={12} />
                <span className="text-xs text-gray-400">Energy Flow</span>
              </div>
              <div className={`text-sm font-semibold ${energyTrend === 'up' ? 'text-green-400' : energyTrend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
                {energyTrend === 'up' ? 'Rising' : energyTrend === 'down' ? 'Falling' : 'Stable'}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="text-purple-400" size={12} />
                <span className="text-xs text-gray-400">Optimal Mix</span>
              </div>
              <div className="text-sm font-semibold text-purple-400">
                2:15
              </div>
            </div>
          </div>

          {currentTrack && nextTrack && showTransitionAlert && (
            <div className={`bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-3 transition-all ${
              transitionApplied ? 'bg-green-900/30 border-green-500/50' : ''
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-yellow-400" size={14} />
                <span className={`text-sm font-semibold ${transitionApplied ? 'text-green-400' : 'text-yellow-400'}`}>
                  {transitionApplied ? 'Transition Applied' : 'Transition Ready'}
                </span>
                <div className="ml-auto flex gap-1">
                  {!transitionApplied && (
                    <button
                      onClick={() => setTransitionApplied(true)}
                      className="p-1 rounded hover:bg-green-600/20 text-green-400 hover:text-green-300 transition-all"
                      title="Apply transition"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowTransitionAlert(false)}
                    className="p-1 rounded hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-all"
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                Perfect harmonic match detected between tracks
              </div>
              {!transitionApplied && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTransitionApplied(true)}
                    className="px-3 py-1 bg-green-600/20 border border-green-500/30 text-green-300 text-xs rounded hover:bg-green-600/40 transition-all"
                  >
                    Auto Mix
                  </button>
                  <button className="px-3 py-1 bg-gray-600/20 border border-gray-500/30 text-gray-300 text-xs rounded hover:bg-gray-600/40 transition-all">
                    Manual
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};