import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import { initConsoleCapture } from '../utils/consoleCapture';
import './index.css';

// Initialize console capture for editor context
initConsoleCapture({ source: 'editor' });

// Removed null MonacoEnvironment configuration
// Proper configuration is in EditorApp.tsx

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <EditorApp />
    </React.StrictMode>
  );
}
