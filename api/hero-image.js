const crypto = require('crypto');
const part0 = require('./hero-image-data/part-0');
const part1 = require('./hero-image-data/part-1');

const correctedPart1 = part1.replace('Fcy33386D7l', 'Fcy83386D7l');
const image = Buffer.from(part0 + correctedPart1, 'base64');
const imageHash = crypto.createHash('sha256').update(image).digest('hex');
const EXPECTED_LENGTH = 14812;
const EXPECTED_HASH = '34ea6ecd6eee82f6a78e513a0c0fd4b18b8d97f0cfd67967c3bcd30388ab9614';

if (image.length !== EXPECTED_LENGTH || imageHash !== EXPECTED_HASH) {
  throw new Error('El recurso visual del hero no superó la verificación de integridad.');
}

module.exports = function handler(req, res) {
  if (req.query?.meta === '1') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, length: image.length, sha256: imageHash });
    return;
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Length', String(image.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(image);
};
