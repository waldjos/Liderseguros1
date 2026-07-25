'use strict';

(() => {
  const originalFetch = window.fetch.bind(window);
  const officialPath = '/api/channel-data';

  window.fetch = (input, init) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      const url = new URL(raw, window.location.href);
      if (url.pathname.endsWith('/data/agencies-demo.json')) {
        return originalFetch(officialPath, { ...init, cache: 'no-store' });
      }
    } catch (error) {
      console.warn('No se pudo resolver la fuente del directorio:', error);
    }
    return originalFetch(input, init);
  };
})();
