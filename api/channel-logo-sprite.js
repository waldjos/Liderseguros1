'use strict';

const crypto = require('crypto');
const parts = [
  require('../channel-logo-hd-parts/part-0'),
  require('../channel-logo-hd-parts/part-1')
];

const sprite = Buffer.from(parts.join(''), 'base64');
const spriteHash = crypto.createHash('sha256').update(sprite).digest('hex');
const declaredRiffBytes = sprite.length >= 8 ? sprite.readUInt32LE(4) + 8 : 0;

module.exports = function handler(request, response) {
  if (String(request.query?.meta || '') === '1') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({
      renderer: 'excel-rebuilt-webp-v1',
      contentType: 'image/webp',
      width: 1200,
      height: 1200,
      grid: '10x10',
      cell: '120x120',
      populatedCells: 95,
      bytes: sprite.length,
      declaredRiffBytes,
      headerMatchesLength: declaredRiffBytes === sprite.length,
      sha256: spriteHash,
      riff: sprite.subarray(0, 4).toString('ascii'),
      webp: sprite.subarray(8, 12).toString('ascii')
    });
    return;
  }

  response.setHeader('Content-Type', 'image/webp');
  response.setHeader('Content-Length', String(sprite.length));
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('ETag', `"${spriteHash}"`);
  response.status(200).end(sprite);
};
