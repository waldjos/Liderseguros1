const fs = require('fs');
const path = require('path');

const INTERACTIVE_MAP_CSS = `
/* Mapa interactivo nacional basado en Leaflet y OpenStreetMap */
.network-map-shell {
  position: relative !important;
  width: 100% !important;
  height: clamp(360px, 45vw, 470px) !important;
  min-height: 360px !important;
  max-height: 470px !important;
  aspect-ratio: auto !important;
  overflow: hidden !important;
  border-radius: 18px !important;
  background: linear-gradient(145deg, #dceaf6, #eef5fa) !important;
  border: 1px solid rgba(11, 46, 122, 0.12) !important;
  isolation: isolate;
}

.network-map-shell::after,
.network-map-shell.map-error::before {
  display: none !important;
}

.network-map-image,
.network-map-hotspots {
  display: none !important;
}

.network-leaflet-map {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
}

.network-map-shell .leaflet-container {
  width: 100%;
  height: 100%;
  font-family: inherit;
  background: #dfeaf3;
  outline: none;
}

.network-map-shell .leaflet-control-zoom {
  border: 0;
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(17, 40, 85, 0.2);
}

.network-map-shell .leaflet-control-zoom a {
  width: 34px;
  height: 34px;
  line-height: 34px;
  border: 0;
  color: #0b2e7a;
  font-weight: 800;
}

.network-map-shell .leaflet-control-attribution {
  max-width: calc(100% - 12px);
  padding: 2px 6px;
  border-radius: 8px 0 0 0;
  background: rgba(255, 255, 255, 0.88);
  color: #60708d;
  font-size: 0.54rem;
}

.network-map-legend {
  display: grid;
  gap: 0.28rem;
  padding: 0.48rem 0.58rem;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 7px 18px rgba(17, 40, 85, 0.18);
  color: #4f6385;
  font-size: 0.56rem;
  font-weight: 700;
}

.network-map-legend span {
  display: flex;
  align-items: center;
  gap: 0.38rem;
}

.network-map-legend i {
  display: inline-block;
  flex: none;
}

.network-map-legend .state-symbol {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #0b2e7a;
  box-shadow: 0 2px 5px rgba(11, 46, 122, 0.3);
}

.network-map-legend .agency-symbol {
  width: 14px;
  height: 14px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 2px solid #fff;
  background: #f7941d;
  box-shadow: 0 2px 5px rgba(247, 148, 29, 0.35);
}

.network-map-status {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1.2rem;
  text-align: center;
  background: linear-gradient(145deg, #e8f2fb, #f7fbff);
  color: #536a8d;
  font-size: 0.74rem;
  font-weight: 700;
}

.network-map-status[hidden] {
  display: none !important;
}

.network-map-status i {
  color: #0b2e7a;
  font-size: 1.5rem;
}

.network-map-shell.is-error .network-map-status i,
.network-map-status-error i {
  color: #f7941d;
}

.network-state-map-icon,
.network-agency-map-icon,
.network-user-map-icon {
  background: transparent !important;
  border: 0 !important;
}

.network-state-map-marker {
  position: relative;
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid #fff;
  background: rgba(255, 255, 255, 0.94);
  color: #476187;
  font-size: 0.52rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  box-shadow: 0 5px 14px rgba(17, 40, 85, 0.22);
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.network-state-map-marker:hover {
  transform: scale(1.12);
}

.network-state-map-marker.has-data {
  width: 35px;
  height: 35px;
  background: #0b2e7a;
  color: #fff;
  box-shadow: 0 7px 18px rgba(11, 46, 122, 0.34);
}

.network-state-map-marker.is-selected {
  background: #f7941d;
  color: #fff;
  transform: scale(1.14);
  box-shadow: 0 7px 19px rgba(247, 148, 29, 0.42);
}

.network-state-map-marker b {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  border: 2px solid #fff;
  background: #f7941d;
  color: #fff;
  font-size: 0.52rem;
  line-height: 1;
}

.network-agency-map-pin {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 3px solid #fff;
  background: var(--pin-color, #0b2e7a);
  box-shadow: 0 9px 20px rgba(17, 40, 85, 0.4);
}

.network-agency-map-pin span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transform: rotate(45deg);
  background: rgba(255, 255, 255, 0.96);
  color: var(--pin-color, #0b2e7a);
  font-size: 0.48rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.network-user-map-marker {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 4px solid #fff;
  background: #137ad4;
  color: #fff;
  box-shadow: 0 0 0 7px rgba(19, 122, 212, 0.2), 0 8px 18px rgba(17, 40, 85, 0.28);
}

.network-map-shell .leaflet-tooltip {
  padding: 0.34rem 0.5rem;
  border: 0;
  border-radius: 9px;
  background: rgba(9, 35, 83, 0.94);
  color: #fff;
  font-family: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  box-shadow: 0 7px 16px rgba(17, 40, 85, 0.25);
}

.network-map-shell .leaflet-tooltip-top::before {
  border-top-color: rgba(9, 35, 83, 0.94);
}

.network-map-shell .leaflet-popup-content-wrapper {
  border-radius: 15px;
  box-shadow: 0 12px 30px rgba(17, 40, 85, 0.2);
}

.network-map-shell .leaflet-popup-content {
  margin: 0.78rem 0.85rem;
  font-family: inherit;
}

.network-map-popup {
  min-width: 190px;
}

.network-map-popup strong {
  display: block;
  color: #0b2e7a;
  font-size: 0.76rem;
  line-height: 1.25;
}

.network-map-popup > span {
  display: block;
  margin-top: 0.28rem;
  color: #647694;
  font-size: 0.62rem;
  line-height: 1.4;
}

.network-map-popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.38rem;
  margin-top: 0.62rem;
}

.network-map-popup-actions button,
.network-map-popup-actions a {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.38rem 0.48rem;
  border-radius: 9px;
  background: #eef3fb;
  color: #0b2e7a;
  font-size: 0.58rem;
  font-weight: 800;
  text-align: center;
}

.network-map-popup-actions a {
  background: #0b2e7a;
  color: #fff;
}

.agency-card {
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.agency-card.is-map-highlighted {
  border-color: rgba(247, 148, 29, 0.72);
  box-shadow: 0 0 0 4px rgba(247, 148, 29, 0.12), 0 12px 28px rgba(17, 40, 85, 0.12);
  transform: translateY(-2px);
}

.network-map-heading > i {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(11, 46, 122, 0.08);
  color: #0b2e7a;
}

@media (max-width: 860px) {
  .network-map-shell {
    height: 380px !important;
    min-height: 380px !important;
    max-height: 380px !important;
  }
}

@media (max-width: 520px) {
  .network-map-shell {
    height: 330px !important;
    min-height: 330px !important;
    max-height: 330px !important;
    border-radius: 15px !important;
  }

  .network-state-map-marker {
    width: 27px;
    height: 27px;
    font-size: 0.46rem;
  }

  .network-state-map-marker.has-data {
    width: 31px;
    height: 31px;
  }

  .network-state-map-marker b {
    top: -6px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    font-size: 0.46rem;
  }

  .network-agency-map-pin {
    width: 34px;
    height: 34px;
  }

  .network-agency-map-pin span {
    width: 21px;
    height: 21px;
    font-size: 0.43rem;
  }

  .network-map-shell .leaflet-control-attribution {
    font-size: 0.48rem;
  }
}

@media (max-width: 390px) {
  .network-map-shell {
    height: 300px !important;
    min-height: 300px !important;
    max-height: 300px !important;
  }
}
`;

module.exports = (request, response) => {
  try {
    const cssPath = path.join(process.cwd(), 'network-directory.css');
    const baseCss = fs.readFileSync(cssPath, 'utf8');
    response.setHeader('Content-Type', 'text/css; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    response.status(200).send(`${baseCss}\n${INTERACTIVE_MAP_CSS}`);
  } catch (error) {
    console.error('No se pudo generar el CSS del directorio:', error);
    response.status(500).send('/* Error al generar estilos del directorio */');
  }
};
