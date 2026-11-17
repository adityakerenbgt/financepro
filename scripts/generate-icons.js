// Membuat ikon PNG PWA dari public/icon.svg:  node scripts/generate-icons.js
const sharp = require('sharp');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const svg = path.join(pub, 'icon.svg');

(async () => {
  for (const size of [192, 512]) {
    await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(pub, `icon-${size}.png`));
  }
  // Maskable: logo 80% di tengah dengan latar penuh agar tidak terpotong oleh bentuk ikon Android.
  const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0f172a' } })
    .composite([{ input: inner, gravity: 'center' }]).png().toFile(path.join(pub, 'icon-maskable-512.png'));
  console.log('Ikon dibuat di public/');
})();
