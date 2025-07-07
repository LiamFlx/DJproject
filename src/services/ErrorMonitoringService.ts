/**
 * ErrorMonitoringService - Production-grade error tracking and reporting
 * This service captures and reports errors for debugging and quality improvement
 */

interface ErrorConfig {
  enabled: boolean;
  captureConsoleErrors: boolean;
  captureNetworkErrors: boolean;
  captureUnhandledRejections: boolean;
  captureResourceErrors: boolean;
  sampleRate: number;
  maxErrorsPerMinute: number;
  endpoint?: string;
}

interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  type: string;
  source: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  componentStack?: string;
  tags: Record<string, string>;
  metadata: Record<string, any>;
  userAgent: string;
  sessionId: string;
}

class ErrorMonitoringServiceClass {
  private config: ErrorConfig = {
    enabled: true,
    captureConsoleErrors: true,
    captureNetworkErrors: true,
    captureUnhandledRejections: true,
    captureResourceErrors: true,
    sampleRate: 1.0, // Capture all errors
    maxErrorsPerMinute: 10,
    endpoint: undefined
  };

  private errors: ErrorReport[] = [];
  private originalConsoleError: typeof console.error;
  private originalWindowOnerror: typeof window.onerror;
  private originalWindowOnunhandledrejection: typeof window.onunhandledrejection;
  private isInitialized = false;
  private sessionId = '';
  private errorCount = 0;
  private lastErrorReset = Date.now();
  private flushInterval: number | null = null;

  constructor() {
    // Store original console methods
    this.originalConsoleError = console.error;
    this.originalWindowOnerror = window.onerror;
    this.originalWindowOnunhandledrejection = window.onunhandledrejection;
  }

  /**
   * Initialize the error monitoring service
   */
  initialize(sessionId: string, config?: Partial<ErrorConfig>): void {
    if (this.isInitialized) return;

    // Update config with any overrides
    this.config = { ...this.config, ...config };
    this.sessionId = sessionId || `session_${Date.now()}`;
    
    // Set up error handlers
    this.setupErrorHandlers();
    
    // Set up automatic flushing
    this.flushInterval = window.setInterval(() => {
      this.flush();
      this.errorCount = 0;
      this.lastErrorReset = Date.now();
    }, 60000); // Flush every minute
    
    this.isInitialized = true;
    console.log(`🔍 Error monitoring initialized: Session ${this.sessionId}`);
  }

  /**
   * Set up error handlers
   */
  private setupErrorHandlers(): void {
    if (this.config.captureConsoleErrors) {
      console.error = (...args: any[]) => {
        this.captureConsoleError(args);
        this.originalConsoleError.apply(console, args);
      };
    }
    
    if (this.config.captureUnhandledRejections) {
      window.onunhandledrejection = (event: PromiseRejectionEvent) => {
        this.captureUnhandledRejection(event);
        if (this.originalWindowOnunhandledrejection) {
          this.originalWindowOnunhandledrejection.call(window, event);
        }
      };
    }
    
    if (this.config.captureNetworkErrors || this.config.captureResourceErrors) {
      window.onerror = (message, source, lineno, colno, error) => {
        this.captureWindowError(message, source, lineno, colno, error);
        if (this.originalWindowOnerror) {
          return this.originalWindowOnerror.call(window, message, source, lineno, colno, error);
        }
        return false;
      };
    }
    
    if (this.config.captureResourceErrors) {
      window.addEventListener('error', (event) => {
        if (event.target && (event.target as HTMLElement).tagName) {
          this.captureResourceError(event);
        }
      }, true);
    }
  }

  /**
   * Capture console.error calls
   */
  private captureConsoleError(args: any[]): void {
    if (!this.shouldCaptureError()) return;
    
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      JSON.stringify(arg)
    ).join(' ');
    
    const stack = args.find(arg => arg instanceof Error)?.stack;
    
    this.addError({
      message,
      stack,
      type: 'console',
      source: 'console.error'
    });
  }

  /**
   * Capture unhandled promise rejections
   */
  private captureUnhandledRejection(event: PromiseRejectionEvent): void {
    if (!this.shouldCaptureError()) return;
    
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    
    this.addError({
      message,
      stack,
      type: 'promise',
      source: 'unhandledrejection'
    });
  }

  /**
   * Capture window.onerror events
   */
  private captureWindowError(message: any, source?: string, lineNumber?: number, columnNumber?: number, error?: Error): void {
    if (!this.shouldCaptureError()) return;
    
    this.addError({
      message: String(message),
      stack: error?.stack,
      type: 'runtime',
      source: source || 'window.onerror',
      lineNumber,
      columnNumber
    });
  }

  /**
   * Capture resource loading errors
   */
  private captureResourceError(event: ErrorEvent): void {
    if (!this.shouldCaptureError()) return;
    
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    
    // Only capture resource errors (img, script, link, audio, video)
    if (!['img', 'script', 'link', 'audio', 'video'].includes(tagName)) return;
    
    const sourceAttribute = 
      tagName === 'link' ? (target as HTMLLinkElement).href :
      tagName === 'img' ? (target as HTMLImageElement).src :
      tagName === 'script' ? (target as HTMLScriptElement).src :
      tagName === 'audio' || tagName === 'video' ? (target as HTMLMediaElement).src :
      '';
    
    this.addError({
      message: `Failed to load ${tagName} resource`,
      type: 'resource',
      source: sourceAttribute || 'resource',
      metadata: {
        tagName,
        resourceUrl: sourceAttribute
      }
    });
  }

  /**
   * Manually capture an error
   */
  captureError(error: Error | string, metadata: Record<string, any> = {}, tags: Record<string, string> = {}): void {
    if (!this.config.enabled || !this.isInitialized) return;
    
    if (!this.shouldCaptureError()) return;
    
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.addError({
      message,
      stack,
      type: 'manual',
      source: 'captureError',
      metadata,
      tags
    });
  }

  /**
   * Capture a handled exception (for tracking recoverable errors)
   */
  captureHandledException(error: Error | string, metadata: Record<string, any> = {}): void {
    if (!this.config.enabled || !this.isInitialized) return;
    
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.addError({
      message,
      stack,
      type: 'handled',
      source: 'captureHandledException',
      metadata
    });
  }

  /**
   * Add an error to the collection
   */
  private addError(errorData: Partial<ErrorReport>): void {
    // Rate limiting
    if (this.errorCount >= this.config.maxErrorsPerMinute) {
      // If it's been more than a minute since the last reset, reset the counter
      if (Date.now() - this.lastErrorReset > 60000) {
        this.errorCount = 0;
        this.lastErrorReset = Date.now();
      } else {
        return; // Skip this error due to rate limiting
      }
    }
    
    this.errorCount++;
    
    const error: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      type: errorData.type || 'unknown',
      source: errorData.source || 'unknown',
      url: window.location.href,
      lineNumber: errorData.lineNumber,
      columnNumber: errorData.columnNumber,
      componentStack: errorData.componentStack,
      tags: errorData.tags || {},
      metadata: errorData.metadata || {},
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    };
    
    this.errors.push(error);
    
    // If we have too many errors, flush immediately
    if (this.errors.length >= 10) {
      this.flush();
    }
  }

  /**
   * Determine if we should capture an error based on sampling rate
   */
  private shouldCaptureError(): boolean {
    if (!this.config.enabled || !this.isInitialized) return false;
    
    // Apply sampling rate
    if (this.config.sampleRate < 1.0) {
      return Math.random() <= this.config.sampleRate;
    }
    
    return true;
  }

  /**
   * Flush errors to storage or server
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.errors.length === 0) return;

    try {
      const errorsToSend = [...this.errors];
      this.errors = [];
      
      // If endpoint is configured, send to server
      if (this.config.endpoint) {
        try {
          await this.sendToServer(errorsToSend);
        } catch (error) {
          console.warn('Failed to send errors to server:', error);
          // Store locally as fallback
          this.storeLocally(errorsToSend);
        }
      } else {
        // Otherwise just store locally
        this.storeLocally(errorsToSend);
      }
    } catch (error) {
      // Use original console.error to avoid infinite loop
      this.originalConsoleError.call(console, 'Error monitoring flush failed:', error);
    }
  }

  /**
   * Send errors to server
   */
  private async sendToServer(errors: ErrorReport[]): Promise<void> {
    if (!this.config.endpoint) return;

    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      errors
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
      throw new Error(`Error reporting server returned ${response.status}`);
    }
  }

  /**
   * Store errors locally
   */
  private storeLocally(errors: ErrorReport[]): void {
    try {
      // Store in localStorage with size limits
      const key = `dj-sensee-errors-${this.sessionId}`;
      const existingData = localStorage.getItem(key);
      const existingErrors = existingData ? JSON.parse(existingData) : [];
      
      const updatedErrors = [...existingErrors, ...errors].slice(-100); // Limit to last 100 errors
      
      localStorage.setItem(key, JSON.stringify(updatedErrors));
    } catch (error) {
      // Use original console.error to avoid infinite loop
      this.originalConsoleError.call(console, 'Failed to store errors locally:', error);
    }
  }

  /**
   * Get all captured errors
   */
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Restore original console methods
    console.error = this.originalConsoleError;
    window.onerror = this.originalWindowOnerror;
    window.onunhandledrejection = this.originalWindowOnunhandledrejection;
    
    // Flush remaining errors
    this.flush();
    
    // Clear interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    this.isInitialized = false;
    console.log('🔍 Error monitoring destroyed');
  }
}

export const ErrorMonitoringService = new ErrorMonitoringServiceClass();