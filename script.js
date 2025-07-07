document.addEventListener('DOMContentLoaded', () => {
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
});

console.log("Página cargada correctamente.");
