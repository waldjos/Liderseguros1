'use strict';

(() => {
  const STYLE_ID = 'heroFinalCenteringFix';

  function applyFinalCentering() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Ajuste final del encuadre visual del hero. */
      .hero-panel-premium .hero-figure-caracas {
        box-sizing: border-box !important;
        justify-self: center !important;
        align-self: center !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .hero-panel-premium .hero-photo-caracas {
        object-fit: cover !important;
        object-position: center center !important;
      }

      @media (max-width: 720px) {
        .hero-panel-premium .hero-figure-caracas {
          width: calc(100% - 24px) !important;
          max-width: 610px !important;
          margin: 14px auto 0 !important;
          left: auto !important;
          right: auto !important;
          transform: translateX(-6px) !important;
        }

        .hero-panel-premium .hero-photo-caracas {
          position: absolute !important;
          top: 0 !important;
          bottom: 0 !important;
          left: 47% !important;
          right: auto !important;
          width: 106% !important;
          height: 100% !important;
          margin: 0 !important;
          transform: translateX(-50%) !important;
          object-position: center center !important;
        }
      }

      @media (max-width: 410px) {
        .hero-panel-premium .hero-figure-caracas {
          width: calc(100% - 20px) !important;
          transform: translateX(-5px) !important;
        }

        .hero-panel-premium .hero-photo-caracas {
          left: 47% !important;
          width: 106% !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFinalCentering, { once: true });
  } else {
    applyFinalCentering();
  }
})();
