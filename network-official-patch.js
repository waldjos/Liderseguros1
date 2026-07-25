'use strict';

(() => {
  const DATA_URL = '/api/channel-data';
  let agencyIndex = new Map();

  function ensureStyles() {
    if (document.getElementById('networkOfficialPatchStyles')) return;
    const style = document.createElement('style');
    style.id = 'networkOfficialPatchStyles';
    style.textContent = `
      .agency-code-badge {
        display: inline-flex;
        margin-left: .35rem;
        margin-top: .22rem;
        padding: .24rem .42rem;
        border-radius: 999px;
        background: rgba(11,46,122,.08);
        color: #0b2e7a;
        font-size: .52rem;
        font-weight: 800;
        letter-spacing: .02em;
        vertical-align: top;
      }
      .agency-action.email { background: #f3f6fb; color: #0b2e7a; }
      .network-official-status {
        display: inline-flex;
        align-items: center;
        gap: .35rem;
        color: #167344;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  function patchSourceNote() {
    document.querySelectorAll('.network-source-note').forEach((note) => {
      note.innerHTML = '<span class="network-official-status"><i class="fa-solid fa-circle-check"></i> Directorio oficial</span> de canales alternativos aprobados. Los registros sin coordenadas exactas aparecen en la lista sin pin individual. Cartografía de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.';
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
    patchSourceNote();
    document.querySelectorAll('.agency-card[data-agency-id]').forEach(patchCard);
  }

  async function loadOfficialData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar el directorio (${response.status}).`);
      const payload = await response.json();
      const agencies = Array.isArray(payload.agencies) ? payload.agencies : [];
      agencyIndex = new Map(agencies.map((agency) => [agency.id, agency]));
      patchDirectory();

      const results = document.getElementById('networkResults');
      if (results) new MutationObserver(patchDirectory).observe(results, { childList: true, subtree: true });
      const modal = document.getElementById('modal-red-atencion');
      if (modal) new MutationObserver(patchSourceNote).observe(modal, { childList: true, subtree: true });
      [150, 500, 1200, 2500].forEach((delay) => window.setTimeout(patchDirectory, delay));
    } catch (error) {
      console.error('No se pudo aplicar el directorio oficial:', error);
    }
  }

  function initialize() {
    ensureStyles();
    loadOfficialData();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
