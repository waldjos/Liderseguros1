const fs = require('fs');
const path = require('path');

const HERO_MARKUP = `
      <section class="hero-panel hero-panel-premium">
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">Portal del asegurado</p>
            <h1>
              <span class="hero-title-primary">Protección</span>
              <span class="hero-title-accent">que te acompaña</span>
            </h1>
            <span class="hero-divider" aria-hidden="true"></span>
            <p class="hero-description">La Asociación Cooperativa Líder de Seguros para Vehículos, R.L. es una entidad autorizada y regulada por la SUDEASEG en Venezuela para emitir pólizas de Responsabilidad Civil de Vehículos (RCV).</p>
            <div class="hero-trust"><i class="fa-solid fa-shield-halved"></i><span>Autorizada por SUDEASEG</span></div>
            <div class="hero-actions">
              <a class="button button-primary" href="https://wa.me/message/L5WYMYGWUOIQK1" id="btn-cotizar">
                <span class="hero-action-icon"><i class="fa-solid fa-calculator"></i></span>
                <span>Cotiza</span>
                <span class="button-icon-circle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </a>
              <a class="button button-secondary" id="btn-reportar-siniestro" href="https://wa.me/message/VASHLSML6T7AO1">
                <span class="hero-action-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
                <span>Siniestro</span>
                <span class="button-icon-circle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </a>
            </div>
          </div>
          <div class="hero-figure">
            <span class="hero-shield" aria-hidden="true"></span>
            <img src="assets/imagenprincipal.png" alt="Familia protegida junto a su vehículo" class="hero-photo" />
            <span class="hero-ribbon" aria-hidden="true"></span>
          </div>
        </div>
        <div class="hero-benefits" aria-label="Beneficios de Líder de Seguros">
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-shield-halved"></i></span><span>Respaldo y<br />confianza</span></div>
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-user-check"></i></span><span>Atención ágil<br />y humana</span></div>
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-map-location-dot"></i></span><span>Cobertura en<br />todo el país</span></div>
        </div>
      </section>`;

function injectHeadAssets(html) {
  let result = html;

  if (!result.includes('hero-modern.css')) {
    result = result.replace(
      '<link rel="stylesheet" href="style.css" />',
      '<link rel="stylesheet" href="style.css" />\n  <link rel="stylesheet" href="hero-modern.css" />'
    );
  }

  if (!result.includes('assets/app-icon-192.png')) {
    result = result.replace(
      '<link rel="manifest" href="manifest.webmanifest" />',
      '<link rel="manifest" href="manifest.webmanifest" />\n  <link rel="icon" type="image/png" sizes="192x192" href="assets/app-icon-192.png" />\n  <link rel="apple-touch-icon" sizes="192x192" href="assets/app-icon-192.png" />'
    );
  }

  return result;
}

module.exports = function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = injectHeadAssets(html);

    const heroPattern = /\s*<section class="hero-panel">[\s\S]*?<\/section>/;
    if (!heroPattern.test(html)) {
      throw new Error('No se encontró el bloque hero original.');
    }

    html = html.replace(heroPattern, `\n${HERO_MARKUP}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('No se pudo renderizar la portada:', error);
    res.status(500).send('No se pudo cargar el portal.');
  }
};
