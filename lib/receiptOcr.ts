// OCR nota DI PERANGKAT (browser) dengan Tesseract.js. Foto tidak dikirim ke server mana pun.
// Aset (worker, inti WASM, data bahasa) disajikan dari domain sendiri di /tesseract (lihat scripts/copy-tesseract.js).
// Hanya boleh dipanggil dari browser.
import { normalizeReceipt, type NormalizedReceipt } from './receiptCore';
import { parseReceiptText } from './receiptText';

const OCR_WIDTH = 1600;

// Skala abu-abu + regangan kontras: meningkatkan akurasi OCR pada struk thermal yang pudar. Mengembalikan canvas.
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = bmp.width < OCR_WIDTH ? Math.min(2, OCR_WIDTH / bmp.width) : Math.min(1, OCR_WIDTH / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface OcrResult extends NormalizedReceipt { text: string }

export async function readReceiptOnDevice(
  file: Blob,
  categories: string[],
  onProgress?: (percent: number, stage: 'download' | 'read') => void,
): Promise<OcrResult> {
  const canvas = await prepare(file);
  const { createWorker } = await import('tesseract.js');
  let stage: 'download' | 'read' = 'download';
  const worker = await createWorker(['ind', 'eng'], 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
    langPath: '/tesseract/lang',
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') stage = 'read';
      onProgress?.(Math.round((m.progress ?? 0) * 100), stage);
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    const text = data.text ?? '';
    const norm = normalizeReceipt(parseReceiptText(text), { categories, allowMissingTotal: true });
    return { ...norm, text };
  } finally {
    await worker.terminate();
  }
}
