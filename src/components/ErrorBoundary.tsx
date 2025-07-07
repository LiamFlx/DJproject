import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('🧱 ErrorBoundary caught an error:', error);
    if (this.props.onError) {
      this.props.onError(error, info); // Hook for external logging (e.g., Sentry, Datadog)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback ? (
        fallback
      ) : (
        <div style={styles.wrapper}>
          <h2 style={styles.title}>Something went wrong.</h2>
          <p style={styles.subtitle}>Please try refreshing the page or come back later.</p>
          {error && (
            <details style={styles.details}>
              <summary>Details</summary>
              {error.toString()}
            </details>
          )}
          <button style={styles.button} onClick={this.handleReset}>
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '2rem',
    color: '#fff',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center'
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#ccc'
  },
  details: {
    marginTop: '1rem',
    fontSize: '0.85rem',
    textAlign: 'left',
    background: '#333',
    padding: '1rem',
    borderRadius: 4,
    color: '#ccc'
  },
  button: {
    marginTop: '1.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  }
};
