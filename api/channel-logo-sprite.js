'use strict';

const parts = [
  require('../channel-logo-parts/part-0'),
  require('../channel-logo-parts/part-1'),
  require('../channel-logo-parts/part-2'),
  require('../channel-logo-parts/part-3')
];

const sprite = Buffer.from(parts.join(''), 'base64');

module.exports = function handler(request, response) {
  response.setHeader('Content-Type', 'image/webp');
  response.setHeader('Content-Length', String(sprite.length));
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(200).end(sprite);
};
