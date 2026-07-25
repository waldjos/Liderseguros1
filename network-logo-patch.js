'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const SPRITE_URL = '/api/channel-logo-sprite.js?v=1';
  const STYLE_ID = 'networkOfficialLogoStyles';
  const NAME_ATTRIBUTE_SELECTOR = '.network-agency-map-icon[title], .leaflet-marker-icon[title]';

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

  function spritePosition(value) {
    const text = String(value || '').trim();
    return /^\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(text) ? text : '';
  }

  function spriteSize(value) {
    const text = String(value || '').trim();
    return /^\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(text) ? text : '1000% 1000%';
  }

  function hasSprite(agency) {
    return Boolean(agency?.logoSprite && spritePosition(agency.logoPosition));
  }

  function setSpriteVariables(node, agency) {
    node.style.setProperty('--official-logo-position', spritePosition(agency.logoPosition));
    node.style.setProperty('--official-logo-size', spriteSize(agency.logoSize));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .agency-logo.has-official-logo {
        padding: 0 !important;
        overflow: hidden !important;
        border: 1px solid rgba(11, 46, 122, .12) !important;
        background-color: #fff !important;
        background-image: url('${SPRITE_URL}') !important;
        background-repeat: no-repeat !important;
        background-position: var(--official-logo-position) !important;
        background-size: var(--official-logo-size) !important;
        color: transparent !important;
        text-indent: -9999px;
        box-shadow: 0 8px 20px rgba(11, 46, 122, .12) !important;
      }

      .network-agency-map-pin.has-official-logo {
        background: var(--pin-color, #0b2e7a) !important;
      }

      .network-agency-map-pin .network-agency-map-logo {
        display: block !important;
        width: 27px !important;
        height: 27px !important;
        border-radius: 50% !important;
        border: 1px solid rgba(11, 46, 122, .12) !important;
        background-color: #fff !important;
        background-image: url('${SPRITE_URL}') !important;
        background-repeat: no-repeat !important;
        background-position: var(--official-logo-position) !important;
        background-size: var(--official-logo-size) !important;
        color: transparent !important;
        overflow: hidden !important;
        box-shadow: 0 2px 6px rgba(5, 22, 58, .28) !important;
      }

      @media (max-width: 520px) {
        .network-agency-map-pin .network-agency-map-logo {
          width: 23px !important;
          height: 23px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function preloadSprite() {
    const image = new Image();
    image.decoding = 'async';
    image.src = SPRITE_URL;
  }

  function patchCard(card) {
    if (card.dataset.officialLogoApplied === 'true') return;
    const agency = agenciesById.get(card.dataset.agencyId);
    if (!hasSprite(agency)) return;

    const logo = card.querySelector('.agency-logo');
    if (!logo) return;

    logo.replaceChildren();
    logo.classList.add('has-official-logo');
    logo.removeAttribute('aria-label');
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', `Logo de ${agency.name}`);
    logo.setAttribute('title', agency.name);
    setSpriteVariables(logo, agency);
    card.dataset.officialLogoApplied = 'true';
  }

  function patchMarker(marker) {
    if (marker.dataset.officialLogoApplied === 'true') return;
    const pin = marker.querySelector('.network-agency-map-pin');
    if (!pin) return;

    const agency = agenciesByName.get(normalize(marker.getAttribute('title')));
    if (!hasSprite(agency)) return;

    const logo = document.createElement('span');
    logo.className = 'network-agency-map-logo';
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', `Logo de ${agency.name}`);
    logo.setAttribute('title', agency.name);
    setSpriteVariables(logo, agency);

    pin.replaceChildren(logo);
    pin.classList.add('has-official-logo');
    marker.dataset.officialLogoApplied = 'true';
  }

  function patchVisibleDirectory() {
    patchQueued = false;
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
    document.querySelectorAll(NAME_ATTRIBUTE_SELECTOR).forEach(patchMarker);
  }

  function schedulePatch() {
    if (patchQueued) return;
    patchQueued = true;
    window.requestAnimationFrame(patchVisibleDirectory);
  }

  function observeDirectory() {
    const modal = document.getElementById('modal-red-atencion');
    if (!modal || modal.dataset.officialLogoObserver === 'true') return;

    modal.dataset.officialLogoObserver = 'true';
    new MutationObserver(schedulePatch).observe(modal, { childList: true, subtree: true });
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
    preloadSprite();
    observeDirectory();

    try {
      await loadAgencies();
      schedulePatch();
      [150, 400, 900, 1800, 3200].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudieron aplicar los logos oficiales:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
