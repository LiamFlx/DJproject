/**
 * OptimizationEngine - Real-time set optimization and feedback processing
 * This service analyzes playback data and provides recommendations for set improvement
 */

import { Track } from '../types';
import { AnalyticsService } from './AnalyticsService';

interface OptimizationConfig {
  enabled: boolean;
  realTimeAnalysis: boolean;
  learningRate: number;
  adaptationSpeed: number;
  energyWeighting: number;
  keyWeighting: number;
  genreWeighting: number;
  crowdWeighting: number;
}

interface TrackAnalysis {
  trackId: string;
  energy: number;
  bpm: number;
  key: string;
  genre: string;
  valence: number;
  danceability: number;
  success: number; // 0-100 rating of how well this track performed
}

interface TransitionAnalysis {
  fromTrackId: string;
  toTrackId: string;
  transitionType: string;
  duration: number;
  success: number; // 0-100 rating
  energyChange: number;
  bpmChange: number;
  keyCompatible: boolean;
}

interface SetAnalysis {
  energyCurve: number[];
  peakMoments: number[];
  valleysCount: number;
  genreCoherence: number;
  keyProgression: string[];
  overallRating: number;
}

interface Recommendation {
  id: string;
  type: 'track' | 'transition' | 'energy' | 'structure';
  confidence: number;
  description: string;
  suggestedTrackId?: string;
  suggestedPosition?: number;
  expectedImpact: number;
  reasoning: string;
}

class OptimizationEngineClass {
  private config: OptimizationConfig = {
    enabled: true,
    realTimeAnalysis: true,
    learningRate: 0.05,
    adaptationSpeed: 0.7,
    energyWeighting: 0.3,
    keyWeighting: 0.2,
    genreWeighting: 0.2,
    crowdWeighting: 0.3
  };

  private trackAnalyses: Map<string, TrackAnalysis> = new Map();
  private transitionAnalyses: TransitionAnalysis[] = [];
  private setAnalysis: SetAnalysis | null = null;
  private recommendations: Recommendation[] = [];
  private currentPlaylist: Track[] = [];
  private crowdFeedback: Map<string, number> = new Map();
  private venueProfile: any = null;
  private isInitialized = false;
  private processingQueue: any[] = [];
  private processingInterval: number | null = null;

  /**
   * Initialize the optimization engine
   */
  initialize(config?: Partial<OptimizationConfig>, venueProfile?: any): void {
    if (this.isInitialized) return;

    // Update config with any overrides
    this.config = { ...this.config, ...config };
    
    // Set venue profile if provided
    this.venueProfile = venueProfile;
    
    // Start processing queue for real-time analysis
    if (this.config.realTimeAnalysis) {
      this.startProcessingQueue();
    }
    
    this.isInitialized = true;
    console.log('🧠 Optimization Engine initialized');
  }

  /**
   * Start processing queue for real-time analysis
   */
  private startProcessingQueue(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = window.setInterval(() => {
      this.processQueue();
    }, 100); // Process every 100ms for real-time feedback
  }

  /**
   * Process items in the queue
   */
  private processQueue(): void {
    if (this.processingQueue.length === 0) return;

    // Process up to 5 items at once
    const itemsToProcess = this.processingQueue.splice(0, 5);
    
    for (const item of itemsToProcess) {
      switch (item.type) {
        case 'track':
          this.processTrackFeedback(item.trackId, item.feedback);
          break;
        case 'transition':
          this.processTransitionFeedback(item.fromTrackId, item.toTrackId, item.feedback);
          break;
        case 'crowd':
          this.processCrowdFeedback(item.feedback);
          break;
      }
    }
    
    // Generate new recommendations after processing
    if (itemsToProcess.length > 0) {
      this.generateRecommendations();
    }
  }

  /**
   * Set the current playlist for analysis
   */
  setPlaylist(tracks: Track[]): void {
    this.currentPlaylist = [...tracks];
    
    // Initialize track analyses for new tracks
    tracks.forEach(track => {
      if (!this.trackAnalyses.has(track.id.toString())) {
        this.trackAnalyses.set(track.id.toString(), {
          trackId: track.id.toString(),
          energy: track.energy || 50,
          bpm: parseInt(track.bpm || '120'),
          key: track.key || 'C',
          genre: track.genre || 'electronic',
          valence: track.valence || 50,
          danceability: track.danceability || 50,
          success: 50 // Initial neutral rating
        });
      }
    });
    
    // Analyze the set structure
    this.analyzeSetStructure();
    
    // Generate initial recommendations
    this.generateRecommendations();
    
    console.log(`🧠 Analyzing playlist with ${tracks.length} tracks`);
  }

  /**
   * Add track feedback for optimization
   */
  addTrackFeedback(trackId: string, success: number, realTime: boolean = true): void {
    if (!this.config.enabled) return;

    if (realTime && this.config.realTimeAnalysis) {
      // Add to processing queue for real-time analysis
      this.processingQueue.push({
        type: 'track',
        trackId,
        feedback: success
      });
    } else {
      // Process immediately
      this.processTrackFeedback(trackId, success);
    }
    
    // Track in analytics
    const track = this.findTrackById(trackId);
    if (track) {
      AnalyticsService.trackFeedback(trackId, success, 'track');
    }
  }

  /**
   * Process track feedback
   */
  private processTrackFeedback(trackId: string, success: number): void {
    const analysis = this.trackAnalyses.get(trackId);
    if (!analysis) return;
    
    // Update success rating with learning rate
    const newSuccess = analysis.success * (1 - this.config.learningRate) + success * this.config.learningRate;
    
    this.trackAnalyses.set(trackId, {
      ...analysis,
      success: newSuccess
    });
    
    console.log(`🧠 Track feedback processed: ${trackId} (${newSuccess.toFixed(1)})`);
  }

  /**
   * Add transition feedback for optimization
   */
  addTransitionFeedback(fromTrackId: string, toTrackId: string, success: number, transitionType: string, duration: number, realTime: boolean = true): void {
    if (!this.config.enabled) return;

    if (realTime && this.config.realTimeAnalysis) {
      // Add to processing queue for real-time analysis
      this.processingQueue.push({
        type: 'transition',
        fromTrackId,
        toTrackId,
        feedback: {
          success,
          transitionType,
          duration
        }
      });
    } else {
      // Process immediately
      this.processTransitionFeedback(fromTrackId, toTrackId, {
        success,
        transitionType,
        duration
      });
    }
    
    // Track in analytics
    const fromTrack = this.findTrackById(fromTrackId);
    const toTrack = this.findTrackById(toTrackId);
    if (fromTrack && toTrack) {
      AnalyticsService.trackMix(fromTrack, toTrack, transitionType as any, duration);
    }
  }

  /**
   * Process transition feedback
   */
  private processTransitionFeedback(fromTrackId: string, toTrackId: string, feedback: any): void {
    const fromAnalysis = this.trackAnalyses.get(fromTrackId);
    const toAnalysis = this.trackAnalyses.get(toTrackId);
    
    if (!fromAnalysis || !toAnalysis) return;
    
    // Calculate transition properties
    const energyChange = toAnalysis.energy - fromAnalysis.energy;
    const bpmChange = toAnalysis.bpm - fromAnalysis.bpm;
    const keyCompatible = this.areKeysCompatible(fromAnalysis.key, toAnalysis.key);
    
    // Find existing transition analysis or create new one
    const existingIndex = this.transitionAnalyses.findIndex(
      t => t.fromTrackId === fromTrackId && t.toTrackId === toTrackId
    );
    
    if (existingIndex >= 0) {
      // Update existing analysis
      const existing = this.transitionAnalyses[existingIndex];
      this.transitionAnalyses[existingIndex] = {
        ...existing,
        success: existing.success * (1 - this.config.learningRate) + feedback.success * this.config.learningRate,
        transitionType: feedback.transitionType,
        duration: feedback.duration
      };
    } else {
      // Create new analysis
      this.transitionAnalyses.push({
        fromTrackId,
        toTrackId,
        transitionType: feedback.transitionType,
        duration: feedback.duration,
        success: feedback.success,
        energyChange,
        bpmChange,
        keyCompatible
      });
    }
    
    console.log(`🧠 Transition feedback processed: ${fromTrackId} → ${toTrackId}`);
  }

  /**
   * Add crowd feedback for optimization
   */
  addCrowdFeedback(feedback: Record<string, number>, realTime: boolean = true): void {
    if (!this.config.enabled) return;

    if (realTime && this.config.realTimeAnalysis) {
      // Add to processing queue for real-time analysis
      this.processingQueue.push({
        type: 'crowd',
        feedback
      });
    } else {
      // Process immediately
      this.processCrowdFeedback(feedback);
    }
  }

  /**
   * Process crowd feedback
   */
  private processCrowdFeedback(feedback: Record<string, number>): void {
    // Update crowd feedback map
    Object.entries(feedback).forEach(([key, value]) => {
      this.crowdFeedback.set(key, value);
    });
    
    // Adjust recommendations based on crowd feedback
    this.generateRecommendations();
    
    console.log('🧠 Crowd feedback processed');
  }

  /**
   * Analyze the structure of the current set
   */
  private analyzeSetStructure(): void {
    if (this.currentPlaylist.length === 0) return;
    
    // Extract energy curve
    const energyCurve = this.currentPlaylist.map(track => track.energy || 50);
    
    // Find peak moments (local maxima)
    const peakMoments: number[] = [];
    for (let i = 1; i < energyCurve.length - 1; i++) {
      if (energyCurve[i] > energyCurve[i-1] && energyCurve[i] > energyCurve[i+1]) {
        peakMoments.push(i);
      }
    }
    
    // Count valleys (local minima)
    let valleysCount = 0;
    for (let i = 1; i < energyCurve.length - 1; i++) {
      if (energyCurve[i] < energyCurve[i-1] && energyCurve[i] < energyCurve[i+1]) {
        valleysCount++;
      }
    }
    
    // Calculate genre coherence (percentage of adjacent tracks with same genre)
    let genreMatches = 0;
    for (let i = 0; i < this.currentPlaylist.length - 1; i++) {
      if (this.currentPlaylist[i].genre === this.currentPlaylist[i+1].genre) {
        genreMatches++;
      }
    }
    const genreCoherence = this.currentPlaylist.length > 1 ? 
      (genreMatches / (this.currentPlaylist.length - 1)) * 100 : 
      100;
    
    // Track key progression
    const keyProgression = this.currentPlaylist.map(track => track.key || 'C');
    
    // Calculate overall rating based on structure
    const hasGoodProgression = this.hasGoodEnergyProgression(energyCurve);
    const hasPeaks = peakMoments.length > 0;
    const hasVariety = valleysCount > 0;
    const hasKeyCoherence = this.hasGoodKeyProgression(keyProgression);
    
    const overallRating = 
      (hasGoodProgression ? 25 : 0) +
      (hasPeaks ? 25 : 0) +
      (hasVariety ? 25 : 0) +
      (hasKeyCoherence ? 25 : 0);
    
    this.setAnalysis = {
      energyCurve,
      peakMoments,
      valleysCount,
      genreCoherence,
      keyProgression,
      overallRating
    };
    
    console.log(`🧠 Set analysis complete: ${overallRating}% optimal`);
  }

  /**
   * Check if the energy progression is good
   */
  private hasGoodEnergyProgression(energyCurve: number[]): boolean {
    if (energyCurve.length < 3) return true;
    
    // Check if energy generally increases then decreases
    const mid = Math.floor(energyCurve.length / 2);
    const firstHalf = energyCurve.slice(0, mid);
    const secondHalf = energyCurve.slice(mid);
    
    const firstHalfIncreasing = firstHalf[firstHalf.length - 1] > firstHalf[0];
    const secondHalfDecreasing = secondHalf[secondHalf.length - 1] < secondHalf[0];
    
    return firstHalfIncreasing && secondHalfDecreasing;
  }

  /**
   * Check if the key progression is harmonically sound
   */
  private hasGoodKeyProgression(keyProgression: string[]): boolean {
    if (keyProgression.length < 2) return true;
    
    let compatibleTransitions = 0;
    for (let i = 0; i < keyProgression.length - 1; i++) {
      if (this.areKeysCompatible(keyProgression[i], keyProgression[i+1])) {
        compatibleTransitions++;
      }
    }
    
    return compatibleTransitions >= (keyProgression.length - 1) * 0.7; // At least 70% compatible
  }

  /**
   * Check if two musical keys are compatible
   */
  private areKeysCompatible(key1: string, key2: string): boolean {
    if (!key1 || !key2) return false;
    
    // Camelot wheel compatible keys
    const camelotWheel: Record<string, string[]> = {
      'Am': ['Em', 'Dm', 'C', 'G'],
      'Bm': ['F#m', 'Am', 'D', 'A'],
      'Cm': ['Gm', 'Bbm', 'Eb', 'Bb'],
      'Dm': ['Am', 'Cm', 'F', 'C'],
      'Em': ['Bm', 'Dm', 'G', 'D'],
      'Fm': ['Cm', 'Ebm', 'Ab', 'Eb'],
      'Gm': ['Dm', 'Fm', 'Bb', 'F'],
      'C': ['G', 'F', 'Am', 'Em'],
      'D': ['A', 'G', 'Bm', 'F#m'],
      'E': ['B', 'A', 'C#m', 'G#m'],
      'F': ['C', 'Bb', 'Dm', 'Am'],
      'G': ['D', 'C', 'Em', 'Bm'],
      'A': ['E', 'D', 'F#m', 'C#m'],
      'B': ['F#', 'E', 'G#m', 'D#m']
    };
    
    // Check if keys are compatible
    return key1 === key2 || (camelotWheel[key1]?.includes(key2) || camelotWheel[key2]?.includes(key1) || false);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(): void {
    if (!this.setAnalysis || this.currentPlaylist.length === 0) return;
    
    const recommendations: Recommendation[] = [];
    
    // Energy curve recommendations
    if (!this.hasGoodEnergyProgression(this.setAnalysis.energyCurve)) {
      recommendations.push(this.generateEnergyRecommendation());
    }
    
    // Transition recommendations
    if (this.currentPlaylist.length > 1) {
      const poorTransitions = this.findPoorTransitions();
      if (poorTransitions.length > 0) {
        recommendations.push(this.generateTransitionRecommendation(poorTransitions[0]));
      }
    }
    
    // Track recommendations
    const trackRecommendation = this.generateTrackRecommendation();
    if (trackRecommendation) {
      recommendations.push(trackRecommendation);
    }
    
    // Structure recommendations
    if (this.setAnalysis.overallRating < 70) {
      recommendations.push(this.generateStructureRecommendation());
    }
    
    // Sort by confidence
    this.recommendations = recommendations.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`🧠 Generated ${this.recommendations.length} recommendations`);
  }

  /**
   * Generate energy curve recommendation
   */
  private generateEnergyRecommendation(): Recommendation {
    const energyCurve = this.setAnalysis?.energyCurve || [];
    
    // Determine if we need more build-up or cool-down
    const needsBuildUp = energyCurve.length > 2 && energyCurve[1] - energyCurve[0] < 10;
    const needsCoolDown = energyCurve.length > 2 && energyCurve[energyCurve.length - 1] > 70;
    
    let description = '';
    let reasoning = '';
    let confidence = 0;
    
    if (needsBuildUp) {
      description = 'Start with lower energy tracks and gradually build up';
      reasoning = 'Your set starts too intensely. A gradual build-up creates anticipation and extends dance floor longevity.';
      confidence = 0.85;
    } else if (needsCoolDown) {
      description = 'End with lower energy tracks for a smoother closing';
      reasoning = 'Your set ends at high energy. A gradual cool-down helps transition the audience to the end of your set.';
      confidence = 0.8;
    } else {
      description = 'Add more energy variation throughout your set';
      reasoning = 'Your energy curve is too flat. Adding peaks and valleys creates more dynamic and engaging sets.';
      confidence = 0.75;
    }
    
    return {
      id: `energy_${Date.now()}`,
      type: 'energy',
      confidence,
      description,
      expectedImpact: 85,
      reasoning
    };
  }

  /**
   * Find transitions with poor ratings
   */
  private findPoorTransitions(): TransitionAnalysis[] {
    return this.transitionAnalyses
      .filter(t => t.success < 60)
      .sort((a, b) => a.success - b.success);
  }

  /**
   * Generate transition recommendation
   */
  private generateTransitionRecommendation(poorTransition: TransitionAnalysis): Recommendation {
    const fromTrack = this.findTrackById(poorTransition.fromTrackId);
    const toTrack = this.findTrackById(poorTransition.toTrackId);
    
    if (!fromTrack || !toTrack) {
      return {
        id: `transition_${Date.now()}`,
        type: 'transition',
        confidence: 0.7,
        description: 'Improve transitions between tracks with large BPM or key differences',
        expectedImpact: 75,
        reasoning: 'Smoother transitions create a more professional sound and maintain dance floor momentum.'
      };
    }
    
    let description = '';
    let reasoning = '';
    
    if (Math.abs(poorTransition.bpmChange) > 8) {
      description = `Use tempo adjustment when transitioning from ${fromTrack.title} to ${toTrack.title}`;
      reasoning = `The BPM difference of ${Math.abs(poorTransition.bpmChange)} is too large for a smooth transition. Gradually adjust tempo for better flow.`;
    } else if (!poorTransition.keyCompatible) {
      description = `Use harmonic mixing or EQ when transitioning from ${fromTrack.title} to ${toTrack.title}`;
      reasoning = 'The keys are not compatible. Use EQ to reduce clashing frequencies or find an alternative track with a compatible key.';
    } else {
      description = `Extend the transition time between ${fromTrack.title} and ${toTrack.title}`;
      reasoning = 'A longer blend will create a smoother transition between these tracks.';
    }
    
    return {
      id: `transition_${Date.now()}`,
      type: 'transition',
      confidence: 0.8,
      description,
      expectedImpact: 80,
      reasoning
    };
  }

  /**
   * Generate track recommendation
   */
  private generateTrackRecommendation(): Recommendation | null {
    if (this.currentPlaylist.length < 2) return null;
    
    // Find position where a new track would be most beneficial
    let worstTransitionIndex = -1;
    let worstTransitionScore = 100;
    
    for (let i = 0; i < this.currentPlaylist.length - 1; i++) {
      const fromTrack = this.currentPlaylist[i];
      const toTrack = this.currentPlaylist[i + 1];
      
      // Calculate transition score
      const bpmDiff = Math.abs(parseInt(fromTrack.bpm || '0') - parseInt(toTrack.bpm || '0'));
      const energyDiff = Math.abs((fromTrack.energy || 0) - (toTrack.energy || 0));
      const keyCompatible = this.areKeysCompatible(fromTrack.key || '', toTrack.key || '');
      
      const score = 100 - (bpmDiff * 2) - (energyDiff * 0.5) - (keyCompatible ? 0 : 30);
      
      if (score < worstTransitionScore) {
        worstTransitionScore = score;
        worstTransitionIndex = i;
      }
    }
    
    if (worstTransitionIndex === -1 || worstTransitionScore > 60) {
      return null; // No problematic transitions
    }
    
    const fromTrack = this.currentPlaylist[worstTransitionIndex];
    const toTrack = this.currentPlaylist[worstTransitionIndex + 1];
    
    // Find a track that would bridge these two better
    const bridgeTrack = this.findBridgeTrack(fromTrack, toTrack);
    
    if (!bridgeTrack) return null;
    
    return {
      id: `track_${Date.now()}`,
      type: 'track',
      confidence: 0.75,
      description: `Add "${bridgeTrack.title}" between "${fromTrack.title}" and "${toTrack.title}"`,
      suggestedTrackId: bridgeTrack.id.toString(),
      suggestedPosition: worstTransitionIndex + 1,
      expectedImpact: 85,
      reasoning: `This track has compatible BPM and key with both surrounding tracks, creating a smoother transition.`
    };
  }

  /**
   * Find a track that would bridge two tracks well
   */
  private findBridgeTrack(fromTrack: Track, toTrack: Track): Track | null {
    // This would normally search a track database
    // For now, we'll create a synthetic track with ideal properties
    
    const fromBpm = parseInt(fromTrack.bpm || '120');
    const toBpm = parseInt(toTrack.bpm || '120');
    const targetBpm = Math.round((fromBpm + toBpm) / 2);
    
    const fromEnergy = fromTrack.energy || 50;
    const toEnergy = toTrack.energy || 50;
    const targetEnergy = Math.round((fromEnergy + toEnergy) / 2);
    
    // Use one of the keys for compatibility
    const targetKey = this.areKeysCompatible(fromTrack.key || '', toTrack.key || '') ? 
      fromTrack.key : 
      toTrack.key;
    
    // Create a synthetic bridge track
    return {
      id: `bridge_${Date.now()}`,
      title: `Perfect Bridge (AI Recommended)`,
      artist: 'DJ Sensee AI',
      duration: 240,
      bpm: targetBpm.toString(),
      key: targetKey || 'C',
      energy: targetEnergy,
      genre: fromTrack.genre || toTrack.genre || 'electronic'
    };
  }

  /**
   * Generate structure recommendation
   */
  private generateStructureRecommendation(): Recommendation {
    const setAnalysis = this.setAnalysis;
    if (!setAnalysis) {
      return {
        id: `structure_${Date.now()}`,
        type: 'structure',
        confidence: 0.7,
        description: 'Improve overall set structure with better energy progression',
        expectedImpact: 80,
        reasoning: 'A well-structured set keeps the audience engaged throughout your performance.'
      };
    }
    
    let description = '';
    let reasoning = '';
    
    if (setAnalysis.peakMoments.length === 0) {
      description = 'Add at least one high-energy peak moment to your set';
      reasoning = 'Peak moments create memorable experiences and give the audience something to anticipate.';
    } else if (setAnalysis.valleysCount === 0) {
      description = 'Add breathing room with lower energy sections';
      reasoning = 'Constant high energy can fatigue your audience. Valleys allow for rest and build anticipation for the next peak.';
    } else if (setAnalysis.genreCoherence < 50) {
      description = 'Improve genre coherence for a more consistent sound';
      reasoning = 'Too many genre shifts can feel disjointed. Group similar genres together for a more cohesive flow.';
    } else {
      description = 'Refine your energy progression for a more natural flow';
      reasoning = 'The best sets have a natural arc that builds tension and releases it at the right moments.';
    }
    
    return {
      id: `structure_${Date.now()}`,
      type: 'structure',
      confidence: 0.75,
      description,
      expectedImpact: 85,
      reasoning
    };
  }

  /**
   * Find a track by ID
   */
  private findTrackById(trackId: string): Track | undefined {
    return this.currentPlaylist.find(track => track.id.toString() === trackId);
  }

  /**
   * Get current recommendations
   */
  getRecommendations(): Recommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get set analysis
   */
  getSetAnalysis(): SetAnalysis | null {
    return this.setAnalysis;
  }

  /**
   * Get track analysis
   */
  getTrackAnalysis(trackId: string): TrackAnalysis | null {
    return this.trackAnalyses.get(trackId) || null;
  }

  /**
   * Get all track analyses
   */
  getAllTrackAnalyses(): TrackAnalysis[] {
    return Array.from(this.trackAnalyses.values());
  }

  /**
   * Get transition analyses
   */
  getTransitionAnalyses(): TransitionAnalysis[] {
    return [...this.transitionAnalyses];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.processingQueue = [];
    this.isInitialized = false;
    console.log('🧠 Optimization Engine destroyed');
  }
}

export const OptimizationEngine = new OptimizationEngineClass();