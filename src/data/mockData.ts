import { Track } from '../types';

// Using free, publicly available audio samples
// These are from Google's sound library with CORS enabled
export const initialPlaylist: Track[] = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Free Music Archive',
    album: 'Creative Commons',
    duration: 180,
    url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    bpm: 128,
    key: 'C',
    energy: 75,
    genre: 'Electronic',
    year: 2023,
    waveform: [0.2, 0.4, 0.6, 0.8, 0.7, 0.5, 0.3, 0.6, 0.9, 0.4, 0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.5, 0.2, 0.4]
  },
  {
    id: 2,
    title: 'Night Drive',
    artist: 'Demo Artist',
    album: 'Sample Pack',
    duration: 240,
    url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
    bpm: 124,
    key: 'Am',
    energy: 70,
    genre: 'Synthwave',
    year: 2023,
    waveform: [0.3, 0.5, 0.7, 0.6, 0.4, 0.8, 0.9, 0.5, 0.2, 0.6, 0.7, 0.4, 0.3, 0.8, 0.6, 0.5, 0.7, 0.9, 0.3, 0.4]
  },
  {
    id: 3,
    title: 'Electric Dreams',
    artist: 'Synth Master',
    album: 'Digital Age',
    duration: 195,
    url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    bpm: 132,
    key: 'Dm',
    energy: 85,
    genre: 'Techno',
    year: 2023,
    waveform: [0.4, 0.7, 0.9, 0.8, 0.6, 0.3, 0.5, 0.8, 0.9, 0.7, 0.4, 0.2, 0.6, 0.8, 0.9, 0.5, 0.3, 0.7, 0.8, 0.4]
  },
  {
    id: 4,
    title: 'Sunset Boulevard',
    artist: 'Chill Waves',
    album: 'Relaxation',
    duration: 210,
    url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
    bpm: 118,
    key: 'F',
    energy: 60,
    genre: 'Chillout',
    year: 2023,
    waveform: [0.2, 0.3, 0.5, 0.4, 0.6, 0.7, 0.5, 0.3, 0.4, 0.6, 0.8, 0.5, 0.2, 0.4, 0.6, 0.7, 0.5, 0.3, 0.4, 0.6]
  },
  {
    id: 5,
    title: 'Bass Drop',
    artist: 'Heavy Beats',
    album: 'Underground',
    duration: 225,
    url: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    bpm: 140,
    key: 'Gm',
    energy: 95,
    genre: 'Dubstep',
    year: 2023,
    waveform: [0.1, 0.3, 0.8, 0.9, 0.7, 0.4, 0.2, 0.6, 0.9, 0.8, 0.5, 0.3, 0.7, 0.9, 0.8, 0.4, 0.2, 0.6, 0.9, 0.7]
  },
  {
    id: 6,
    title: 'Cosmic Journey',
    artist: 'Space Odyssey',
    album: 'Interstellar',
    duration: 312,
    url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
    bpm: 116,
    key: 'F',
    energy: 60,
    genre: 'Ambient',
    year: 2023,
    waveform: [0.3, 0.4, 0.5, 0.6, 0.5, 0.4, 0.3, 0.5, 0.6, 0.7, 0.6, 0.4, 0.3, 0.5, 0.7, 0.6, 0.4, 0.3, 0.5, 0.6]
  },
  {
    id: 7,
    title: 'Urban Groove',
    artist: 'City Beats',
    album: 'Street Life',
    duration: 256,
    url: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
    bpm: 118,
    key: 'A',
    energy: 65,
    genre: 'Hip Hop',
    year: 2023,
    waveform: [0.4, 0.6, 0.5, 0.7, 0.8, 0.6, 0.4, 0.5, 0.7, 0.8, 0.6, 0.3, 0.5, 0.7, 0.8, 0.6, 0.4, 0.5, 0.7, 0.6]
  },
  {
    id: 8,
    title: 'Digital Rain',
    artist: 'Matrix Sound',
    album: 'Code Reality',
    duration: 234,
    url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg',
    bpm: 126,
    key: 'Bm',
    energy: 80,
    genre: 'Electronic',
    year: 2023,
    waveform: [0.5, 0.7, 0.8, 0.6, 0.4, 0.7, 0.9, 0.8, 0.5, 0.3, 0.6, 0.8, 0.7, 0.4, 0.6, 0.8, 0.9, 0.6, 0.3, 0.5]
  }
];

// Alternative free music sources for backup:
export const ALTERNATIVE_AUDIO_SOURCES = [
  // Google's sound library (CORS-enabled)
  'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
  'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  
  // Additional reliable sources
  'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
  'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
  
  // Note: These are examples. In production, you'd want to:
  // 1. Host your own audio files
  // 2. Use a CDN for better performance
  // 3. Ensure proper licensing for all tracks
];

// Energy data for the set summary chart
export const energyData = [
  { time: '0:00', energy: 45 },
  { time: '0:30', energy: 52 },
  { time: '1:00', energy: 58 },
  { time: '1:30', energy: 62 },
  { time: '2:00', energy: 68 },
  { time: '2:30', energy: 65 },
  { time: '3:00', energy: 55 }
];