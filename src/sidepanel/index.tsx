import { createRoot } from 'react-dom/client';
import { SidePanelApp } from './SidePanelApp';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<SidePanelApp />);
}
