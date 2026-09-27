(() => {
  const parts = [0,1,2,3,4,5,6];
  let i = 0;
  const finish = () => {
    const host = document.querySelector('.hero-photo-collage');
    if (!host || !window.__HERO_MOBILE) return;
    if (!host.querySelector('.hero-exact-image')) {
      const img = document.createElement('img');
      img.className = 'hero-exact-image';
      img.alt = 'Sede, oficinas y flota operativa de Líder de Seguros';
      img.src = 'data:image/webp;base64,' + window.__HERO_MOBILE;
      host.appendChild(img);
    }
    host.classList.add('has-exact-mobile');
  };
  const next = () => {
    if (i >= parts.length) { finish(); return; }
    const s = document.createElement('script');
    s.src = '/institucional/hero-mobile-part-' + parts[i++] + '.js?v=1';
    s.async = false;
    s.onload = next;
    s.onerror = next;
    document.head.appendChild(s);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', next, {once:true});
  } else {
    next();
  }
})();