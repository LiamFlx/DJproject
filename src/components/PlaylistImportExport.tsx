import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Track } from '../types';

interface PlaylistImportExportProps {
  onImport: (tracks: Track[]) => void;
  onExport: () => void;
  currentPlaylist: Track[];
}

export const PlaylistImportExport: React.FC<PlaylistImportExportProps> = ({
  onImport,
  onExport,
  currentPlaylist
}) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setImportMessage('Processing file...');

    try {
      const text = await file.text();
      
      // Try to parse as JSON first
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        
        // Validate playlist structure
        if (data.tracks && Array.isArray(data.tracks)) {
          const tracks: Track[] = data.tracks.map((track: any, index: number) => ({
            id: track.id || `imported_${Date.now()}_${index}`,
            title: track.title || 'Unknown Title',
            artist: track.artist || 'Unknown Artist',
            album: track.album,
            duration: track.duration || 180,
            bpm: track.bpm || '120',
            key: track.key || 'C',
            energy: track.energy || 50,
            genre: track.genre || 'electronic'
          }));
          
          onImport(tracks);
          setImportStatus('success');
          setImportMessage(`Successfully imported ${tracks.length} tracks`);
        } else {
          throw new Error('Invalid playlist format');
        }
      }
      // Try to parse as M3U playlist
      else if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8')) {
        const lines = text.split('\n').filter(line => line.trim());
        const tracks: Track[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            // Parse M3U metadata
            const match = line.match(/#EXTINF:(-?\d+),(.+)/);
            if (match) {
              const duration = parseInt(match[1]);
              const titleArtist = match[2];
              const [artist, title] = titleArtist.includes(' - ') 
                ? titleArtist.split(' - ', 2)
                : ['Unknown Artist', titleArtist];
              
              const nextLine = lines[i + 1];
              if (nextLine && !nextLine.startsWith('#')) {
                tracks.push({
                  id: `m3u_${Date.now()}_${i}`,
                  title: title.trim(),
                  artist: artist.trim(),
                  duration: duration > 0 ? duration : 180,
                  url: nextLine.trim(),
                  bpm: '120',
                  key: 'C',
                  energy: 50,
                  genre: 'electronic'
                });
                i++; // Skip the URL line
              }
            }
          }
        }
        
        if (tracks.length > 0) {
          onImport(tracks);
          setImportStatus('success');
          setImportMessage(`Successfully imported ${tracks.length} tracks from M3U`);
        } else {
          throw new Error('No valid tracks found in M3U file');
        }
      }
      // Try to parse as CSV
      else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(line => line.trim());
        const tracks: Track[] = [];
        
        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('title') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
          if (columns.length >= 2) {
            tracks.push({
              id: `csv_${Date.now()}_${i}`,
              title: columns[0] || 'Unknown Title',
              artist: columns[1] || 'Unknown Artist',
              album: columns[2],
              duration: columns[3] ? parseInt(columns[3]) : 180,
              bpm: columns[4] || '120',
              key: columns[5] || 'C',
              energy: columns[6] ? parseFloat(columns[6]) : 50,
              genre: columns[7] || 'electronic'
            });
          }
        }
        
        if (tracks.length > 0) {
          onImport(tracks);
          setImportStatus('success');
          setImportMessage(`Successfully imported ${tracks.length} tracks from CSV`);
        } else {
          throw new Error('No valid tracks found in CSV file');
        }
      }
      else {
        throw new Error('Unsupported file format. Please use JSON, M3U, or CSV files.');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Failed to import playlist');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clear status after 5 seconds
    setTimeout(() => {
      setImportStatus('idle');
      setImportMessage('');
    }, 5000);
  };

  const handleExportJSON = () => {
    const playlistData = {
      name: `DJ-Sensee Playlist ${new Date().toLocaleDateString()}`,
      description: `Exported on ${new Date().toLocaleString()}`,
      tracks: currentPlaylist,
      metadata: {
        totalTracks: currentPlaylist.length,
        totalDuration: currentPlaylist.reduce((sum, track) => sum + (track.duration || 180), 0),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    const dataStr = JSON.stringify(playlistData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dj-sensee-playlist-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleExportM3U = () => {
    let m3uContent = '#EXTM3U\n';
    
    currentPlaylist.forEach(track => {
      const duration = track.duration || 180;
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || 'Unknown Title';
      
      m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;
      m3uContent += `${track.url || '#'}\n`;
    });

    const dataBlob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dj-sensee-playlist-${Date.now()}.m3u`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Title', 'Artist', 'Album', 'Duration', 'BPM', 'Key', 'Energy', 'Genre'];
    let csvContent = headers.join(',') + '\n';
    
    currentPlaylist.forEach(track => {
      const row = [
        `"${track.title || ''}"`,
        `"${track.artist || ''}"`,
        `"${track.album || ''}"`,
        track.duration || 180,
        track.bpm || '120',
        track.key || 'C',
        track.energy || 50,
        `"${track.genre || 'electronic'}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dj-sensee-playlist-${Date.now()}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
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
            <FileText className="text-purple-400" size={20} />
            <h3 className="text-lg font-bold text-white">Import/Export</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{currentPlaylist.length} tracks</span>
            {isExpanded ? (
              <ChevronUp className="text-gray-400" size={16} />
            ) : (
              <ChevronDown className="text-gray-400" size={16} />
            )}
          </div>
        </div>
        
        {/* Quick Actions (Always Visible) */}
        <div className="flex items-center gap-2 mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.m3u,.m3u8,.csv"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus === 'loading'}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded hover:bg-purple-600/40 transition-all disabled:opacity-50"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={handleExportJSON}
            disabled={currentPlaylist.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/20 border border-gray-500/30 text-gray-300 text-sm rounded hover:bg-gray-600/40 transition-all disabled:opacity-50"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-6 animate-fade-in-fast border-t border-gray-700/50">
          {/* Import Section */}
          <div className="mt-4 space-y-4">
            <h4 className="text-base font-semibold text-gray-300">Import Playlist</h4>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importStatus === 'loading'}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all disabled:opacity-50"
              >
                <Upload size={16} />
                {importStatus === 'loading' ? 'Importing...' : 'Import File'}
              </button>
              
              <div className="text-sm text-gray-400">
                Supports JSON, M3U, and CSV formats
              </div>
            </div>

            {/* Import Status */}
            {importStatus !== 'idle' && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                importStatus === 'success' ? 'bg-green-900/30 border border-green-500/50' :
                importStatus === 'error' ? 'bg-red-900/30 border border-red-500/50' :
                'bg-blue-900/30 border border-blue-500/50'
              }`}>
                {importStatus === 'success' ? (
                  <CheckCircle className="text-green-400" size={16} />
                ) : importStatus === 'error' ? (
                  <AlertCircle className="text-red-400" size={16} />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                )}
                <span className={`text-sm ${
                  importStatus === 'success' ? 'text-green-300' :
                  importStatus === 'error' ? 'text-red-300' :
                  'text-blue-300'
                }`}>
                  {importMessage}
                </span>
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-300">Export Playlist</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleExportJSON}
                disabled={currentPlaylist.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                <div className="text-left">
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-gray-400">Full metadata</div>
                </div>
              </button>
              
              <button
                onClick={handleExportM3U}
                disabled={currentPlaylist.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                <div className="text-left">
                  <div className="font-medium">M3U</div>
                  <div className="text-xs text-gray-400">Media player</div>
                </div>
              </button>
              
              <button
                onClick={handleExportCSV}
                disabled={currentPlaylist.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} />
                <div className="text-left">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-400">Spreadsheet</div>
                </div>
              </button>
            </div>
          </div>

          {/* Format Information */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h5 className="font-semibold text-gray-300 mb-2 text-sm">Supported Formats</h5>
            <div className="space-y-1 text-xs text-gray-400">
              <div><strong>JSON:</strong> Complete DJ-Sensee format with all metadata</div>
              <div><strong>M3U:</strong> Standard playlist format for media players</div>
              <div><strong>CSV:</strong> Spreadsheet format for data analysis</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add missing imports
import { ChevronUp, ChevronDown } from 'lucide-react';