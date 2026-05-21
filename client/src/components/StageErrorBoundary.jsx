import React from 'react';

/**
 * StageErrorBoundary
 * ------------------
 * Catches any runtime JS error inside StagePage and renders a branded
 * recovery screen instead of a white/black blank page.
 *
 * Why this matters:
 *   React errors inside a component tree propagate upward until caught.
 *   Without a boundary, the entire Stage becomes an empty DOM — invisible
 *   on a TV display with nobody to notice. This boundary ensures the show
 *   goes on (or at least shows a useful recovery message + auto-reload).
 */
export class StageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.reloadTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[StageErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });

    // Auto-reload after 10 seconds so a live venue display recovers on its own
    this.reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 10000);
  }

  componentWillUnmount() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: '#04020a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'sans-serif', textAlign: 'center',
            padding: '2rem', gap: '1.5rem'
          }}
        >
          <div style={{ fontSize: 48 }}>🎤</div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#db2777', marginBottom: 12 }}>
              Stage Error — Auto-Recovering
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, marginBottom: 8 }}>
              Brief Intermission
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, maxWidth: 380 }}>
              The stage encountered an unexpected error. Reloading automatically in 10 seconds…
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              border: 'none', borderRadius: 9999, color: '#fff',
              fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase',
              cursor: 'pointer', fontWeight: 700
            }}
          >
            Reload Now
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', maxWidth: '80vw', overflow: 'auto', textAlign: 'left' }}>
              {String(this.state.error)}{'\n'}{this.state.errorInfo?.componentStack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
