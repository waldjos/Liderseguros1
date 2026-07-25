'use strict';

(() => {
  const PARAM = 'view';
  const VALUE = 'red-nacional';
  const HASH = '#red-nacional';
  const SESSION_KEY = 'liderOpenNetworkDirectory';
  const MODAL_ID = 'modal-red-atencion';

  function directUrl() {
    return `${window.location.origin}/red-nacional/`;
  }

  function isRequested() {
    const url = new URL(window.location.href);
    return url.searchParams.get(PARAM) === VALUE
      || url.hash === HASH
      || window.sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function setRequested(enabled) {
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set(PARAM, VALUE);
      url.hash = HASH;
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } else {
      url.searchParams.delete(PARAM);
      url.hash = '';
      window.sessionStorage.removeItem(SESSION_KEY);
    }
    window.history.replaceState({}, '', url);
  }

  function activateDirectoryModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return false;

    document.querySelectorAll('.modal.active').forEach((current) => {
      if (current !== modal) {
        current.classList.remove('active');
        current.setAttribute('aria-hidden', 'true');
      }
    });

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    addShareButton();

    window.requestAnimationFrame(() => {
      const focusTarget = modal.querySelector('#networkSearch, button, select, input');
      focusTarget?.focus({ preventScroll: true });
      modal.dispatchEvent(new CustomEvent('network:opened', { bubbles: true }));
      window.dispatchEvent(new Event('resize'));
    });
    return true;
  }

  function openDirectory(attempt = 0) {
    if (activateDirectoryModal()) return;
    if (attempt < 40) window.setTimeout(() => openDirectory(attempt + 1), 100);
  }

  function openDirectorySequence() {
    window.sessionStorage.setItem(SESSION_KEY, '1');
    [0, 80, 220, 520, 1000, 1800].forEach((delay) => {
      window.setTimeout(openDirectory, delay);
    });
  }

  async function shareDirectory() {
    const url = directUrl();
    const data = {
      title: 'Red Nacional de Atención · Líder de Seguros',
      text: 'Consulta los canales alternativos aprobados de Líder de Seguros en Venezuela.',
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      window.alert('El enlace directo a la Red Nacional fue copiado.');
    } catch {
      window.prompt('Copia este enlace:', url);
    }
  }

  function ensureStyles() {
    if (document.getElementById('networkDeepLinkStyles')) return;

    const style = document.createElement('style');
    style.id = 'networkDeepLinkStyles';
    style.textContent = `
      .network-share-directory {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: .45rem;
        padding: .65rem .85rem;
        border: 0;
        border-radius: 12px;
        background: #0b2e7a;
        color: #fff;
        font: inherit;
        font-size: .7rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 18px rgba(11, 46, 122, .16);
      }

      @media (max-width: 520px) {
        .network-share-directory { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function addShareButton() {
    ensureStyles();
    const modal = document.getElementById(MODAL_ID);
    if (!modal || modal.querySelector('.network-share-directory')) return;

    const host = modal.querySelector('.network-toolbar') || modal.querySelector('.network-body') || modal;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'network-share-directory';
    button.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartir Red Nacional';
    button.addEventListener('click', shareDirectory);
    host.prepend(button);
  }

  function initialize() {
    ensureStyles();

    document.addEventListener('click', (event) => {
      if (event.target.closest(`[data-open-modal="${MODAL_ID}"]`)) {
        setRequested(true);
        window.setTimeout(addShareButton, 120);
      }

      if (event.target.closest(`#${MODAL_ID} [data-close-modal]`)) {
        setRequested(false);
      }
    }, true);

    window.addEventListener('popstate', () => {
      const modal = document.getElementById(MODAL_ID);
      if (isRequested()) openDirectorySequence();
      else if (modal?.classList.contains('active')) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
      }
    });

    if (isRequested()) openDirectorySequence();
    window.addEventListener('load', () => {
      if (isRequested()) openDirectorySequence();
    }, { once: true });
    window.setTimeout(addShareButton, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
