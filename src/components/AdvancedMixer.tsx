import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Sliders, Zap, RotateCcw, 
  Waves, TrendingUp, Activity, Settings 
} from 'lucide-react';
import { Track } from '../types';
import { WebAudioService } from '../services/WebAudioService';

interface AdvancedMixerProps {
  trackA?: Track;
  trackB?: Track;
  isPlayingA: boolean;
  isPlayingB: boolean;
  onCrossfaderChange: (position: number) => void;
}

export const AdvancedMixer: React.FC<AdvancedMixerProps> = ({
  trackA,
  trackB,
  isPlayingA,
  isPlayingB,
  onCrossfaderChange
}) => {
  const [crossfaderPosition, setCrossfaderPosition] = useState(0);
  const [channelAGain, setChannelAGain] = useState(0.8);
  const [channelBGain, setChannelBGain] = useState(0.8);
  const [channelAEQ, setChannelAEQ] = useState({ low: 0.5, mid: 0.5, high: 0.5 });
  const [channelBEQ, setChannelBEQ] = useState({ low: 0.5, mid: 0.5, high: 0.5 });
  const [analysisA, setAnalysisA] = useState<any>(null);
  const [analysisB, setAnalysisB] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const spectrumCanvasA = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasB = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Initialize Web Audio API
    WebAudioService.initialize().catch(console.error);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Start real-time analysis visualization
    const updateAnalysis = () => {
      if (trackA) {
        const analysis = WebAudioService.getAnalysis('channelA');
        setAnalysisA(analysis);
        drawSpectrum('channelA', spectrumCanvasA.current);
      }
      
      if (trackB) {
        const analysis = WebAudioService.getAnalysis('channelB');
        setAnalysisB(analysis);
        drawSpectrum('channelB', spectrumCanvasB.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateAnalysis);
    };
    
    if (isPlayingA || isPlayingB) {
      updateAnalysis();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlayingA, isPlayingB, trackA, trackB]);

  const drawSpectrum = (channelId: string, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const spectrum = WebAudioService.getSpectrum(channelId);
    if (!spectrum) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#8B5CF6');
    gradient.addColorStop(0.5, '#22D3EE');
    gradient.addColorStop(1, '#F59E0B');
    
    ctx.fillStyle = gradient;
    
    const barWidth = width / spectrum.length;
    
    for (let i = 0; i < spectrum.length; i++) {
      const barHeight = (spectrum[i] / 255) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  };

  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseFloat(e.target.value);
    setCrossfaderPosition(position);
    WebAudioService.setCrossfader(position);
    onCrossfaderChange(position);
  };

  const handleChannelAGain = (gain: number) => {
    setChannelAGain(gain);
    WebAudioService.setChannelGain('channelA', gain);
  };

  const handleChannelBGain = (gain: number) => {
    setChannelBGain(gain);
    WebAudioService.setChannelGain('channelB', gain);
  };

  const handleEQChange = (channel: 'A' | 'B', band: 'low' | 'mid' | 'high', value: number) => {
    const channelId = `channel${channel}`;
    WebAudioService.setEQ(channelId, band, value);
    
    if (channel === 'A') {
      setChannelAEQ(prev => ({ ...prev, [band]: value }));
    } else {
      setChannelBEQ(prev => ({ ...prev, [band]: value }));
    }
  };

  const syncBPM = () => {
    if (analysisA && analysisB) {
      WebAudioService.syncBPM('channelA', 'channelB');
    }
  };

  const addReverb = (channel: 'A' | 'B') => {
    WebAudioService.addReverb(`channel${channel}`, 0.5, 2);
  };

  const addDelay = (channel: 'A' | 'B') => {
    WebAudioService.addDelay(`channel${channel}`, 0.3, 0.3);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="text-purple-400" />
          Advanced Mixer
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Settings className="text-gray-300" size={18} />
        </button>
      </div>

      {/* Channel Strips */}
      <div className="grid grid-cols-2 gap-6">
        {/* Channel A */}
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-bold text-purple-400 mb-2">Channel A</h4>
            {trackA && (
              <div className="text-sm text-gray-300">
                <p className="font-semibold truncate">{trackA.title}</p>
                <p className="text-gray-400">{trackA.artist}</p>
              </div>
            )}
          </div>

          {/* Spectrum Analyzer */}
          <div className="bg-gray-800 rounded-lg p-2">
            <canvas
              ref={spectrumCanvasA}
              width={200}
              height={60}
              className="w-full h-15 rounded"
            />
          </div>

          {/* Analysis Display */}
          {analysisA && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-purple-400 font-bold">{Math.round(analysisA.bpm)}</div>
                <div className="text-gray-400">BPM</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-cyan-400 font-bold">{analysisA.key}</div>
                <div className="text-gray-400">Key</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-green-400 font-bold">{Math.round(analysisA.energy)}%</div>
                <div className="text-gray-400">Energy</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-yellow-400 font-bold">{Math.round(analysisA.loudness)}%</div>
                <div className="text-gray-400">Level</div>
              </div>
            </div>
          )}

          {/* EQ Controls */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center">3-Band EQ</div>
            {(['high', 'mid', 'low'] as const).map(band => (
              <div key={band} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8 uppercase">{band}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={channelAEQ[band]}
                  onChange={(e) => handleEQChange('A', band, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-xs text-gray-400 w-8">
                  {Math.round((channelAEQ[band] - 0.5) * 24)}
                </span>
              </div>
            ))}
          </div>

          {/* Channel Gain */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center">Channel Gain</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={channelAGain}
              onChange={(e) => handleChannelAGain(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-center text-xs text-gray-400">
              {Math.round(channelAGain * 100)}%
            </div>
          </div>

          {/* Effects */}
          {showAdvanced && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 text-center">Effects</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addReverb('A')}
                  className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs rounded hover:bg-purple-600/40 transition-all"
                >
                  Reverb
                </button>
                <button
                  onClick={() => addDelay('A')}
                  className="px-2 py-1 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-xs rounded hover:bg-cyan-600/40 transition-all"
                >
                  Delay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Channel B */}
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Channel B</h4>
            {trackB && (
              <div className="text-sm text-gray-300">
                <p className="font-semibold truncate">{trackB.title}</p>
                <p className="text-gray-400">{trackB.artist}</p>
              </div>
            )}
          </div>

          {/* Spectrum Analyzer */}
          <div className="bg-gray-800 rounded-lg p-2">
            <canvas
              ref={spectrumCanvasB}
              width={200}
              height={60}
              className="w-full h-15 rounded"
            />
          </div>

          {/* Analysis Display */}
          {analysisB && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-purple-400 font-bold">{Math.round(analysisB.bpm)}</div>
                <div className="text-gray-400">BPM</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-cyan-400 font-bold">{analysisB.key}</div>
                <div className="text-gray-400">Key</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-green-400 font-bold">{Math.round(analysisB.energy)}%</div>
                <div className="text-gray-400">Energy</div>
              </div>
              <div className="bg-gray-800/50 rounded p-2 text-center">
                <div className="text-yellow-400 font-bold">{Math.round(analysisB.loudness)}%</div>
                <div className="text-gray-400">Level</div>
              </div>
            </div>
          )}

          {/* EQ Controls */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center">3-Band EQ</div>
            {(['high', 'mid', 'low'] as const).map(band => (
              <div key={band} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8 uppercase">{band}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={channelBEQ[band]}
                  onChange={(e) => handleEQChange('B', band, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-xs text-gray-400 w-8">
                  {Math.round((channelBEQ[band] - 0.5) * 24)}
                </span>
              </div>
            ))}
          </div>

          {/* Channel Gain */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 text-center">Channel Gain</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={channelBGain}
              onChange={(e) => handleChannelBGain(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-center text-xs text-gray-400">
              {Math.round(channelBGain * 100)}%
            </div>
          </div>

          {/* Effects */}
          {showAdvanced && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 text-center">Effects</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addReverb('B')}
                  className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs rounded hover:bg-purple-600/40 transition-all"
                >
                  Reverb
                </button>
                <button
                  onClick={() => addDelay('B')}
                  className="px-2 py-1 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-xs rounded hover:bg-cyan-600/40 transition-all"
                >
                  Delay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crossfader */}
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-md font-bold text-white mb-2">Crossfader</h4>
          <div className="relative">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={crossfaderPosition}
              onChange={handleCrossfaderChange}
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer crossfader-slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>A</span>
              <span>CENTER</span>
              <span>B</span>
            </div>
          </div>
        </div>

        {/* Beat Sync */}
        {analysisA && analysisB && showAdvanced && (
          <div className="flex items-center justify-center gap-4">
            <div className="text-xs text-gray-400">
              BPM Diff: {Math.abs(analysisA.bpm - analysisB.bpm).toFixed(1)}
            </div>
            <button
              onClick={syncBPM}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              <Zap size={14} />
              Sync BPM
            </button>
          </div>
        )}
      </div>

      {/* Master Controls */}
      <div className="border-t border-gray-700 pt-4">
        <div className="text-center">
          <h4 className="text-md font-bold text-white mb-3">Master Output</h4>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="text-gray-400" size={16} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.8"
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div className="text-xs text-gray-400">Master Volume</div>
          </div>
        </div>
      </div>
    </div>
  );
};