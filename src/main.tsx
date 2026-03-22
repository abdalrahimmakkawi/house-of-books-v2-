import * as React from 'react';
import {StrictMode, ReactNode, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Force update logic
const APP_VERSION = '2.0';
const savedVersion = localStorage.getItem('hob_version');
if (savedVersion !== APP_VERSION) {
  localStorage.setItem('hob_version', APP_VERSION);
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    }).then(() => window.location.reload());
  }
}

// Force update all PWA installations
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  }).then(() => {
    navigator.serviceWorker.register('/sw.js');
  });
}

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); (this as any).state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error(error, errorInfo); }
  render() {
    if ((this as any).state.hasError) return (<div style={{ padding: '20px', color: 'red' }}><h1>Error</h1><pre>{(this as any).state.error?.message}</pre></div>);
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
