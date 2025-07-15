console.log("Script.js loaded and running");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded event fired");

  const form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletter-email');
      if (emailInput && emailInput.value) {
        alert(`Gracias por suscribirte con el correo: ${emailInput.value}`);
        emailInput.value = '';
      } else {
        alert('Por favor, ingresa un correo válido.');
      }
    });
  }

  // New code for Oficina Principal button toggle
  const oficinaBtn = document.getElementById('oficina-btn');
  const phoneNumbersContainer = document.getElementById('phone-numbers');

  if (oficinaBtn && phoneNumbersContainer) {
    oficinaBtn.addEventListener('click', () => {
      if (phoneNumbersContainer.style.display === 'none' || phoneNumbersContainer.style.display === '') {
        phoneNumbersContainer.style.display = 'flex';
      } else {
        phoneNumbersContainer.style.display = 'none';
      }
    });
  }

  // New code for Afiliados modal
  const afiliadosBtn = document.getElementById('afiliados-btn');
  const afiliadosModal = document.getElementById('afiliados-modal');
  const modalCloseBtn = afiliadosModal.querySelector('.modal-close-btn');

  // Open modal
  function openModal() {
    console.log("Afiliados button clicked, opening modal");
    afiliadosModal.style.display = 'flex';
    afiliadosModal.setAttribute('aria-hidden', 'false');
  }

  // Close modal
  function closeModal() {
    afiliadosModal.style.display = 'none';
    afiliadosModal.setAttribute('aria-hidden', 'true');
  }

  // Event listeners
  if (afiliadosBtn && afiliadosModal && modalCloseBtn) {
    afiliadosBtn.addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);

    // Close modal on outside click
    afiliadosModal.addEventListener('click', (e) => {
      if (e.target === afiliadosModal) {
        closeModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && afiliadosModal.style.display === 'flex') {
        closeModal();
      }
    });
  }
});
