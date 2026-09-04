import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <AlertTriangle size={48} color="var(--error)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
            We're sorry, but an unexpected error occurred while rendering this component. Try refreshing the page.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ marginTop: '32px', padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', textAlign: 'left', width: '100%', overflowX: 'auto', fontSize: '13px', fontFamily: 'monospace' }}>
              <strong>{this.state.error.toString()}</strong>
              <br />
              {this.state.errorInfo.componentStack}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
