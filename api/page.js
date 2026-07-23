const fs = require('fs');
const path = require('path');

const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?client=ms-android-samsung-ss&hs=jEt&sca_esv=df665db1217e69dc&sxsrf=APpeQntMvwj1RUVu7Hg4aWixNYnqHo4VRQ:1783555246895&q=opiniones+de+l%C3%ADder+de+seguros+para+veh%C3%ADculos&uds=AJ5uw1-llK3e_HkB1xkFZn_5ajZa9L6WAFFUtzGJg5BjjCabgqJj4HYEZfsoD64tokOXDfazhIYrTwmObDsCW9q2R_mR3UD5LvN361MAxln21TmZGCuO97moSGLtgEzI8ntyH8MR9Vyd_0PsDD7wXBHBfrZVNTRkNohx0tedccpz2X9vUBuOQzGGF1UnABIirb-VLX4hsz8PRa1XCvOPbdW0-EQHwtpg7SjicCshhjSUifa3DqQ9KuVNAX0mofFzAQtuR4UMweN6Gi60wlQgrZQRvGJw5CZrBBhd3tEc0sfjtV3Ta7PBpWpEH-31_16hy-lqPaqKFPYMey5zTPcO7xxL7mEicsoOWe4-JykyTNBIWZvwrVydOiTRCBTQ_3bpRj4KXBXS8eGMYVssjozjJCgIkIngyoc1AAghnyLvPoQHZhTn-jB-3x4XJzhpUunMHYZnKMK1SrnlwtfvrIZNv1gEBKL31ZBVfH4TC0bIqzJaXOypaWhNF9Zz_IaZXHCiy488jE5Z3fg6S1ft5R5n4L3RrnJ_3SZZsA&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-_5YaAIEgh2i5YUeKwsOnog0AmwcH7w3ps8JyR9VphDiUNcN5OzGvq3tANqEU8xe_7T2eGrHgYgDmo9kWkWDdJKYr9JLfXKFMcLQVwgMgYFQG4MxWwMb7dwzhFvNzO-bauX6jL7I%3D&sa=X&ved=2ahUKEwjfq7aHpcSVAxXm4ckDHXQODdgQk8gLegUIgwEQAQ&ictx=1&biw=384&bih=690&dpr=3.75#ebo=4';

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
          <div class="hero-figure hero-figure-caracas">
            <img src="/api/hero-image.js" alt="Familia venezolana junto a su vehículo con El Ávila y Caracas al fondo" class="hero-photo hero-photo-caracas" />
          </div>
        </div>
        <div class="hero-benefits" aria-label="Beneficios de Líder de Seguros">
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-shield-halved"></i></span><span>Respaldo y<br />confianza</span></div>
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-user-check"></i></span><span>Atención ágil<br />y humana</span></div>
          <div class="hero-benefit"><span class="hero-benefit-icon"><i class="fa-solid fa-map-location-dot"></i></span><span>Cobertura en<br />todo el país</span></div>
        </div>
      </section>`;

const CONTACT_MARKUP = `
      <section class="location-review-section" aria-label="Ubicación y reseñas">
        <article class="location-card-modern">
          <span class="location-map-lines" aria-hidden="true"></span>
          <div class="location-topline"><span></span>Estamos cerca de ti</div>
          <div class="location-main">
            <span class="location-pin-large"><i class="fa-solid fa-location-dot"></i></span>
            <div class="location-copy">
              <h2>San Antonio de los Altos</h2>
              <p>Visita nuestra sede y recibe atención personalizada para tus trámites, renovaciones y consultas.</p>
            </div>
          </div>
          <div class="location-actions">
            <a class="location-action location-action-primary" href="https://maps.app.goo.gl/9tPJA7SooyVFCHik6" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-route"></i> Cómo llegar</a>
            <a class="location-action location-action-secondary" href="tel:04242367811"><i class="fa-solid fa-phone"></i> 0424 2367811</a>
          </div>
        </article>

        <article class="review-card-modern">
          <div>
            <div class="review-google-mark">
              <span class="review-google-icon"><i class="fa-brands fa-google"></i></span>
              <span class="review-stars" aria-label="Cinco estrellas decorativas">★★★★★</span>
            </div>
            <h2>Tu experiencia nos ayuda a crecer</h2>
            <p>Cuéntanos cómo fue tu atención. Tu opinión ayuda a otras personas a conocernos y nos permite seguir mejorando.</p>
          </div>
          <div>
            <a class="review-button" href="${GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener noreferrer">
              <span>Dejar una reseña en Google</span>
              <span class="review-button-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </a>
            <span class="review-note"><i class="fa-solid fa-lock"></i> Se abrirá el perfil de Google en una nueva ventana.</span>
          </div>
        </article>
      </section>`;

function injectHeadAssets(html) {
  let result = html;

  if (!result.includes('hero-modern.css')) {
    result = result.replace(
      '<link rel="stylesheet" href="style.css" />',
      '<link rel="stylesheet" href="style.css" />\n  <link rel="stylesheet" href="hero-modern.css" />'
    );
  }

  if (!result.includes('location-reviews.css')) {
    result = result.replace(
      '<link rel="stylesheet" href="hero-modern.css" />',
      '<link rel="stylesheet" href="hero-modern.css" />\n  <link rel="stylesheet" href="location-reviews.css" />'
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

    const contactPattern = /\s*<section class="contact-section">[\s\S]*?<\/section>/;
    if (!contactPattern.test(html)) {
      throw new Error('No se encontró el bloque de ubicación original.');
    }
    html = html.replace(contactPattern, `\n${CONTACT_MARKUP}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('No se pudo renderizar la portada:', error);
    res.status(500).send('No se pudo cargar el portal.');
  }
};