import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import './index.css';

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
