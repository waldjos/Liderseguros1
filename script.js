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

    // Guardar archivos en localStorage (solo nombres y base64, no rutas)
    if (guardarBtn && fileInput && savedDocsDiv) {
        guardarBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!fileInput.files.length) return alert('Selecciona al menos un archivo.');
            let docs = JSON.parse(localStorage.getItem('misDocumentos') || '[]');
            if (docs.length + fileInput.files.length > 5) {
                alert('Solo puedes guardar hasta 5 documentos en total.');
                return;
            }
            for (let file of fileInput.files) {
                if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                    alert('Solo se permiten archivos PDF, JPG o PNG.');
                    continue;
                }
                const base64 = await toBase64(file);
                docs.push({ name: file.name, data: base64 });
            }
            localStorage.setItem('misDocumentos', JSON.stringify(docs));
            mostrarDocumentos();
            fileInput.value = '';
            fileNameSpan.textContent = 'Sin archivos seleccionados';
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
});
