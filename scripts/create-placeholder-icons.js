/**
 * Quick script to create placeholder icons for development
 * Run with: node scripts/create-placeholder-icons.js
 *
 * Note: This creates simple colored squares as placeholders.
 * Replace with proper icons before production!
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
try {
  mkdirSync(iconsDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

const sizes = [16, 32, 48, 128];

// Create simple SVG placeholders
sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0369a1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.5}" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="central">AI</text>
</svg>`;

  writeFileSync(join(iconsDir, `icon${size}.svg`), svg);
  console.log(`✓ Created icon${size}.svg`);
});

console.log('\n✨ Placeholder icons created successfully!');
console.log('📝 Note: These are development placeholders. Replace with proper PNG icons for production.\n');
