(() => {
  const parts = [0,1,2,3,4,5,6];
  let index = 0;
  const loadNext = () => {
    if (index >= parts.length) {
      if (window.__LIDER_SPRITE) {
        document.documentElement.style.setProperty(
          '--sprite-image',
          'url("data:image/webp;base64,' + window.__LIDER_SPRITE + '")'
        );
      }
      return;
    }
    const script = document.createElement('script');
    script.src = '/institucional/sprite-part-' + parts[index++] + '.js?v=1';
    script.async = false;
    script.onload = loadNext;
    script.onerror = loadNext;
    document.head.appendChild(script);
  };
  loadNext();
})();