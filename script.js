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

    // Mostrar nombre de archivos seleccionados
    if (fileInput && fileNameSpan) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const names = Array.from(fileInput.files).map(f => f.name).join(', ');
                fileNameSpan.textContent = names;
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
        if (!infoModal || !infoModalTitle || !infoModalMessage) {
            alert(mensaje);
            return;
        }
        infoModalTitle.textContent = titulo;
        infoModalMessage.textContent = mensaje;
        infoModal.classList.add('active');
    }

    if (infoModal && infoModalClose) {
        infoModalClose.addEventListener('click', () => infoModal.classList.remove('active'));
        window.addEventListener('click', (event) => {
            if (event.target === infoModal) {
                infoModal.classList.remove('active');
            }
        });
    }

    // Guardar archivos en localStorage (solo nombres y base64, no rutas)
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
                // Límite de 2 MB por archivo para evitar problemas con localStorage
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
                html += `<li><a href="${doc.data}" download="${doc.name}">${doc.name}</a> <button data-index="${i}" class="delete-doc" style="color:#ff9100;background:none;border:none;cursor:pointer;">Eliminar</button></li>`;
            });
            html += '</ul>';
        }
        savedDocsDiv.innerHTML = html;
        // Botones eliminar
        savedDocsDiv.querySelectorAll('.delete-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
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

    // Mostrar documentos guardados al abrir modal
    const openBtnDocumentos = document.getElementById('btn-documentos');
    const modalDocumentos = document.getElementById('modal-documentos');
    if (openBtnDocumentos && modalDocumentos) {
        openBtnDocumentos.addEventListener('click', mostrarDocumentos);
    }



    console.log("Script loaded. DOM is ready.");

    // --- Modal de Gestión de Documentos ---
    const closeBtnDocumentos = modalDocumentos ? modalDocumentos.querySelector('.close-button') : null;

    // --- Utilidad para abrir/cerrar modales ---
    function setupModal(modalId, openBtnId, closeBtnSelector) {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(openBtnId);
        const closeBtn = modal ? modal.querySelector(closeBtnSelector) : null;
        if (modal && openBtn && closeBtn) {
            openBtn.addEventListener('click', () => {
                modal.classList.add('active');
            });
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    // Modales principales
    setupModal('modal-documentos', 'btn-documentos', '.close-button');
    setupModal('modal-cambio-aceite', 'btn-cambio-aceite', '.close-button');
    setupModal('modal-defensoria', 'btn-defensoria', '.close-button');
    setupModal('modal-instalar-app', 'btn-instalar-app', '.close-button');

    // Modal de Términos y Condiciones (con lógica especial)
    // Variables para el modal de Términos y Condiciones (declaradas una sola vez)
    let modalTerminos = document.getElementById('modal-terminos');
    let openBtnTerminos = document.getElementById('btn-terminos');
    let closeBtnTerminos = modalTerminos ? modalTerminos.querySelector('.close-button') : null;
    let acceptBtnTerminos = document.getElementById('aceptar-terminos-btn');
    let terminosCheckbox = document.getElementById('acepto-terminos-checkbox');
    if (modalTerminos && openBtnTerminos && closeBtnTerminos && acceptBtnTerminos && terminosCheckbox) {
        // Mostrar modal en la primera visita
        if (!localStorage.getItem('terminosAceptados')) {
            modalTerminos.classList.add('active');
        }
        openBtnTerminos.addEventListener('click', () => {
            modalTerminos.classList.add('active');
        });
        closeBtnTerminos.addEventListener('click', () => {
            modalTerminos.classList.remove('active');
        });
        terminosCheckbox.addEventListener('change', () => {
            acceptBtnTerminos.disabled = !terminosCheckbox.checked;
        });
        acceptBtnTerminos.addEventListener('click', () => {
            if (terminosCheckbox.checked) {
                localStorage.setItem('terminosAceptados', 'true');
                modalTerminos.classList.remove('active');
            }
        });
        window.addEventListener('click', (event) => {
            if (event.target === modalTerminos) {
                if (localStorage.getItem('terminosAceptados')) {
                    modalTerminos.classList.remove('active');
                }
            }
        });
    }

    // --- Modal de Términos y Condiciones ---
    // (Eliminado: declaraciones duplicadas de variables para el modal de términos y condiciones)

    if (modalTerminos && openBtnTerminos && closeBtnTerminos && acceptBtnTerminos && terminosCheckbox) {
        // --- Show modal on first visit ---
        if (!localStorage.getItem('terminosAceptados')) {
            modalTerminos.classList.add('active');
        }

        // --- Event Listeners ---
        openBtnTerminos.addEventListener('click', () => {
            console.log("Open button for Terminos modal clicked.");
            modalTerminos.classList.add('active');
        });

        closeBtnTerminos.addEventListener('click', () => {
            modalTerminos.classList.remove('active');
        });

        terminosCheckbox.addEventListener('change', () => {
            acceptBtnTerminos.disabled = !terminosCheckbox.checked;
        });

        acceptBtnTerminos.addEventListener('click', () => {
            if (terminosCheckbox.checked) {
                localStorage.setItem('terminosAceptados', 'true');
                modalTerminos.classList.remove('active');
            }
        });

        window.addEventListener('click', (event) => {
            if (event.target === modalTerminos) {
                console.log("Clicked outside the Terminos modal.");
                // Do not close the modal on outside click if terms have not been accepted
                if (localStorage.getItem('terminosAceptados')) {
                    modalTerminos.classList.remove('active');
                }
            }
        });
    } else {
        console.error('A critical element for the Terminos modal is missing.');
    }

    // Lógica especial para el formulario de cambio de aceite
    const formCambioAceite = document.getElementById('form-cambio-aceite');
    if (formCambioAceite) {
        const kmActualInput = formCambioAceite.querySelector('input[name="km-actual"]');
        const frecuenciaInputs = formCambioAceite.querySelectorAll('input[name="frecuencia"]');
        const kmProximoInput = formCambioAceite.querySelector('input[name="km-proximo"]');
        function calcularProximoCambio() {
            const kmActual = parseInt(kmActualInput.value) || 0;
            let frecuencia = 5000;
            frecuenciaInputs.forEach(radio => { if (radio.checked) frecuencia = parseInt(radio.value); });
            if (kmActual > 0) {
                kmProximoInput.value = kmActual + frecuencia;
            } else {
                kmProximoInput.value = '';
            }
        }
        kmActualInput.addEventListener('input', calcularProximoCambio);
        frecuenciaInputs.forEach(radio => radio.addEventListener('change', calcularProximoCambio));
    }

    // Información temporal para botones cuya funcionalidad aún no está disponible
    const btnCodigo010 = document.getElementById('btn-codigo-010');
    const btnDescargarPoliza = document.getElementById('btn-descargar-poliza');
    const btnReportarSiniestro = document.getElementById('btn-reportar-siniestro');
    const btnDefensoria = document.getElementById('btn-defensoria');
    const btnInstalarAhora = document.getElementById('btn-instalar-ahora');

    function informarFuncionalidadEnDesarrollo(mensaje) {
        abrirModalInfo(mensaje, 'Funcionalidad en desarrollo');
    }

    if (btnCodigo010) {
        btnCodigo010.addEventListener('click', (e) => {
            e.preventDefault();
            informarFuncionalidadEnDesarrollo('La funcionalidad asociada al Código 010 se encuentra en definición con la cooperativa y aún no está disponible desde este llavero digital.');
        });
    }

    // Descargar póliza ahora abre enlace real desde index.html (sin bloqueo JS)

    if (btnReportarSiniestro) {
        // Ya redirige directamente al enlace configurado en index.html
    }

    // Defensoría se abre por setupModal desde el botón en index.html (sin bloqueo JS)

    if (btnInstalarAhora) {
        btnInstalarAhora.addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                abrirModalInfo('Si no ves el mensaje de instalación automática, usa el menú del navegador y selecciona "Agregar a pantalla de inicio".', 'Instalación manual');
                return;
            }

            deferredInstallPrompt.prompt();
            try {
                await deferredInstallPrompt.userChoice;
            } catch (error) {
                console.error('No se completó la instalación PWA:', error);
            } finally {
                deferredInstallPrompt = null;
            }
        });
    }
});
