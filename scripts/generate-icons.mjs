/**
 * Gera ícones PNG para o PWA usando apenas canvas nativo do Node.js (via @napi-rs/canvas).
 * Se não tiver a lib, usa fallback de copiar o SVG como PNG (funciona em Chrome/Edge).
 *
 * Uso: node scripts/generate-icons.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/icons');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.18;

  // Fundo arredondado com gradiente
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0,    '#0f172a');
  grad.addColorStop(0.60, '#1e3a5f');
  grad.addColorStop(1,    '#1d4ed8');

  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.arcTo(size, 0, size, radius, radius);
  ctx.lineTo(size, size - radius);
  ctx.arcTo(size, size, size - radius, size, radius);
  ctx.lineTo(radius, size);
  ctx.arcTo(0, size, 0, size - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Casa estilizada
  const cx = size / 2;
  const sc = size / 512;

  ctx.beginPath();
  ctx.moveTo(cx, 110 * sc);
  ctx.lineTo(390 * sc, 230 * sc);
  ctx.lineTo(390 * sc, 400 * sc);
  ctx.lineTo(310 * sc, 400 * sc);
  ctx.lineTo(310 * sc, 310 * sc);
  ctx.lineTo(202 * sc, 310 * sc);
  ctx.lineTo(202 * sc, 400 * sc);
  ctx.lineTo(122 * sc, 400 * sc);
  ctx.lineTo(122 * sc, 230 * sc);
  ctx.closePath();
  ctx.strokeStyle = 'white';
  ctx.lineWidth   = 22 * sc;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // R$ na porta
  ctx.font      = `bold ${72 * sc}px Arial`;
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('R$', cx, 388 * sc);

  return canvas.toBuffer('image/png');
}

try {
  writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192));
  console.log('✅ icon-192.png gerado');

  writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512));
  console.log('✅ icon-512.png gerado');
} catch (e) {
  console.error('❌ Erro ao gerar PNGs:', e.message);
  console.log('💡 Instale: npm install canvas --save-dev');
  console.log('   Ou substitua os arquivos icon-192.png e icon-512.png manualmente.');
}
