document.addEventListener('DOMContentLoaded', () => {

    console.log("Script loaded. DOM is ready.");

    // --- Modal de Gestión de Documentos ---
    const modalDocumentos = document.getElementById('modal-documentos');
    const openBtnDocumentos = document.getElementById('btn-documentos');
    const closeBtnDocumentos = modalDocumentos ? modalDocumentos.querySelector('.close-button') : null;

    if (modalDocumentos && openBtnDocumentos && closeBtnDocumentos) {
        openBtnDocumentos.addEventListener('click', () => {
            console.log("Open button for Documentos modal clicked.");
            modalDocumentos.style.display = 'block';
        });

        closeBtnDocumentos.addEventListener('click', () => {
            console.log("Close button for Documentos modal clicked.");
            modalDocumentos.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modalDocumentos) {
                console.log("Clicked outside the Documentos modal.");
                modalDocumentos.style.display = 'none';
            }
        });
    } else {
        console.error('A critical element for the Documentos modal is missing.');
    }

    // --- Modal de Términos y Condiciones ---
    const modalTerminos = document.getElementById('modal-terminos');
    const openBtnTerminos = document.getElementById('btn-terminos');
    const closeBtnTerminos = modalTerminos ? modalTerminos.querySelector('.close-button') : null;
    const acceptBtnTerminos = document.getElementById('aceptar-terminos-btn');
    const terminosCheckbox = document.getElementById('acepto-terminos-checkbox');

    if (modalTerminos && openBtnTerminos && closeBtnTerminos && acceptBtnTerminos && terminosCheckbox) {
        // --- Show modal on first visit ---
        if (!localStorage.getItem('terminosAceptados')) {
            modalTerminos.style.display = 'block';
        }

        // --- Event Listeners ---
        openBtnTerminos.addEventListener('click', () => {
            console.log("Open button for Terminos modal clicked.");
            modalTerminos.style.display = 'block';
        });

        closeBtnTerminos.addEventListener('click', () => {
            modalTerminos.style.display = 'none';
        });

        terminosCheckbox.addEventListener('change', () => {
            acceptBtnTerminos.disabled = !terminosCheckbox.checked;
        });

        acceptBtnTerminos.addEventListener('click', () => {
            if (terminosCheckbox.checked) {
                localStorage.setItem('terminosAceptados', 'true');
                modalTerminos.style.display = 'none';
            }
        });

        window.addEventListener('click', (event) => {
            if (event.target === modalTerminos) {
                console.log("Clicked outside the Terminos modal.");
                // Do not close the modal on outside click if terms have not been accepted
                if (localStorage.getItem('terminosAceptados')) {
                    modalTerminos.style.display = 'none';
                }
            }
        });
    } else {
        console.error('A critical element for the Terminos modal is missing.');
    }

        // --- Modal de Cambio de Aceite ---
        const modalCambioAceite = document.getElementById('modal-cambio-aceite');
        const openBtnCambioAceite = document.getElementById('btn-cambio-aceite');
        const closeBtnCambioAceite = document.getElementById('close-cambio-aceite');
        const formCambioAceite = document.getElementById('form-cambio-aceite');
        if (modalCambioAceite && openBtnCambioAceite && closeBtnCambioAceite) {
            openBtnCambioAceite.addEventListener('click', () => {
                modalCambioAceite.classList.add('active');
            });
            closeBtnCambioAceite.addEventListener('click', () => {
                modalCambioAceite.classList.remove('active');
            });
            window.addEventListener('click', (e) => {
                if (e.target === modalCambioAceite) {
                    modalCambioAceite.classList.remove('active');
                }
            });
            // Calcular automáticamente el próximo cambio
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
        }
});
