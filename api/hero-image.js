const crypto = require('crypto');
const part0 = require('./hero-image-data/part-0');
const part1 = require('./hero-image-data/part-1');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const segmentHashes = (value, count = 8) => {
  const size = Math.ceil(value.length / count);
  const result = [];
  for (let index = 0; index < value.length; index += size) result.push(hash(value.slice(index, index + size)));
  return result;
};
const encodedImage = part0 + part1;
const image = Buffer.from(encodedImage, 'base64');
const imageHash = hash(image);

module.exports = function handler(req, res) {
  if (req.query?.raw === '1') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(encodedImage);
    return;
  }

  if (req.query?.meta === '1') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      ok: image.length === 14812 && imageHash === '34ea6ecd6eee82f6a78e513a0c0fd4b18b8d97f0cfd67967c3bcd30388ab9614',
      length: image.length,
      sha256: imageHash,
      encodedLength: encodedImage.length,
      part0Length: part0.length,
      part1Length: part1.length,
      part0Sha256: hash(part0),
      part1Sha256: hash(part1),
      part0Segments: segmentHashes(part0),
      part1Segments: segmentHashes(part1)
    });
    return;
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Length', String(image.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(image);
};
