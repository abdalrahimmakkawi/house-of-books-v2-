import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
