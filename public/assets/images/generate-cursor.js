const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas for the cursor
const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

// Clear the canvas
ctx.clearRect(0, 0, 32, 32);

// Draw a hand pointer emoji-like cursor
// Draw the hand shape
ctx.fillStyle = '#FFFFFF';
ctx.beginPath();
// Thumb
ctx.moveTo(8, 20);
ctx.lineTo(8, 15);
ctx.lineTo(12, 15);
ctx.lineTo(12, 20);
// Index finger (pointing)
ctx.lineTo(16, 8);
ctx.lineTo(20, 8);
ctx.lineTo(16, 22);
// Rest of the hand
ctx.lineTo(12, 24);
ctx.lineTo(8, 24);
ctx.closePath();
ctx.fill();

// Add black outline
ctx.strokeStyle = '#000000';
ctx.lineWidth = 1.5;
ctx.stroke();

// Convert to PNG buffer
const buffer = canvas.toBuffer('image/png');

// Save to file
fs.writeFileSync('poke-cursor.png', buffer);

console.log('Poke cursor image generated successfully!'); 