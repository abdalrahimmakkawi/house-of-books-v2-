import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Lazily pulled in so the Studio chunk is never part of the normal boot path.
const Studio = React.lazy(() => import('./pages/Agent'))
const StudioPreview = () => (
  <React.Suspense fallback={<div style={{ padding: 24, fontFamily: 'Georgia,serif', color: '#c9a84c', background: '#0e0d14', minHeight: '100vh' }}>Loading Studio…</div>}>
    <Studio />
  </React.Suspense>
)

// Catches any render crash anywhere in the app so users get a friendly
// retry screen instead of a permanent blank page. Shelf/notes live in
// localStorage, so a reload loses nothing.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { console.error('[HoB] render error:', error) }
  render() {
    if (this.state.hasError) return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'14px',background:'#0e0d14',color:'#e8e4d9',fontFamily:'Georgia,serif',textAlign:'center',padding:'2rem'}}>
        <div style={{fontSize:'2.5rem'}}>📚</div>
        <div style={{fontSize:'1.3rem',color:'#c9a84c'}}>Something went wrong</div>
        <div style={{fontSize:'13px',color:'#9a9080',maxWidth:'360px',lineHeight:1.6}}>
          An unexpected error interrupted the app. Your shelf and notes are safe — reloading will pick up right where you left off.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{padding:'11px 26px',background:'#c9a84c',color:'#0a0a0f',border:'none',borderRadius:'8px',fontSize:'14px',cursor:'pointer',fontFamily:'Georgia,serif'}}
        >↻ Reload</button>
      </div>
    )
    return this.props.children
  }
}

// Dev-only preview of the admin Studio at ?studio=1.
//
// The Studio normally renders only for an authenticated admin session, which
// makes reviewing its LAYOUT a chore — you have to log in every time, and it
// can't be looked at from a machine that isn't signed in. This bypasses the
// UI gate for design review only.
//
// It is NOT a security hole: import.meta.env.DEV is false in `vite build`, so
// this branch is dead-code-eliminated and never reaches production. The real
// gate was never the UI anyway — /api/agent verifies the Supabase access token
// server-side and returns 403 for non-admins, so a preview without a session
// simply shows the metrics strip in its error state.
const studioPreview =
  import.meta.env.DEV && new URLSearchParams(location.search).has('studio')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {studioPreview ? <StudioPreview /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
)

// Boot signal for the splash-screen watchdog in index.html. If this module
// executes at all, the JS bundle loaded and parsed — the failure mode the
// watchdog guards against (a stale/broken cached bundle that leaves the user
// stuck on the splash logo) is one where this line never runs.
;(window as any).__hobBooted = true
