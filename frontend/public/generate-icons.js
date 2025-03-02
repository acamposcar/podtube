const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a canvas for our icon
function createIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Fill background with red (YouTube color)
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw a simple headphone icon in white
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size / 16;
    ctx.lineCap = 'round';

    // Headphone band
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 3, Math.PI, 0);
    ctx.stroke();

    // Left earpiece
    ctx.beginPath();
    ctx.arc(size / 3, size / 1.8, size / 8, 0, Math.PI * 2);
    ctx.stroke();

    // Right earpiece
    ctx.beginPath();
    ctx.arc(size / 1.5, size / 1.8, size / 8, 0, Math.PI * 2);
    ctx.stroke();

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, filename), buffer);
    console.log(`Created ${filename}`);
}

// Create a screenshot for PWA
function createScreenshot(width, height, filename) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw header
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, width, height * 0.15);

    // Draw logo
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(width / 2, height / 3, width / 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw some content boxes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width * 0.1, height * 0.5, width * 0.8, height * 0.1);
    ctx.fillRect(width * 0.1, height * 0.65, width * 0.8, height * 0.1);
    ctx.fillRect(width * 0.1, height * 0.8, width * 0.8, height * 0.1);

    // Add border to boxes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.1, height * 0.5, width * 0.8, height * 0.1);
    ctx.strokeRect(width * 0.1, height * 0.65, width * 0.8, height * 0.1);
    ctx.strokeRect(width * 0.1, height * 0.8, width * 0.8, height * 0.1);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, filename), buffer);
    console.log(`Created ${filename}`);
}

// Create icons
createIcon(192, 'android-chrome-192x192.png');
createIcon(512, 'android-chrome-512x512.png');
createIcon(180, 'apple-touch-icon.png');
createIcon(32, 'favicon-32x32.png');
createIcon(16, 'favicon-16x16.png');

// Create screenshots
createScreenshot(1280, 800, 'screenshots/desktop.png');
createScreenshot(414, 896, 'screenshots/mobile.png');

console.log('All icons and screenshots generated successfully!'); 