const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#fb6b6a"/>
  <!-- Stylized Modern Bold Studio E -->
  <path d="M 18 16 H 46 V 23 H 26 V 28 H 42 V 35 H 26 V 41 H 46 V 48 H 18 Z" fill="#ffffff"/>
  <circle cx="48" cy="18" r="4.5" fill="#ffffff" opacity="0.95"/>
</svg>`;

async function generate() {
  const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  const p192 = await sharp(Buffer.from(svg)).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicIconsDir, 'icon-192.png'), p192);

  const p512 = await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicIconsDir, 'icon-512.png'), p512);

  const p48 = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();
  const p32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  const p16 = await sharp(Buffer.from(svg)).resize(16, 16).png().toBuffer();

  // Multi-resolution ICO with 16x16, 32x32, 48x48
  const images = [
    { size: 16, buffer: p16 },
    { size: 32, buffer: p32 },
    { size: 48, buffer: p48 }
  ];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(images.length, 4); // 3 frames

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size, 0); // Width
    entry.writeUInt8(img.size, 1); // Height
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  const ico = Buffer.concat([header, ...entries, ...images.map(i => i.buffer)]);

  // Write ICO and SVG to app and public
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'favicon.ico'), ico);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), ico);
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'icon.svg'), svg);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), svg);

  console.log('✓ Edito brand icons & favicon generated successfully!');
}

generate().catch(console.error);

