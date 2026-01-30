import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from './PopupApp';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<PopupApp />);
}
