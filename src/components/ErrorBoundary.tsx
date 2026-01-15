import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-48 bg-destructive/10 rounded border border-destructive/20">
          <div className="text-center p-4">
            <p className="text-xs text-destructive mb-1">Component Error</p>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || 'Something went wrong rendering this component'}
            </p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
