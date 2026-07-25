'use strict';

(() => {
  const SUDEASEG_URL = 'https://www.sudeaseg.gob.ve/sujetos-regulados';

  function loadGuideStyles() {
    if (document.querySelector('link[href="hero-verification-guide.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'hero-verification-guide.css';
    document.head.appendChild(link);
  }

  function openGuide() {
    const modal = document.getElementById('modal-guia-uso');
    if (!modal) return;
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    window.setTimeout(() => modal.querySelector('[data-close-guide]')?.focus({ preventScroll: true }), 50);
  }

  function closeGuide() {
    const modal = document.getElementById('modal-guia-uso');
    if (!modal) return;
    modal.classList.remove('active');
    if (!document.querySelector('.modal.active')) document.body.classList.remove('modal-open');
  }

  function injectGuideModal() {
    if (document.getElementById('modal-guia-uso')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-guia-uso';
    modal.className = 'modal usage-guide-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'usageGuideTitle');
    modal.innerHTML = `
      <div class="modal-content usage-guide-content">
        <header class="usage-guide-header">
          <div class="usage-guide-heading">
            <span class="usage-guide-heading-icon"><i class="fa-solid fa-book-open"></i></span>
            <div>
              <p class="eyebrow">Ayuda paso a paso</p>
              <h2 id="usageGuideTitle">Guía completa de uso</h2>
              <p>Conoce todas las funciones del Portal del Asegurado y cómo utilizarlas de forma segura.</p>
            </div>
          </div>
          <button class="close-button usage-guide-close" type="button" data-close-guide data-close-modal aria-label="Cerrar guía">&times;</button>
        </header>

        <div class="usage-guide-body">
          <section class="usage-guide-start">
            <span><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <div><strong>Empieza por aquí</strong><p>En la portada encontrarás cotización, reporte de siniestros, verificación regulatoria, Red Nacional, documentos, vehículo, alertas y canales de contacto.</p></div>
          </section>

          <div class="usage-guide-grid">
            <details open>
              <summary><span><i class="fa-solid fa-shield-halved"></i></span> Cotizar y reportar un siniestro</summary>
              <div class="usage-guide-detail"><p><strong>Cotiza</strong> abre el canal oficial de WhatsApp para solicitar precio y orientación. <strong>Siniestro</strong> abre el canal destinado a reportar incidentes y recibir instrucciones.</p><p>Ten disponibles tus datos personales, información del vehículo y documentación relacionada con el caso.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-building-shield"></i></span> Verificar regulación en SUDEASEG</summary>
              <div class="usage-guide-detail"><p>Pulsa <strong>Autorizada por SUDEASEG</strong> para abrir la lista oficial de sujetos regulados. Allí podrás comprobar la información publicada por la Superintendencia de la Actividad Aseguradora.</p><a href="${SUDEASEG_URL}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir sujetos regulados</a></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-map-location-dot"></i></span> Usar la Red Nacional</summary>
              <div class="usage-guide-detail"><p>Pulsa <strong>Red Nacional</strong> debajo de los beneficios. Selecciona un estado en el mapa o en la lista, utiliza los filtros por tipo de negocio y busca por nombre, ciudad o servicio.</p><p>Al permitir tu ubicación, el portal puede ordenar los puntos por cercanía. Cada perfil puede mostrar logo, teléfono, WhatsApp, redes sociales, horario y ruta en Google Maps.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-file-shield"></i></span> Guardar Mis Documentos</summary>
              <div class="usage-guide-detail"><p>En <strong>Mis Documentos</strong> puedes conservar cédula, licencia, póliza y otros archivos PDF, JPG o PNG. También puedes registrar fechas de vencimiento.</p><p>Los documentos se almacenan localmente en el dispositivo. Usa las opciones de exportar e importar para conservar una copia de respaldo.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-car-side"></i></span> Registrar Mi Vehículo</summary>
              <div class="usage-guide-detail"><p>Completa placa, marca, modelo, año, kilometraje y fecha de vencimiento de la póliza. Esa información activa el resumen del vehículo y permite calcular avisos.</p><p>En Mantenimiento registra cambios de aceite, filtros, frenos, neumáticos, batería y próximos kilometrajes o fechas.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-bell"></i></span> Activar notificaciones</summary>
              <div class="usage-guide-detail"><p>El módulo de notificaciones reúne alertas de póliza, documentos y mantenimiento. Pulsa <strong>Activar</strong> y acepta el permiso del navegador.</p><p>Las alertas dependen de los datos y fechas que hayas registrado en este dispositivo.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-file-arrow-down"></i></span> Descargar o renovar la póliza</summary>
              <div class="usage-guide-detail"><p><strong>Descargar Póliza</strong> abre el sistema disponible para consultar el documento. <strong>Renovar Póliza</strong> conecta con el canal oficial de renovación.</p><p>Verifica que los datos del asegurado y del vehículo estén correctos antes de completar cualquier trámite.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-location-dot"></i></span> Ubicación, contacto y reseñas</summary>
              <div class="usage-guide-detail"><p>La tarjeta de ubicación permite abrir la ruta en Google Maps o llamar directamente. La sección de reseñas enlaza con Google para compartir tu experiencia.</p><p>Los iconos sociales llevan a los perfiles oficiales disponibles en el portal.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-mobile-screen-button"></i></span> Instalar la aplicación</summary>
              <div class="usage-guide-detail"><p>Desde el menú selecciona <strong>Instalar aplicación</strong>. En Android utiliza Instalar o Agregar a pantalla de inicio. En iPhone abre Compartir y selecciona Agregar a pantalla de inicio.</p><p>La instalación crea un acceso directo y permite usar algunas funciones locales con mayor comodidad.</p></div>
            </details>

            <details>
              <summary><span><i class="fa-solid fa-lock"></i></span> Privacidad y permisos</summary>
              <div class="usage-guide-detail"><p>Los datos de vehículo y los documentos personales permanecen en el dispositivo mientras no exista un servicio autenticado de respaldo. El portal solo solicita ubicación o notificaciones cuando eliges utilizar esas funciones.</p><p>No compartas códigos, contraseñas ni información financiera mediante canales que no estén identificados como oficiales.</p></div>
            </details>
          </div>

          <section class="usage-guide-footer-note">
            <i class="fa-solid fa-circle-info"></i>
            <p>La guía puede abrirse nuevamente desde el botón principal. Las funciones disponibles pueden ampliarse cuando se incorpore la información oficial completa de la red nacional.</p>
          </section>
        </div>
      </div>`;

    document.body.appendChild(modal);
    modal.querySelector('[data-close-guide]')?.addEventListener('click', closeGuide);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeGuide(); });
  }

  function enhanceHeroActions() {
    const currentTrust = document.querySelector('.hero-trust');
    if (!currentTrust || currentTrust.closest('.hero-verification-actions')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'hero-verification-actions';

    const verificationLink = document.createElement('a');
    verificationLink.className = 'hero-trust hero-trust-link';
    verificationLink.href = SUDEASEG_URL;
    verificationLink.target = '_blank';
    verificationLink.rel = 'noopener noreferrer';
    verificationLink.setAttribute('aria-label', 'Verificar autorización en el portal de SUDEASEG');
    verificationLink.innerHTML = '<i class="fa-solid fa-shield-halved"></i><span>Autorizada por SUDEASEG</span><i class="fa-solid fa-arrow-up-right-from-square hero-trust-external"></i>';

    const guideButton = document.createElement('button');
    guideButton.type = 'button';
    guideButton.className = 'hero-guide-button';
    guideButton.setAttribute('data-open-modal', 'modal-guia-uso');
    guideButton.innerHTML = '<span class="hero-guide-button-icon"><i class="fa-solid fa-book-open"></i></span><span><strong>Guía de uso</strong><small>Conoce todas las funciones</small></span>';
    guideButton.addEventListener('click', openGuide);

    currentTrust.replaceWith(wrapper);
    wrapper.append(verificationLink, guideButton);
  }

  function initialize() {
    loadGuideStyles();
    injectGuideModal();
    enhanceHeroActions();
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('modal-guia-uso')?.classList.contains('active')) closeGuide();
    });
  }

  loadGuideStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
