const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const root = process.cwd();
    const directoryScript = fs.readFileSync(path.join(root, 'network-directory.js'), 'utf8');
    const workerScript = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/agencies-demo.json'), 'utf8'));

    // Compilation-only syntax checks. The functions are not executed here.
    new Function(directoryScript);
    new Function(workerScript);

    if (!Array.isArray(data.agencies) || data.agencies.length < 5) {
      throw new Error('El archivo de agencias no contiene suficientes registros de prueba.');
    }

    const ids = new Set();
    for (const agency of data.agencies) {
      if (!agency.id || ids.has(agency.id)) throw new Error(`ID inválido o duplicado: ${agency.id || 'vacío'}`);
      if (!agency.name || !agency.state || !agency.category) throw new Error(`Registro incompleto: ${agency.id}`);
      if (!Number.isFinite(Number(agency.latitude)) || !Number.isFinite(Number(agency.longitude))) {
        throw new Error(`Coordenadas inválidas: ${agency.id}`);
      }
      ids.add(agency.id);
    }

    const pageHandler = require('./page.js');
    let statusCode = 200;
    let html = '';
    const mockResponse = {
      setHeader() {},
      status(code) { statusCode = code; return this; },
      send(value) { html = String(value); return this; }
    };
    pageHandler({}, mockResponse);

    const requiredMarkers = [
      'id="btn-red-atencion"',
      'id="menuBtnRedAtencion"',
      'id="modal-red-atencion"',
      'id="networkMapHotspots"',
      'id="networkResults"',
      'network-directory.css',
      'network-directory.js'
    ];
    if (statusCode !== 200) throw new Error(`La portada renderizada respondió con estado ${statusCode}.`);
    for (const marker of requiredMarkers) {
      if (!html.includes(marker)) throw new Error(`Falta el marcador renderizado: ${marker}`);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      agencies: data.agencies.length,
      statesWithDemoData: [...new Set(data.agencies.map((agency) => agency.state))].length,
      modalInserted: html.includes('id="modal-red-atencion"'),
      scriptsValid: true,
      dataValid: true
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: error.message });
  }
};
