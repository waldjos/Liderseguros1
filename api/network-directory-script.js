const fs = require('fs');
const path = require('path');

module.exports = (request, response) => {
  try {
    const baseScript = fs.readFileSync(path.join(process.cwd(), 'network-directory.js'), 'utf8');
    const enhancement = fs.readFileSync(path.join(process.cwd(), 'network-map-enhancement.js'), 'utf8');
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    response.status(200).send(`${baseScript}\n${enhancement}`);
  } catch (error) {
    console.error('No se pudo generar el directorio interactivo:', error);
    response.status(500).send("console.error('No se pudo cargar el mapa interactivo.');");
  }
};
