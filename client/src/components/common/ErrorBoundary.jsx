import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    // Detect lazy-load / chunk failures
    const isChunkError = error?.name === 'ChunkLoadError' ||
      /loading chunk|failed to fetch dynamically imported module/i.test(error?.message || '');

    return { hasError: true, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Notify the backend
    fetch('/api/settings/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error ? error.toString() : 'Unknown Error',
        componentStack: errorInfo ? errorInfo.componentStack : '',
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(e => console.error('Failed to report client error:', e));

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      const { isChunkError } = this.state;

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary)', padding: '24px'
        }}>
          <div className="card" style={{
            maxWidth: '440px', width: '100%', padding: '48px 32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {isChunkError ? 'Update Available' : 'Something went wrong'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              {isChunkError
                ? 'A new version of the app is available. Please reload to get the latest updates.'
                : <>
                    An unexpected error occurred. Our team has been notified.
                    <br/><br/>
                    <strong style={{color:'var(--error)'}}>{this.state.error?.toString()}</strong>
                    <pre style={{textAlign:'left', fontSize:'11px', overflowX:'auto', background:'rgba(0,0,0,0.2)', padding:'10px', marginTop:'10px'}}>
                      {this.state.error?.stack}
                    </pre>
                  </>}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {isChunkError ? (
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                  >
                    Reload Page
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
