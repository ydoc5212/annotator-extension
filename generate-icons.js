// Simple script to create placeholder PNG icons
// Since we can't easily generate PNGs in Node without dependencies,
// we'll create a data URI that Chrome can use

const fs = require('fs');

// Create a simple 1x1 pixel PNG in base64
const createSimplePNG = (size) => {
  // This is a base64-encoded 1x1 blue pixel PNG
  // In production, you'd want proper icons
  const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(pixel, 'base64');
};

['16', '48', '128'].forEach(size => {
  fs.writeFileSync(`dist/icons/icon${size}.png`, createSimplePNG(size));
});

console.log('Generated placeholder PNG icons');
