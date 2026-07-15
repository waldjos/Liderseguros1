let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('Error al registrar service worker:', error);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // --- Gestión de Documentos Local ---
  const fileInput = document.getElementById('file-upload');
  const fileNameSpan = document.getElementById('file-name');
  const guardarBtn = document.getElementById('guardar-documentos-btn');
  const savedDocsDiv = document.querySelector('#modal-documentos .saved-documents');

  if (fileInput && fileNameSpan) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        fileNameSpan.textContent = Array.from(fileInput.files).map(f => f.name).join(', ');
      } else {
        fileNameSpan.textContent = 'Sin archivos seleccionados';
      }
    });
  }

  // Modal informativo genérico
  const infoModal = document.getElementById('modal-info');
  const infoModalClose = infoModal ? infoModal.querySelector('#close-modal-info') : null;
  const infoModalTitle = infoModal ? infoModal.querySelector('#modal-info-title') : null;
  const infoModalMessage = infoModal ? infoModal.querySelector('#modal-info-message') : null;

  function abrirModalInfo(mensaje, titulo = 'Información') {
    if (!infoModal || !infoModalTitle || !infoModalMessage) { alert(mensaje); return; }
    infoModalTitle.textContent = titulo;
    infoModalMessage.textContent = mensaje;
    infoModal.classList.add('active');
  }

  if (infoModal && infoModalClose) {
    infoModalClose.addEventListener('click', () => infoModal.classList.remove('active'));
    window.addEventListener('click', (event) => {
      if (event.target === infoModal) infoModal.classList.remove('active');
    });
  }

  // Guardar archivos en localStorage
  if (guardarBtn && fileInput && savedDocsDiv) {
    guardarBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!fileInput.files.length) {
        abrirModalInfo('Selecciona al menos un archivo para guardar en Mis Documentos.');
        return;
      }
      let docs = JSON.parse(localStorage.getItem('misDocumentos') || '[]');
      if (docs.length + fileInput.files.length > 5) {
        abrirModalInfo('Solo puedes guardar hasta 5 documentos en total. Elimina alguno si deseas subir nuevos archivos.');
        return;
      }
      for (let file of fileInput.files) {
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
          abrirModalInfo('Solo se permiten archivos PDF, JPG o PNG.', 'Tipo de archivo no permitido');
          continue;
        }
        const maxSizeBytes = 2 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          abrirModalInfo(`El archivo "${file.name}" supera los 2 MB permitidos. Por favor selecciona un archivo más liviano.`, 'Archivo demasiado grande');
          continue;
        }
        const base64 = await toBase64(file);
        docs.push({ name: file.name, data: base64 });
      }
      localStorage.setItem('misDocumentos', JSON.stringify(docs));
      mostrarDocumentos();
      fileInput.value = '';
      fileNameSpan.textContent = 'Sin archivos seleccionados';
      abrirModalInfo('Tus documentos se han guardado correctamente en este dispositivo.', 'Documentos guardados');
    });
  }

  function mostrarDocumentos() {
    let docs = JSON.parse(localStorage.getItem('misDocumentos') || '[]');
    let html = '<h3>Tus documentos guardados</h3>';
    if (docs.length === 0) {
      html += '<p>No hay documentos guardados.</p>';
    } else {
      html += '<ul style="padding-left:18px;">';
      docs.forEach((doc, i) => {
        html += `<li><a href="${doc.data}" download="${doc.name}">${doc.name}</a> <button data-index="${i}" class="delete-doc" style="color:#F7941D;background:none;border:none;cursor:pointer;">Eliminar</button></li>`;
      });
      html += '</ul>';
    }
    savedDocsDiv.innerHTML = html;
    savedDocsDiv.querySelectorAll('.delete-doc').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        let docs = JSON.parse(localStorage.getItem('misDocumentos') || '[]');
        docs.splice(idx, 1);
        localStorage.setItem('misDocumentos', JSON.stringify(docs));
        mostrarDocumentos();
      });
    });
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const openBtnDocumentos = document.getElementById('btn-documentos');
  const modalDocumentos = document.getElementById('modal-documentos');
  if (openBtnDocumentos && modalDocumentos) {
    openBtnDocumentos.addEventListener('click', mostrarDocumentos);
  }

  // --- Menú móvil ---
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const menuBtnDocumentos = document.getElementById('menuBtnDocumentos');
  const menuBtnCambioAceite = document.getElementById('menuBtnCambioAceite');
  const menuBtnDefensoria = document.getElementById('menuBtnDefensoria');

  function closeMobileNav() {
    if (mobileNav && menuToggle) {
      mobileNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }
  function toggleMobileNav() {
    if (!mobileNav || !menuToggle) return;
    const isOpen = mobileNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  }
  if (menuToggle) {
    menuToggle.addEventListener('click', (event) => { event.stopPropagation(); toggleMobileNav(); });
  }
  if (menuBtnDocumentos) menuBtnDocumentos.addEventListener('click', () => { closeMobileNav(); document.getElementById('btn-documentos')?.click(); });
  if (menuBtnCambioAceite) menuBtnCambioAceite.addEventListener('click', () => { closeMobileNav(); document.getElementById('btn-cambio-aceite')?.click(); });
  if (menuBtnDefensoria) menuBtnDefensoria.addEventListener('click', () => {
    closeMobileNav();
    window.location.href = 'tel:02125646727';
  });

  window.addEventListener('click', (event) => {
    if (mobileNav && mobileNav.classList.contains('open') && !event.target.closest('#mobileNav') && !event.target.closest('#menuToggle')) {
      closeMobileNav();
    }
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobileNav(); });

  // --- Utilidad para abrir/cerrar modales ---
  function setupModal(modalId, openBtnId, closeBtnSelector) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = modal ? modal.querySelector(closeBtnSelector) : null;
    if (modal && openBtn && closeBtn) {
      openBtn.addEventListener('click', () => modal.classList.add('active'));
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      window.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('active'); });
    }
  }
  setupModal('modal-documentos', 'btn-documentos', '.close-button');
  setupModal('modal-cambio-aceite', 'btn-cambio-aceite', '.close-button');
  setupModal('modal-defensoria', 'btn-defensoria', '.close-button');
  setupModal('modal-instalar-app', 'btn-instalar-app', '.close-button');

  // --- Términos y Condiciones ---
  const modalTerminos = document.getElementById('modal-terminos');
  const closeBtnTerminos = modalTerminos ? modalTerminos.querySelector('.close-button') : null;
  const acceptBtnTerminos = document.getElementById('aceptar-terminos-btn');
  const terminosCheckbox = document.getElementById('acepto-terminos-checkbox');
  if (modalTerminos && closeBtnTerminos && acceptBtnTerminos && terminosCheckbox) {
    if (!localStorage.getItem('terminosAceptados')) {
      modalTerminos.classList.add('active');
    }
    closeBtnTerminos.addEventListener('click', () => {
      if (localStorage.getItem('terminosAceptados')) modalTerminos.classList.remove('active');
    });
    terminosCheckbox.addEventListener('change', () => { acceptBtnTerminos.disabled = !terminosCheckbox.checked; });
    acceptBtnTerminos.addEventListener('click', () => {
      if (terminosCheckbox.checked) {
        localStorage.setItem('terminosAceptados', 'true');
        modalTerminos.classList.remove('active');
      }
    });
    window.addEventListener('click', (event) => {
      if (event.target === modalTerminos && localStorage.getItem('terminosAceptados')) {
        modalTerminos.classList.remove('active');
      }
    });
  }

  // --- Formulario cambio de aceite ---
  const formCambioAceite = document.getElementById('form-cambio-aceite');
  if (formCambioAceite) {
    const kmActualInput = formCambioAceite.querySelector('input[name="km-actual"]');
    const frecuenciaInputs = formCambioAceite.querySelectorAll('input[name="frecuencia"]');
    const kmProximoInput = formCambioAceite.querySelector('input[name="km-proximo"]');

    function sanitizeEmailValue(value, maxLength = 500) {
      return String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
    }

    function calcularProximoCambio() {
      const kmActual = parseInt(kmActualInput.value) || 0;
      let frecuencia = 5000;
      frecuenciaInputs.forEach(radio => { if (radio.checked) frecuencia = parseInt(radio.value); });
      kmProximoInput.value = kmActual > 0 ? kmActual + frecuencia : '';
    }
    kmActualInput.addEventListener('input', calcularProximoCambio);
    frecuenciaInputs.forEach(radio => radio.addEventListener('change', calcularProximoCambio));
    formCambioAceite.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(formCambioAceite);
      const data = Object.fromEntries(formData.entries());
      const recipient = (data.email || '').toString().trim();

      const safeRecipient = sanitizeEmailValue(recipient || 'contacto@liderdeseguros.com', 250);
      const templateParams = {
        to_email: safeRecipient,
        recipient_email: safeRecipient,
        marca_vehiculo: sanitizeEmailValue(data['marca-vehiculo'], 120),
        marca_aceite: sanitizeEmailValue(data['marca-aceite'], 120),
        tipo_aceite: sanitizeEmailValue(data['tipo-aceite'], 120),
        fecha_cambio: sanitizeEmailValue(data['fecha-cambio'], 80),
        frecuencia: sanitizeEmailValue(data.frecuencia === '7000' ? '7.000 km' : '5.000 km', 80),
        km_actual: sanitizeEmailValue(data['km-actual'], 80),
        km_proximo: sanitizeEmailValue(data['km-proximo'], 80),
        email: safeRecipient
      };

      const payloadSize = new Blob([JSON.stringify(templateParams)]).size;
      if (payloadSize > 50000) {
        throw new Error('El contenido del formulario supera el límite permitido para el envío.');
      }

      try {
        const emailjs = window.emailjs;
        if (window.EMAILJS_DEBUG) {
          console.info('EmailJS config:', window.EMAILJS_CONFIG);
        }
        if (!emailjs || !window.EMAILJS_CONFIG?.publicKey || !window.EMAILJS_CONFIG.serviceId || !window.EMAILJS_CONFIG.templateId) {
          throw new Error('EmailJS no está configurado. Completa publicKey, serviceId y templateId.');
        }

        emailjs.init(window.EMAILJS_CONFIG.publicKey);
        await emailjs.send(
          window.EMAILJS_CONFIG.serviceId,
          window.EMAILJS_CONFIG.templateId,
          templateParams,
          window.EMAILJS_CONFIG.publicKey
        );

        document.getElementById('modal-cambio-aceite')?.classList.remove('active');
        abrirModalInfo('Tu solicitud fue enviada correctamente a la bandeja indicada.', 'Información registrada');
        formCambioAceite.reset();
      } catch (error) {
        console.error('Error al enviar el formulario de cambio de aceite:', error);
        const details = [
          error?.message,
          error?.text,
          error?.status,
          error?.response?.data?.message,
          error?.response?.data?.error,
          error?.response?.statusText
        ].filter(Boolean);
        const rawError = details.join(' | ') || 'Error desconocido';
        const friendlyMessage = rawError.includes('Content cannot be longer') || rawError.includes('límite permitido')
          ? 'El contenido del formulario es demasiado largo para enviarlo automáticamente. Intenta con datos más cortos o contacta por WhatsApp.'
          : rawError.includes('origin') || rawError.includes('forbidden') || rawError.includes('domain')
            ? 'El dominio de la web no está autorizado en EmailJS. Agrega tu dominio en la sección Domains de tu cuenta de EmailJS y vuelve a intentarlo.'
            : rawError.includes('template') || rawError.includes('parameter')
              ? 'La plantilla de EmailJS no está recibiendo los campos esperados. Revisa los nombres de las variables en la plantilla.'
              : `No se pudo enviar el formulario automáticamente. Detalle: ${rawError}`;
        abrirModalInfo(friendlyMessage, 'Error al enviar');
      }
    });
  }

  // --- Instalar App ---
  const btnInstalarAhora = document.getElementById('btn-instalar-ahora');
  if (btnInstalarAhora) {
    btnInstalarAhora.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        abrirModalInfo('Si no ves el mensaje de instalación automática, usa el menú del navegador y selecciona "Agregar a pantalla de inicio".', 'Instalación manual');
        return;
      }
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; }
      catch (error) { console.error('No se completó la instalación PWA:', error); }
      finally { deferredInstallPrompt = null; }
    });
  }

  // --- Carrusel de servicios (flecha ">") ---
  const servicesSlider = document.getElementById('servicesSlider');
  const servicesNext = document.getElementById('servicesNext');
  const quickPrev = document.getElementById('quickPrev');
  if (servicesSlider && servicesNext) {
    const card = servicesSlider.querySelector('.service-card');
    const step = card ? card.getBoundingClientRect().width + 12 : 160;
    servicesNext.addEventListener('click', () => {
      const atEnd = servicesSlider.scrollLeft + servicesSlider.clientWidth >= servicesSlider.scrollWidth - 4;
      servicesSlider.scrollBy({ left: atEnd ? -servicesSlider.scrollWidth : step, behavior: 'smooth' });
    });
  }
  if (quickPrev && servicesSlider) {
    quickPrev.addEventListener('click', () => {
      servicesSlider.scrollBy({ left: -160, behavior: 'smooth' });
    });
  }

  // --- Testimonios ---
  const testimonials = Array.from(document.querySelectorAll('.testimonial-card'));
  let testimonialIndex = testimonials.findIndex(card => card.classList.contains('active'));
  if (testimonialIndex < 0) testimonialIndex = 0;
  function showTestimonial(index) {
    if (!testimonials.length) return;
    testimonials.forEach((card, i) => card.classList.toggle('active', i === index));
    testimonialIndex = index;
  }
  document.getElementById('testimonialPrev')?.addEventListener('click', () => {
    showTestimonial((testimonialIndex - 1 + testimonials.length) % testimonials.length);
  });
  document.getElementById('testimonialNext')?.addEventListener('click', () => {
    showTestimonial((testimonialIndex + 1) % testimonials.length);
  });

  console.log('Script loaded. DOM is ready.');
});
