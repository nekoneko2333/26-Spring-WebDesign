import { StrictMode } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient();

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#081827' }}>
          <h1>Homepage render error</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack || this.state.error.message}</pre>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
