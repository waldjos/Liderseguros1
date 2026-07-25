'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  const OFFICIAL_NOTE = '<span class="network-official-status"><i class="fa-solid fa-circle-check"></i> Directorio oficial</span> de canales alternativos aprobados. Los registros sin coordenadas exactas aparecen en la lista sin pin individual. Cartografía de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.';
  const COPY_REPLACEMENTS = [
    [/Versión demostrativa:/gi, 'Directorio oficial:'],
    [/estos perfiles son registros de prueba para validar el diseño y el funcionamiento\. Serán sustituidos por la información oficial de la red nacional\.?/gi, 'Los perfiles corresponden a canales alternativos aprobados de la red nacional.'],
    [/Sin registros de prueba/gi, 'Sin canales registrados'],
    [/Aún no hay registros de prueba en este estado\./gi, 'Aún no hay canales registrados en este estado.'],
    [/Logo demostrativo/gi, 'Identificador del canal'],
    [/Los perfiles mostrados continúan siendo demostrativos\./gi, 'Los perfiles mostrados corresponden al directorio oficial aprobado.'],
    [/registros demostrativos/gi, 'registros oficiales'],
    [/registros de prueba/gi, 'canales registrados']
  ];

  let agencyIndex = new Map();
  let patchScheduled = false;

  function replaceCopy(value) {
    return COPY_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value || ''));
  }

  function ensureStyles() {
    if (document.getElementById('networkOfficialPatchStyles')) return;

    const style = document.createElement('style');
    style.id = 'networkOfficialPatchStyles';
    style.textContent = `
      #modal-red-atencion .network-demo-banner,
      #modal-red-atencion .agency-demo-tag {
        display: none !important;
      }

      .agency-code-badge {
        display: inline-flex;
        margin: .22rem 0 0 .35rem;
        padding: .24rem .42rem;
        border-radius: 999px;
        background: rgba(11, 46, 122, .08);
        color: #0b2e7a;
        font-size: .52rem;
        font-weight: 800;
        letter-spacing: .02em;
        vertical-align: top;
      }

      .agency-action.email {
        background: #f3f6fb;
        color: #0b2e7a;
      }

      .network-official-status {
        display: inline-flex;
        align-items: center;
        gap: .35rem;
        color: #167344;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  function patchSourceNote() {
    const note = document.querySelector('#modal-red-atencion .network-source-note');
    if (!note || note.innerHTML === OFFICIAL_NOTE) return;
    note.dataset.officialDirectory = 'true';
    note.innerHTML = OFFICIAL_NOTE;
  }

  function cleanLegacyCopy() {
    const modal = document.getElementById('modal-red-atencion');
    if (!modal) return;

    modal.querySelectorAll('.network-demo-banner, .agency-demo-tag').forEach((node) => node.remove());

    modal.querySelectorAll('[title], [aria-label]').forEach((node) => {
      ['title', 'aria-label'].forEach((attribute) => {
        if (!node.hasAttribute(attribute)) return;
        const current = node.getAttribute(attribute);
        const updated = replaceCopy(current);
        if (updated !== current) node.setAttribute(attribute, updated);
      });
    });

    const walker = document.createTreeWalker(modal, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (node.parentElement?.closest('script, style')) return;
      const updated = replaceCopy(node.nodeValue);
      if (updated !== node.nodeValue) node.nodeValue = updated;
    });
  }

  function patchCard(card) {
    const agency = agencyIndex.get(card.dataset.agencyId);
    if (!agency) return;

    card.querySelectorAll('.agency-demo-tag').forEach((tag) => tag.remove());

    const type = card.querySelector('.agency-type');
    if (type && agency.code && !card.querySelector('.agency-code-badge')) {
      const code = document.createElement('span');
      code.className = 'agency-code-badge';
      code.textContent = agency.code;
      type.insertAdjacentElement('afterend', code);
    }

    const actions = card.querySelector('.agency-actions');
    if (actions && agency.email && !actions.querySelector('a[href^="mailto:"]')) {
      const mail = document.createElement('a');
      mail.className = 'agency-action email';
      mail.href = `mailto:${agency.email}`;
      mail.innerHTML = '<i class="fa-solid fa-envelope"></i> Correo';
      actions.appendChild(mail);
    }
  }

  function patchDirectory() {
    patchScheduled = false;
    cleanLegacyCopy();
    patchSourceNote();
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
  }

  function schedulePatch() {
    if (patchScheduled) return;
    patchScheduled = true;
    window.requestAnimationFrame(patchDirectory);
  }

  function observeDirectory() {
    const modal = document.getElementById('modal-red-atencion');
    if (!modal || modal.dataset.officialObserver === 'true') return;

    modal.dataset.officialObserver = 'true';
    new MutationObserver(schedulePatch).observe(modal, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label']
    });
  }

  async function loadOfficialData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status}).`);

      const payload = await response.json();
      const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
      agencyIndex = new Map(agencies.map((agency) => [agency.id, agency]));
      schedulePatch();
      observeDirectory();

      [120, 350, 800, 1600, 3000].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudo aplicar el directorio oficial:', error);
    }
  }

  function initialize() {
    ensureStyles();
    cleanLegacyCopy();
    patchSourceNote();
    observeDirectory();
    loadOfficialData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
