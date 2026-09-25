(() => {
  const topbar = document.getElementById('topbar');
  const menuButton = document.getElementById('menuButton');
  const syncHeader = () => topbar?.classList.toggle('scrolled', window.scrollY > 24);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  menuButton?.addEventListener('click', () => {
    const open = topbar.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
    topbar?.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
  }
})();