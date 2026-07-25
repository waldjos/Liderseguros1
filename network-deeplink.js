'use strict';

(() => {
  const PARAM = 'view';
  const VALUE = 'red-nacional';
  const MODAL_ID = 'modal-red-atencion';

  function directUrl() {
    return `${window.location.origin}/red-nacional/`;
  }

  function isRequested() {
    const url = new URL(window.location.href);
    return url.searchParams.get(PARAM) === VALUE || url.hash === '#red-nacional';
  }

  function setRequested(enabled) {
    const url = new URL(window.location.href);
    if (enabled) url.searchParams.set(PARAM, VALUE);
    else url.searchParams.delete(PARAM);
    url.hash = '';
    history.replaceState({}, '', url);
  }

  function findOpener() {
    return document.querySelector(`[data-open-modal="${MODAL_ID}"]`)
      || [...document.querySelectorAll('button,a')].find((node) => /red\s+nacional|red\s+de\s+atenci[oó]n/i.test(node.textContent || ''));
  }

  function openDirectory(attempt = 0) {
    const opener = findOpener();
    if (opener) {
      opener.click();
      window.setTimeout(addShareButton, 120);
      return;
    }

    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      addShareButton();
      return;
    }

    if (attempt < 30) window.setTimeout(() => openDirectory(attempt + 1), 150);
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
      if (isRequested()) openDirectory();
      else if (modal?.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
      }
    });

    if (isRequested()) openDirectory();
    window.setTimeout(addShareButton, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
