const fs = require('fs');
const path = require('path');

const MAP_FIX_CSS = `
/* Corrección robusta del mapa nacional: fondo local y pines reales */
.network-map-shell {
  min-height: 255px !important;
  max-height: 255px !important;
  aspect-ratio: auto !important;
  background:
    url('/assets/venezuela-states-map.svg?v=17') center / 96% auto no-repeat,
    radial-gradient(circle at 72% 18%, rgba(53,153,255,.16), transparent 34%),
    linear-gradient(145deg, #eaf4ff, #f8fbff) !important;
}

.network-map-image {
  display: none !important;
}

.network-map-hotspots {
  z-index: 3;
  pointer-events: none;
}

.network-state-hotspot {
  pointer-events: auto;
  width: 11px !important;
  height: 11px !important;
  border: 2px solid #fff !important;
  background: #9eb3cf !important;
  color: transparent !important;
  box-shadow: 0 3px 8px rgba(11,46,122,.24) !important;
  overflow: visible;
}

.network-state-hotspot .network-state-code {
  display: none !important;
}

.network-state-hotspot.has-data {
  width: 34px !important;
  height: 42px !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: translate(-50%, -78%) !important;
}

.network-state-hotspot.has-data::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 5px;
  width: 25px;
  height: 25px;
  border-radius: 50% 50% 50% 0;
  background: #0b2e7a;
  border: 3px solid #fff;
  box-shadow: 0 7px 15px rgba(11,46,122,.36);
  transform: translateX(-50%) rotate(-45deg);
  transform-origin: center;
}

.network-state-hotspot.has-data::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 13px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  transform: translateX(-50%);
  z-index: 2;
}

.network-state-hotspot.has-data.is-selected::before {
  background: #f7941d;
  box-shadow: 0 7px 16px rgba(247,148,29,.4);
}

.network-state-hotspot.has-data:hover,
.network-state-hotspot.has-data:focus-visible {
  transform: translate(-50%, -78%) scale(1.12) !important;
}

.network-state-count {
  top: -2px !important;
  right: -5px !important;
  z-index: 4;
  min-width: 18px !important;
  height: 18px !important;
  background: #f7941d !important;
  color: #fff !important;
  border: 2px solid #fff !important;
  font-size: .52rem !important;
}

@media (max-width: 520px) {
  .network-map-shell {
    min-height: 235px !important;
    max-height: 235px !important;
    background-size: 97% auto, auto, auto !important;
  }
}

@media (max-width: 390px) {
  .network-map-shell {
    min-height: 210px !important;
    max-height: 210px !important;
  }
  .network-state-hotspot.has-data {
    transform: translate(-50%, -76%) scale(.92) !important;
  }
}
`;

module.exports = (request, response) => {
  try {
    const cssPath = path.join(process.cwd(), 'network-directory.css');
    const baseCss = fs.readFileSync(cssPath, 'utf8');
    response.setHeader('Content-Type', 'text/css; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    response.status(200).send(`${baseCss}\n${MAP_FIX_CSS}`);
  } catch (error) {
    console.error('No se pudo generar el CSS del directorio:', error);
    response.status(500).send('/* Error al generar estilos del directorio */');
  }
};
