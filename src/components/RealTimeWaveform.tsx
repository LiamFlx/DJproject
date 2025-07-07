import React, { useRef, useEffect, useState } from 'react';
import { Track } from '../types';
import { WebAudioService } from '../services/WebAudioService';

interface RealTimeWaveformProps {
  track: Track;
  channelId: string;
  isPlaying: boolean;
  progress: number;
  height?: number;
}

export const RealTimeWaveform: React.FC<RealTimeWaveformProps> = ({
  track,
  channelId,
  isPlaying,
  progress,
  height = 120
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [beatPhase, setBeatPhase] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Get real-time audio data
      const waveform = WebAudioService.getWaveform(channelId);
      const spectrum = WebAudioService.getSpectrum(channelId);
      const analysis = WebAudioService.getAnalysis(channelId);

      if (analysis) {
        setBeatPhase(WebAudioService.getBeatPhase(channelId));
      }

      // Draw background grid
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      // Vertical grid lines (beat markers)
      if (analysis) {
        const beatsPerSecond = analysis.bpm / 60;
        const pixelsPerSecond = width / (track.duration || 180);
        const pixelsPerBeat = pixelsPerSecond / beatsPerSecond;
        
        for (let i = 0; i < width; i += pixelsPerBeat) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
      }

      // Horizontal center line
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.setLineDash([]);

      if (waveform && isPlaying) {
        // Draw real-time waveform
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / waveform.length;
        let x = 0;

        for (let i = 0; i < waveform.length; i++) {
          const v = (waveform[i] - 128) / 128;
          const y = (v * height) / 2 + height / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();

        // Draw spectrum overlay
        if (spectrum) {
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)');
          gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.2)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.3)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(0, height);

          const spectrumSliceWidth = width / spectrum.length;
          let spectrumX = 0;

          for (let i = 0; i < spectrum.length; i++) {
            const barHeight = (spectrum[i] / 255) * height * 0.3;
            ctx.lineTo(spectrumX, height - barHeight);
            spectrumX += spectrumSliceWidth;
          }

          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Draw static waveform representation
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Generate pseudo-waveform based on track properties
        const segments = 200;
        const segmentWidth = width / segments;
        
        for (let i = 0; i < segments; i++) {
          const x = i * segmentWidth;
          const energy = track.energy || 50;
          const variance = Math.sin(i * 0.1) * Math.cos(i * 0.05);
          const amplitude = (energy / 100) * 0.4 + variance * 0.2;
          const y = height / 2 + amplitude * height / 2 * Math.sin(i * 0.2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      // Draw progress indicator
      const progressX = (progress / 100) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      // Draw beat indicator
      if (isPlaying && analysis) {
        const beatIndicatorX = progressX + (beatPhase * 50); // 50px ahead for beat prediction
        ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.beginPath();
        ctx.arc(beatIndicatorX, 20, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw key and BPM info
      if (analysis) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '12px monospace';
        ctx.fillText(`${Math.round(analysis.bpm)} BPM`, 10, 20);
        ctx.fillText(analysis.key, 10, 35);
        ctx.fillText(`${Math.round(analysis.energy)}% Energy`, 10, 50);
      }

      // Continue animation if playing
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [track, channelId, isPlaying, progress, height, beatPhase]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className="w-full h-full"
        style={{ height: `${height}px` }}
      />
      
      {/* Overlay controls */}
      <div className="absolute top-2 right-2 flex gap-2">
        {isPlaying && (
          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
            LIVE
          </div>
        )}
        <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};