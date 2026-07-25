'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const LOGO_URL = '/api/channel-logo.js?v=1';
  const STYLE_ID = 'networkOfficialLogoStyles';
  const VIEWER_ID = 'networkLogoViewer';
  const NAME_ATTRIBUTE_SELECTOR = '.network-agency-map-icon[title], .leaflet-marker-icon[title]';
  const GRID_LAST_INDEX = 9;
  const POSITION_STEP = 100 / GRID_LAST_INDEX;

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
    const match = String(agency?.logoPosition || '').trim().match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
    if (!agency?.logoSprite || !match) return null;

    const column = Math.min(GRID_LAST_INDEX, Math.max(0, Math.round(Number(match[1]) / POSITION_STEP)));
    const row = Math.min(GRID_LAST_INDEX, Math.max(0, Math.round(Number(match[2]) / POSITION_STEP)));
    return Number.isFinite(column) && Number.isFinite(row) ? { column, row } : null;
  }

  function hasSprite(agency) {
    return Boolean(spriteCell(agency));
  }

  function logoUrl(agency) {
    const cell = spriteCell(agency);
    return cell ? `${LOGO_URL}&col=${cell.column}&row=${cell.row}` : '';
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

  function imageHasVisibleContent(image) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return true;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visiblePixels = 0;

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];
        if (alpha > 24 && (red < 242 || green < 242 || blue < 242)) visiblePixels += 1;
        if (visiblePixels > 8) return true;
      }
      return false;
    } catch (error) {
      return true;
    }
  }

  function createLogoVisual(agency, className = '') {
    const frame = document.createElement('span');
    frame.className = `official-logo-frame ${className}`.trim();

    const fallback = document.createElement('span');
    fallback.className = 'official-logo-fallback';
    fallback.textContent = initials(agency);
    fallback.setAttribute('aria-hidden', 'true');

    const image = new Image();
    image.className = 'official-logo-image';
    image.alt = `Logo de ${agency.name}`;
    image.decoding = 'async';
    image.loading = 'lazy';
    image.addEventListener('load', () => {
      frame.classList.add(imageHasVisibleContent(image) ? 'is-loaded' : 'is-empty');
    }, { once: true });
    image.addEventListener('error', () => frame.classList.add('is-error'), { once: true });
    image.src = logoUrl(agency);

    frame.append(fallback, image);
    return frame;
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
        border: 1px solid rgba(11, 46, 122, .14) !important;
        background: #fff !important;
        color: #0b2e7a !important;
        box-shadow: 0 8px 20px rgba(11, 46, 122, .14) !important;
      }

      button.agency-logo.has-official-logo {
        appearance: none;
        -webkit-appearance: none;
        cursor: zoom-in;
        font: inherit;
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }

      button.agency-logo.has-official-logo:hover,
      button.agency-logo.has-official-logo:focus-visible {
        transform: translateY(-2px) scale(1.035);
        border-color: rgba(247, 148, 29, .72) !important;
        box-shadow: 0 0 0 4px rgba(247, 148, 29, .12), 0 12px 26px rgba(11, 46, 122, .18) !important;
        outline: none;
      }

      .official-logo-frame {
        position: relative;
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        border-radius: inherit;
        background: #fff;
      }

      .official-logo-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        max-width: none !important;
        object-fit: contain;
        opacity: 0;
        transition: opacity .16s ease;
      }

      .official-logo-frame.is-loaded .official-logo-image { opacity: 1; }

      .official-logo-fallback {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        padding: .18rem;
        color: #0b2e7a;
        background: linear-gradient(145deg, #ffffff, #eef3fb);
        font-size: .62rem;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -.02em;
        text-align: center;
      }

      .official-logo-frame.is-loaded .official-logo-fallback { visibility: hidden; }

      .agency-logo-zoom {
        position: absolute;
        right: 3px;
        bottom: 3px;
        z-index: 3;
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(11, 46, 122, .92);
        color: #fff;
        font-size: 8px;
        text-indent: 0;
        box-shadow: 0 2px 7px rgba(5, 22, 58, .3);
        pointer-events: none;
      }

      .network-agency-map-pin.has-official-logo {
        background: var(--pin-color, #0b2e7a) !important;
      }

      .network-agency-map-logo {
        display: block !important;
        width: 27px !important;
        height: 27px !important;
        border-radius: 50% !important;
        border: 1px solid rgba(11, 46, 122, .12) !important;
        overflow: hidden !important;
        background: #fff !important;
        box-shadow: 0 2px 6px rgba(5, 22, 58, .28) !important;
      }

      .network-agency-map-logo .official-logo-fallback { font-size: .42rem; }

      .network-group-logo-status > .network-group-title {
        position: sticky;
        top: 0;
        z-index: 2;
        margin: 0;
        padding: .56rem .62rem;
        border-radius: 12px;
        background: rgba(246, 249, 253, .96);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .network-group-logo-status.has-logos > .network-group-title {
        color: #167344;
        background: rgba(231, 247, 238, .96);
      }

      .network-group-logo-status.pending-logos > .network-group-title {
        color: #8b5b12;
        background: rgba(255, 246, 229, .96);
      }

      .network-logo-viewer[hidden] { display: none !important; }

      .network-logo-viewer {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(4, 18, 47, .82);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .network-logo-viewer-card {
        position: relative;
        width: min(92vw, 430px);
        max-height: 92vh;
        display: grid;
        justify-items: center;
        gap: .8rem;
        padding: 1rem 1rem 1.1rem;
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(0, 0, 0, .38);
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

      .network-logo-viewer-copy {
        width: 100%;
        padding: .2rem 2.6rem 0;
      }

      .network-logo-viewer-copy span {
        display: block;
        color: #71809c;
        font-size: .66rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
      }

      .network-logo-viewer-copy strong {
        display: block;
        margin-top: .28rem;
        color: #0b2e7a;
        font-size: clamp(1rem, 4vw, 1.25rem);
        line-height: 1.25;
      }

      .network-logo-viewer-image {
        width: min(72vw, 240px);
        aspect-ratio: 1;
        border-radius: 24px;
        border: 1px solid rgba(11, 46, 122, .12);
        background: #fff;
        box-shadow: inset 0 0 0 8px #fff, 0 14px 34px rgba(11, 46, 122, .16);
      }

      .network-logo-viewer-image .official-logo-fallback { font-size: 1.35rem; }

      .network-logo-viewer-hint {
        margin: 0;
        color: #71809c;
        font-size: .68rem;
      }

      @media (max-width: 520px) {
        .network-agency-map-logo {
          width: 23px !important;
          height: 23px !important;
        }

        .network-logo-viewer-card {
          width: min(94vw, 380px);
          border-radius: 20px;
        }

        .network-logo-viewer-image {
          width: min(76vw, 220px);
          border-radius: 20px;
        }
      }
    `;
    document.head.appendChild(style);
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
    viewer.setAttribute('aria-labelledby', 'networkLogoViewerName');
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
    if (!hasSprite(agency)) return;
    const viewer = ensureViewer();
    const imageHost = viewer.querySelector('[data-logo-viewer-image]');
    const name = viewer.querySelector('#networkLogoViewerName');
    if (!imageHost || !name) return;

    lastFocusedLogo = trigger || null;
    name.textContent = agency.name;
    imageHost.replaceChildren(createLogoVisual(agency));
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
    if (!hasSprite(agency)) return;

    let logo = card.querySelector('.agency-logo');
    if (!logo) return;

    if (logo.tagName !== 'BUTTON') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = logo.className;
      button.style.cssText = logo.style.cssText;
      logo.replaceWith(button);
      logo = button;
    }

    if (logo.dataset.officialLogoVersion === 'image-v1') return;

    logo.replaceChildren(createLogoVisual(agency));
    logo.classList.add('has-official-logo');
    logo.setAttribute('aria-label', `Ver logo ampliado de ${agency.name}`);
    logo.setAttribute('title', `Ver logo de ${agency.name} en grande`);
    logo.dataset.viewOfficialLogo = agency.id;
    logo.dataset.officialLogoVersion = 'image-v1';

    const zoom = document.createElement('span');
    zoom.className = 'agency-logo-zoom';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';
    logo.appendChild(zoom);
    card.dataset.officialLogoApplied = 'true';
  }

  function patchMarker(marker) {
    if (marker.dataset.officialLogoVersion === 'image-v1') return;
    const pin = marker.querySelector('.network-agency-map-pin');
    if (!pin) return;

    const agency = agenciesByName.get(normalize(marker.getAttribute('title')));
    if (!hasSprite(agency)) return;

    const logo = document.createElement('span');
    logo.className = 'network-agency-map-logo';
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', `Logo de ${agency.name}`);
    logo.setAttribute('title', agency.name);
    logo.appendChild(createLogoVisual(agency));

    pin.replaceChildren(logo);
    pin.classList.add('has-official-logo');
    marker.dataset.officialLogoApplied = 'true';
    marker.dataset.officialLogoVersion = 'image-v1';
  }

  function labelRecommendedSort() {
    const select = document.getElementById('networkSort');
    const option = select?.querySelector('option[value="recommended"]');
    if (option) option.textContent = 'Con logo primero';
  }

  function reorderCardsByLogo() {
    const results = document.getElementById('networkResults');
    const sort = document.getElementById('networkSort');
    if (!results || sort?.value !== 'recommended') return;

    const cards = [...results.querySelectorAll('.agency-card[data-agency-id]')];
    if (!cards.length) return;

    const withLogo = cards.filter((card) => hasSprite(agenciesById.get(card.dataset.agencyId)));
    const withoutLogo = cards.filter((card) => !hasSprite(agenciesById.get(card.dataset.agencyId)));
    const signature = `${withLogo.map((card) => card.dataset.agencyId).join('|')}::${withoutLogo.map((card) => card.dataset.agencyId).join('|')}`;
    const alreadyGrouped = results.querySelector(':scope > .network-group-logo-status');
    if (alreadyGrouped && results.dataset.logoOrderSignature === signature) return;

    const fragment = document.createDocumentFragment();
    const buildGroup = (title, groupCards, className, icon) => {
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

    buildGroup('Canales con logo', withLogo, 'has-logos', 'fa-circle-check');
    buildGroup('Pendientes de logo', withoutLogo, 'pending-logos', 'fa-clock');
    results.replaceChildren(fragment);
    results.dataset.logoOrderSignature = signature;
  }

  function patchVisibleDirectory() {
    patchQueued = false;
    labelRecommendedSort();
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
    document.querySelectorAll(NAME_ATTRIBUTE_SELECTOR).forEach(patchMarker);
    reorderCardsByLogo();
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

  function bindInteractions() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-view-official-logo]');
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      const agency = agenciesById.get(trigger.dataset.viewOfficialLogo);
      openViewer(agency, trigger);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeViewer();
    });
  }

  async function initialize() {
    ensureStyles();
    ensureViewer();
    observeDirectory();
    bindInteractions();

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
