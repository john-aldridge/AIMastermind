import { createRoot } from 'react-dom/client';
import { SidePanelApp } from './SidePanelApp';
import '@/styles/globals.css';
import '@/styles/sidepanel.css';

// Initialize console capture early (before other code runs)
// This ensures we capture all sidepanel logs
import '@/services/consoleMonitor';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<SidePanelApp />);
}
