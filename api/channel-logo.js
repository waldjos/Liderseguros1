'use strict';

const parts = [
  require('../channel-logo-parts-v6/part-00'),
  require('../channel-logo-parts-v6/part-01'),
  require('../channel-logo-parts-v6/part-02'),
  require('../channel-logo-parts-v6/part-03'),
  require('../channel-logo-parts-v6/part-04')
];

const SPRITE_BASE64 = parts.join('');
const GRID_SIZE = 10;
const CELL_SIZE = 80;
const OUTPUT_SIZE = 240;
const SPRITE_SIZE = GRID_SIZE * CELL_SIZE;

function boundedInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(GRID_SIZE - 1, Math.max(0, parsed));
}

module.exports = function handler(request, response) {
  const column = boundedInteger(request.query?.col);
  const row = boundedInteger(request.query?.row);
  const offsetX = column * CELL_SIZE;
  const offsetY = row * CELL_SIZE;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="0 0 ${CELL_SIZE} ${CELL_SIZE}" role="img">
  <rect width="${CELL_SIZE}" height="${CELL_SIZE}" rx="8" fill="#ffffff"/>
  <image href="data:image/webp;base64,${SPRITE_BASE64}" x="-${offsetX}" y="-${offsetY}" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}" preserveAspectRatio="none"/>
</svg>`;

  response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(200).send(svg);
};
