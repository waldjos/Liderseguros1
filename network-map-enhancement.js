/* Interactive national map enhancement */
(() => {
  'use strict';

  const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const LEAFLET_SCRIPT_URLS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  ];
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const DATA_URL = 'data/agencies-demo.json';
  const VENEZUELA_BOUNDS = [[0.55, -73.75], [12.55, -59.55]];
  const VENEZUELA_CENTER = [7.15, -66.55];

  const STATE_META = {
    Amazonas: { code: 'AM', lat: 3.75, lng: -65.55, zoom: 6 },
    'Anzoátegui': { code: 'AN', lat: 9.05, lng: -64.25, zoom: 7 },
    Apure: { code: 'AP', lat: 7.05, lng: -68.80, zoom: 6 },
    Aragua: { code: 'AR', lat: 10.18, lng: -67.48, zoom: 8 },
    Barinas: { code: 'BA', lat: 8.62, lng: -70.20, zoom: 7 },
    'Bolívar': { code: 'BO', lat: 6.20, lng: -63.60, zoom: 6 },
    Carabobo: { code: 'CA', lat: 10.18, lng: -68.00, zoom: 8 },
    Cojedes: { code: 'CO', lat: 9.35, lng: -68.30, zoom: 7 },
    'Delta Amacuro': { code: 'DA', lat: 8.75, lng: -61.50, zoom: 7 },
    'Distrito Capital': { code: 'DC', lat: 10.50, lng: -66.91, zoom: 10 },
    'Falcón': { code: 'FA', lat: 11.02, lng: -69.70, zoom: 7 },
    'Guárico': { code: 'GU', lat: 8.82, lng: -66.15, zoom: 7 },
    'La Guaira': { code: 'LG', lat: 10.62, lng: -66.72, zoom: 9 },
    Lara: { code: 'LA', lat: 10.18, lng: -69.78, zoom: 7 },
    'Mérida': { code: 'ME', lat: 8.60, lng: -71.15, zoom: 7 },
    Miranda: { code: 'MI', lat: 10.20, lng: -66.35, zoom: 8 },
    Monagas: { code: 'MO', lat: 9.42, lng: -63.00, zoom: 7 },
    'Nueva Esparta': { code: 'NE', lat: 11.00, lng: -63.90, zoom: 9 },
    Portuguesa: { code: 'PO', lat: 9.02, lng: -69.20, zoom: 7 },
    Sucre: { code: 'SU', lat: 10.48, lng: -63.20, zoom: 7 },
    'Táchira': { code: 'TA', lat: 7.92, lng: -72.10, zoom: 7 },
    Trujillo: { code: 'TR', lat: 9.40, lng: -70.48, zoom: 7 },
    Yaracuy: { code: 'YA', lat: 10.30, lng: -68.72, zoom: 8 },
    Zulia: { code: 'ZU', lat: 10.28, lng: -72.35, zoom: 7 }
  };

  const mapState = {
    agencies: [],
    map: null,
    stateLayer: null,
    agencyLayer: null,
    userLayer: null,
    agencyMarkers: new Map(),
    ready: false,
    initializing: false,
    lastWidth: 0,
    resizeObserver: null
  };

  let elements = {};

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function ensureLayoutFixStyles() {
    if (document.getElementById('networkMobileLayoutFix')) return;
    const style = document.createElement('style');
    style.id = 'networkMobileLayoutFix';
    style.textContent = `
      .network-modal,
      .network-modal-content,
      .network-body,
      .network-toolbar,
      .network-layout,
      .network-map-card,
      .network-results-panel,
      .network-results-list,
      .network-group,
      .agency-card,
      .agency-main,
      .agency-actions,
      .agency-socials {
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
      }

      .network-modal,
      .network-modal-content,
      .network-body,
      .network-layout,
      .network-results-panel {
        width: 100%;
        overflow-x: hidden;
      }

      .network-results-list,
      .network-group {
        width: 100%;
      }

      .network-results-list > *,
      .network-group > * {
        min-width: 0;
        max-width: 100%;
      }

      .agency-card {
        width: 100%;
        overflow: hidden;
        grid-template-columns: 54px minmax(0, 1fr) !important;
      }

      .agency-main,
      .agency-heading,
      .agency-heading > div,
      .agency-location-line,
      .agency-hours,
      .agency-services,
      .agency-actions,
      .agency-socials {
        min-width: 0;
        max-width: 100%;
      }

      .agency-heading h4,
      .agency-location-line span,
      .agency-hours span,
      .agency-service {
        min-width: 0;
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .agency-actions {
        width: 100%;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .agency-action {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        padding-inline: .45rem;
        white-space: normal !important;
        overflow-wrap: anywhere;
        text-align: center;
        line-height: 1.2;
      }

      .agency-socials {
        flex-wrap: wrap;
      }

      .network-map-popup {
        min-width: 0 !important;
        width: min(220px, 70vw);
        max-width: 100%;
      }

      .network-map-reset {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 11px;
        background: #fff;
        color: #0b2e7a;
        box-shadow: 0 8px 22px rgba(17, 40, 85, .2);
        cursor: pointer;
      }

      @media (max-width: 520px) {
        .network-body {
          padding-left: .62rem !important;
          padding-right: .62rem !important;
        }

        .network-results-panel,
        .network-map-card {
          padding: .68rem !important;
        }

        .agency-card {
          grid-template-columns: 46px minmax(0, 1fr) !important;
          gap: .58rem !important;
          padding: .68rem !important;
        }

        .agency-logo {
          width: 46px !important;
          height: 46px !important;
        }

        .agency-actions {
          gap: .38rem !important;
        }

        .agency-action {
          min-height: 42px;
          font-size: .58rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLeafletCss() {
    if (document.querySelector('link[data-network-leaflet]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    link.dataset.networkLeaflet = 'true';
    document.head.appendChild(link);
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === url);
      if (existing) {
        if (window.L) resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.networkLeaflet = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureLeaflet() {
    if (window.L) return;
    ensureLeafletCss();
    for (const url of LEAFLET_SCRIPT_URLS) {
      try {
        await loadScript(url);
        if (window.L) return;
      } catch (error) {
        console.warn(`No se pudo cargar Leaflet desde ${url}`, error);
      }
    }
    throw new Error('No fue posible cargar Leaflet.');
  }

  function isModalVisible() {
    if (!elements.modal) return false;
    const style = window.getComputedStyle(elements.modal);
    const rect = elements.modal.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 1) !== 0
      && rect.width > 10
      && rect.height > 10;
  }

  function stateCounts() {
    return mapState.agencies.reduce((counts, agency) => {
      counts[agency.state] = (counts[agency.state] || 0) + 1;
      return counts;
    }, {});
  }

  function filteredAgencies() {
    const selectedState = elements.stateSelect?.value || 'all';
    const selectedCategory = elements.categorySelect?.value || 'all';
    const query = normalizeText(elements.search?.value || '');

    return mapState.agencies.filter((agency) => {
      if (selectedState !== 'all' && agency.state !== selectedState) return false;
      if (selectedCategory !== 'all' && agency.category !== selectedCategory) return false;
      if (!query) return true;
      const haystack = normalizeText([
        agency.name,
        agency.category,
        agency.state,
        agency.municipality,
        agency.city,
        agency.address,
        ...(agency.services || [])
      ].join(' '));
      return haystack.includes(query);
    });
  }

  function stateIcon(name, count) {
    const selected = elements.stateSelect?.value === name;
    const classes = ['network-state-map-marker'];
    if (count) classes.push('has-data');
    if (selected) classes.push('is-selected');
    return window.L.divIcon({
      className: 'network-state-map-icon',
      html: `<div class="${classes.join(' ')}"><span>${STATE_META[name].code}</span>${count ? `<b>${count}</b>` : ''}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  }

  function agencyIcon(agency) {
    const color = /^#[0-9a-f]{6}$/i.test(agency.logoColor || '') ? agency.logoColor : '#0b2e7a';
    const initials = escapeHtml(agency.logoText || agency.name.slice(0, 3).toUpperCase());
    return window.L.divIcon({
      className: 'network-agency-map-icon',
      html: `<div class="network-agency-map-pin" style="--pin-color:${color}"><span>${initials}</span></div>`,
      iconSize: [44, 54],
      iconAnchor: [22, 52],
      popupAnchor: [0, -48]
    });
  }

  function agencyPopup(agency) {
    const maps = safeUrl(agency.maps);
    return `<div class="network-map-popup">
      <strong>${escapeHtml(agency.name)}</strong>
      <span>${escapeHtml(agency.category)} · ${escapeHtml(agency.city)}, ${escapeHtml(agency.state)}</span>
      <div class="network-map-popup-actions">
        <button type="button" data-network-map-agency="${escapeHtml(agency.id)}">Ver perfil</button>
        ${maps ? `<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>` : ''}
      </div>
    </div>`;
  }

  function selectState(name) {
    if (!elements.stateSelect) return;
    elements.stateSelect.value = name;
    elements.stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderStateMarkers() {
    if (!mapState.ready) return;
    const counts = stateCounts();
    mapState.stateLayer.clearLayers();

    Object.entries(STATE_META).forEach(([name, meta]) => {
      const count = counts[name] || 0;
      const marker = window.L.marker([meta.lat, meta.lng], {
        icon: stateIcon(name, count),
        title: `${name}${count ? ` · ${count} punto(s)` : ' · Sin registros'}`,
        keyboard: true,
        zIndexOffset: elements.stateSelect?.value === name ? 900 : 200
      });
      marker.bindTooltip(`${name}${count ? ` · ${count}` : ''}`, {
        direction: 'top',
        offset: [0, -16],
        opacity: 0.96
      });
      marker.on('click', () => selectState(name));
      marker.addTo(mapState.stateLayer);
    });
  }

  function renderAgencyMarkers() {
    if (!mapState.ready) return;
    mapState.agencyLayer.clearLayers();
    mapState.agencyMarkers.clear();

    filteredAgencies().forEach((agency) => {
      const latitude = Number(agency.latitude);
      const longitude = Number(agency.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const marker = window.L.marker([latitude, longitude], {
        icon: agencyIcon(agency),
        title: agency.name,
        keyboard: true,
        zIndexOffset: 1200
      });
      marker.bindPopup(agencyPopup(agency), { maxWidth: 250, closeButton: true });
      marker.addTo(mapState.agencyLayer);
      mapState.agencyMarkers.set(agency.id, marker);
    });
  }

  function renderMapMarkers() {
    renderStateMarkers();
    renderAgencyMarkers();
  }

  function showVenezuela(animate = false) {
    if (!mapState.ready || !mapState.map || !isModalVisible()) return;
    mapState.map.invalidateSize({ animate: false });
    mapState.map.fitBounds(window.L.latLngBounds(VENEZUELA_BOUNDS), {
      padding: [10, 10],
      animate,
      maxZoom: 5.75
    });
    const center = mapState.map.getCenter();
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
      mapState.map.setView(VENEZUELA_CENTER, 5.25, { animate: false });
    }
  }

  function focusSelection(animate = true) {
    if (!mapState.ready || !mapState.map || !isModalVisible()) return;
    const selectedState = elements.stateSelect?.value || 'all';

    if (selectedState === 'all') {
      showVenezuela(animate);
      return;
    }

    const agencies = mapState.agencies
      .filter((agency) => agency.state === selectedState)
      .map((agency) => [Number(agency.latitude), Number(agency.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    mapState.map.invalidateSize({ animate: false });
    if (agencies.length > 1) {
      mapState.map.fitBounds(window.L.latLngBounds(agencies), {
        padding: [42, 42],
        maxZoom: 10.5,
        animate
      });
      return;
    }
    if (agencies.length === 1) {
      mapState.map.setView(agencies[0], 10.75, { animate });
      return;
    }

    const meta = STATE_META[selectedState];
    if (meta) mapState.map.setView([meta.lat, meta.lng], meta.zoom, { animate });
  }

  function focusAgency(agencyId) {
    const escapedId = window.CSS?.escape ? window.CSS.escape(agencyId) : agencyId.replace(/["\\]/g, '\\$&');
    const card = document.querySelector(`[data-agency-id="${escapedId}"]`);
    if (card) {
      document.querySelectorAll('.agency-card.is-map-highlighted').forEach((item) => item.classList.remove('is-map-highlighted'));
      card.classList.add('is-map-highlighted');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => card.classList.remove('is-map-highlighted'), 2200);
    }

    const marker = mapState.agencyMarkers.get(agencyId);
    if (marker && mapState.ready) {
      mapState.map.invalidateSize({ animate: false });
      mapState.map.setView(marker.getLatLng(), Math.max(mapState.map.getZoom(), 11.5), { animate: true });
      marker.openPopup();
    }
  }

  function stabilizeMap(resetView = false) {
    if (!mapState.ready || !mapState.map || !isModalVisible()) return;
    [0, 80, 220, 520].forEach((delay, index) => {
      window.setTimeout(() => {
        if (!isModalVisible()) return;
        mapState.map.invalidateSize({ animate: false });
        if (resetView && index === 3) focusSelection(false);
      }, delay);
    });
  }

  function addUserLocation() {
    if (!navigator.geolocation || !mapState.ready) return;
    navigator.geolocation.getCurrentPosition((position) => {
      mapState.userLayer.clearLayers();
      const icon = window.L.divIcon({
        className: 'network-user-map-icon',
        html: '<div class="network-user-map-marker"><i class="fa-solid fa-location-crosshairs"></i></div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
      const coordinates = [position.coords.latitude, position.coords.longitude];
      window.L.marker(coordinates, {
        icon,
        title: 'Tu ubicación aproximada',
        zIndexOffset: 1500
      }).bindTooltip('Tu ubicación aproximada', { direction: 'top' }).addTo(mapState.userLayer);
      mapState.map.invalidateSize({ animate: false });
      mapState.map.setView(coordinates, 11, { animate: true });
    }, () => {}, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  function installResetControl() {
    const reset = window.L.control({ position: 'topright' });
    reset.onAdd = () => {
      const button = window.L.DomUtil.create('button', 'network-map-reset');
      button.type = 'button';
      button.title = 'Ver toda Venezuela';
      button.setAttribute('aria-label', 'Ver toda Venezuela');
      button.innerHTML = '<i class="fa-solid fa-house"></i>';
      window.L.DomEvent.disableClickPropagation(button);
      window.L.DomEvent.on(button, 'click', (event) => {
        window.L.DomEvent.preventDefault(event);
        if (elements.stateSelect) {
          elements.stateSelect.value = 'all';
          elements.stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          showVenezuela(true);
        }
      });
      return button;
    };
    reset.addTo(mapState.map);
  }

  function observeMapSize() {
    if (!window.ResizeObserver || mapState.resizeObserver) return;
    mapState.resizeObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect?.width || 0);
      if (!width || Math.abs(width - mapState.lastWidth) < 2) return;
      mapState.lastWidth = width;
      if (mapState.ready && isModalVisible()) {
        window.requestAnimationFrame(() => mapState.map.invalidateSize({ animate: false }));
      }
    });
    mapState.resizeObserver.observe(elements.mapShell);
  }

  function bindEnhancementEvents() {
    elements.stateSelect?.addEventListener('change', () => window.setTimeout(() => {
      renderMapMarkers();
      focusSelection(true);
    }, 100));
    elements.categorySelect?.addEventListener('change', () => window.setTimeout(renderAgencyMarkers, 70));
    elements.search?.addEventListener('input', () => window.setTimeout(renderAgencyMarkers, 70));
    elements.locationButton?.addEventListener('click', () => window.setTimeout(addUserLocation, 650));

    elements.modal?.addEventListener('click', (event) => {
      const stateButton = event.target.closest('[data-network-state]');
      if (stateButton) window.setTimeout(() => {
        renderMapMarkers();
        focusSelection(true);
      }, 120);

      const popupButton = event.target.closest('[data-network-map-agency]');
      if (popupButton) focusAgency(popupButton.dataset.networkMapAgency);

      const card = event.target.closest('.agency-card');
      if (card && !event.target.closest('a,button')) focusAgency(card.dataset.agencyId);
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-open-modal="modal-red-atencion"]')) return;
      window.setTimeout(openMapWhenVisible, 0);
      window.setTimeout(openMapWhenVisible, 120);
      window.setTimeout(openMapWhenVisible, 360);
    }, true);

    const observer = new MutationObserver(() => {
      if (isModalVisible()) openMapWhenVisible();
    });
    observer.observe(elements.modal, { attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });
  }

  async function initMap() {
    if (mapState.ready || mapState.initializing || !isModalVisible()) return;
    mapState.initializing = true;
    elements.mapShell.innerHTML = '<div class="network-map-status"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando mapa interactivo de Venezuela…</span></div>';

    try {
      const [dataResponse] = await Promise.all([
        fetch(DATA_URL, { cache: 'no-store' }),
        ensureLeaflet()
      ]);
      if (!dataResponse.ok) throw new Error(`No se pudo cargar el directorio (${dataResponse.status}).`);
      const payload = await dataResponse.json();
      mapState.agencies = Array.isArray(payload.agencies) ? payload.agencies : [];

      if (!isModalVisible()) {
        mapState.initializing = false;
        return;
      }

      elements.mapShell.innerHTML = '<div id="networkLeafletMap" class="network-leaflet-map" aria-label="Mapa interactivo de Venezuela con estados, agencias y canales"></div>';
      mapState.map = window.L.map('networkLeafletMap', {
        zoomControl: true,
        attributionControl: true,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [[0.0, -74.4], [13.1, -59.0]],
        maxBoundsViscosity: 0.85,
        preferCanvas: true
      });

      window.L.tileLayer(TILE_URL, {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
      }).addTo(mapState.map);

      const legend = window.L.control({ position: 'bottomleft' });
      legend.onAdd = () => {
        const node = window.L.DomUtil.create('div', 'network-map-legend');
        node.innerHTML = '<span><i class="state-symbol"></i> Estados</span><span><i class="agency-symbol"></i> Agencias y canales</span>';
        window.L.DomEvent.disableClickPropagation(node);
        return node;
      };
      legend.addTo(mapState.map);
      installResetControl();

      mapState.stateLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.agencyLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.userLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.ready = true;
      mapState.initializing = false;
      renderMapMarkers();
      observeMapSize();
      stabilizeMap(true);
    } catch (error) {
      mapState.initializing = false;
      console.error(error);
      elements.mapShell.innerHTML = '<div class="network-map-status network-map-status-error"><i class="fa-solid fa-map-location-dot"></i><span>No se pudo cargar el mapa interactivo. Revisa tu conexión e intenta nuevamente.</span></div>';
    }
  }

  function openMapWhenVisible() {
    if (!isModalVisible()) return;
    if (!mapState.ready) {
      initMap();
      return;
    }
    stabilizeMap(true);
  }

  function initializeEnhancement() {
    const modal = document.getElementById('modal-red-atencion');
    const mapShell = document.getElementById('networkMapShell');
    if (!modal || !mapShell) return;

    elements = {
      modal,
      mapShell,
      search: document.getElementById('networkSearch'),
      stateSelect: document.getElementById('networkStateSelect'),
      categorySelect: document.getElementById('networkCategorySelect'),
      locationButton: document.getElementById('networkUseLocation')
    };

    ensureLayoutFixStyles();
    const sourceNote = modal.querySelector('.network-source-note');
    if (sourceNote) {
      sourceNote.innerHTML = 'Mapa interactivo con cartografía de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>. Los perfiles mostrados continúan siendo demostrativos.';
    }

    bindEnhancementEvents();
    if (isModalVisible()) openMapWhenVisible();
  }

  document.addEventListener('DOMContentLoaded', () => window.setTimeout(initializeEnhancement, 0));
})();