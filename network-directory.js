'use strict';

(() => {
  const DATA_URL = 'data/agencies-demo.json';
  const MAP_URL = 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Venezuela_con_estados.svg';
  const CATEGORY_ORDER = ['Agencia', 'Canal adscrito', 'Corredor aliado', 'Concesionario aliado', 'Taller aliado'];

  const STATES = [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
    'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
    'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
    'Yaracuy', 'Zulia'
  ];

  const STATE_POSITIONS = {
    'Zulia': [13, 33, 'ZU'], 'Falcón': [28, 16, 'FA'], 'Lara': [31, 29, 'LA'],
    'Yaracuy': [39, 28, 'YA'], 'Carabobo': [44, 33, 'CA'], 'Aragua': [50, 35, 'AR'],
    'La Guaira': [51, 26, 'LG'], 'Distrito Capital': [54, 30, 'DC'], 'Miranda': [58, 36, 'MI'],
    'Nueva Esparta': [68, 20, 'NE'], 'Sucre': [76, 31, 'SU'], 'Monagas': [72, 42, 'MO'],
    'Anzoátegui': [64, 44, 'AN'], 'Delta Amacuro': [84, 43, 'DA'], 'Bolívar': [70, 65, 'BO'],
    'Amazonas': [53, 79, 'AM'], 'Apure': [36, 65, 'AP'], 'Barinas': [32, 54, 'BA'],
    'Táchira': [19, 56, 'TA'], 'Mérida': [25, 47, 'ME'], 'Trujillo': [27, 38, 'TR'],
    'Portuguesa': [38, 45, 'PO'], 'Cojedes': [44, 46, 'CO'], 'Guárico': [53, 51, 'GU']
  };

  const state = {
    agencies: [],
    selectedState: 'all',
    selectedCategory: 'all',
    search: '',
    sort: 'recommended',
    userLocation: null,
    loaded: false
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

  function safeUrl(value, allowedProtocols = ['https:', 'http:']) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return allowedProtocols.includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function getDistanceKm(latitude1, longitude1, latitude2, longitude2) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const earthRadius = 6371;
    const deltaLatitude = toRadians(latitude2 - latitude1);
    const deltaLongitude = toRadians(longitude2 - longitude1);
    const a = Math.sin(deltaLatitude / 2) ** 2
      + Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(distance) {
    if (!Number.isFinite(distance)) return '';
    if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} m`;
    return `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`;
  }

  function agenciesByStateCount() {
    return state.agencies.reduce((counts, agency) => {
      counts[agency.state] = (counts[agency.state] || 0) + 1;
      return counts;
    }, {});
  }

  function populateFilters() {
    const stateOptions = ['<option value="all">Todos los estados</option>']
      .concat(STATES.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`));
    elements.stateSelect.innerHTML = stateOptions.join('');

    const categories = [...new Set(state.agencies.map((agency) => agency.category).filter(Boolean))]
      .sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
    elements.categorySelect.innerHTML = '<option value="all">Todos los tipos</option>'
      + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  }

  function renderMap() {
    const counts = agenciesByStateCount();
    elements.mapImage.src = MAP_URL;
    elements.mapImage.addEventListener('error', () => {
      elements.mapImage.style.display = 'none';
      elements.mapShell.classList.add('map-fallback');
    }, { once: true });

    elements.hotspots.innerHTML = STATES.map((name) => {
      const [x, y, shortName] = STATE_POSITIONS[name] || [50, 50, name.slice(0, 2).toUpperCase()];
      const count = counts[name] || 0;
      const classes = ['network-state-hotspot'];
      if (count) classes.push('has-data');
      if (state.selectedState === name) classes.push('is-selected');
      return `<button type="button" class="${classes.join(' ')}" data-network-state="${escapeHtml(name)}" style="left:${x}%;top:${y}%" title="${escapeHtml(name)}${count ? ` · ${count} punto(s)` : ' · Sin registros de prueba'}" aria-label="Seleccionar ${escapeHtml(name)}">
        ${escapeHtml(shortName)}${count ? `<span class="network-state-count">${count}</span>` : ''}
      </button>`;
    }).join('');

    elements.stateChips.innerHTML = [
      `<button type="button" class="network-state-chip ${state.selectedState === 'all' ? 'is-selected' : ''}" data-network-state="all">Toda Venezuela</button>`,
      ...STATES.map((name) => {
        const count = counts[name] || 0;
        const classes = ['network-state-chip'];
        if (count) classes.push('has-data');
        if (state.selectedState === name) classes.push('is-selected');
        return `<button type="button" class="${classes.join(' ')}" data-network-state="${escapeHtml(name)}">${escapeHtml(name)}${count ? ` · ${count}` : ''}</button>`;
      })
    ].join('');
  }

  function getFilteredAgencies() {
    const query = normalizeText(state.search);
    const agencies = state.agencies
      .map((agency, index) => {
        const distance = state.userLocation
          ? getDistanceKm(state.userLocation.latitude, state.userLocation.longitude, Number(agency.latitude), Number(agency.longitude))
          : null;
        return { ...agency, _sourceIndex: index, _distance: distance };
      })
      .filter((agency) => state.selectedState === 'all' || agency.state === state.selectedState)
      .filter((agency) => state.selectedCategory === 'all' || agency.category === state.selectedCategory)
      .filter((agency) => {
        if (!query) return true;
        const haystack = normalizeText([
          agency.name, agency.category, agency.state, agency.municipality, agency.city,
          agency.address, ...(agency.services || [])
        ].join(' '));
        return haystack.includes(query);
      });

    agencies.sort((a, b) => {
      if (state.sort === 'distance' && state.userLocation) return a._distance - b._distance;
      if (state.sort === 'name') return a.name.localeCompare(b.name, 'es');
      return a._sourceIndex - b._sourceIndex;
    });
    return agencies;
  }

  function socialLink(platform, url) {
    const safe = safeUrl(url);
    if (!safe) return '';
    const icons = {
      instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook-f',
      tiktok: 'fa-brands fa-tiktok', website: 'fa-solid fa-globe'
    };
    const labels = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', website: 'Sitio web' };
    return `<a class="agency-social" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer" aria-label="${labels[platform] || platform}" title="${labels[platform] || platform}"><i class="${icons[platform] || 'fa-solid fa-link'}"></i></a>`;
  }

  function agencyCard(agency) {
    const maps = safeUrl(agency.maps);
    const whatsapp = agency.whatsapp ? `https://wa.me/${String(agency.whatsapp).replace(/\D/g, '')}` : '';
    const phoneHref = agency.phone ? `tel:${String(agency.phone).replace(/[^+\d]/g, '')}` : '';
    const logoColor = /^#[0-9a-f]{6}$/i.test(agency.logoColor || '') ? agency.logoColor : '#0b2e7a';
    const logoUrl = safeUrl(agency.logo);
    const logo = logoUrl
      ? `<div class="agency-logo" style="--agency-color:${logoColor}"><img src="${escapeHtml(logoUrl)}" alt="Logo de ${escapeHtml(agency.name)}" loading="lazy" /></div>`
      : `<div class="agency-logo" style="--agency-color:${logoColor}" aria-label="Logo demostrativo">${escapeHtml(agency.logoText || agency.name.slice(0, 3).toUpperCase())}</div>`;
    const services = (agency.services || []).slice(0, 4).map((service) => `<span class="agency-service">${escapeHtml(service)}</span>`).join('');
    const socials = Object.entries(agency.socials || {}).map(([platform, url]) => socialLink(platform, url)).join('');
    const distance = Number.isFinite(agency._distance)
      ? `<span class="agency-distance"><i class="fa-solid fa-location-arrow"></i> A ${escapeHtml(formatDistance(agency._distance))}</span>`
      : '';

    return `<article class="agency-card" data-agency-id="${escapeHtml(agency.id)}">
      ${logo}
      <div class="agency-main">
        <div class="agency-heading">
          <div><h4>${escapeHtml(agency.name)}</h4><span class="agency-type">${escapeHtml(agency.category)}</span></div>
          ${agency.demo ? '<span class="agency-demo-tag">Demo</span>' : ''}
        </div>
        <div class="agency-location-line"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(agency.city)}, ${escapeHtml(agency.state)} · ${escapeHtml(agency.address)}</span></div>
        <div class="agency-hours"><i class="fa-regular fa-clock"></i><span>${escapeHtml(agency.hours || 'Horario por confirmar')}</span></div>
        ${distance}
        <div class="agency-services">${services}</div>
      </div>
      <div class="agency-actions">
        ${maps ? `<a class="agency-action primary" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-route"></i> Cómo llegar</a>` : ''}
        ${whatsapp ? `<a class="agency-action whatsapp" href="${escapeHtml(whatsapp)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
        ${phoneHref ? `<a class="agency-action" href="${escapeHtml(phoneHref)}"><i class="fa-solid fa-phone"></i> Llamar</a>` : ''}
        <button class="agency-action" type="button" data-share-agency="${escapeHtml(agency.id)}"><i class="fa-solid fa-share-nodes"></i> Compartir</button>
      </div>
      ${socials ? `<div class="agency-socials">${socials}</div>` : ''}
    </article>`;
  }

  function renderResults() {
    const agencies = getFilteredAgencies();
    elements.resultCount.textContent = `${agencies.length} punto${agencies.length === 1 ? '' : 's'} de atención`;

    const selectedLabel = state.selectedState === 'all' ? 'Toda Venezuela' : state.selectedState;
    const stateTotal = state.agencies.filter((agency) => state.selectedState === 'all' || agency.state === state.selectedState).length;
    elements.summary.innerHTML = `<div><strong>${escapeHtml(selectedLabel)}</strong><span>${stateTotal ? 'Selecciona un perfil para contactar o llegar.' : 'Aún no hay registros de prueba en este estado.'}</span></div><span class="network-map-summary-badge">${stateTotal}</span>`;

    if (!agencies.length) {
      elements.results.innerHTML = '<div class="network-empty"><i class="fa-solid fa-map-location-dot"></i><strong>No encontramos puntos con estos filtros.</strong><p>Prueba otro estado, tipo de negocio o término de búsqueda.</p></div>';
      renderMap();
      return;
    }

    const categories = [...new Set(agencies.map((agency) => agency.category))]
      .sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a);
        const indexB = CATEGORY_ORDER.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });

    elements.results.innerHTML = categories.map((category) => {
      const categoryAgencies = agencies.filter((agency) => agency.category === category);
      return `<section class="network-group"><h3 class="network-group-title">${escapeHtml(category)} <span>${categoryAgencies.length}</span></h3>${categoryAgencies.map(agencyCard).join('')}</section>`;
    }).join('');
    renderMap();
  }

  function setSelectedState(value) {
    state.selectedState = STATES.includes(value) ? value : 'all';
    elements.stateSelect.value = state.selectedState;
    renderResults();
    if (window.innerWidth < 861) {
      elements.resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function shareAgency(agencyId) {
    const agency = state.agencies.find((item) => item.id === agencyId);
    if (!agency) return;
    const shareData = {
      title: agency.name,
      text: `${agency.name} · ${agency.category} · ${agency.city}, ${agency.state}`,
      url: agency.maps || window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(`${shareData.text}\n${shareData.url}`)
      .then(() => window.alert('La información del punto de atención fue copiada.'))
      .catch(() => window.alert(`${shareData.text}\n${shareData.url}`));
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      elements.locationStatus.textContent = 'Este dispositivo no admite geolocalización. Puedes elegir el estado manualmente.';
      return;
    }

    elements.locationButton.disabled = true;
    elements.locationButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Localizando';
    elements.locationStatus.textContent = 'Solicitando la ubicación del dispositivo…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        state.sort = 'distance';
        elements.sortSelect.value = 'distance';
        elements.locationButton.classList.add('is-active');
        elements.locationButton.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Ubicación activa';
        elements.locationStatus.textContent = 'Los puntos se ordenan por distancia aproximada desde tu ubicación.';
        elements.locationButton.disabled = false;
        renderResults();
      },
      (error) => {
        const messages = {
          1: 'El permiso de ubicación fue rechazado. Puedes elegir el estado manualmente.',
          2: 'No fue posible determinar tu ubicación. Intenta nuevamente.',
          3: 'La ubicación tardó demasiado en responder. Intenta nuevamente.'
        };
        elements.locationStatus.textContent = messages[error.code] || 'No se pudo obtener la ubicación.';
        elements.locationButton.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Usar mi ubicación';
        elements.locationButton.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }

  function bindEvents() {
    elements.search.addEventListener('input', (event) => {
      state.search = event.target.value;
      renderResults();
    });
    elements.stateSelect.addEventListener('change', (event) => setSelectedState(event.target.value));
    elements.categorySelect.addEventListener('change', (event) => {
      state.selectedCategory = event.target.value;
      renderResults();
    });
    elements.sortSelect.addEventListener('change', (event) => {
      state.sort = event.target.value;
      if (state.sort === 'distance' && !state.userLocation) requestLocation();
      else renderResults();
    });
    elements.locationButton.addEventListener('click', requestLocation);
    elements.modal.addEventListener('click', (event) => {
      const stateButton = event.target.closest('[data-network-state]');
      if (stateButton) setSelectedState(stateButton.dataset.networkState);
      const shareButton = event.target.closest('[data-share-agency]');
      if (shareButton) shareAgency(shareButton.dataset.shareAgency);
    });

    document.getElementById('menuBtnRedAtencion')?.addEventListener('click', () => {
      document.getElementById('mobileNav')?.classList.remove('open');
      document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
    });
  }

  async function loadData() {
    elements.results.innerHTML = '<div class="network-loading"><i class="fa-solid fa-spinner fa-spin"></i> Preparando la red de atención…</div>';
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status}).`);
      const payload = await response.json();
      state.agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
      state.loaded = true;
      populateFilters();
      renderResults();
    } catch (error) {
      console.error(error);
      elements.results.innerHTML = '<div class="network-empty"><i class="fa-solid fa-triangle-exclamation"></i><strong>No se pudo cargar la red de atención.</strong><p>Revisa tu conexión e intenta abrir nuevamente este módulo.</p></div>';
    }
  }

  function initialize() {
    const modal = document.getElementById('modal-red-atencion');
    if (!modal) return;
    elements = {
      modal,
      search: document.getElementById('networkSearch'),
      stateSelect: document.getElementById('networkStateSelect'),
      categorySelect: document.getElementById('networkCategorySelect'),
      sortSelect: document.getElementById('networkSort'),
      locationButton: document.getElementById('networkUseLocation'),
      locationStatus: document.getElementById('networkLocationStatus'),
      mapImage: document.getElementById('networkMapImage'),
      mapShell: document.getElementById('networkMapShell'),
      hotspots: document.getElementById('networkMapHotspots'),
      stateChips: document.getElementById('networkStateChips'),
      summary: document.getElementById('networkMapSummary'),
      results: document.getElementById('networkResults'),
      resultCount: document.getElementById('networkResultCount'),
      resultsPanel: document.getElementById('networkResultsPanel')
    };
    bindEvents();
    loadData();
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
