import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContentApp } from './ContentApp';
import '@/styles/globals.css';

// Create a container for the extension content
const initializeContentScript = () => {
  // Check if already initialized
  if (document.getElementById('ai-mastermind-root')) {
    return;
  }

  // Create root container
  const rootContainer = document.createElement('div');
  rootContainer.id = 'ai-mastermind-root';
  rootContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;

  // Append to body
  document.body.appendChild(rootContainer);

  // Render React app
  const root = createRoot(rootContainer);
  root.render(<ContentApp />);

  console.log('AI Mastermind content script initialized');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}
