'use strict';

const sharp = require('sharp');
const crypto = require('crypto');
const parts = [
  require('../channel-logo-hd-parts/part-0'),
  require('../channel-logo-hd-parts/part-1')
];

const SPRITE = Buffer.from(parts.join(''), 'base64');
const GRID_SIZE = 10;
const CELL_SIZE = 120;
const OUTPUT_SIZE = 360;
const CACHE = new Map();

function boundedInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(GRID_SIZE - 1, Math.max(0, parsed));
}

async function renderCell(column, row) {
  const key = `${column}:${row}`;
  if (CACHE.has(key)) return CACHE.get(key);

  const task = (async () => {
    const extracted = sharp(SPRITE, { failOn: 'error' })
      .extract({
        left: column * CELL_SIZE,
        top: row * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE
      });

    const png = await extracted
      .clone()
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        kernel: sharp.kernel.lanczos3
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    const { data, info } = await extracted
      .clone()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let nonWhitePixels = 0;
    let opaquePixels = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      if (alpha > 24) opaquePixels += 1;
      if (alpha > 24 && (red < 242 || green < 242 || blue < 242)) nonWhitePixels += 1;
    }

    return {
      png,
      width: info.width,
      height: info.height,
      channels: info.channels,
      opaquePixels,
      nonWhitePixels,
      coverage: Number((nonWhitePixels / (info.width * info.height)).toFixed(4)),
      sha256: crypto.createHash('sha256').update(png).digest('hex')
    };
  })();

  CACHE.set(key, task);
  try {
    return await task;
  } catch (error) {
    CACHE.delete(key);
    throw error;
  }
}

module.exports = async function handler(request, response) {
  const column = boundedInteger(request.query?.col);
  const row = boundedInteger(request.query?.row);

  try {
    const result = await renderCell(column, row);

    if (String(request.query?.meta || '') === '1') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({
        renderer: 'sharp-server-crop-v1',
        column,
        row,
        sourceCell: `${CELL_SIZE}x${CELL_SIZE}`,
        output: `${OUTPUT_SIZE}x${OUTPUT_SIZE}`,
        bytes: result.png.length,
        coverage: result.coverage,
        nonWhitePixels: result.nonWhitePixels,
        opaquePixels: result.opaquePixels,
        sha256: result.sha256
      });
      return;
    }

    if (String(request.query?.json || '') === '1') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({
        column,
        row,
        mimeType: 'image/png',
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE,
        coverage: result.coverage,
        sha256: result.sha256,
        base64: result.png.toString('base64')
      });
      return;
    }

    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Content-Length', String(result.png.length));
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('ETag', `"${result.sha256}"`);
    response.status(200).end(result.png);
  } catch (error) {
    console.error('No se pudo recortar el logo solicitado:', error);
    response.setHeader('Cache-Control', 'no-store');
    response.status(500).json({ error: 'No se pudo generar el logo solicitado.' });
  }
};
