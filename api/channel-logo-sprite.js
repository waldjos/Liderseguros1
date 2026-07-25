'use strict';

const crypto = require('crypto');
const parts = [
  require('../channel-logo-parts/part-0'),
  require('../channel-logo-parts/part-1'),
  require('../channel-logo-parts/part-2'),
  require('../channel-logo-parts/part-3')
];

const sprite = Buffer.from(parts.join(''), 'base64');
const spriteHash = crypto.createHash('sha256').update(sprite).digest('hex');

module.exports = function handler(request, response) {
  if (String(request.query?.meta || '') === '1') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({
      contentType: 'image/webp',
      bytes: sprite.length,
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
  response.status(200).end(sprite);
};
