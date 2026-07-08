// Simple icon generator without canvas dependency
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = './public/icons';

// Create directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create a simple SVG icon that we'll convert to different sizes
const svgTemplate = `
<svg width="SIZE" height="SIZE" viewBox="0 0 SIZE SIZE" xmlns="http://www.w3.org/2000/svg">
  <rect width="SIZE" height="SIZE" rx="SIZE * 0.18" fill="#06050a"/>
  <rect x="SIZE * 0.05" y="SIZE * 0.05" width="SIZE * 0.9" height="SIZE * 0.9" rx="SIZE * 0.14" 
        fill="none" stroke="#c9a84c" stroke-width="SIZE * 0.04"/>
  <text x="SIZE/2" y="SIZE/2 + SIZE * 0.03" 
        font-family="serif" font-size="SIZE * 0.52" 
        text-anchor="middle" dominant-baseline="middle" fill="#c9a84c">📚</text>
</svg>
`;

// Generate SVG files for each size
for (const size of SIZES) {
  const svg = svgTemplate.replace(/SIZE/g, size);
  const filePath = path.join(OUTPUT_DIR, `icon-${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ icon-${size}.svg`);
}

// Also create a simple PNG placeholder using a base64 encoded 1x1 pixel
const pngPlaceholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

for (const size of SIZES) {
  const filePath = path.join(OUTPUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngPlaceholder);
  console.log(`✓ icon-${size}.png (placeholder)`);
}

console.log('\n✅ Done! Icons saved to public/icons/');
console.log('Note: PNG files are placeholders. For production, replace with actual PNG icons.');
