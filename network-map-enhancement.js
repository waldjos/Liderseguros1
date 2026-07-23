
/* Interactive national map enhancement */
(() => {
  const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const LEAFLET_SCRIPT_URLS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  ];
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const VENEZUELA_BOUNDS = [[0.45, -73.75], [12.65, -59.55]];
  const DATA_URL = 'data/agencies-demo.json';

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
    ready: false
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
    window.setTimeout(() => {
      renderMapMarkers();
      focusSelection();
    }, 80);
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
      marker.bindPopup(agencyPopup(agency), { maxWidth: 275, closeButton: true });
      marker.addTo(mapState.agencyLayer);
      mapState.agencyMarkers.set(agency.id, marker);
    });
  }

  function renderMapMarkers() {
    renderStateMarkers();
    renderAgencyMarkers();
  }

  function focusSelection() {
    if (!mapState.ready || !mapState.map) return;
    const selectedState = elements.stateSelect?.value || 'all';

    if (selectedState === 'all') {
      mapState.map.fitBounds(VENEZUELA_BOUNDS, { padding: [16, 16], animate: true });
      return;
    }

    const agencies = mapState.agencies
      .filter((agency) => agency.state === selectedState)
      .map((agency) => [Number(agency.latitude), Number(agency.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (agencies.length > 1) {
      mapState.map.fitBounds(window.L.latLngBounds(agencies), { padding: [50, 50], maxZoom: 11, animate: true });
      return;
    }
    if (agencies.length === 1) {
      mapState.map.setView(agencies[0], 11, { animate: true });
      return;
    }

    const meta = STATE_META[selectedState];
    if (meta) mapState.map.setView([meta.lat, meta.lng], meta.zoom, { animate: true });
  }

  function focusAgency(agencyId) {
    const card = document.querySelector(`[data-agency-id="${CSS.escape(agencyId)}"]`);
    if (card) {
      document.querySelectorAll('.agency-card.is-map-highlighted').forEach((item) => item.classList.remove('is-map-highlighted'));
      card.classList.add('is-map-highlighted');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => card.classList.remove('is-map-highlighted'), 2200);
    }

    const marker = mapState.agencyMarkers.get(agencyId);
    if (marker && mapState.ready) {
      mapState.map.setView(marker.getLatLng(), Math.max(mapState.map.getZoom(), 12), { animate: true });
      marker.openPopup();
    }
  }

  function refreshMap() {
    if (!mapState.ready) return;
    window.setTimeout(() => {
      mapState.map.invalidateSize({ animate: false });
      renderMapMarkers();
      focusSelection();
    }, 180);
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
      mapState.map.setView(coordinates, 11, { animate: true });
    }, () => {}, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  function bindEnhancementEvents() {
    elements.stateSelect?.addEventListener('change', () => window.setTimeout(() => {
      renderMapMarkers();
      focusSelection();
    }, 40));
    elements.categorySelect?.addEventListener('change', () => window.setTimeout(renderAgencyMarkers, 40));
    elements.search?.addEventListener('input', () => window.setTimeout(renderAgencyMarkers, 40));
    elements.locationButton?.addEventListener('click', () => window.setTimeout(addUserLocation, 600));

    elements.modal?.addEventListener('click', (event) => {
      const stateButton = event.target.closest('[data-network-state]');
      if (stateButton) window.setTimeout(() => {
        renderMapMarkers();
        focusSelection();
      }, 80);

      const popupButton = event.target.closest('[data-network-map-agency]');
      if (popupButton) focusAgency(popupButton.dataset.networkMapAgency);

      const card = event.target.closest('.agency-card');
      if (card && !event.target.closest('a,button')) focusAgency(card.dataset.agencyId);
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-modal="modal-red-atencion"]')) refreshMap();
    });
    window.addEventListener('resize', refreshMap, { passive: true });
  }

  async function initMap() {
    elements.mapShell.innerHTML = '<div class="network-map-status"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando mapa interactivo de Venezuela…</span></div>';

    try {
      const [dataResponse] = await Promise.all([
        fetch(DATA_URL, { cache: 'no-store' }),
        ensureLeaflet()
      ]);
      if (!dataResponse.ok) throw new Error(`No se pudo cargar el directorio (${dataResponse.status}).`);
      const payload = await dataResponse.json();
      mapState.agencies = Array.isArray(payload.agencies) ? payload.agencies : [];

      elements.mapShell.innerHTML = '<div id="networkLeafletMap" class="network-leaflet-map" aria-label="Mapa interactivo de Venezuela con estados, agencias y canales"></div>';
      mapState.map = window.L.map('networkLeafletMap', {
        zoomControl: true,
        attributionControl: true,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [[-1.5, -76.5], [14.5, -57.0]],
        maxBoundsViscosity: 0.55,
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

      mapState.stateLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.agencyLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.userLayer = window.L.layerGroup().addTo(mapState.map);
      mapState.map.fitBounds(VENEZUELA_BOUNDS, { padding: [16, 16], animate: false });
      mapState.ready = true;
      renderMapMarkers();
      refreshMap();
    } catch (error) {
      console.error(error);
      elements.mapShell.innerHTML = '<div class="network-map-status network-map-status-error"><i class="fa-solid fa-map-location-dot"></i><span>No se pudo cargar el mapa interactivo. Revisa tu conexión e intenta nuevamente.</span></div>';
    }
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

    const sourceNote = modal.querySelector('.network-source-note');
    if (sourceNote) {
      sourceNote.innerHTML = 'Mapa interactivo con cartografía de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>. Los perfiles mostrados continúan siendo demostrativos.';
    }

    bindEnhancementEvents();
    initMap();
  }

  document.addEventListener('DOMContentLoaded', () => window.setTimeout(initializeEnhancement, 0));
})();
