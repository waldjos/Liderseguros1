'use strict';

const crypto = require('crypto');
const zlib = require('zlib');
const spriteParts = [
  require('../channel-logo-parts-v6/part-00'),
  require('../channel-logo-parts-v6/part-01'),
  require('../channel-logo-parts-v6/part-02'),
  require('../channel-logo-parts-v6/part-03'),
  require('../channel-logo-parts-v6/part-04')
];
const dataParts = [
  require('../channel-data-parts/part-0'),
  require('../channel-data-parts/part-1')
];

const EXPECTED_BYTES = 45200;
const EXPECTED_SHA256 = '3cf783556d925cac630a6ef2c2308e01358da6f94c6362662ef8eae1fa0c1d6e';
const EXPECTED_LOGOS = 95;
const GRID_LAST_INDEX = 9;
const POSITION_STEP = 100 / GRID_LAST_INDEX;

function spriteCell(agency) {
  const match = String(agency?.logoPosition || '').trim().match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!agency?.logoSprite || !match) return null;
  const column = Math.round(Number(match[1]) / POSITION_STEP);
  const row = Math.round(Number(match[2]) / POSITION_STEP);
  if (!Number.isFinite(column) || !Number.isFinite(row)) return null;
  if (column < 0 || column > GRID_LAST_INDEX || row < 0 || row > GRID_LAST_INDEX) return null;
  return { column, row, key: `${column}:${row}` };
}

module.exports = function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  try {
    const sprite = Buffer.from(spriteParts.join(''), 'base64');
    const sha256 = crypto.createHash('sha256').update(sprite).digest('hex');
    const declaredRiffBytes = sprite.length >= 8 ? sprite.readUInt32LE(4) + 8 : 0;
    const riff = sprite.subarray(0, 4).toString('ascii');
    const webp = sprite.subarray(8, 12).toString('ascii');
    const spriteIntegrity = sprite.length === EXPECTED_BYTES
      && sha256 === EXPECTED_SHA256
      && declaredRiffBytes === sprite.length
      && riff === 'RIFF'
      && webp === 'WEBP';

    const compressedData = Buffer.from(dataParts.join(''), 'base64');
    const payload = JSON.parse(zlib.brotliDecompressSync(compressedData).toString('utf8'));
    const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
    const assigned = [];
    const invalid = [];
    const occupied = new Map();

    agencies.forEach((agency) => {
      if (!agency?.logoSprite) return;
      const cell = spriteCell(agency);
      if (!cell) {
        invalid.push({ id: agency?.id, name: agency?.name, logoPosition: agency?.logoPosition });
        return;
      }
      assigned.push({ id: agency.id, name: agency.name, ...cell });
      const values = occupied.get(cell.key) || [];
      values.push({ id: agency.id, name: agency.name });
      occupied.set(cell.key, values);
    });

    const duplicates = [...occupied.entries()]
      .filter(([, values]) => values.length > 1)
      .map(([cell, values]) => ({ cell, agencies: values }));
    const referencesBlankCell = assigned.filter(({ row, column }) => row === 9 && column >= 5);
    const mappingIntegrity = assigned.length === EXPECTED_LOGOS
      && occupied.size === EXPECTED_LOGOS
      && invalid.length === 0
      && duplicates.length === 0
      && referencesBlankCell.length === 0;
    const healthy = spriteIntegrity && mappingIntegrity;

    response.status(healthy ? 200 : 503).json({
      healthy,
      renderer: 'verified-webp-background-v6',
      sprite: {
        integrityOk: spriteIntegrity,
        bytes: sprite.length,
        expectedBytes: EXPECTED_BYTES,
        sha256,
        expectedSha256: EXPECTED_SHA256,
        declaredRiffBytes,
        riff,
        webp,
        width: 800,
        height: 800,
        cell: '80x80'
      },
      mapping: {
        integrityOk: mappingIntegrity,
        totalAgencies: agencies.length,
        assignedLogos: assigned.length,
        expectedLogos: EXPECTED_LOGOS,
        uniqueCells: occupied.size,
        invalid,
        duplicates,
        referencesBlankCell,
        sample: assigned.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('No se pudo validar el sistema de logos:', error);
    response.status(503).json({
      healthy: false,
      error: 'No se pudo validar el sprite o la asignación de logos.'
    });
  }
};
