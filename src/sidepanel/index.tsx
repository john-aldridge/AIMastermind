import { createRoot } from 'react-dom/client';
import { SidePanelApp } from './SidePanelApp';
import '@/styles/globals.css';
import '@/styles/sidepanel.css';

// Disable Monaco workers to prevent CSP violations
(window as any).MonacoEnvironment = {
  getWorker() {
    return null;
  }
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<SidePanelApp />);
}
