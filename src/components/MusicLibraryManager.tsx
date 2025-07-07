import React, { useState, useRef } from 'react';
import { Music, Upload, Download, Search, Filter, Trash2, Plus, RefreshCw, Save, FileText, HardDrive } from 'lucide-react';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { Track } from '../types';

interface MusicLibraryManagerProps {
  onTracksSelected: (tracks: Track[]) => void;
  className?: string;
}

export const MusicLibraryManager: React.FC<MusicLibraryManagerProps> = ({
  onTracksSelected,
  className = ''
}) => {
  const {
    tracks,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    importFromFiles,
    generateProceduralTrack,
    createBackup,
    restoreFromBackup,
    getStats
  } = useMusicLibrary();

  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const stats = getStats();

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const importedCount = await importFromFiles(Array.from(files));
      setImportProgress(100);
      
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1000);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Handle track selection
  const handleTrackSelect = (trackId: string) => {
    setSelectedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ searchQuery: e.target.value });
  };

  // Handle genre filter
  const handleGenreFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ genre: e.target.value });
  };

  // Handle use selected tracks
  const handleUseSelectedTracks = () => {
    const selectedTracksList = tracks.filter(track => selectedTracks.has(track.id.toString()));
    onTracksSelected(selectedTracksList);
  };

  // Handle generate procedural tracks
  const handleGenerateProceduralTracks = async () => {
    setIsImporting(true);
    
    try {
      const generatedTracks: Track[] = [];
      
      // Generate 5 tracks
      for (let i = 0; i < 5; i++) {
        setImportProgress((i / 5) * 100);
        const track = await generateProceduralTrack({
          title: `AI Generated Track ${i + 1}`,
          genre: ['house', 'techno', 'ambient', 'trance', 'electronic'][i % 5],
          duration: 30 + Math.random() * 120
        });
        generatedTracks.push(track);
      }
      
      setImportProgress(100);
      
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1000);
      
      // Select the generated tracks
      const newSelectedTracks = new Set(selectedTracks);
      generatedTracks.forEach(track => {
        newSelectedTracks.add(track.id.toString());
      });
      setSelectedTracks(newSelectedTracks);
    } catch (error) {
      console.error('Generation failed:', error);
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Handle backup
  const handleBackup = async () => {
    await createBackup();
    alert('Library backup created successfully');
  };

  // Handle restore
  const handleRestore = async () => {
    if (confirm('Are you sure you want to restore from backup? This will replace your current library.')) {
      const success = await restoreFromBackup();
      if (success) {
        alert('Library restored successfully');
      } else {
        alert('Failed to restore library');
      }
    }
  };

  return (
    <div className={`glass-panel rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Music className="text-purple-400" size={20} />
          Music Library
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-lg hover:bg-purple-600/40 transition-all text-purple-300"
            title="Import files"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileImport}
            className="hidden"
          />
          
          <button
            onClick={handleBackup}
            className="p-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/40 transition-all text-cyan-300"
            title="Backup library"
          >
            <Save size={16} />
          </button>
          
          <button
            onClick={handleRestore}
            className="p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-lg hover:bg-yellow-600/40 transition-all text-yellow-300"
            title="Restore from backup"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-all ${
              showFilters 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle filters"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search tracks..."
            value={filters.searchQuery || ''}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg animate-fade-in-fast">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Genre</label>
                <select
                  value={filters.genre || 'all'}
                  onChange={handleGenreFilter}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Genres</option>
                  <option value="house">House</option>
                  <option value="techno">Techno</option>
                  <option value="trance">Trance</option>
                  <option value="ambient">Ambient</option>
                  <option value="electronic">Electronic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">BPM Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="60"
                    max="200"
                    placeholder="Min"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={filters.bpmRange?.[0] || ''}
                    onChange={(e) => updateFilters({ 
                      bpmRange: [parseInt(e.target.value) || 60, filters.bpmRange?.[1] || 180] 
                    })}
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    min="60"
                    max="200"
                    placeholder="Max"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={filters.bpmRange?.[1] || ''}
                    onChange={(e) => updateFilters({ 
                      bpmRange: [filters.bpmRange?.[0] || 60, parseInt(e.target.value) || 180] 
                    })}
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-all"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Import Progress */}
      {isImporting && (
        <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg animate-fade-in-fast">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-300">Importing tracks...</span>
            <span className="text-xs text-gray-400">{Math.round(importProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-purple-500 to-cyan-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Library Stats */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="text-cyan-400" size={16} />
            <span className="text-sm text-gray-300">Library Stats</span>
          </div>
          <span className="text-xs text-gray-400">
            {stats.totalTracks} tracks • {Math.round(stats.totalDuration / 60)} minutes
          </span>
        </div>
      </div>
      
      {/* Track List */}
      {error ? (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      ) : isLoading ? (
        <div className="p-4 text-center">
          <div className="inline-block w-6 h-6 border-2 border-t-transparent border-purple-500 rounded-full animate-spin mb-2"></div>
          <p className="text-gray-400 text-sm">Loading music library...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="p-6 text-center">
          <Music className="mx-auto text-gray-500 mb-3" size={32} />
          <p className="text-gray-400 mb-4">Your music library is empty</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Import Music
            </button>
            <button
              onClick={handleGenerateProceduralTracks}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Generate Demo Tracks
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {tracks.map(track => (
            <div
              key={track.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedTracks.has(track.id.toString()) 
                  ? 'border-purple-500 bg-purple-900/30' 
                  : 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50'
              }`}
              onClick={() => handleTrackSelect(track.id.toString())}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music className="text-white" size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{track.title}</h4>
                  <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {track.bpm && <span>{track.bpm} BPM</span>}
                    {track.key && <span>{track.key}</span>}
                    {track.genre && <span className="capitalize">{track.genre}</span>}
                    <span>{Math.round((track.duration || 180) / 60)}:{String(Math.round((track.duration || 180) % 60)).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {selectedTracks.size} tracks selected
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateProceduralTracks}
            className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-sm rounded hover:bg-cyan-600/40 transition-all flex items-center gap-2"
          >
            <Plus size={14} />
            Generate Tracks
          </button>
          
          <button
            onClick={handleUseSelectedTracks}
            disabled={selectedTracks.size === 0}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Music size={14} />
            Use Selected
          </button>
        </div>
      </div>
    </div>
  );
};