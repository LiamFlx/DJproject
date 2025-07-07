import React, { useState, useEffect } from 'react';
import { Music, Sparkles, Heart, Mic, Play, ArrowRight, SkipBack as Skip, Check, Zap, Users, Target, Volume2, Headphones, Radio } from 'lucide-react';
import { AppMode } from '../types';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  setMode: (mode: AppMode) => void;
}

export interface OnboardingData {
  streamingService?: 'spotify' | 'apple' | 'skip';
  musicImport?: 'playlist' | 'youtube' | 'upload' | 'skip';
  favoriteArtist?: string;
  musicStyle?: string;
  favoriteInstrument?: string;
  djExperience?: string;
  venueType?: string;
}

interface PulsingHotspotProps {
  children: React.ReactNode;
  isActive: boolean;
  delay?: number;
}

const PulsingHotspot: React.FC<PulsingHotspotProps> = ({ children, isActive, delay = 0 }) => (
  <div className={`relative ${isActive ? 'animate-pulse-glow' : ''}`} style={{ animationDelay: `${delay}ms` }}>
    {isActive && (
      <div className="absolute -inset-3 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl animate-ping"></div>
    )}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, setMode }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 0) setActiveHotspot('streaming');
      else if (step === 1) setActiveHotspot('import');
      else if (step === 2) setActiveHotspot('questions');
    }, 800);

    return () => clearTimeout(timer);
  }, [step]);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
      setActiveHotspot(null);
    } else {
      setShowConfirmation(true);
      setTimeout(() => {
        onComplete(data);
        setMode('studio');
      }, 2500);
    }
  };

  const handleSkip = () => {
    if (step === 0) setData({ ...data, streamingService: 'skip' });
    else if (step === 1) setData({ ...data, musicImport: 'skip' });
    handleNext();
  };

  const updateData = (key: keyof OnboardingData, value: string) => {
    setData({ ...data, [key]: value });
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/30 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-600/20 rounded-full mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="text-center animate-fade-in z-10">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto animate-pulse-glow shadow-2xl">
              <Check className="text-white" size={64} />
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full animate-ping"></div>
          </div>
          
          <h2 className="text-5xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-cyan-200">
            Welcome to the Booth!
          </h2>
          <p className="text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Your AI copilot is calibrated and ready to drop the perfect beats
          </p>
          
          <div className="flex items-center justify-center gap-3 text-purple-300 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <Sparkles className="animate-spin" size={24} />
              <span className="font-semibold">Initializing your personalized DJ experience...</span>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
                <Music className="text-purple-400" size={24} />
              </div>
              <p className="text-sm text-gray-400">Tracks Ready</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/30">
                <Zap className="text-cyan-400" size={24} />
              </div>
              <p className="text-sm text-gray-400">AI Calibrated</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-pink-500/30">
                <Target className="text-pink-400" size={24} />
              </div>
              <p className="text-sm text-gray-400">Vibe Locked</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/10 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-600/10 rounded-full mix-blend-screen filter blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-3 glass-panel rounded-full px-8 py-4 border border-purple-500/30 shadow-2xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`relative w-4 h-4 rounded-full transition-all duration-500 ${
                i <= step 
                  ? 'bg-gradient-to-r from-purple-400 to-cyan-400 shadow-lg shadow-purple-400/50' 
                  : 'bg-gray-600 border border-gray-500'
              }`}>
                {i <= step && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 to-cyan-400/30 rounded-full animate-ping"></div>
                )}
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 transition-all duration-500 ${
                  i < step 
                    ? 'bg-gradient-to-r from-purple-400 to-cyan-400' 
                    : 'bg-gray-600'
                }`}></div>
              )}
            </div>
          ))}
          <span className="ml-4 text-sm text-gray-300 font-medium">
            Step {step + 1} of 3
          </span>
        </div>
      </div>

      <div className="z-10 text-center max-w-4xl w-full">
        {/* Step 0: Streaming Service */}
        {step === 0 && (
          <div className="animate-fade-in">
            <div className="mb-12">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <Headphones className="text-white animate-pulse" size={40} />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full animate-ping"></div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-white to-cyan-300">
                Connect Your Sound
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-4 leading-relaxed">
                Link your music library for AI-powered track recommendations
              </p>
              <div className="flex items-center justify-center gap-3 text-purple-300 mb-12">
                <Volume2 size={20} />
                <span className="text-lg">This helps us understand your vibe and suggest perfect drops</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <PulsingHotspot isActive={activeHotspot === 'streaming'}>
                <button
                  onClick={() => {
                    updateData('streamingService', 'spotify');
                    setActiveHotspot(null);
                    setTimeout(handleNext, 400);
                  }}
                  className="group w-full p-8 glass-panel rounded-2xl border-2 border-green-500/30 hover:border-green-400/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
                >
                  <div className="text-green-400 text-6xl mb-6 group-hover:scale-110 transition-transform">♪</div>
                  <h3 className="text-2xl font-bold text-white mb-4">Spotify</h3>
                  <p className="text-gray-300 leading-relaxed">Import your playlists and get intelligent track suggestions based on your listening history</p>
                  <div className="mt-6 flex items-center justify-center gap-2 text-green-400">
                    <Zap size={16} />
                    <span className="text-sm font-semibold">Smart Recommendations</span>
                  </div>
                </button>
              </PulsingHotspot>

              <PulsingHotspot isActive={activeHotspot === 'streaming'} delay={300}>
                <button
                  onClick={() => {
                    updateData('streamingService', 'apple');
                    setActiveHotspot(null);
                    setTimeout(handleNext, 400);
                  }}
                  className="group w-full p-8 glass-panel rounded-2xl border-2 border-gray-500/30 hover:border-gray-400/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-500/20"
                >
                  <div className="text-gray-300 text-6xl mb-6 group-hover:scale-110 transition-transform">🍎</div>
                  <h3 className="text-2xl font-bold text-white mb-4">Apple Music</h3>
                  <p className="text-gray-300 leading-relaxed">Seamlessly sync your Apple Music library for perfect track compatibility</p>
                  <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
                    <Music size={16} />
                    <span className="text-sm font-semibold">Library Sync</span>
                  </div>
                </button>
              </PulsingHotspot>
            </div>

            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-3 mx-auto text-lg group"
            >
              <Skip size={20} className="group-hover:animate-pulse" />
              Skip for now - I'll add music later
            </button>
          </div>
        )}

        {/* Step 1: Music Import */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="mb-12">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <Radio className="text-white animate-pulse" size={40} />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full animate-ping"></div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-purple-300">
                Build Your Crate
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-4 leading-relaxed">
                Add your go-to tracks so our AI can learn your signature style
              </p>
              <div className="flex items-center justify-center gap-3 text-cyan-300 mb-12">
                <Target size={20} />
                <span className="text-lg">Better crate = Better sets = Happier crowds</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <PulsingHotspot isActive={activeHotspot === 'import'}>
                <button
                  onClick={() => {
                    updateData('musicImport', 'playlist');
                    setActiveHotspot(null);
                    setTimeout(handleNext, 400);
                  }}
                  className="group w-full p-6 glass-panel rounded-2xl border-2 border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20"
                >
                  <Music className="text-purple-400 mx-auto mb-4 group-hover:animate-pulse" size={48} />
                  <h3 className="text-xl font-bold text-white mb-3">Playlists</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">Import your existing playlists and favorites</p>
                </button>
              </PulsingHotspot>

              <PulsingHotspot isActive={activeHotspot === 'import'} delay={200}>
                <button
                  onClick={() => {
                    updateData('musicImport', 'youtube');
                    setActiveHotspot(null);
                    setTimeout(handleNext, 400);
                  }}
                  className="group w-full p-6 glass-panel rounded-2xl border-2 border-red-500/30 hover:border-red-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/20"
                >
                  <div className="text-red-400 text-4xl mb-4 group-hover:animate-pulse">📺</div>
                  <h3 className="text-xl font-bold text-white mb-3">YouTube</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">Paste YouTube links for instant track access</p>
                </button>
              </PulsingHotspot>

              <PulsingHotspot isActive={activeHotspot === 'import'} delay={400}>
                <button
                  onClick={() => {
                    updateData('musicImport', 'upload');
                    setActiveHotspot(null);
                    setTimeout(handleNext, 400);
                  }}
                  className="group w-full p-6 glass-panel rounded-2xl border-2 border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20"
                >
                  <div className="text-cyan-400 text-4xl mb-4 group-hover:animate-pulse">📁</div>
                  <h3 className="text-xl font-bold text-white mb-3">Upload</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">Upload your own audio files directly</p>
                </button>
              </PulsingHotspot>
            </div>

            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-3 mx-auto text-lg group"
            >
              <Skip size={20} className="group-hover:animate-pulse" />
              Skip - I'll add tracks later
            </button>
          </div>
        )}

        {/* Step 2: Personal Questions */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="mb-12">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <Heart className="text-white animate-pulse" size={40} />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full animate-ping"></div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-white to-purple-300">
                Define Your Sound
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-4 leading-relaxed">
                Help our AI understand your musical DNA and DJ style
              </p>
              <div className="flex items-center justify-center gap-3 text-pink-300 mb-12">
                <Users size={20} />
                <span className="text-lg">Personalized AI = Sets that move souls</span>
              </div>
            </div>

            <div className="space-y-8 max-w-2xl mx-auto">
              <PulsingHotspot isActive={activeHotspot === 'questions'}>
                <div className="glass-panel rounded-2xl p-8 border border-purple-500/30">
                  <label className="block text-lg font-semibold text-gray-200 mb-4 text-left">
                    🎵 Who's your favorite artist?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Deadmau5, Charlotte de Witte, Disclosure..."
                    className="w-full px-6 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    onChange={(e) => updateData('favoriteArtist', e.target.value)}
                  />
                </div>
              </PulsingHotspot>

              <PulsingHotspot isActive={activeHotspot === 'questions'} delay={300}>
                <div className="glass-panel rounded-2xl p-8 border border-cyan-500/30">
                  <label className="block text-lg font-semibold text-gray-200 mb-4 text-left">
                    🎶 What's your signature style?
                  </label>
                  <select
                    className="w-full px-6 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    onChange={(e) => updateData('musicStyle', e.target.value)}
                  >
                    <option value="">Select your vibe...</option>
                    <option value="house">House & Deep House</option>
                    <option value="techno">Techno & Tech House</option>
                    <option value="trance">Trance & Progressive</option>
                    <option value="dubstep">Dubstep & Bass</option>
                    <option value="dnb">Drum & Bass</option>
                    <option value="ambient">Ambient & Chill</option>
                    <option value="hiphop">Hip Hop & R&B</option>
                    <option value="latin">Latin & Reggaeton</option>
                  </select>
                </div>
              </PulsingHotspot>

              <PulsingHotspot isActive={activeHotspot === 'questions'} delay={600}>
                <div className="glass-panel rounded-2xl p-8 border border-pink-500/30">
                  <label className="block text-lg font-semibold text-gray-200 mb-4 text-left">
                    🎧 What's your DJ experience level?
                  </label>
                  <select
                    className="w-full px-6 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                    onChange={(e) => updateData('djExperience', e.target.value)}
                  >
                    <option value="">Choose your level...</option>
                    <option value="beginner">Beginner - Just starting out</option>
                    <option value="intermediate">Intermediate - Know the basics</option>
                    <option value="advanced">Advanced - Experienced mixer</option>
                    <option value="professional">Professional - Industry veteran</option>
                  </select>
                </div>
              </PulsingHotspot>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={handleNext}
                className="group px-12 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl hover:shadow-purple-500/40 flex items-center gap-4 btn-glow"
              >
                <Sparkles className="group-hover:animate-spin" size={28} />
                Create My AI Profile
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={28} />
              </button>
              
              <button
                onClick={handleSkip}
                className="px-8 py-4 text-gray-400 hover:text-white transition-colors flex items-center gap-3 text-lg group"
              >
                <Skip size={20} className="group-hover:animate-pulse" />
                Skip questions
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Value Reinforcement */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="glass-panel rounded-xl p-6 border border-yellow-500/20 hover:border-yellow-500/40 transition-all group">
            <Zap className="text-yellow-400 mx-auto mb-4 group-hover:animate-pulse" size={32} />
            <h3 className="text-lg font-bold mb-2 text-yellow-400">Smart Suggestions</h3>
            <p className="text-sm text-gray-400 leading-relaxed">AI learns your style for perfect track recommendations and seamless mixing</p>
          </div>
          <div className="glass-panel rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all group">
            <Target className="text-purple-400 mx-auto mb-4 group-hover:animate-pulse" size={32} />
            <h3 className="text-lg font-bold mb-2 text-purple-400">Seamless Mixing</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Real-time compatibility analysis for smooth transitions and perfect drops</p>
          </div>
          <div className="glass-panel rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
            <Users className="text-cyan-400 mx-auto mb-4 group-hover:animate-pulse" size={32} />
            <h3 className="text-lg font-bold mb-2 text-cyan-400">Crowd Reading</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Live energy tracking to keep the dance floor moving all night long</p>
          </div>
        </div>
      </div>
    </div>
  );
};