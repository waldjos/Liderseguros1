const fs = require('fs');
const path = require('path');

module.exports = (request, response) => {
  try {
    const officialPreload = fs.readFileSync(path.join(process.cwd(), 'network-official-preload.js'), 'utf8');
    const baseScript = fs.readFileSync(path.join(process.cwd(), 'network-directory.js'), 'utf8');
    const enhancement = fs.readFileSync(path.join(process.cwd(), 'network-map-enhancement.js'), 'utf8');
    const heroNetworkCta = fs.readFileSync(path.join(process.cwd(), 'hero-network-cta.js'), 'utf8');
    const verificationGuide = fs.readFileSync(path.join(process.cwd(), 'hero-verification-guide.js'), 'utf8');
    const finalHeroCentering = fs.readFileSync(path.join(process.cwd(), 'hero-final-centering.js'), 'utf8');
    const officialPatch = fs.readFileSync(path.join(process.cwd(), 'network-official-patch.js'), 'utf8');
    const logoPatch = fs.readFileSync(path.join(process.cwd(), 'network-logo-patch.js'), 'utf8');
    const logoPatchV2 = fs.readFileSync(path.join(process.cwd(), 'network-logo-v2.js'), 'utf8');
    const deepLink = fs.readFileSync(path.join(process.cwd(), 'network-deeplink.js'), 'utf8');

    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    response.status(200).send(`${officialPreload}\n${baseScript}\n${enhancement}\n${heroNetworkCta}\n${verificationGuide}\n${finalHeroCentering}\n${officialPatch}\n${logoPatch}\n${logoPatchV2}\n${deepLink}`);
  } catch (error) {
    console.error('No se pudo generar el directorio interactivo:', error);
    response.status(500).send("console.error('No se pudo cargar el mapa interactivo.');");
  }
};
