import * as React from 'react';
import {StrictMode, ReactNode, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
