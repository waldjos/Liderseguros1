'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const SPRITE_URL = '/api/channel-logo-sprite.js?v=4';
  const STYLE_ID = 'networkLogoSpriteV3Styles';
  const RENDERER = 'webp-background-v3';
  const MARKER_SELECTOR = '.network-agency-map-icon[title], .leaflet-marker-icon[title]';

  let agenciesById = new Map();
  let agenciesByName = new Map();
  let patchQueued = false;
  let spritePromise = null;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function hasSprite(agency) {
    return Boolean(
      agency?.logoSprite
      && /^\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(String(agency.logoPosition || '').trim())
    );
  }

  function initials(agency) {
    const configured = String(agency?.logoText || '').trim();
    if (configured) return configured.slice(0, 4).toUpperCase();

    return String(agency?.name || 'CANAL')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  function loadSprite() {
    if (spritePromise) return spritePromise;

    spritePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar el sprite oficial de logos.'));
      image.src = SPRITE_URL;
    });

    return spritePromise;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .logo-sprite-v3-frame {
        position: relative !important;
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        border-radius: inherit !important;
        background-color: #fff !important;
        background-image: var(--official-logo-sprite, none) !important;
        background-repeat: no-repeat !important;
        background-size: 1000% 1000% !important;
        background-position: var(--official-logo-position, 0% 0%) !important;
      }

      .logo-sprite-v3-frame > .official-logo-fallback {
        position: absolute !important;
        inset: 0 !important;
        z-index: 1 !important;
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        padding: .18rem !important;
        color: #0b2e7a !important;
        background: linear-gradient(145deg, #fff, #eef3fb) !important;
        font-size: .62rem !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-align: center !important;
      }

      .logo-sprite-v3-frame.is-loaded > .official-logo-fallback {
        display: none !important;
      }

      .logo-sprite-v3-frame.is-error > .official-logo-fallback {
        display: grid !important;
      }

      .agency-logo.has-official-logo {
        background: #fff !important;
      }

      .network-agency-map-logo .logo-sprite-v3-frame > .official-logo-fallback {
        font-size: .42rem !important;
      }

      .network-logo-viewer-image .logo-sprite-v3-frame > .official-logo-fallback {
        font-size: 1.35rem !important;
      }
    `;
    document.head.appendChild(style);
  }

  function createSpriteVisual(agency) {
    if (!hasSprite(agency)) return null;

    const frame = document.createElement('span');
    frame.className = 'official-logo-frame logo-sprite-v3-frame';
    frame.dataset.logoRenderer = RENDERER;
    frame.dataset.logoAgencyId = agency.id;
    frame.style.setProperty('--official-logo-position', String(agency.logoPosition).trim());
    frame.style.setProperty('--official-logo-sprite', `url("${SPRITE_URL}")`);

    const fallback = document.createElement('span');
    fallback.className = 'official-logo-fallback';
    fallback.textContent = initials(agency);
    fallback.setAttribute('aria-hidden', 'true');
    frame.appendChild(fallback);

    loadSprite()
      .then(() => frame.classList.add('is-loaded'))
      .catch(() => frame.classList.add('is-error'));

    return frame;
  }

  function patchCard(card) {
    const agency = agenciesById.get(card.dataset.agencyId);
    if (!hasSprite(agency)) return;

    let logo = card.querySelector('.agency-logo');
    if (!logo) return;
    if (logo.dataset.logoRenderer === RENDERER) return;

    if (logo.tagName !== 'BUTTON') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = logo.className;
      button.style.cssText = logo.style.cssText;
      logo.replaceWith(button);
      logo = button;
    }

    const visual = createSpriteVisual(agency);
    if (!visual) return;

    logo.replaceChildren(visual);
    logo.classList.add('has-official-logo');
    logo.setAttribute('aria-label', `Ver logo ampliado de ${agency.name}`);
    logo.setAttribute('title', `Ver logo de ${agency.name} en grande`);
    logo.dataset.viewOfficialLogo = agency.id;
    logo.dataset.logoRenderer = RENDERER;
    logo.dataset.officialLogoVersion = 'image-v1';

    const zoom = document.createElement('span');
    zoom.className = 'agency-logo-zoom';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';
    logo.appendChild(zoom);

    card.dataset.officialLogoApplied = 'true';
    card.dataset.logoRenderer = RENDERER;
  }

  function patchMarker(marker) {
    const agency = agenciesByName.get(normalize(marker.getAttribute('title')));
    if (!hasSprite(agency)) return;
    if (marker.dataset.logoRenderer === RENDERER) return;

    const pin = marker.querySelector('.network-agency-map-pin');
    if (!pin) return;

    const visual = createSpriteVisual(agency);
    if (!visual) return;

    const logo = document.createElement('span');
    logo.className = 'network-agency-map-logo';
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', `Logo de ${agency.name}`);
    logo.setAttribute('title', agency.name);
    logo.appendChild(visual);

    pin.replaceChildren(logo);
    pin.classList.add('has-official-logo');
    marker.dataset.officialLogoApplied = 'true';
    marker.dataset.officialLogoVersion = 'image-v1';
    marker.dataset.logoRenderer = RENDERER;
  }

  function patchViewer() {
    const viewer = document.getElementById('networkLogoViewer');
    if (!viewer || viewer.hidden) return;

    const name = viewer.querySelector('#networkLogoViewerName')?.textContent;
    const agency = agenciesByName.get(normalize(name));
    const host = viewer.querySelector('[data-logo-viewer-image]');
    if (!host || !hasSprite(agency)) return;
    if (host.dataset.logoAgencyId === agency.id && host.dataset.logoRenderer === RENDERER) return;

    const visual = createSpriteVisual(agency);
    if (!visual) return;

    host.replaceChildren(visual);
    host.dataset.logoRenderer = RENDERER;
    host.dataset.logoAgencyId = agency.id;
  }

  function patchVisibleLogos() {
    patchQueued = false;
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
    document.querySelectorAll(MARKER_SELECTOR).forEach(patchMarker);
    patchViewer();
  }

  function schedulePatch() {
    if (patchQueued) return;
    patchQueued = true;
    window.requestAnimationFrame(patchVisibleLogos);
  }

  function observeChanges() {
    if (!document.body || document.body.dataset.logoSpriteV3Observer === 'true') return;
    document.body.dataset.logoSpriteV3Observer = 'true';
    new MutationObserver(schedulePatch).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'title']
    });
  }

  async function loadAgencies() {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status}).`);

    const payload = await response.json();
    const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
    agenciesById = new Map(agencies.map((agency) => [agency.id, agency]));
    agenciesByName = new Map(agencies.map((agency) => [normalize(agency.name), agency]));
  }

  async function initialize() {
    ensureStyles();
    observeChanges();

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-view-official-logo]')) return;
      window.setTimeout(schedulePatch, 0);
      window.setTimeout(schedulePatch, 60);
    }, true);

    try {
      await Promise.all([loadAgencies(), loadSprite().catch(() => null)]);
      schedulePatch();
      [120, 350, 800, 1600, 3000].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudieron renderizar los logos oficiales:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
