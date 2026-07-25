'use strict';

(() => {
  function promoteNetworkButton() {
    const benefits = document.querySelector('.hero-benefits');
    const networkButton = document.getElementById('btn-red-atencion');
    if (!benefits || !networkButton) return;

    let wrapper = document.querySelector('.hero-network-cta-wrap');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'hero-network-cta-wrap';
      wrapper.setAttribute('aria-label', 'Acceso principal a la red nacional');
      benefits.insertAdjacentElement('afterend', wrapper);
    }

    networkButton.className = 'button button-primary hero-network-button';
    networkButton.innerHTML = `
      <span class="hero-network-button-icon"><i class="fa-solid fa-map-location-dot"></i></span>
      <span class="hero-network-button-copy">
        <strong>Red Nacional</strong>
        <small>Ubica agencias y canales en todo el país</small>
      </span>
      <span class="hero-network-button-arrow" aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>
    `;
    wrapper.appendChild(networkButton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', promoteNetworkButton, { once: true });
  } else {
    promoteNetworkButton();
  }
})();
