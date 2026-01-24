/**
 * Script to generate PWA icons
 * Run: npx ts-node scripts/generate-icons.js
 * Or install sharp: npm install sharp --save-dev && node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator for placeholder icons
// Creates a minimal valid PNG with the specified color

function createMinimalPNG(size, bgColor = [10, 10, 10], textColor = [255, 255, 255]) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB
  const compression = 0;
  const filter = 0;
  const interlace = 0;

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(compression, 10);
  ihdrData.writeUInt8(filter, 11);
  ihdrData.writeUInt8(interlace, 12);

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk - create simple solid color image
  const zlib = require('zlib');
  const rawData = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    rawData[rowStart] = 0; // filter byte

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      // Simple "T" letter rendering
      const centerX = width / 2;
      const centerY = height / 2;
      const letterWidth = width * 0.5;
      const letterHeight = height * 0.6;
      const strokeWidth = width * 0.15;

      const inTopBar = y >= centerY - letterHeight/2 &&
                       y <= centerY - letterHeight/2 + strokeWidth &&
                       x >= centerX - letterWidth/2 &&
                       x <= centerX + letterWidth/2;

      const inStem = x >= centerX - strokeWidth/2 &&
                     x <= centerX + strokeWidth/2 &&
                     y >= centerY - letterHeight/2 + strokeWidth &&
                     y <= centerY + letterHeight/2;

      const isLetter = inTopBar || inStem;

      // Green dot in top right
      const dotCenterX = width * 0.74;
      const dotCenterY = height * 0.27;
      const dotRadius = width * 0.08;
      const distToDot = Math.sqrt(Math.pow(x - dotCenterX, 2) + Math.pow(y - dotCenterY, 2));
      const isGreenDot = distToDot <= dotRadius;

      if (isGreenDot) {
        rawData[pixelStart] = 34;     // R (green)
        rawData[pixelStart + 1] = 197; // G
        rawData[pixelStart + 2] = 94;  // B
      } else if (isLetter) {
        rawData[pixelStart] = textColor[0];
        rawData[pixelStart + 1] = textColor[1];
        rawData[pixelStart + 2] = textColor[2];
      } else {
        rawData[pixelStart] = bgColor[0];
        rawData[pixelStart + 1] = bgColor[1];
        rawData[pixelStart + 2] = bgColor[2];
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return crc ^ 0xffffffff;
}

function makeCrcTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

const icon192 = createMinimalPNG(192);
const icon512 = createMinimalPNG(512);

fs.writeFileSync(path.join(publicDir, 'icon-192x192.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), icon512);

// Create a simple favicon.ico (16x16)
const favicon = createMinimalPNG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

console.log('Icons generated successfully!');
console.log('- icon-192x192.png');
console.log('- icon-512x512.png');
console.log('- favicon.ico');
