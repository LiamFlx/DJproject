import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BarChart2, GitBranch, Video, Lightbulb } from 'lucide-react';
import { Track, AppMode } from '../types';
import { energyData } from '../data/mockData';
import { StudioPanel } from '../components/StudioPanel';
import { useNeuralCueLink } from '../contexts/NeuralCueLinkContext';

interface MagicProducerProps {
  setMode: (mode: AppMode) => void;
  playlist: Track[];
}

const SetSummaryReport: React.FC = () => (
  <div className="glass-panel rounded-2xl p-6 md:col-span-2">
    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
      <BarChart2 className="text-purple-400" />
      Set Summary Report
    </h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={energyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9CA3AF" 
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF" 
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #4B5563',
              borderRadius: '8px'
            }}
          />
          <Line
            type="monotone"
            dataKey="energy"
            stroke="url(#energyLineGradient)"
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
          />
          <defs>
            <linearGradient id="energyLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const PerformanceDNAPanel: React.FC = () => (
  <div className="glass-panel rounded-2xl p-6">
    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
      <GitBranch className="text-cyan-400" />
      Performance DNA
    </h3>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Dominant Style:</span>
        <span className="font-semibold text-white">Deep House</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Strength:</span>
        <span className="font-semibold text-green-400">Smooth Transitions</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Improvement Area:</span>
        <span className="font-semibold text-yellow-400">Energy Sustain</span>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Overall Performance Score</div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-600 to-cyan-400 h-3 rounded-full transition-all duration-1000" 
            style={{ width: '78%' }}
          ></div>
        </div>
        <div className="text-right text-sm text-gray-300 mt-1">78/100</div>
      </div>
    </div>
  </div>
);

export const MagicProducer: React.FC<MagicProducerProps> = ({ setMode, playlist }) => {
  const { insights } = useNeuralCueLink();

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SetSummaryReport />
        <PerformanceDNAPanel />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StudioPanel title="Replay & Annotate" icon={<Video />}>
          <p className="text-sm text-gray-400 mb-4">
            Playback your timeline with notes and highlights.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
              <span className="text-sm">Epic blend @2:34</span>
              <span className="text-xs text-green-400">★ 4.8</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
              <span className="text-sm">Drop timing @5:12</span>
              <span className="text-xs text-yellow-400">★ 3.2</span>
            </div>
          </div>
        </StudioPanel>
        
        <StudioPanel title="AI Insights Log" icon={<Lightbulb />}>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {insights.length > 0 ? (
              insights.map((insight, i) => (
                <div key={i} className="text-sm text-gray-300 p-2 bg-gray-800 rounded">
                  {insight}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">
                No insights logged during this session. Start mixing to see AI analysis!
              </p>
            )}
          </div>
        </StudioPanel>
      </div>
    </div>
  );
};
export default MagicProducer;
