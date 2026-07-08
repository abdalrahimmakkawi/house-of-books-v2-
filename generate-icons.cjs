// Generate PWA icons for House of Books
const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Dark background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, size, size);
  
  // Gold book emoji in center
  ctx.fillStyle = '#c9a84c';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📚', size / 2, size / 2);
  
  // Add subtle border
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  
  return canvas;
}

// Generate 192x192 icon
const icon192 = createIcon(192);
const buffer192 = icon192.toBuffer('image/png');
fs.writeFileSync('public/icon-192.png', buffer192);

// Generate 512x512 icon
const icon512 = createIcon(512);
const buffer512 = icon512.toBuffer('image/png');
fs.writeFileSync('public/icon-512.png', buffer512);

console.log('✅ PWA icons generated: icon-192.png and icon-512.png');
