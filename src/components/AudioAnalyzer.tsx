import React, { useRef, useEffect, useState } from 'react';
import { Activity, Mic, Volume2, Zap, AudioWaveform as Waveform } from 'lucide-react';

interface AudioAnalyzerProps {
  isRecording?: boolean;
  onAnalysisUpdate?: (data: AudioAnalysisData) => void;
  className?: string;
  mode?: 'ambient' | 'live' | 'compact';
}

export interface AudioAnalysisData {
  volume: number;
  frequency: {
    low: number;
    mid: number;
    high: number;
  };
  bpm: number;
  energy: number;
  timestamp: number;
}

export const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({
  isRecording = false,
  onAnalysisUpdate,
  className = '',
  mode = 'ambient'
}) => {
  const [isListening, setIsListening] = useState(isRecording);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [volume, setVolume] = useState(0);
  const [frequency, setFrequency] = useState({ low: 0, mid: 0, high: 0 });
  const [bpm, setBpm] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Beat detection variables
  const peaksRef = useRef<number[]>([]);
  const lastPeakTimeRef = useRef<number>(0);
  const bpmHistoryRef = useRef<number[]>([]);
  
  // Initialize audio analyzer
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create analyzer node
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Connect microphone to analyzer
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);
        
        setHasPermission(true);
        
        // Start analysis if recording is enabled
        if (isRecording) {
          setIsListening(true);
          startAnalysis();
        }
      } catch (err) {
        console.error('Error initializing audio analyzer:', err);
        setError('Microphone access denied or not available');
        setHasPermission(false);
      }
    };
    
    initializeAudio();
    
    return () => {
      // Clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Update listening state when isRecording changes
  useEffect(() => {
    if (isRecording !== isListening && hasPermission) {
      setIsListening(isRecording);
      
      if (isRecording) {
        startAnalysis();
      } else if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isRecording, hasPermission]);
  
  const startAnalysis = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);
    
    const analyze = () => {
      if (!isListening || !analyser) return;
      
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDataArray);
      
      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < timeDataArray.length; i++) {
        const amplitude = (timeDataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / timeDataArray.length);
      const normalizedVolume = Math.min(1, rms * 5); // Amplify for better visualization
      setVolume(normalizedVolume);
      
      // Calculate frequency bands
      const lowEnd = calculateAverageEnergy(dataArray, 0, 10); // 0-200Hz
      const midRange = calculateAverageEnergy(dataArray, 10, 100); // 200-2000Hz
      const highEnd = calculateAverageEnergy(dataArray, 100, 512); // 2000-20000Hz
      
      setFrequency({
        low: lowEnd,
        mid: midRange,
        high: highEnd
      });
      
      // Calculate overall energy
      const overallEnergy = (lowEnd * 0.4 + midRange * 0.4 + highEnd * 0.2) * 100;
      setEnergy(Math.min(100, overallEnergy));
      
      // Beat detection
      detectBeats(dataArray, audioContextRef.current!.currentTime);
      
      // Send analysis data to parent component
      if (onAnalysisUpdate) {
        onAnalysisUpdate({
          volume: normalizedVolume,
          frequency: { low: lowEnd, mid: midRange, high: highEnd },
          bpm: bpm,
          energy: overallEnergy,
          timestamp: Date.now()
        });
      }
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  };
  
  const calculateAverageEnergy = (dataArray: Uint8Array, startBin: number, endBin: number): number => {
    let sum = 0;
    for (let i = startBin; i < endBin; i++) {
      sum += dataArray[i];
    }
    return sum / (endBin - startBin) / 255; // Normalize to 0-1
  };
  
  const detectBeats = (dataArray: Uint8Array, currentTime: number) => {
    // Focus on low frequencies where beats usually are
    const bassEnergy = calculateAverageEnergy(dataArray, 0, 10);
    
    // Detect peaks
    if (bassEnergy > 0.5 && currentTime - lastPeakTimeRef.current > 0.3) {
      peaksRef.current.push(currentTime);
      lastPeakTimeRef.current = currentTime;
      
      // Keep only recent peaks for BPM calculation
      const recentPeaks = peaksRef.current.filter(time => currentTime - time < 5);
      peaksRef.current = recentPeaks;
      
      // Calculate BPM if we have enough peaks
      if (recentPeaks.length >= 4) {
        const intervals: number[] = [];
        for (let i = 1; i < recentPeaks.length; i++) {
          intervals.push(recentPeaks[i] - recentPeaks[i - 1]);
        }
        
        // Calculate average interval
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const currentBpm = Math.round(60 / avgInterval);
        
        // Filter out unreasonable BPM values
        if (currentBpm >= 60 && currentBpm <= 200) {
          bpmHistoryRef.current.push(currentBpm);
          
          // Keep history limited
          if (bpmHistoryRef.current.length > 10) {
            bpmHistoryRef.current.shift();
          }
          
          // Calculate average BPM from history
          const avgBpm = Math.round(
            bpmHistoryRef.current.reduce((sum, val) => sum + val, 0) / bpmHistoryRef.current.length
          );
          
          setBpm(avgBpm);
        }
      }
    }
  };
  
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      if (!hasPermission) {
        try {
          // Request permission again
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          
          if (!analyserRef.current) {
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
          }
          
          if (!microphoneRef.current) {
            microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
            microphoneRef.current.connect(analyserRef.current);
          }
          
          setHasPermission(true);
          setError(null);
        } catch (err) {
          console.error('Error requesting microphone access:', err);
          setError('Microphone access denied');
          return;
        }
      }
      
      setIsListening(true);
      startAnalysis();
    }
  };
  
  // Render compact mode
  if (mode === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={toggleListening}
          className={`p-2 rounded-full ${
            isListening 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          <Mic size={16} />
        </button>
        
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
            style={{ width: `${volume * 100}%` }}
          />
        </div>
        
        {bpm > 0 && (
          <div className="text-xs font-mono text-gray-300">
            {bpm} BPM
          </div>
        )}
      </div>
    );
  }
  
  // Render ambient mode (background listening)
  if (mode === 'ambient') {
    return (
      <div className={`glass-panel rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Waveform className="text-purple-400" size={20} />
            <h3 className="text-lg font-bold text-white">Ambient Analyzer</h3>
          </div>
          
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <Mic size={16} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {/* Volume Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
          
          {/* Frequency Bands */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">Bass</div>
              <div className="h-20 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-purple-500 transition-all duration-100"
                  style={{ height: `${frequency.low * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">Mid</div>
              <div className="h-20 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-cyan-500 transition-all duration-100"
                  style={{ height: `${frequency.mid * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">High</div>
              <div className="h-20 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-pink-500 transition-all duration-100"
                  style={{ height: `${frequency.high * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* BPM and Energy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">BPM</div>
              <div className="text-xl font-bold text-purple-400">
                {bpm > 0 ? bpm : '--'}
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Energy</div>
              <div className="text-xl font-bold text-cyan-400">
                {Math.round(energy)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render live mode (full analyzer)
  return (
    <div className={`glass-panel rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Live Audio Analyzer</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`} />
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all ${
              isListening 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <Mic size={16} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        {/* Volume Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 flex items-center gap-1">
              <Volume2 size={14} className="text-gray-400" />
              Volume Level
            </span>
            <span className="text-sm font-mono text-white">{Math.round(volume * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
        
        {/* Frequency Spectrum */}
        <div className="space-y-2">
          <div className="text-sm text-gray-300 flex items-center gap-1">
            <Waveform size={14} className="text-gray-400" />
            Frequency Spectrum
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">Bass</div>
              <div className="h-24 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-100"
                  style={{ height: `${frequency.low * 100}%` }}
                />
              </div>
              <div className="text-xs text-center text-purple-400 font-mono">
                {Math.round(frequency.low * 100)}%
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">Mid</div>
              <div className="h-24 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-100"
                  style={{ height: `${frequency.mid * 100}%` }}
                />
              </div>
              <div className="text-xs text-center text-cyan-400 font-mono">
                {Math.round(frequency.mid * 100)}%
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-400 text-center">High</div>
              <div className="h-24 bg-gray-700 rounded-lg overflow-hidden relative">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-pink-600 to-pink-400 transition-all duration-100"
                  style={{ height: `${frequency.high * 100}%` }}
                />
              </div>
              <div className="text-xs text-center text-pink-400 font-mono">
                {Math.round(frequency.high * 100)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* BPM and Energy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">BPM</span>
              <Zap size={12} className="text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-yellow-400 text-center">
              {bpm > 0 ? bpm : '--'}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Energy</span>
              <Activity size={12} className="text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400 text-center">
              {Math.round(energy)}%
            </div>
          </div>
        </div>
        
        {/* Status */}
        <div className="text-xs text-gray-400 text-center">
          {isListening ? (
            <span className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              Listening to ambient audio
            </span>
          ) : (
            'Click the microphone icon to start analyzing'
          )}
        </div>
      </div>
    </div>
  );
};