import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import './index.css';

// CRITICAL: Disable Monaco workers BEFORE any Monaco code loads
// This prevents CSP violations and worker-related errors
(window as any).MonacoEnvironment = {
  getWorker() {
    return null;
  }
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <EditorApp />
    </React.StrictMode>
  );
}
