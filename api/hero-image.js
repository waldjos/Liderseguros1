const part0 = require('./hero-image-data/part-0');
const part1 = require('./hero-image-data/part-1');

const image = Buffer.from(part0 + part1, 'base64');

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Length', String(image.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(image);
};
