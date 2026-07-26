'use strict';

const crypto = require('crypto');
const parts = [
  require('../channel-logo-parts-v6/part-00'),
  require('../channel-logo-parts-v6/part-01'),
  require('../channel-logo-parts-v6/part-02'),
  require('../channel-logo-parts-v6/part-03'),
  require('../channel-logo-parts-v6/part-04')
];

const EXPECTED_BYTES = 45200;
const EXPECTED_SHA256 = '222f30a3dc1fe6f7af27d3cb0e2b60adfe22a0e732040fa45e8b138b9c6d8c42';
const sprite = Buffer.from(parts.join(''), 'base64');
const spriteHash = crypto.createHash('sha256').update(sprite).digest('hex');
const declaredRiffBytes = sprite.length >= 8 ? sprite.readUInt32LE(4) + 8 : 0;
const riff = sprite.subarray(0, 4).toString('ascii');
const webp = sprite.subarray(8, 12).toString('ascii');
const integrityOk = sprite.length === EXPECTED_BYTES
  && spriteHash === EXPECTED_SHA256
  && declaredRiffBytes === sprite.length
  && riff === 'RIFF'
  && webp === 'WEBP';

module.exports = function handler(request, response) {
  if (String(request.query?.meta || '') === '1') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(integrityOk ? 200 : 500).json({
      renderer: 'verified-webp-sprite-v6',
      contentType: 'image/webp',
      width: 800,
      height: 800,
      grid: '10x10',
      cell: '80x80',
      populatedCells: 95,
      bytes: sprite.length,
      expectedBytes: EXPECTED_BYTES,
      sha256: spriteHash,
      expectedSha256: EXPECTED_SHA256,
      declaredRiffBytes,
      headerMatchesLength: declaredRiffBytes === sprite.length,
      expectedHashMatches: spriteHash === EXPECTED_SHA256,
      riff,
      webp,
      integrityOk
    });
    return;
  }

  if (!integrityOk) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(500).json({ error: 'El sprite de logos no superó la validación de integridad.' });
    return;
  }

  response.setHeader('Content-Type', 'image/webp');
  response.setHeader('Content-Length', String(sprite.length));
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('ETag', `"${spriteHash}"`);
  response.status(200).end(sprite);
};
