// Menyalin aset OCR (Tesseract) ke public/tesseract agar disajikan dari domain sendiri (CSP ketat, tanpa CDN pihak ketiga).
// Dijalankan otomatis saat `npm install` (postinstall). Hasilnya tidak di-commit (public/tesseract ada di .gitignore).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'tesseract');
const nm = (p) => path.join(root, 'node_modules', p);

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

try {
  copy(nm('tesseract.js/dist/worker.min.js'), path.join(out, 'worker.min.js'));
  for (const f of ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) copy(nm(`tesseract.js-core/${f}`), path.join(out, 'core', f));
  for (const l of ['eng', 'ind']) copy(nm(`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`), path.join(out, 'lang', `${l}.traineddata.gz`));
  console.log('[tesseract] aset OCR disalin ke public/tesseract');
} catch (e) {
  // Paket opsional belum terpasang: fitur OCR di perangkat saja yang tidak tersedia; jangan menggagalkan instalasi.
  console.warn('[tesseract] dilewati:', e.message);
}
