'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const LOGO_URL = '/api/channel-logo.js?v=5';
  const RENDERER = 'server-png-v1';
  const STYLE_ID = 'networkServerLogoStyles';
  const VIEWER_ID = 'networkLogoViewer';
  const GRID_LAST_INDEX = 9;
  const POSITION_STEP = 100 / GRID_LAST_INDEX;
  const MARKER_SELECTOR = '.network-agency-map-icon[title], .leaflet-marker-icon[title]';

  let agenciesById = new Map();
  let agenciesByName = new Map();
  let patchQueued = false;
  let lastFocusedLogo = null;

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

    const column = Math.min(GRID_LAST_INDEX, Math.max(0, Math.round(Number(match[1]) / POSITION_STEP)));
    const row = Math.min(GRID_LAST_INDEX, Math.max(0, Math.round(Number(match[2]) / POSITION_STEP)));
    return Number.isFinite(column) && Number.isFinite(row) ? { column, row } : null;
  }

  function hasLogo(agency) {
    return Boolean(spriteCell(agency));
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

  function logoUrl(agency) {
    const cell = spriteCell(agency);
    return cell ? `${LOGO_URL}&col=${cell.column}&row=${cell.row}` : '';
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .agency-logo.has-official-logo {
        position: relative !important;
        display: grid !important;
        place-items: center !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 1px solid rgba(11,46,122,.14) !important;
        background: #fff !important;
        color: #0b2e7a !important;
        box-shadow: 0 8px 20px rgba(11,46,122,.14) !important;
      }
      button.agency-logo.has-official-logo {
        appearance: none;
        -webkit-appearance: none;
        cursor: zoom-in;
        font: inherit;
      }
      .official-server-logo-frame {
        position: relative;
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: inherit;
        background: linear-gradient(145deg,#fff,#eef3fb);
      }
      .official-server-logo-image {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        max-width: none !important;
        object-fit: contain;
        background: #fff;
        opacity: 0;
        transition: opacity .14s ease;
      }
      .official-server-logo-frame.is-loaded .official-server-logo-image { opacity: 1; }
      .official-server-logo-fallback {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        padding: .18rem;
        color: #0b2e7a;
        font-size: .62rem;
        font-weight: 900;
        line-height: 1;
        text-align: center;
      }
      .official-server-logo-frame.is-loaded .official-server-logo-fallback { visibility: hidden; }
      .agency-logo-zoom {
        position: absolute;
        right: 3px;
        bottom: 3px;
        z-index: 4;
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(11,46,122,.94);
        color: #fff;
        font-size: 8px;
        box-shadow: 0 2px 7px rgba(5,22,58,.3);
        pointer-events: none;
      }
      .network-agency-map-pin.has-official-logo { background: var(--pin-color,#0b2e7a) !important; }
      .network-agency-map-logo {
        display: block !important;
        width: 27px !important;
        height: 27px !important;
        border-radius: 50% !important;
        border: 1px solid rgba(11,46,122,.12) !important;
        overflow: hidden !important;
        background: #fff !important;
        box-shadow: 0 2px 6px rgba(5,22,58,.28) !important;
      }
      .network-agency-map-logo .official-server-logo-fallback { font-size: .42rem; }
      .network-group-logo-status > .network-group-title {
        position: sticky;
        top: 0;
        z-index: 2;
        margin: 0;
        padding: .56rem .62rem;
        border-radius: 12px;
        background: rgba(246,249,253,.96);
      }
      .network-group-logo-status.has-logos > .network-group-title {
        color: #167344;
        background: rgba(231,247,238,.96);
      }
      .network-group-logo-status.pending-logos > .network-group-title {
        color: #8b5b12;
        background: rgba(255,246,229,.96);
      }
      .network-logo-viewer[hidden] { display: none !important; }
      .network-logo-viewer {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(4,18,47,.82);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .network-logo-viewer-card {
        position: relative;
        width: min(92vw,430px);
        display: grid;
        justify-items: center;
        gap: .8rem;
        padding: 1rem 1rem 1.1rem;
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(0,0,0,.38);
        text-align: center;
      }
      .network-logo-viewer-close {
        position: absolute;
        top: .65rem;
        right: .65rem;
        z-index: 2;
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: #eef3fb;
        color: #0b2e7a;
        font-size: 1.25rem;
        cursor: pointer;
      }
      .network-logo-viewer-copy { width: 100%; padding: .2rem 2.6rem 0; }
      .network-logo-viewer-copy span { display: block; color: #71809c; font-size: .66rem; font-weight: 700; text-transform: uppercase; }
      .network-logo-viewer-copy strong { display: block; margin-top: .28rem; color: #0b2e7a; font-size: 1.15rem; }
      .network-logo-viewer-image {
        width: min(72vw,320px);
        aspect-ratio: 1;
        border-radius: 24px;
        border: 1px solid rgba(11,46,122,.12);
        overflow: hidden;
        background: #fff;
        box-shadow: 0 14px 34px rgba(11,46,122,.16);
      }
      .network-logo-viewer-image .official-server-logo-fallback { font-size: 1.35rem; }
      .network-logo-viewer-hint { margin: 0; color: #71809c; font-size: .68rem; }
      @media(max-width:520px) {
        .network-agency-map-logo { width: 23px !important; height: 23px !important; }
        .network-logo-viewer-card { width: min(94vw,380px); border-radius: 20px; }
        .network-logo-viewer-image { width: min(78vw,300px); border-radius: 20px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createLogoVisual(agency) {
    const url = logoUrl(agency);
    if (!url) return null;

    const frame = document.createElement('span');
    frame.className = 'official-server-logo-frame';
    frame.dataset.logoRenderer = RENDERER;
    frame.dataset.logoAgencyId = agency.id;

    const fallback = document.createElement('span');
    fallback.className = 'official-server-logo-fallback';
    fallback.textContent = initials(agency);
    fallback.setAttribute('aria-hidden', 'true');

    const image = new Image();
    image.className = 'official-server-logo-image';
    image.alt = `Logo de ${agency.name}`;
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;
    image.addEventListener('load', () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) frame.classList.add('is-loaded');
      else frame.classList.add('is-error');
    }, { once: true });
    image.addEventListener('error', () => frame.classList.add('is-error'), { once: true });
    image.src = url;

    frame.append(fallback, image);
    return frame;
  }

  function ensureViewer() {
    let viewer = document.getElementById(VIEWER_ID);
    if (viewer) return viewer;
    viewer = document.createElement('div');
    viewer.id = VIEWER_ID;
    viewer.className = 'network-logo-viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.innerHTML = `
      <div class="network-logo-viewer-card">
        <button class="network-logo-viewer-close" type="button" data-close-logo-viewer aria-label="Cerrar logo">&times;</button>
        <div class="network-logo-viewer-copy"><span>Logo del canal</span><strong id="networkLogoViewerName"></strong></div>
        <div class="network-logo-viewer-image" data-logo-viewer-image></div>
        <p class="network-logo-viewer-hint">Pulsa fuera del cuadro o la X para volver al directorio.</p>
      </div>`;
    viewer.addEventListener('click', (event) => {
      if (event.target === viewer || event.target.closest('[data-close-logo-viewer]')) closeViewer();
    });
    document.body.appendChild(viewer);
    return viewer;
  }

  function openViewer(agency, trigger) {
    if (!hasLogo(agency)) return;
    const viewer = ensureViewer();
    const host = viewer.querySelector('[data-logo-viewer-image]');
    const name = viewer.querySelector('#networkLogoViewerName');
    const visual = createLogoVisual(agency);
    if (!host || !name || !visual) return;
    lastFocusedLogo = trigger || null;
    name.textContent = agency.name;
    host.replaceChildren(visual);
    viewer.hidden = false;
    window.setTimeout(() => viewer.querySelector('.network-logo-viewer-close')?.focus({ preventScroll: true }), 30);
  }

  function closeViewer() {
    const viewer = document.getElementById(VIEWER_ID);
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    lastFocusedLogo?.focus?.({ preventScroll: true });
    lastFocusedLogo = null;
  }

  function patchCard(card) {
    const agency = agenciesById.get(card.dataset.agencyId);
    if (!hasLogo(agency)) return;
    let logo = card.querySelector('.agency-logo');
    if (!logo || logo.dataset.logoRenderer === RENDERER) return;

    if (logo.tagName !== 'BUTTON') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = logo.className;
      button.style.cssText = logo.style.cssText;
      logo.replaceWith(button);
      logo = button;
    }

    const visual = createLogoVisual(agency);
    if (!visual) return;
    logo.replaceChildren(visual);
    logo.classList.add('has-official-logo');
    logo.setAttribute('aria-label', `Ver logo ampliado de ${agency.name}`);
    logo.setAttribute('title', `Ver logo de ${agency.name} en grande`);
    logo.dataset.viewOfficialLogo = agency.id;
    logo.dataset.logoRenderer = RENDERER;

    const zoom = document.createElement('span');
    zoom.className = 'agency-logo-zoom';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';
    logo.appendChild(zoom);
    card.dataset.logoRenderer = RENDERER;
  }

  function patchMarker(marker) {
    if (marker.dataset.logoRenderer === RENDERER) return;
    const agency = agenciesByName.get(normalize(marker.getAttribute('title')));
    if (!hasLogo(agency)) return;
    const pin = marker.querySelector('.network-agency-map-pin');
    const visual = createLogoVisual(agency);
    if (!pin || !visual) return;

    const logo = document.createElement('span');
    logo.className = 'network-agency-map-logo';
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', `Logo de ${agency.name}`);
    logo.appendChild(visual);
    pin.replaceChildren(logo);
    pin.classList.add('has-official-logo');
    marker.dataset.logoRenderer = RENDERER;
  }

  function labelSort() {
    const option = document.querySelector('#networkSort option[value="recommended"]');
    if (option) option.textContent = 'Con logo primero';
  }

  function reorderCards() {
    const results = document.getElementById('networkResults');
    const sort = document.getElementById('networkSort');
    if (!results || sort?.value !== 'recommended') return;
    const cards = [...results.querySelectorAll('.agency-card[data-agency-id]')];
    if (!cards.length) return;
    const withLogo = cards.filter((card) => hasLogo(agenciesById.get(card.dataset.agencyId)));
    const withoutLogo = cards.filter((card) => !hasLogo(agenciesById.get(card.dataset.agencyId)));
    const signature = `${withLogo.map((card) => card.dataset.agencyId).join('|')}::${withoutLogo.map((card) => card.dataset.agencyId).join('|')}`;
    if (results.dataset.serverLogoOrder === signature) return;

    const fragment = document.createDocumentFragment();
    const addGroup = (title, groupCards, className, icon) => {
      if (!groupCards.length) return;
      const section = document.createElement('section');
      section.className = `network-group network-group-logo-status ${className}`;
      const heading = document.createElement('h3');
      heading.className = 'network-group-title';
      heading.innerHTML = `<i class="fa-solid ${icon}"></i> ${title} <span>${groupCards.length}</span>`;
      section.appendChild(heading);
      groupCards.forEach((card) => section.appendChild(card));
      fragment.appendChild(section);
    };
    addGroup('Canales con logo', withLogo, 'has-logos', 'fa-circle-check');
    addGroup('Pendientes de logo', withoutLogo, 'pending-logos', 'fa-clock');
    results.replaceChildren(fragment);
    results.dataset.serverLogoOrder = signature;
  }

  function patchVisible() {
    patchQueued = false;
    labelSort();
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
    document.querySelectorAll(MARKER_SELECTOR).forEach(patchMarker);
    reorderCards();
  }

  function schedulePatch() {
    if (patchQueued) return;
    patchQueued = true;
    window.requestAnimationFrame(patchVisible);
  }

  async function initialize() {
    ensureStyles();
    ensureViewer();
    new MutationObserver(schedulePatch).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-view-official-logo]');
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      openViewer(agenciesById.get(trigger.dataset.viewOfficialLogo), trigger);
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeViewer();
    });

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Directorio ${response.status}`);
      const payload = await response.json();
      const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
      agenciesById = new Map(agencies.map((agency) => [agency.id, agency]));
      agenciesByName = new Map(agencies.map((agency) => [normalize(agency.name), agency]));
      schedulePatch();
      [120,350,800,1600,3000].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudieron cargar los logos individuales:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
