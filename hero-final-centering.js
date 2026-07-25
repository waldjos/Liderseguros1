'use strict';

(() => {
  const STYLE_ID = 'heroFinalCenteringFix';

  function applyFinalCentering() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Centrado y proporciones finales del visual principal. */
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
        /* El cuadro de la imagen usa exactamente el mismo ancho que la barra de beneficios. */
        .hero-panel-premium .hero-figure-caracas {
          width: 100% !important;
          max-width: 100% !important;
          margin: 14px auto 16px !important;
          left: auto !important;
          right: auto !important;
          transform: none !important;
        }

        .hero-panel-premium .hero-benefits {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          position: static !important;
          inset: auto !important;
          transform: none !important;
        }

        /* Mantiene centrada la composición interna de familia, vehículo y franjas. */
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
          width: 100% !important;
          margin-bottom: 14px !important;
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
