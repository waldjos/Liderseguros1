'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const SPRITE_URL = '/api/channel-logo-sprite.js?v=3';
  const STYLE_ID = 'networkLogoSpriteV2Styles';
  const GRID_LAST_INDEX = 9;
  const POSITION_STEP = 100 / GRID_LAST_INDEX;
  const MARKER_SELECTOR = '.network-agency-map-icon[title], .leaflet-marker-icon[title]';

  let agenciesById = new Map();
  let agenciesByName = new Map();
  let patchQueued = false;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function spriteCell(agency) {
    const match = String(agency?.logoPosition || '')
      .trim()
      .match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);

    if (!agency?.logoSprite || !match) return null;

    const column = Math.min(
      GRID_LAST_INDEX,
      Math.max(0, Math.round(Number(match[1]) / POSITION_STEP))
    );
    const row = Math.min(
      GRID_LAST_INDEX,
      Math.max(0, Math.round(Number(match[2]) / POSITION_STEP))
    );

    return Number.isFinite(column) && Number.isFinite(row)
      ? { column, row }
      : null;
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

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .logo-sprite-v2-frame {
        position: relative !important;
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        border-radius: inherit !important;
        background: #fff !important;
      }

      .official-logo-sprite-v2-image {
        position: absolute !important;
        display: block !important;
        width: 1000% !important;
        height: 1000% !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        object-fit: fill !important;
        opacity: 0;
        transition: opacity .12s ease;
        pointer-events: none;
        user-select: none;
      }

      .logo-sprite-v2-frame.is-loaded .official-logo-sprite-v2-image {
        opacity: 1 !important;
      }

      .logo-sprite-v2-frame.is-loaded > .official-logo-fallback {
        visibility: hidden !important;
      }

      .logo-sprite-v2-frame.is-error > .official-logo-fallback {
        visibility: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  function createSpriteVisual(agency) {
    const cell = spriteCell(agency);
    if (!cell) return null;

    const frame = document.createElement('span');
    frame.className = 'official-logo-frame logo-sprite-v2-frame';
    frame.dataset.logoRenderer = 'webp-sprite-v2';
    frame.dataset.logoAgencyId = agency.id;

    const fallback = document.createElement('span');
    fallback.className = 'official-logo-fallback';
    fallback.textContent = initials(agency);
    fallback.setAttribute('aria-hidden', 'true');

    const image = new Image();
    image.className = 'official-logo-sprite-v2-image';
    image.alt = `Logo de ${agency.name}`;
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;
    image.style.left = `${cell.column * -100}%`;
    image.style.top = `${cell.row * -100}%`;
    image.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true });
    image.addEventListener('error', () => frame.classList.add('is-error'), { once: true });
    image.src = SPRITE_URL;

    frame.append(fallback, image);
    return frame;
  }

  function patchCard(card) {
    const agency = agenciesById.get(card.dataset.agencyId);
    if (!spriteCell(agency)) return;

    let logo = card.querySelector('.agency-logo');
    if (!logo) return;
    if (logo.dataset.logoRenderer === 'webp-sprite-v2') return;

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
    logo.dataset.logoRenderer = 'webp-sprite-v2';

    // La versión anterior consulta este valor para evitar sobrescribir un logo ya procesado.
    logo.dataset.officialLogoVersion = 'image-v1';

    const zoom = document.createElement('span');
    zoom.className = 'agency-logo-zoom';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';
    logo.appendChild(zoom);

    card.dataset.officialLogoApplied = 'true';
    card.dataset.logoRenderer = 'webp-sprite-v2';
  }

  function patchMarker(marker) {
    const agency = agenciesByName.get(normalize(marker.getAttribute('title')));
    if (!spriteCell(agency)) return;
    if (marker.dataset.logoRenderer === 'webp-sprite-v2') return;

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
    marker.dataset.logoRenderer = 'webp-sprite-v2';
  }

  function patchViewer() {
    const viewer = document.getElementById('networkLogoViewer');
    if (!viewer || viewer.hidden) return;

    const name = viewer.querySelector('#networkLogoViewerName')?.textContent;
    const agency = agenciesByName.get(normalize(name));
    const host = viewer.querySelector('[data-logo-viewer-image]');
    if (!host || !spriteCell(agency)) return;
    if (host.dataset.logoAgencyId === agency.id && host.dataset.logoRenderer === 'webp-sprite-v2') return;

    const visual = createSpriteVisual(agency);
    if (!visual) return;

    host.replaceChildren(visual);
    host.dataset.logoRenderer = 'webp-sprite-v2';
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
    if (!document.body || document.body.dataset.logoSpriteV2Observer === 'true') return;
    document.body.dataset.logoSpriteV2Observer = 'true';
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
      await loadAgencies();
      schedulePatch();
      [120, 350, 800, 1600, 3000].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudieron renderizar los logos desde el sprite WebP:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
