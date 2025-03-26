import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';
import * as iterableService from '@/services/iterableService';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Initialize Iterable with a placeholder API key
// This helps prevent console errors - replace with real key in production
iterableService.initializeIterable('YOUR_ITERABLE_API_KEY_HERE');

// Get the root element
const root = document.getElementById('root');

// Make sure the element exists
if (root) {
  // Create a client
  const queryClient = new QueryClient();

  // Render the app
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <App />
              <Toaster />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
} else {
  // Display an error if the root element is missing
  document.body.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="color: #e11d48; margin-bottom: 16px;">
        Application Failed to Start
      </h1>
      <p style="max-width: 500px; margin-bottom: 24px;">
        The application couldn't find the necessary HTML element to mount. Please make sure your index.html contains a div with id="root".
      </p>
      <button 
        onclick="window.location.reload()" 
        style="
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        "
      >
        Reload Page
      </button>
    </div>
  `;
}
