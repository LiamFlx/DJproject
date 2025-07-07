import React, { useRef, useEffect, useState } from 'react';
import { AudioWaveform as Waveform, Mic, Volume2, Zap } from 'lucide-react';
import { AudioAnalyzer, AudioAnalysisData } from './AudioAnalyzer';

interface LiveAudioVisualizerProps {
  isRecording?: boolean;
  onAnalysisUpdate?: (data: AudioAnalysisData) => void;
  className?: string;
  visualizationMode?: 'waveform' | 'spectrum' | 'circular';
  colorScheme?: 'purple' | 'cyan' | 'rainbow';
}

export const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  isRecording = false,
  onAnalysisUpdate,
  className = '',
  visualizationMode = 'waveform',
  colorScheme = 'purple'
}) => {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Handle analysis data updates
  const handleAnalysisUpdate = (data: AudioAnalysisData) => {
    setAnalysisData(data);
    if (onAnalysisUpdate) {
      onAnalysisUpdate(data);
    }
  };
  
  // Draw visualizations
  useEffect(() => {
    if (!analysisData || !canvasRef.current || !isRecording) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up gradient based on color scheme
    let gradient;
    if (colorScheme === 'purple') {
      gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(1, '#C4B5FD');
    } else if (colorScheme === 'cyan') {
      gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#06B6D4');
      gradient.addColorStop(1, '#A5F3FC');
    } else {
      gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#8B5CF6');
      gradient.addColorStop(0.5, '#06B6D4');
      gradient.addColorStop(1, '#F59E0B');
    }
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    
    // Draw based on visualization mode
    if (visualizationMode === 'waveform') {
      drawWaveform(ctx, canvas, analysisData);
    } else if (visualizationMode === 'spectrum') {
      drawSpectrum(ctx, canvas, analysisData);
    } else if (visualizationMode === 'circular') {
      drawCircular(ctx, canvas, analysisData);
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(() => {
      // This will be called on next frame, but we need the latest analysis data
    });
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analysisData, isRecording, visualizationMode, colorScheme]);
  
  const drawWaveform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: AudioAnalysisData) => {
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    // Generate a smooth waveform based on frequency data
    for (let i = 0; i < width; i++) {
      const x = i;
      const normalizedI = i / width;
      
      // Use frequency data to modulate the waveform
      const lowFactor = Math.sin(normalizedI * Math.PI * 2 * 1) * data.frequency.low * height * 0.4;
      const midFactor = Math.sin(normalizedI * Math.PI * 2 * 3) * data.frequency.mid * height * 0.3;
      const highFactor = Math.sin(normalizedI * Math.PI * 2 * 5) * data.frequency.high * height * 0.2;
      
      const y = centerY + lowFactor + midFactor + highFactor;
      
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, centerY);
    ctx.stroke();
  };
  
  const drawSpectrum = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: AudioAnalysisData) => {
    const width = canvas.width;
    const height = canvas.height;
    const barCount = 64;
    const barWidth = width / barCount;
    const barSpacing = 1;
    
    // Generate spectrum-like visualization
    for (let i = 0; i < barCount; i++) {
      const normalizedI = i / barCount;
      
      // Calculate bar height based on frequency distribution
      let barHeight;
      if (normalizedI < 0.33) {
        // Low frequency range
        barHeight = data.frequency.low * height * (0.5 + Math.random() * 0.5);
      } else if (normalizedI < 0.66) {
        // Mid frequency range
        barHeight = data.frequency.mid * height * (0.5 + Math.random() * 0.5);
      } else {
        // High frequency range
        barHeight = data.frequency.high * height * (0.5 + Math.random() * 0.5);
      }
      
      // Add some randomness for visual interest
      barHeight *= 0.8 + Math.random() * 0.4;
      
      // Draw bar
      ctx.fillRect(
        i * barWidth + barSpacing / 2,
        height - barHeight,
        barWidth - barSpacing,
        barHeight
      );
    }
  };
  
  const drawCircular = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: AudioAnalysisData) => {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw frequency bands as circular bars
    const segments = 32;
    const angleStep = (Math.PI * 2) / segments;
    
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const normalizedI = i / segments;
      
      // Calculate bar height based on frequency distribution
      let barHeight;
      if (normalizedI < 0.33) {
        // Low frequency range
        barHeight = data.frequency.low * radius * 0.8;
      } else if (normalizedI < 0.66) {
        // Mid frequency range
        barHeight = data.frequency.mid * radius * 0.8;
      } else {
        // High frequency range
        barHeight = data.frequency.high * radius * 0.8;
      }
      
      // Add some randomness for visual interest
      barHeight *= 0.8 + Math.random() * 0.4;
      
      // Calculate start and end points
      const innerX = centerX + Math.cos(angle) * radius;
      const innerY = centerY + Math.sin(angle) * radius;
      const outerX = centerX + Math.cos(angle) * (radius + barHeight);
      const outerY = centerY + Math.sin(angle) * (radius + barHeight);
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
    
    // Draw BPM indicator
    if (data.bpm > 0) {
      const bpmAngle = (data.bpm / 200) * Math.PI * 2; // Map 0-200 BPM to 0-2π
      const bpmX = centerX + Math.cos(bpmAngle) * (radius * 1.2);
      const bpmY = centerY + Math.sin(bpmAngle) * (radius * 1.2);
      
      ctx.beginPath();
      ctx.arc(bpmX, bpmY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  return (
    <div className={`glass-panel rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Waveform className="text-purple-400" size={20} />
            <h3 className="text-lg font-bold text-white">Live Audio Analysis</h3>
          </div>
          <div className="flex items-center gap-3">
            {analysisData && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">BPM:</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {analysisData.bpm > 0 ? analysisData.bpm : '--'}
                </span>
              </div>
            )}
            <button
              className={`p-2 rounded-lg transition-all ${
                isRecording 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Mic size={16} />
            </button>
          </div>
        </div>

        {/* Quick Summary (Always Visible) */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          {analysisData && (
            <>
              <div className="flex items-center gap-2">
                <Volume2 className="text-gray-400" size={14} />
                <div className="w-16 bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-yellow-400 h-1.5 rounded-full transition-all duration-100"
                    style={{ width: `${analysisData.volume * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Energy:</span>
                <span className="font-semibold text-green-400">
                  {Math.round(analysisData.energy)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-400" size={14} />
                <span className="text-gray-400">
                  {getEnergyDescription(analysisData.energy)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in-fast border-t border-gray-700/50">
          {/* Canvas Visualization */}
          <div className="mt-4 bg-gray-800 rounded-lg p-3">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full h-40 rounded"
            />
          </div>
          
          {/* Visualization Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className={`px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-all`}
            >
              Hide Details
            </button>
            
            <button
              onClick={() => {}}
              className={`px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded hover:bg-purple-600/40 transition-all`}
            >
              Save Analysis
            </button>
          </div>
          
          {/* Audio Analyzer Component */}
          <AudioAnalyzer 
            isRecording={isRecording}
            onAnalysisUpdate={handleAnalysisUpdate}
            mode="ambient"
          />
        </div>
      )}
    </div>
  );
};

// Helper function to get energy description
const getEnergyDescription = (energy: number): string => {
  if (energy < 30) return 'Low';
  if (energy < 60) return 'Medium';
  return 'High';
};