/**
 * AnalyticsService - Tracks user interactions, performance metrics, and system health
 * This is a singleton service for production-grade analytics
 */

import { Track } from '../types';

interface PlaybackEvent {
  trackId: string;
  title: string;
  artist: string;
  timestamp: number;
  eventType: 'play' | 'pause' | 'skip' | 'complete' | 'error';
  duration: number;
  playbackPosition: number;
  sessionId: string;
}

interface MixEvent {
  fromTrackId: string;
  toTrackId: string;
  timestamp: number;
  transitionType: 'auto' | 'manual' | 'crossfade' | 'cut';
  transitionDuration: number;
  bpmDifference: number;
  keyCompatible: boolean;
  energyChange: number;
  sessionId: string;
}

interface PerformanceMetrics {
  sessionId: string;
  timestamp: number;
  memoryUsage: number;
  cpuUsage: number;
  audioBufferHealth: number;
  renderTime: number;
  networkLatency: number;
}

interface UserFeedback {
  sessionId: string;
  timestamp: number;
  trackId: string;
  rating: number;
  feedbackType: 'transition' | 'track' | 'energy' | 'overall';
  comment?: string;
}

interface AnalyticsConfig {
  enabled: boolean;
  anonymizeData: boolean;
  collectPerformanceMetrics: boolean;
  metricsInterval: number;
  batchSize: number;
  flushInterval: number;
  endpoint?: string;
}

class AnalyticsServiceClass {
  private config: AnalyticsConfig = {
    enabled: true,
    anonymizeData: true,
    collectPerformanceMetrics: true,
    metricsInterval: 30000, // 30 seconds
    batchSize: 20,
    flushInterval: 60000, // 1 minute
  };

  private events: (PlaybackEvent | MixEvent | UserFeedback)[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private sessionId: string = '';
  private flushTimeoutId: number | null = null;
  private metricsIntervalId: number | null = null;
  private isInitialized: boolean = false;
  private userId: string | null = null;
  private deviceInfo: Record<string, any> = {};

  /**
   * Initialize the analytics service
   */
  initialize(userId?: string, config?: Partial<AnalyticsConfig>): void {
    if (this.isInitialized) return;

    // Update config with any overrides
    this.config = { ...this.config, ...config };
    
    // Generate a unique session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Set user ID if provided
    this.userId = userId || null;
    
    // Collect device info
    this.collectDeviceInfo();
    
    // Start performance metrics collection if enabled
    if (this.config.collectPerformanceMetrics) {
      this.startPerformanceMetricsCollection();
    }
    
    // Set up automatic flushing
    this.setupAutoFlush();
    
    // Set up unload handler to flush events before page close
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    this.isInitialized = true;
    console.log(`📊 Analytics initialized: Session ${this.sessionId}`);
  }

  /**
   * Collect basic device and browser information
   */
  private collectDeviceInfo(): void {
    try {
      const { userAgent, language, platform } = navigator;
      const { width, height } = window.screen;
      const pixelRatio = window.devicePixelRatio || 1;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      this.deviceInfo = {
        userAgent: this.config.anonymizeData ? this.anonymizeUserAgent(userAgent) : userAgent,
        language,
        platform,
        screenWidth: width,
        screenHeight: height,
        pixelRatio,
        timeZone,
        isOnline: navigator.onLine,
        hasTouch: 'ontouchstart' in window,
        audioContext: !!window.AudioContext || !!(window as any).webkitAudioContext,
        webGL: !!document.createElement('canvas').getContext('webgl'),
      };
    } catch (error) {
      console.warn('Failed to collect device info:', error);
      this.deviceInfo = { error: 'Failed to collect' };
    }
  }

  /**
   * Anonymize user agent to remove identifying information
   */
  private anonymizeUserAgent(userAgent: string): string {
    // Remove version numbers and specific device info
    return userAgent
      .replace(/(\d+\.)+\d+/g, 'x.x.x')
      .replace(/\([^)]*\)/g, '(anonymized)');
  }

  /**
   * Track playback events
   */
  trackPlayback(track: Track, eventType: PlaybackEvent['eventType'], position: number): void {
    if (!this.config.enabled || !this.isInitialized) return;

    const event: PlaybackEvent = {
      trackId: track.id.toString(),
      title: track.title,
      artist: track.artist,
      timestamp: Date.now(),
      eventType,
      duration: track.duration || 0,
      playbackPosition: position,
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.checkBatchSize();
  }

  /**
   * Track mix/transition events
   */
  trackMix(fromTrack: Track, toTrack: Track, transitionType: MixEvent['transitionType'], duration: number): void {
    if (!this.config.enabled || !this.isInitialized) return;

    // Calculate BPM difference
    const fromBpm = parseInt(fromTrack.bpm || '0');
    const toBpm = parseInt(toTrack.bpm || '0');
    const bpmDifference = Math.abs(fromBpm - toBpm);

    // Determine key compatibility
    const keyCompatible = this.areKeysCompatible(fromTrack.key || '', toTrack.key || '');

    // Calculate energy change
    const energyChange = (toTrack.energy || 0) - (fromTrack.energy || 0);

    const event: MixEvent = {
      fromTrackId: fromTrack.id.toString(),
      toTrackId: toTrack.id.toString(),
      timestamp: Date.now(),
      transitionType,
      transitionDuration: duration,
      bpmDifference,
      keyCompatible,
      energyChange,
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.checkBatchSize();
  }

  /**
   * Track user feedback
   */
  trackFeedback(trackId: string, rating: number, feedbackType: UserFeedback['feedbackType'], comment?: string): void {
    if (!this.config.enabled || !this.isInitialized) return;

    const feedback: UserFeedback = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      trackId,
      rating,
      feedbackType,
      comment
    };

    this.events.push(feedback);
    this.checkBatchSize();
  }

  /**
   * Start collecting performance metrics at regular intervals
   */
  private startPerformanceMetricsCollection(): void {
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
    }

    this.metricsIntervalId = window.setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Collect current performance metrics
   */
  private collectPerformanceMetrics(): void {
    try {
      const memory = (performance as any).memory ? {
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize
      } : null;

      // Calculate memory usage percentage if available
      const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;

      // Estimate CPU usage based on frame rate
      let cpuUsage = 0;
      if ('requestAnimationFrame' in window) {
        let lastTime = performance.now();
        let frames = 0;
        const calculateFrameRate = () => {
          const now = performance.now();
          frames++;
          if (now >= lastTime + 1000) {
            const fps = frames * 1000 / (now - lastTime);
            cpuUsage = Math.max(0, 100 - (fps / 60) * 100); // Rough estimate
            lastTime = now;
            frames = 0;
          }
          requestAnimationFrame(calculateFrameRate);
        };
        calculateFrameRate();
      }

      // Estimate audio buffer health
      const audioBufferHealth = 100; // Placeholder, would need actual buffer monitoring

      // Measure render time
      const renderStart = performance.now();
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStart;

        // Measure network latency
        const networkLatency = navigator.connection ? 
          (navigator.connection as any).rtt || 0 : 
          0;

        const metrics: PerformanceMetrics = {
          sessionId: this.sessionId,
          timestamp: Date.now(),
          memoryUsage,
          cpuUsage,
          audioBufferHealth,
          renderTime,
          networkLatency
        };

        this.performanceMetrics.push(metrics);
      });
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Set up automatic flushing of events
   */
  private setupAutoFlush(): void {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
    }

    this.flushTimeoutId = window.setTimeout(() => {
      this.flush();
      this.setupAutoFlush(); // Set up next flush
    }, this.config.flushInterval);
  }

  /**
   * Check if batch size threshold is reached and flush if needed
   */
  private checkBatchSize(): void {
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush events to storage or server
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.events.length === 0) return;

    try {
      const eventsToSend = [...this.events];
      const metricsToSend = [...this.performanceMetrics];
      
      // Clear local copies
      this.events = [];
      this.performanceMetrics = [];

      // If endpoint is configured, send to server
      if (this.config.endpoint) {
        try {
          await this.sendToServer(eventsToSend, metricsToSend);
        } catch (error) {
          console.warn('Failed to send analytics to server:', error);
          // Store locally as fallback
          this.storeLocally(eventsToSend, metricsToSend);
        }
      } else {
        // Otherwise just store locally
        this.storeLocally(eventsToSend, metricsToSend);
      }
    } catch (error) {
      console.error('Analytics flush failed:', error);
    }
  }

  /**
   * Send analytics data to server
   */
  private async sendToServer(events: any[], metrics: any[]): Promise<void> {
    if (!this.config.endpoint) return;

    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      timestamp: Date.now(),
      events,
      metrics
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Use keepalive to ensure the request completes even if page is unloading
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`Analytics server returned ${response.status}`);
    }
  }

  /**
   * Store analytics data locally
   */
  private storeLocally(events: any[], metrics: any[]): void {
    try {
      // Store in localStorage with size limits
      const key = `dj-sensee-analytics-${this.sessionId}`;
      const existingData = localStorage.getItem(key);
      const existingParsed = existingData ? JSON.parse(existingData) : { events: [], metrics: [] };
      
      const updatedData = {
        events: [...existingParsed.events, ...events].slice(-1000), // Limit to last 1000 events
        metrics: [...existingParsed.metrics, ...metrics].slice(-500) // Limit to last 500 metrics
      };
      
      localStorage.setItem(key, JSON.stringify(updatedData));
    } catch (error) {
      console.warn('Failed to store analytics locally:', error);
    }
  }

  /**
   * Handle page unload to flush remaining events
   */
  private handleBeforeUnload = (): void => {
    this.flush();
    
    // Clean up intervals
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = null;
    }
  };

  /**
   * Check if two musical keys are compatible for mixing
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
   * Get analytics data for the current session
   */
  getSessionData(): any {
    return {
      sessionId: this.sessionId,
      startTime: this.sessionId.split('_')[1],
      events: this.events.length,
      metrics: this.performanceMetrics.length,
      deviceInfo: this.deviceInfo
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.flush();
    
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = null;
    }
    
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    this.isInitialized = false;
    console.log('📊 Analytics service destroyed');
  }
}

export const AnalyticsService = new AnalyticsServiceClass();