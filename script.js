'use strict';

const STORAGE_KEYS = {
  vehicle: 'liderVehicleProfileV2',
  maintenance: 'liderMaintenanceHistoryV2',
  notificationSettings: 'liderNotificationSettingsV2',
  notificationLog: 'liderNotificationLogV2',
  terms: 'terminosAceptadosV2'
};

const MAX_DOCUMENTS = 12;
const MAX_DOCUMENT_SIZE = 8 * 1024 * 1024;
const DOCUMENT_TYPES = {
  cedula: 'Cédula de identidad',
  licencia: 'Licencia de conducir',
  'certificado-medico': 'Certificado médico',
  poliza: 'Póliza',
  vehiculo: 'Documento del vehículo',
  otro: 'Otro documento'
};

let deferredInstallPrompt = null;
let documentsDbPromise = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
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

function uid(prefix = 'item') {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`No se pudo leer ${key}:`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : 'Sin fecha';
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('es-VE').format(number) : '0';
}

function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  const focusTarget = modal.querySelector('input:not([type="hidden"]), button, select, textarea');
  window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 50);
}

function closeModal(modal) {
  if (!modal) return;
  if (modal.id === 'modal-terminos' && !localStorage.getItem(STORAGE_KEYS.terms)) return;
  modal.classList.remove('active');
  if (!document.querySelector('.modal.active')) document.body.classList.remove('modal-open');
}

function showInfo(message, title = 'Información') {
  const modal = document.getElementById('modal-info');
  const titleElement = document.getElementById('modal-info-title');
  const messageElement = document.getElementById('modal-info-message');
  if (!modal || !titleElement || !messageElement) {
    window.alert(message);
    return;
  }
  titleElement.textContent = title;
  messageElement.textContent = message;
  openModal('modal-info');
}

function initializeModalControls() {
  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });

  document.querySelectorAll('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.openModal));
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openModals = Array.from(document.querySelectorAll('.modal.active'));
    closeModal(openModals.at(-1));
  });
}

function initializeMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');

  const closeMenu = () => {
    mobileNav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };

  menuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = mobileNav?.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
  });

  const modalLinks = {
    menuBtnDocumentos: 'modal-documentos',
    menuBtnVehiculo: 'modal-vehiculo',
    menuBtnNotificaciones: 'modal-notificaciones',
    menuBtnTerminos: 'modal-terminos',
    menuBtnInstalar: 'modal-instalar-app'
  };

  Object.entries(modalLinks).forEach(([buttonId, modalId]) => {
    document.getElementById(buttonId)?.addEventListener('click', () => {
      closeMenu();
      openModal(modalId);
    });
  });

  document.getElementById('menuBtnDefensoria')?.addEventListener('click', closeMenu);
  window.addEventListener('click', (event) => {
    if (!event.target.closest('#mobileNav') && !event.target.closest('#menuToggle')) closeMenu();
  });
}

function initializeTerms() {
  const modal = document.getElementById('modal-terminos');
  const checkbox = document.getElementById('acepto-terminos-checkbox');
  const acceptButton = document.getElementById('aceptar-terminos-btn');
  if (!modal || !checkbox || !acceptButton) return;

  if (!localStorage.getItem(STORAGE_KEYS.terms)) openModal('modal-terminos');
  checkbox.addEventListener('change', () => { acceptButton.disabled = !checkbox.checked; });
  acceptButton.addEventListener('click', () => {
    if (!checkbox.checked) return;
    localStorage.setItem(STORAGE_KEYS.terms, new Date().toISOString());
    closeModal(modal);
  });
}

function openDocumentsDb() {
  if (documentsDbPromise) return documentsDbPromise;
  documentsDbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador no admite almacenamiento avanzado de documentos.'));
      return;
    }
    const request = indexedDB.open('liderseguros-documents', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('expiry', 'expiry');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la bóveda local.'));
  });
  return documentsDbPromise;
}

async function documentStoreRequest(mode, operation) {
  const db = await openDocumentsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', mode);
    const store = transaction.objectStore('documents');
    let request;
    try { request = operation(store); }
    catch (error) { reject(error); return; }
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo completar la operación.'));
  });
}

const getDocuments = () => documentStoreRequest('readonly', (store) => store.getAll());
const saveDocument = (documentRecord) => documentStoreRequest('readwrite', (store) => store.put(documentRecord));
const deleteDocument = (id) => documentStoreRequest('readwrite', (store) => store.delete(id));

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type: mime });
}

function documentStatus(expiry) {
  const days = daysUntil(expiry);
  if (days === null) return { label: 'Sin vencimiento', className: '' };
  if (days < 0) return { label: `Venció hace ${Math.abs(days)} día(s)`, className: 'danger' };
  if (days === 0) return { label: 'Vence hoy', className: 'danger' };
  if (days <= 30) return { label: `Vence en ${days} día(s)`, className: 'warning' };
  return { label: `Vigente hasta ${formatDate(expiry)}`, className: 'success' };
}

async function renderDocuments() {
  const list = document.getElementById('documentsList');
  const storageHint = document.getElementById('documentsStorageHint');
  if (!list) return [];

  try {
    const documents = (await getDocuments()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (storageHint) storageHint.textContent = `${documents.length} de ${MAX_DOCUMENTS} espacios utilizados`;
    document.getElementById('overviewDocumentsCount').textContent = String(documents.length);

    if (!documents.length) {
      list.innerHTML = '<p class="empty-state">No hay documentos guardados.</p>';
      return documents;
    }

    list.innerHTML = documents.map((record) => {
      const status = documentStatus(record.expiry);
      return `<article class="record-card">
        <span class="record-icon"><i class="fa-solid fa-file-shield"></i></span>
        <div>
          <h4>${escapeHtml(record.label)}</h4>
          <p>${escapeHtml(DOCUMENT_TYPES[record.type] || 'Documento')} · ${escapeHtml(record.fileName)}</p>
          <div class="record-meta"><span class="status-chip ${status.className}">${escapeHtml(status.label)}</span><span class="status-chip">${Math.max(1, Math.round(record.size / 1024))} KB</span></div>
        </div>
        <div class="record-actions">
          <button class="record-action" type="button" data-document-open="${record.id}" aria-label="Abrir"><i class="fa-solid fa-eye"></i></button>
          <button class="record-action" type="button" data-document-download="${record.id}" aria-label="Descargar"><i class="fa-solid fa-download"></i></button>
          <button class="record-action danger" type="button" data-document-delete="${record.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-document-open]').forEach((button) => {
      button.addEventListener('click', () => openStoredDocument(button.dataset.documentOpen, false));
    });
    list.querySelectorAll('[data-document-download]').forEach((button) => {
      button.addEventListener('click', () => openStoredDocument(button.dataset.documentDownload, true));
    });
    list.querySelectorAll('[data-document-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('¿Deseas eliminar este documento del dispositivo?')) return;
        await deleteDocument(button.dataset.documentDelete);
        await refreshPortalData();
      });
    });
    return documents;
  } catch (error) {
    console.error(error);
    list.innerHTML = '<p class="empty-state">No se pudo acceder a la bóveda local en este navegador.</p>';
    return [];
  }
}

async function openStoredDocument(id, download) {
  const record = await documentStoreRequest('readonly', (store) => store.get(id));
  if (!record?.blob) return;
  const url = URL.createObjectURL(record.blob);
  if (download) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = record.fileName || record.label;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function initializeDocuments() {
  const form = document.getElementById('documentForm');
  const fileInput = document.getElementById('documentFile');
  const fileName = document.getElementById('documentFileName');

  fileInput?.addEventListener('change', () => {
    fileName.textContent = fileInput.files?.[0]?.name || 'Seleccionar PDF, JPG o PNG';
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput?.files?.[0];
    if (!file) { showInfo('Selecciona un archivo para continuar.'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      showInfo('Solo se permiten archivos PDF, JPG o PNG.', 'Archivo no permitido');
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      showInfo('El archivo supera el límite de 8 MB.', 'Archivo demasiado grande');
      return;
    }

    const existing = await getDocuments();
    if (existing.length >= MAX_DOCUMENTS) {
      showInfo(`Solo puedes guardar ${MAX_DOCUMENTS} documentos. Elimina uno antes de agregar otro.`, 'Límite alcanzado');
      return;
    }

    const data = new FormData(form);
    await saveDocument({
      id: uid('doc'),
      type: String(data.get('documentType') || 'otro'),
      label: String(data.get('documentLabel') || file.name).trim().slice(0, 80),
      expiry: String(data.get('documentExpiry') || ''),
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      blob: file,
      createdAt: new Date().toISOString()
    });

    form.reset();
    if (fileName) fileName.textContent = 'Seleccionar PDF, JPG o PNG';
    await refreshPortalData();
    showInfo('El documento quedó guardado únicamente en este dispositivo.', 'Documento guardado');
  });

  document.getElementById('exportDocuments')?.addEventListener('click', async () => {
    const documents = await getDocuments();
    if (!documents.length) { showInfo('No hay documentos para exportar.'); return; }
    const exportable = [];
    for (const record of documents) {
      exportable.push({ ...record, blob: undefined, dataUrl: await blobToDataUrl(record.blob) });
    }
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), documents: exportable })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `respaldo-documentos-lider-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importDocuments')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.documents)) throw new Error('Formato de respaldo inválido.');
      const current = await getDocuments();
      const available = MAX_DOCUMENTS - current.length;
      const incoming = payload.documents.slice(0, available);
      for (const record of incoming) {
        const blob = dataUrlToBlob(record.dataUrl);
        if (blob.size > MAX_DOCUMENT_SIZE) continue;
        await saveDocument({
          id: uid('doc'),
          type: DOCUMENT_TYPES[record.type] ? record.type : 'otro',
          label: String(record.label || record.fileName || 'Documento').slice(0, 80),
          expiry: String(record.expiry || ''),
          fileName: String(record.fileName || 'documento'),
          mimeType: blob.type,
          size: blob.size,
          blob,
          createdAt: new Date().toISOString()
        });
      }
      event.target.value = '';
      await refreshPortalData();
      showInfo(`Se importaron ${incoming.length} documento(s).`, 'Respaldo importado');
    } catch (error) {
      console.error(error);
      showInfo('El archivo seleccionado no es un respaldo válido de Líder Seguros.', 'No se pudo importar');
    }
  });
}

function getVehicle() {
  return readJson(STORAGE_KEYS.vehicle, null);
}

function getMaintenance() {
  const records = readJson(STORAGE_KEYS.maintenance, []);
  return Array.isArray(records) ? records : [];
}

function saveMaintenance(records) {
  writeJson(STORAGE_KEYS.maintenance, records);
}

function fillVehicleForm(vehicle) {
  const form = document.getElementById('vehicleForm');
  if (!form || !vehicle) return;
  Object.entries(vehicle).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value ?? '';
  });
}

function renderVehicle() {
  const vehicle = getVehicle();
  const statusCard = document.getElementById('vehicleStatusCard');
  const overview = document.getElementById('overviewVehicleStatus');
  if (!vehicle) {
    if (overview) overview.textContent = 'Sin registrar';
    if (statusCard) statusCard.innerHTML = '<span class="vehicle-status-icon"><i class="fa-solid fa-car"></i></span><div><strong>Aún no has registrado un vehículo</strong><p>Completa el formulario para activar el historial y las alertas.</p></div>';
    return;
  }

  fillVehicleForm(vehicle);
  if (overview) overview.textContent = vehicle.plate || vehicle.brand || 'Registrado';
  const policyDays = daysUntil(vehicle.policyExpiry);
  const policyText = policyDays === null
    ? 'Sin fecha de vencimiento de póliza'
    : policyDays < 0
      ? `Póliza vencida hace ${Math.abs(policyDays)} día(s)`
      : `Póliza vigente por ${policyDays} día(s)`;
  if (statusCard) {
    statusCard.innerHTML = `<span class="vehicle-status-icon"><i class="fa-solid fa-car-side"></i></span><div><strong>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</strong><p>${formatNumber(vehicle.currentKm)} km · ${escapeHtml(policyText)}</p></div>`;
  }
}

function renderMaintenance() {
  const list = document.getElementById('maintenanceList');
  if (!list) return;
  const records = getMaintenance().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!records.length) {
    list.innerHTML = '<p class="empty-state">No hay mantenimientos registrados.</p>';
    return;
  }
  list.innerHTML = records.map((record) => {
    const nextDetails = [];
    if (record.nextKm) nextDetails.push(`Próximo: ${formatNumber(record.nextKm)} km`);
    if (record.nextDate) nextDetails.push(`Fecha: ${formatDate(record.nextDate)}`);
    return `<article class="record-card">
      <span class="record-icon"><i class="fa-solid fa-screwdriver-wrench"></i></span>
      <div><h4>${escapeHtml(record.type)}</h4><p>${formatDate(record.date)} · ${formatNumber(record.km)} km${record.notes ? ` · ${escapeHtml(record.notes)}` : ''}</p><div class="record-meta">${nextDetails.map((item) => `<span class="status-chip">${escapeHtml(item)}</span>`).join('')}</div></div>
      <div class="record-actions"><button class="record-action danger" type="button" data-maintenance-delete="${record.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button></div>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-maintenance-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('¿Deseas eliminar este registro de mantenimiento?')) return;
      saveMaintenance(getMaintenance().filter((record) => record.id !== button.dataset.maintenanceDelete));
      await refreshPortalData();
    });
  });
}

async function sendMaintenanceEmail(vehicle, record) {
  if (!vehicle?.email) throw new Error('No hay un correo registrado en Mi vehículo.');
  const params = {
    to_email: vehicle.email,
    recipient_email: vehicle.email,
    marca_vehiculo: `${vehicle.brand || ''} ${vehicle.model || ''}`.trim(),
    marca_aceite: record.type === 'Cambio de aceite' ? (record.notes || 'No indicada') : 'No aplica',
    tipo_aceite: record.type,
    fecha_cambio: record.date,
    frecuencia: record.nextKm ? `${formatNumber(Number(record.nextKm) - Number(record.km))} km` : 'No indicada',
    km_actual: String(record.km),
    km_proximo: String(record.nextKm || ''),
    email: vehicle.email
  };
  if (!window.emailjs || !window.EMAILJS_CONFIG?.publicKey) throw new Error('El servicio de correo no está disponible.');
  window.emailjs.init(window.EMAILJS_CONFIG.publicKey);
  await window.emailjs.send(window.EMAILJS_CONFIG.serviceId, window.EMAILJS_CONFIG.templateId, params, window.EMAILJS_CONFIG.publicKey);
}

function initializeVehicle() {
  const vehicleForm = document.getElementById('vehicleForm');
  const maintenanceForm = document.getElementById('maintenanceForm');

  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal-content');
      modal.querySelectorAll('.tab-button').forEach((item) => item.classList.toggle('active', item === button));
      modal.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === button.dataset.tab));
    });
  });

  vehicleForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(vehicleForm).entries());
    const currentYear = new Date().getFullYear();
    const year = Number(data.year || 0);
    if (year && (year < 1950 || year > currentYear + 2)) {
      showInfo('Revisa el año del vehículo.', 'Dato inválido');
      return;
    }
    const vehicle = {
      plate: String(data.plate || '').trim().toUpperCase().slice(0, 12),
      brand: String(data.brand || '').trim().slice(0, 40),
      model: String(data.model || '').trim().slice(0, 40),
      year: year || '',
      currentKm: Math.max(0, Number(data.currentKm || 0)),
      policyExpiry: String(data.policyExpiry || ''),
      email: String(data.email || '').trim().slice(0, 120),
      updatedAt: new Date().toISOString()
    };
    writeJson(STORAGE_KEYS.vehicle, vehicle);
    await refreshPortalData();
    showInfo('Los datos del vehículo se guardaron en este dispositivo.', 'Vehículo actualizado');
  });

  maintenanceForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicle = getVehicle();
    if (!vehicle) {
      showInfo('Primero registra los datos básicos de tu vehículo en la pestaña Resumen.', 'Vehículo requerido');
      return;
    }
    const data = Object.fromEntries(new FormData(maintenanceForm).entries());
    const km = Math.max(0, Number(data.km || 0));
    let nextKm = Math.max(0, Number(data.nextKm || 0));
    if (!nextKm && data.type === 'Cambio de aceite') nextKm = km + 5000;
    const record = {
      id: uid('maintenance'),
      type: String(data.type || 'Mantenimiento').slice(0, 50),
      date: String(data.date || ''),
      km,
      nextKm: nextKm || '',
      nextDate: String(data.nextDate || ''),
      notes: String(data.notes || '').trim().slice(0, 300),
      createdAt: new Date().toISOString()
    };
    const records = getMaintenance();
    records.push(record);
    saveMaintenance(records);
    if (km > Number(vehicle.currentKm || 0)) {
      vehicle.currentKm = km;
      vehicle.updatedAt = new Date().toISOString();
      writeJson(STORAGE_KEYS.vehicle, vehicle);
    }
    maintenanceForm.reset();
    await refreshPortalData();

    if (data.sendEmail === 'on') {
      try {
        await sendMaintenanceEmail(vehicle, record);
        showInfo('El mantenimiento se guardó y se envió el resumen al correo registrado.', 'Mantenimiento registrado');
      } catch (error) {
        console.error(error);
        showInfo(`El mantenimiento se guardó, pero no se pudo enviar el correo: ${error.message}`, 'Registro guardado');
      }
    } else {
      showInfo('El mantenimiento se agregó al historial.', 'Mantenimiento registrado');
    }
  });
}

function getNotificationSettings() {
  return { policy: true, documents: true, maintenance: true, ...readJson(STORAGE_KEYS.notificationSettings, {}) };
}

function alertSeverity(days) {
  if (days < 0 || days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'info';
}

async function collectAlerts(documents = null) {
  const settings = getNotificationSettings();
  const alerts = [];
  const vehicle = getVehicle();
  const maintenance = getMaintenance();
  const docs = documents || await getDocuments().catch(() => []);

  if (settings.policy && vehicle?.policyExpiry) {
    const days = daysUntil(vehicle.policyExpiry);
    if (days !== null && days <= 60) {
      alerts.push({
        id: `policy-${vehicle.policyExpiry}`,
        category: 'Póliza y renovación',
        title: days < 0 ? 'La póliza está vencida' : days === 0 ? 'La póliza vence hoy' : `La póliza vence en ${days} día(s)`,
        detail: `${vehicle.brand || ''} ${vehicle.model || ''} · ${vehicle.plate || ''}`.trim(),
        severity: alertSeverity(days),
        days
      });
    }
  }

  if (settings.documents) {
    docs.forEach((record) => {
      const days = daysUntil(record.expiry);
      if (days !== null && days <= 60) {
        alerts.push({
          id: `document-${record.id}-${record.expiry}`,
          category: 'Documento',
          title: days < 0 ? `${record.label} está vencido` : days === 0 ? `${record.label} vence hoy` : `${record.label} vence en ${days} día(s)`,
          detail: DOCUMENT_TYPES[record.type] || 'Documento',
          severity: alertSeverity(days),
          days
        });
      }
    });
  }

  if (settings.maintenance && vehicle) {
    maintenance.forEach((record) => {
      const currentKm = Number(vehicle.currentKm || 0);
      const kmRemaining = record.nextKm ? Number(record.nextKm) - currentKm : null;
      const dateRemaining = record.nextDate ? daysUntil(record.nextDate) : null;
      const kmDue = kmRemaining !== null && kmRemaining <= 1000;
      const dateDue = dateRemaining !== null && dateRemaining <= 45;
      if (!kmDue && !dateDue) return;
      const due = (kmRemaining !== null && kmRemaining <= 0) || (dateRemaining !== null && dateRemaining <= 0);
      const details = [];
      if (kmRemaining !== null) details.push(kmRemaining <= 0 ? `Excedido por ${formatNumber(Math.abs(kmRemaining))} km` : `Faltan ${formatNumber(kmRemaining)} km`);
      if (dateRemaining !== null) details.push(dateRemaining <= 0 ? 'Fecha vencida' : `Faltan ${dateRemaining} día(s)`);
      alerts.push({
        id: `maintenance-${record.id}-${record.nextKm}-${record.nextDate}`,
        category: 'Mantenimiento',
        title: due ? `${record.type} pendiente` : `${record.type} próximo`,
        detail: details.join(' · '),
        severity: due || (kmRemaining !== null && kmRemaining <= 250) || (dateRemaining !== null && dateRemaining <= 7) ? 'danger' : 'warning',
        days: dateRemaining ?? 999
      });
    });
  }

  const order = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.days - b.days);
}

function renderNotificationPermission() {
  const status = document.getElementById('notificationPermissionStatus');
  const button = document.getElementById('enableNotifications');
  if (!status || !button) return;

  if (!('Notification' in window)) {
    status.textContent = 'Este navegador no admite notificaciones.';
    button.disabled = true;
    return;
  }
  const labels = {
    default: 'Permiso del navegador no solicitado.',
    granted: 'Notificaciones del navegador activadas.',
    denied: 'Notificaciones bloqueadas en la configuración del navegador.'
  };
  status.textContent = labels[Notification.permission] || labels.default;
  button.innerHTML = Notification.permission === 'granted'
    ? '<i class="fa-solid fa-check"></i> Activadas'
    : '<i class="fa-solid fa-bell"></i> Activar';
  button.disabled = Notification.permission === 'granted';
}

async function renderNotifications(documents = null) {
  const alerts = await collectAlerts(documents);
  const list = document.getElementById('notificationsList');
  const count = alerts.length;
  document.getElementById('overviewAlertsCount').textContent = String(count);
  ['quickNotificationBadge', 'menuNotificationBadge'].forEach((id) => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('is-hidden', count === 0);
  });

  if (list) {
    list.innerHTML = count ? alerts.map((alert) => `<article class="record-card alert-card ${alert.severity}">
      <span class="record-icon"><i class="fa-solid ${alert.category === 'Mantenimiento' ? 'fa-screwdriver-wrench' : alert.category === 'Documento' ? 'fa-file-circle-exclamation' : 'fa-shield-halved'}"></i></span>
      <div><h4>${escapeHtml(alert.title)}</h4><p>${escapeHtml(alert.category)} · ${escapeHtml(alert.detail)}</p></div>
      <span class="status-chip ${alert.severity === 'info' ? '' : alert.severity}">${alert.severity === 'danger' ? 'Urgente' : alert.severity === 'warning' ? 'Próximo' : 'Aviso'}</span>
    </article>`).join('') : '<p class="empty-state">No tienes alertas pendientes.</p>';
  }
  return alerts;
}

async function showBrowserAlerts(alerts) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !alerts.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const log = readJson(STORAGE_KEYS.notificationLog, {});
  const due = alerts.filter((alert) => alert.severity !== 'info' && log[alert.id] !== today).slice(0, 3);
  if (!due.length) return;

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  for (const alert of due) {
    const options = { body: `${alert.category}: ${alert.detail}`, icon: './assets/logonuevo.png', badge: './assets/logonuevo.png', tag: alert.id };
    if (registration?.showNotification) await registration.showNotification(alert.title, options);
    else new Notification(alert.title, options);
    log[alert.id] = today;
  }
  writeJson(STORAGE_KEYS.notificationLog, log);
}

function initializeNotifications() {
  const settings = getNotificationSettings();
  document.querySelectorAll('[data-notification-setting]').forEach((input) => {
    input.checked = settings[input.dataset.notificationSetting] !== false;
    input.addEventListener('change', async () => {
      const updated = getNotificationSettings();
      updated[input.dataset.notificationSetting] = input.checked;
      writeJson(STORAGE_KEYS.notificationSettings, updated);
      await refreshPortalData();
    });
  });

  document.getElementById('enableNotifications')?.addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    renderNotificationPermission();
    if (permission === 'granted') {
      const alerts = await collectAlerts();
      await showBrowserAlerts(alerts);
      showInfo('Las notificaciones quedaron activadas para este navegador.', 'Alertas activadas');
    }
  });
  renderNotificationPermission();
}

async function refreshPortalData() {
  const documents = await renderDocuments();
  renderVehicle();
  renderMaintenance();
  const alerts = await renderNotifications(documents);
  return { documents, alerts };
}

function initializePwaInstall() {
  document.getElementById('btn-instalar-ahora')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showInfo('Usa el menú del navegador y selecciona “Agregar a pantalla de inicio”.', 'Instalación manual');
      return;
    }
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; }
    finally { deferredInstallPrompt = null; }
  });
}

function initializeCarousels() {
  const servicesSlider = document.getElementById('servicesSlider');
  document.getElementById('servicesNext')?.addEventListener('click', () => {
    if (!servicesSlider) return;
    const atEnd = servicesSlider.scrollLeft + servicesSlider.clientWidth >= servicesSlider.scrollWidth - 4;
    servicesSlider.scrollBy({ left: atEnd ? -servicesSlider.scrollWidth : 170, behavior: 'smooth' });
  });

  const testimonials = Array.from(document.querySelectorAll('.testimonial-card'));
  let index = Math.max(0, testimonials.findIndex((card) => card.classList.contains('active')));
  const show = (next) => {
    if (!testimonials.length) return;
    index = (next + testimonials.length) % testimonials.length;
    testimonials.forEach((card, cardIndex) => card.classList.toggle('active', cardIndex === index));
  };
  document.getElementById('testimonialPrev')?.addEventListener('click', () => show(index - 1));
  document.getElementById('testimonialNext')?.addEventListener('click', () => show(index + 1));
}

document.addEventListener('DOMContentLoaded', async () => {
  initializeModalControls();
  initializeMenu();
  initializeTerms();
  initializeDocuments();
  initializeVehicle();
  initializeNotifications();
  initializePwaInstall();
  initializeCarousels();

  document.getElementById('btn-documentos')?.addEventListener('click', () => openModal('modal-documentos'));
  document.getElementById('btn-vehiculo')?.addEventListener('click', () => openModal('modal-vehiculo'));
  document.getElementById('btn-notificaciones')?.addEventListener('click', () => openModal('modal-notificaciones'));
  document.getElementById('refreshOverview')?.addEventListener('click', async () => {
    await refreshPortalData();
    showInfo('El resumen fue actualizado.', 'Información actualizada');
  });

  const maintenanceDate = document.querySelector('#maintenanceForm input[name="date"]');
  if (maintenanceDate && !maintenanceDate.value) maintenanceDate.value = new Date().toISOString().slice(0, 10);

  const { alerts } = await refreshPortalData();
  await showBrowserAlerts(alerts);
});
