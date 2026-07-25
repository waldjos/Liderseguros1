'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  let agencyIndex = new Map();
  let patchScheduled = false;

  function ensureStyles() {
    if (document.getElementById('networkOfficialPatchStyles')) return;

    const style = document.createElement('style');
    style.id = 'networkOfficialPatchStyles';
    style.textContent = `
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
    if (!note || note.dataset.officialDirectory === 'true') return;

    note.dataset.officialDirectory = 'true';
    note.innerHTML = '<span class="network-official-status"><i class="fa-solid fa-circle-check"></i> Directorio oficial</span> de canales alternativos aprobados. Los registros sin coordenadas exactas aparecen en la lista sin pin individual. Cartografía de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.';
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
    patchSourceNote();
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
  }

  function schedulePatch() {
    if (patchScheduled) return;
    patchScheduled = true;
    window.requestAnimationFrame(patchDirectory);
  }

  async function loadOfficialData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status}).`);

      const payload = await response.json();
      const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
      agencyIndex = new Map(agencies.map((agency) => [agency.id, agency]));
      schedulePatch();

      const results = document.getElementById('networkResults');
      if (results) {
        new MutationObserver(schedulePatch).observe(results, { childList: true, subtree: true });
      }

      [200, 600, 1400, 2800].forEach((delay) => window.setTimeout(schedulePatch, delay));
    } catch (error) {
      console.error('No se pudo aplicar el directorio oficial:', error);
    }
  }

  function initialize() {
    ensureStyles();
    loadOfficialData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
