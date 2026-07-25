const zlib = require('zlib');
const part0 = require('../channel-data-parts/part-0');
const part1 = require('../channel-data-parts/part-1');

const compressed = Buffer.from(part0 + part1, 'base64');
const json = zlib.brotliDecompressSync(compressed);
const sha256 = 'f0332f170b405de1665290c206a62001a12c407a225a85311de12d71ea2374a5';

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  if (req.query?.meta === '1') {
    const payload = JSON.parse(json.toString('utf8'));
    res.status(200).json({
      ok: true,
      sha256,
      bytes: json.length,
      summary: payload.summary
    });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', String(json.length));
  res.status(200).send(json);
};
