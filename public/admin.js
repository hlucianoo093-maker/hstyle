const state = {
  appointments: [],
  services: [],
  barbers: [],
  bundles: [],
  employees: [],
  workingHours: [],
  unavailableDates: [],
  settings: {
    business_name: 'Old Gold',
    logo_url: '',
    business_type: 'barber',
    country: 'MK',
    currency: 'MKD',
    language: 'mk',
    supported_languages: ['mk', 'sq'],
  },
};

const pageTitles = {
  overview: 'Overview',
  appointments: 'Appointments',
  services: 'Services',
  barbers: 'Barbers',
  schedule: 'Schedule',
  settings: 'Settings',
};

const loginPanel = document.getElementById('loginPanel');
const adminContent = document.getElementById('adminContent');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const appointmentsList = document.getElementById('appointmentsList');
const recentAppointments = document.getElementById('recentAppointments');
const serviceForm = document.getElementById('serviceForm');
const barberForm = document.getElementById('barberForm');
const hoursForm = document.getElementById('hoursForm');
const unavailableForm = document.getElementById('unavailableForm');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return 'Date not set';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(state.settings.language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function setAuthenticated(authenticated) {
  loginPanel.classList.toggle('hidden', authenticated);
  adminContent.classList.toggle('hidden', !authenticated);
}

function showPage(page) {
  if (!pageTitles[page]) return;

  document.querySelectorAll('[data-page-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.pagePanel === page);
  });
  document.querySelectorAll('.admin-nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
  });
  document.getElementById('pageBreadcrumb').textContent = pageTitles[page];
  document.title = `${pageTitles[page]} | ${state.settings.business_name}`;
  const moreButton = document.getElementById('mobileMoreButton');
  if (moreButton) {
    moreButton.classList.toggle('active', page === 'schedule' || page === 'settings');
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(state.settings.language, {
    style: 'currency',
    currency: state.settings.currency,
  }).format(Number(amount) || 0);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'OG';
}

function updateBrandLogo(image, initialsElement, logoUrl, name) {
  const imageIsValid = Boolean(logoUrl);
  image.onerror = () => {
    image.classList.add('hidden');
    initialsElement.classList.remove('hidden');
  };
  image.onload = () => {
    image.classList.remove('hidden');
    initialsElement.classList.add('hidden');
  };
  if (imageIsValid) {
    image.src = logoUrl;
    image.alt = `${name} logo`;
    return;
  }
  image.removeAttribute('src');
  image.classList.add('hidden');
  initialsElement.classList.remove('hidden');
}

function applyBusinessSettings(settings) {
  state.settings = { ...state.settings, ...settings };
  if (!Array.isArray(state.settings.supported_languages)) {
    state.settings.supported_languages = String(state.settings.supported_languages || 'mk,sq').split(',');
  }
  const { business_name: name, logo_url: logoUrl, business_type: businessType } = state.settings;
  const isSalon = businessType === 'salon';
  pageTitles.barbers = isSalon ? 'Team' : 'Barbers';
  const brandInitials = initials(name);
  document.documentElement.lang = state.settings.language;
  document.body.dataset.businessType = businessType;
  document.querySelectorAll('.business-brand-name').forEach((element) => {
    element.childNodes[0].textContent = name.toUpperCase();
  });
  document.querySelectorAll('.business-brand-subtitle').forEach((element) => {
    element.textContent = businessType === 'salon' ? 'BEAUTY STUDIO' : 'BARBER STUDIO';
  });
  document.querySelectorAll('.business-logo-initials').forEach((element) => {
    element.textContent = brandInitials;
  });
  document.querySelectorAll('.business-logo-image').forEach((image) => {
    updateBrandLogo(image, image.parentElement.querySelector('.business-logo-initials'), logoUrl, name);
  });
  document.querySelector('.mobile-business-name').textContent = name.toUpperCase();
  document.querySelector('[data-page="barbers"] span:not(.nav-icon)').textContent = pageTitles.barbers;
  document.getElementById('teamPageKicker').textContent = isSalon ? 'THE PEOPLE BEHIND YOUR STUDIO' : 'THE PEOPLE BEHIND THE CUT';
  document.getElementById('teamPageTitle').textContent = pageTitles.barbers;
  document.getElementById('teamPageDescription').textContent = isSalon
    ? 'Manage your specialists and the profiles customers see.'
    : 'Manage your team and the profiles customers see.';
  document.getElementById('teamListTitle').textContent = isSalon ? 'Studio specialists' : 'Studio barbers';
  document.getElementById('teamStatLabel').textContent = isSalon ? 'Your specialists' : 'Your barbers';
  document.getElementById('teamStatCaption').textContent = isSalon ? 'On your studio team' : 'On your studio team';
  document.getElementById('barberFormHeading').textContent = isSalon ? 'Add a specialist' : 'Add a barber';
  document.getElementById('barberSubmit').innerHTML = isSalon
    ? 'Add specialist <span aria-hidden="true">→</span>'
    : 'Add barber <span aria-hidden="true">→</span>';
  document.title = `${pageTitles[document.querySelector('.admin-nav-link.active')?.dataset.page || 'overview']} | ${name}`;
  document.getElementById('businessName').value = name;
  document.getElementById('businessLogoUrl').value = logoUrl || '';
  document.getElementById('businessCountry').value = state.settings.country || 'MK';
  document.getElementById('businessLanguage').value = state.settings.language;
  document.querySelectorAll('input[name="supportedLanguages"]').forEach((input) => {
    input.checked = state.settings.supported_languages.includes(input.value);
  });
  document.getElementById('googleReviewUrl').value = state.settings.google_review_url || '';
  document.getElementById('facebookUrl').value = state.settings.facebook_url || '';
  document.getElementById('instagramUrl').value = state.settings.instagram_url || '';
  document.getElementById('serviceCurrencyLabel').textContent = state.settings.currency;
  document.querySelectorAll('.currencyLabel').forEach((element) => { element.textContent = state.settings.currency; });
  document.querySelector(`input[name="businessType"][value="${businessType}"]`).checked = true;
  updateLogoPreview(name, logoUrl);
  const localizedToday = new Date().toLocaleDateString(state.settings.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  document.getElementById('todayLabel').textContent = localizedToday.toUpperCase();
  const activePage = document.querySelector('.admin-nav-link.active')?.dataset.page;
  if (activePage) showPage(activePage);
}

function updateLogoPreview(name, logoUrl) {
  const image = document.getElementById('logoPreviewImage');
  const fallback = document.getElementById('logoPreviewInitials');
  document.getElementById('logoPreviewName').textContent = name || 'Business name';
  fallback.textContent = initials(name || 'Old Gold');
  image.onerror = () => {
    image.classList.add('hidden');
    fallback.classList.remove('hidden');
  };
  image.onload = () => {
    image.classList.remove('hidden');
    fallback.classList.add('hidden');
  };
  if (!logoUrl) {
    image.removeAttribute('src');
    image.classList.add('hidden');
    fallback.classList.remove('hidden');
    return;
  }
  image.src = logoUrl;
}

function showMessage(message, isError = false) {
  const toast = document.getElementById('adminToast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  window.clearTimeout(showMessage.timeout);
  showMessage.timeout = window.setTimeout(() => toast.classList.remove('visible'), 3200);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function renderAppointmentRow(appointment, compact = false) {
  const status = escapeHtml(appointment.status);
  const date = formatDate(appointment.appointment_date);
  const actions = appointment.status === 'cancelled'
    ? ''
    : `<div class="appointment-actions">
        ${appointment.status !== 'confirmed' ? `<button type="button" class="row-action confirm-action" data-action="confirm" data-id="${appointment.id}">Confirm</button>` : ''}
        <button type="button" class="row-action cancel-action" data-action="cancel" data-id="${appointment.id}">Cancel</button>
      </div>`;

  return `<article class="appointment-row ${compact ? 'compact' : ''}">
    <div class="appointment-date-block"><strong>${escapeHtml(appointment.appointment_time)}</strong><span>${escapeHtml(date)}</span></div>
    <div class="appointment-customer"><strong>${escapeHtml(appointment.customer_name)}</strong><span>${escapeHtml(appointment.phone)}</span></div>
    <div class="appointment-service"><strong>${escapeHtml(appointment.service_name)}</strong><span>${escapeHtml(appointment.barber_name)} · ${Number(appointment.service_duration)} min</span></div>
    <span class="status-pill ${status}">${status}</span>
    ${actions}
  </article>`;
}

function filteredAppointments() {
  const search = (document.getElementById('appointmentSearch')?.value || '').trim().toLowerCase();
  const date = document.getElementById('appointmentDateFilter')?.value || '';
  return state.appointments.filter((appointment) => {
    const matchesSearch = !search
      || appointment.customer_name.toLowerCase().includes(search)
      || appointment.phone.toLowerCase().includes(search)
      || appointment.service_name.toLowerCase().includes(search)
      || appointment.barber_name.toLowerCase().includes(search);
    return matchesSearch && (!date || appointment.appointment_date === date);
  });
}

function renderAppointments() {
  const appointments = filteredAppointments();
  appointmentsList.innerHTML = appointments.length
    ? appointments.map((appointment) => renderAppointmentRow(appointment)).join('')
    : '<div class="empty-state"><span>▦</span><strong>No appointments found</strong><p>Try changing your filters or check back later.</p></div>';

  const today = localDateString();
  const todayAppointments = state.appointments.filter((appointment) => appointment.appointment_date === today);
  const pending = state.appointments.filter((appointment) => appointment.status === 'pending');
  document.getElementById('todayAppointments').textContent = todayAppointments.length;
  document.getElementById('pendingAppointments').textContent = pending.length;
  document.getElementById('activeServices').textContent = state.services.length;
  document.getElementById('activeBarbers').textContent = state.barbers.length;
  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('mobilePendingCount').textContent = pending.length;
  document.getElementById('mobilePendingCount').classList.toggle('hidden', pending.length === 0);

  const latest = [...state.appointments]
    .sort((a, b) => `${b.appointment_date} ${b.appointment_time}`.localeCompare(`${a.appointment_date} ${a.appointment_time}`))
    .slice(0, 5);
  recentAppointments.innerHTML = latest.length
    ? latest.map((appointment) => renderAppointmentRow(appointment, true)).join('')
    : '<div class="empty-state"><span>▦</span><strong>Your bookings will show up here</strong><p>New online appointments appear in this dashboard.</p></div>';

  bindAppointmentActions();
}

function bindAppointmentActions() {
  document.querySelectorAll('[data-action][data-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await fetchJson(`/api/admin/appointments/${button.dataset.id}/${button.dataset.action}`, { method: 'POST' });
        await loadAdminData();
        showMessage(`Appointment ${button.dataset.action === 'confirm' ? 'confirmed' : 'cancelled'}.`);
      } catch (error) {
        button.disabled = false;
        showMessage(error.message, true);
      }
    });
  });
}

function renderServices() {
  const list = document.getElementById('serviceList');
  list.innerHTML = state.services.length
    ? state.services.map((service) => `
      <article class="management-item">
        <div class="management-icon service-icon">✂</div>
        <div class="management-item-copy"><strong>${escapeHtml(service.name)}</strong><span>${Number(service.duration)} min appointment</span></div>
        <strong class="management-price">${escapeHtml(formatCurrency(service.price))}</strong>
        <div class="management-item-actions">
          <button type="button" class="icon-action" data-edit-service="${service.id}" aria-label="Edit ${escapeHtml(service.name)}" title="Edit">✎</button>
          <button type="button" class="icon-action remove-action" data-delete-service="${service.id}" aria-label="Remove ${escapeHtml(service.name)}" title="Remove">×</button>
        </div>
      </article>`).join('')
    : '<div class="empty-state"><span>✂</span><strong>No services yet</strong><p>Add a service to make it available for online booking.</p></div>';

  list.querySelectorAll('[data-edit-service]').forEach((button) => {
    button.addEventListener('click', () => {
      const service = state.services.find((item) => item.id === Number(button.dataset.editService));
      if (!service) return;
      serviceForm.dataset.editId = service.id;
      serviceForm.elements.name.value = service.name;
      serviceForm.elements.price.value = service.price;
      serviceForm.elements.duration.value = service.duration;
      document.getElementById('serviceFormHeading').textContent = 'Edit service';
      document.getElementById('serviceSubmit').innerHTML = 'Save changes <span aria-hidden="true">→</span>';
      document.getElementById('cancelServiceEdit').classList.remove('hidden');
      serviceForm.elements.name.focus();
    });
  });
  list.querySelectorAll('[data-delete-service]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetchJson(`/api/admin/services/${button.dataset.deleteService}`, { method: 'DELETE' });
        await loadAdminData();
        showMessage('Service removed.');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });
}

function resetBundleForm() {
  const form = document.getElementById('bundleForm');
  form.reset();
  delete form.dataset.editId;
  document.getElementById('bundleFormHeading').textContent = 'Create a bundle';
  document.getElementById('bundleSubmit').innerHTML = 'Create bundle <span aria-hidden="true">→</span>';
  document.getElementById('cancelBundleEdit').classList.add('hidden');
}

function renderBundles() {
  const list = document.getElementById('bundleAdminList');
  const choices = document.getElementById('bundleServiceChoices');
  list.innerHTML = state.bundles.length ? state.bundles.map((bundle) => `
    <article class="management-item">
      <div class="management-icon service-icon">✦</div>
      <div class="management-item-copy"><strong>${escapeHtml(bundle.name)}</strong><span>${escapeHtml(bundle.included_services || '')}</span></div>
      <strong class="management-price">${escapeHtml(formatCurrency(bundle.price))}</strong>
      <div class="management-item-actions">
        <button type="button" class="icon-action" data-edit-bundle="${bundle.id}" aria-label="Edit ${escapeHtml(bundle.name)}" title="Edit">✎</button>
        <button type="button" class="icon-action remove-action" data-delete-bundle="${bundle.id}" aria-label="Remove ${escapeHtml(bundle.name)}" title="Remove">×</button>
      </div>
    </article>`).join('') : '<p class="schedule-empty">No bundles yet. Create a package from your services.</p>';
  choices.innerHTML = state.services.map((service) => `
    <label class="bundle-service-choice"><input type="checkbox" name="serviceIds" value="${service.id}" /> <span>${escapeHtml(service.name)} · ${escapeHtml(formatCurrency(service.price))}</span></label>
  `).join('') || '<p class="schedule-empty">Add services before creating a bundle.</p>';
  list.querySelectorAll('[data-edit-bundle]').forEach((button) => {
    button.addEventListener('click', () => {
      const bundle = state.bundles.find((item) => item.id === Number(button.dataset.editBundle));
      if (!bundle) return;
      const form = document.getElementById('bundleForm');
      form.dataset.editId = bundle.id;
      form.elements.name.value = bundle.name;
      form.elements.description.value = bundle.description;
      form.elements.price.value = bundle.price;
      const selectedIds = String(bundle.included_service_ids || '').split(',').map(Number);
      form.querySelectorAll('input[name="serviceIds"]').forEach((input) => { input.checked = selectedIds.includes(Number(input.value)); });
      document.getElementById('bundleFormHeading').textContent = 'Edit bundle';
      document.getElementById('bundleSubmit').innerHTML = 'Save changes <span aria-hidden="true">→</span>';
      document.getElementById('cancelBundleEdit').classList.remove('hidden');
    });
  });
  list.querySelectorAll('[data-delete-bundle]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetchJson(`/api/admin/bundles/${button.dataset.deleteBundle}`, { method: 'DELETE' });
        await loadAdminData();
        showMessage('Bundle removed.');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });
}

function resetEmployeeForm() {
  const form = document.getElementById('employeeForm');
  form.reset();
  delete form.dataset.editId;
  form.elements.barberId.disabled = false;
  form.elements.password.required = true;
  form.elements.password.placeholder = 'At least 10 characters';
  document.getElementById('employeeFormHeading').textContent = 'Create employee login';
  document.getElementById('employeeSubmit').innerHTML = 'Create login <span aria-hidden="true">→</span>';
  document.getElementById('cancelEmployeeEdit').classList.add('hidden');
}

function renderEmployees() {
  const list = document.getElementById('employeeList');
  const employeeByBarber = new Map(state.employees.map((employee) => [Number(employee.barber_id), employee]));
  const availableBarbers = state.barbers.filter((barber) => !employeeByBarber.has(Number(barber.id)));
  document.getElementById('employeeBarber').innerHTML = availableBarbers
    .map((barber) => `<option value="${barber.id}">${escapeHtml(barber.name)}</option>`).join('');
  list.innerHTML = state.employees.length ? state.employees.map((employee) => `
    <article class="management-item">
      <div class="management-avatar">${escapeHtml((employee.name || 'E').trim().charAt(0).toUpperCase())}</div>
      <div class="management-item-copy"><strong>${escapeHtml(employee.name)}</strong><span>@${escapeHtml(employee.username)}</span></div>
      <div class="management-item-actions">
        <button type="button" class="icon-action" data-edit-employee="${employee.barber_id}" aria-label="Edit login for ${escapeHtml(employee.name)}" title="Edit">✎</button>
        <button type="button" class="icon-action remove-action" data-delete-employee="${employee.barber_id}" aria-label="Remove login for ${escapeHtml(employee.name)}" title="Remove">×</button>
      </div>
    </article>`).join('') : '<p class="schedule-empty">No employee logins yet.</p>';
  list.querySelectorAll('[data-edit-employee]').forEach((button) => {
    button.addEventListener('click', () => {
      const employee = state.employees.find((item) => Number(item.barber_id) === Number(button.dataset.editEmployee));
      if (!employee) return;
      const form = document.getElementById('employeeForm');
      form.dataset.editId = employee.barber_id;
      form.elements.username.value = employee.username;
      form.elements.password.value = '';
      form.elements.password.required = false;
      form.elements.password.placeholder = 'Leave empty to keep current password';
      form.elements.barberId.disabled = true;
      document.getElementById('employeeFormHeading').textContent = `Edit ${employee.name}'s login`;
      document.getElementById('employeeSubmit').innerHTML = 'Save login <span aria-hidden="true">→</span>';
      document.getElementById('cancelEmployeeEdit').classList.remove('hidden');
    });
  });
  list.querySelectorAll('[data-delete-employee]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetchJson(`/api/admin/employees/${button.dataset.deleteEmployee}`, { method: 'DELETE' });
        await loadAdminData();
        showMessage('Employee login removed.');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });
}

function renderBarbers() {
  const list = document.getElementById('barberList');
  list.innerHTML = state.barbers.length
    ? state.barbers.map((barber) => `
      <article class="management-item barber-management-item">
        <div class="management-avatar">${escapeHtml((barber.name || 'B').trim().charAt(0).toUpperCase())}</div>
        <div class="management-item-copy"><strong>${escapeHtml(barber.name)}</strong><span>${escapeHtml(barber.title || 'Barber')}</span></div>
        <div class="management-item-actions">
          <button type="button" class="icon-action" data-edit-barber="${barber.id}" aria-label="Edit ${escapeHtml(barber.name)}" title="Edit">✎</button>
          <button type="button" class="icon-action remove-action" data-delete-barber="${barber.id}" aria-label="Remove ${escapeHtml(barber.name)}" title="Remove">×</button>
        </div>
      </article>`).join('')
    : '<div class="empty-state"><span>♙</span><strong>No barbers yet</strong><p>Add your team so customers can choose who they book with.</p></div>';

  list.querySelectorAll('[data-edit-barber]').forEach((button) => {
    button.addEventListener('click', () => {
      const barber = state.barbers.find((item) => item.id === Number(button.dataset.editBarber));
      if (!barber) return;
      barberForm.dataset.editId = barber.id;
      barberForm.elements.name.value = barber.name;
      barberForm.elements.title.value = barber.title || '';
      barberForm.elements.image.value = barber.image || '';
      document.getElementById('barberFormHeading').textContent = 'Edit barber';
      document.getElementById('barberSubmit').innerHTML = 'Save changes <span aria-hidden="true">→</span>';
      document.getElementById('cancelBarberEdit').classList.remove('hidden');
      barberForm.elements.name.focus();
    });
  });
  list.querySelectorAll('[data-delete-barber]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetchJson(`/api/admin/barbers/${button.dataset.deleteBarber}`, { method: 'DELETE' });
        await loadAdminData();
        showMessage('Barber removed.');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });
}

function populateBarberSelects() {
  const options = state.barbers.map((barber) => `<option value="${barber.id}">${escapeHtml(barber.name)}</option>`).join('');
  document.getElementById('hoursBarber').innerHTML = options;
  document.getElementById('unavailableBarber').innerHTML = options;
}

function renderSchedule() {
  const barberById = new Map(state.barbers.map((barber) => [barber.id, barber.name]));
  const hoursList = document.getElementById('workingHoursList');
  hoursList.innerHTML = state.workingHours.length
    ? state.workingHours.map((hours) => `
      <div class="schedule-list-item"><div><strong>${escapeHtml(barberById.get(hours.barber_id) || 'Barber')}</strong><span>${new Date(Date.UTC(2023, 0, 1 + Number(hours.day_of_week))).toLocaleDateString(state.settings.language, { weekday: 'long', timeZone: 'UTC' })}</span></div><strong>${escapeHtml(hours.start_time)}–${escapeHtml(hours.end_time)}</strong></div>`).join('')
    : '<p class="schedule-empty">No custom hours saved yet.</p>';

  const upcoming = state.unavailableDates.filter((entry) => entry.date >= localDateString());
  const datesList = document.getElementById('unavailableDatesList');
  datesList.innerHTML = upcoming.length
    ? upcoming.map((entry) => `
      <div class="schedule-list-item"><div><strong>${formatDate(entry.date)}</strong><span>${escapeHtml(barberById.get(entry.barber_id) || 'Barber')}${entry.reason ? ` · ${escapeHtml(entry.reason)}` : ''}</span></div><button type="button" class="icon-action remove-action" data-delete-unavailable="${entry.id}" aria-label="Remove blocked date" title="Remove blocked date">×</button></div>`).join('')
    : '<p class="schedule-empty">No upcoming blocked dates.</p>';

  datesList.querySelectorAll('[data-delete-unavailable]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetchJson(`/api/admin/unavailable-dates/${button.dataset.deleteUnavailable}`, { method: 'DELETE' });
        await loadAdminData();
        showMessage('Blocked date removed.');
      } catch (error) {
        showMessage(error.message, true);
      }
    });
  });
}

function syncWorkingHoursInputs() {
  const barberId = Number(hoursForm.elements.barberId.value);
  const dayOfWeek = Number(hoursForm.elements.dayOfWeek.value);
  const current = state.workingHours.find((hours) => (
    Number(hours.barber_id) === barberId && Number(hours.day_of_week) === dayOfWeek
  ));
  hoursForm.elements.startTime.value = current?.start_time || '09:00';
  hoursForm.elements.endTime.value = current?.end_time || '18:00';
}

async function loadAdminData() {
  try {
    const [appointments, services, barbers, workingHours, unavailableDates, settings, bundles, employees] = await Promise.all([
      fetchJson('/api/admin/appointments'),
      fetchJson('/api/admin/services'),
      fetchJson('/api/admin/barbers'),
      fetchJson('/api/admin/working-hours'),
      fetchJson('/api/admin/unavailable-dates'),
      fetchJson('/api/admin/settings'),
      fetchJson('/api/admin/bundles'),
      fetchJson('/api/admin/employees'),
    ]);
    state.appointments = appointments;
    state.services = services;
    state.barbers = barbers;
    state.bundles = bundles;
    state.employees = employees;
    state.workingHours = workingHours;
    state.unavailableDates = unavailableDates;
    applyBusinessSettings(settings);
    renderAppointments();
    renderServices();
    renderBundles();
    renderBarbers();
    renderEmployees();
    populateBarberSelects();
    renderSchedule();
    syncWorkingHoursInputs();
  } catch (error) {
    setAuthenticated(false);
    showMessage(error.message, true);
  }
}

function resetServiceForm() {
  serviceForm.reset();
  delete serviceForm.dataset.editId;
  document.getElementById('serviceFormHeading').textContent = 'Add a service';
  document.getElementById('serviceSubmit').innerHTML = 'Add service <span aria-hidden="true">→</span>';
  document.getElementById('cancelServiceEdit').classList.add('hidden');
}

function resetBarberForm() {
  barberForm.reset();
  delete barberForm.dataset.editId;
  const isSalon = state.settings.business_type === 'salon';
  document.getElementById('barberFormHeading').textContent = isSalon ? 'Add a specialist' : 'Add a barber';
  document.getElementById('barberSubmit').innerHTML = isSalon
    ? 'Add specialist <span aria-hidden="true">→</span>'
    : 'Add barber <span aria-hidden="true">→</span>';
  document.getElementById('cancelBarberEdit').classList.add('hidden');
}

document.querySelectorAll('.admin-nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    showPage(link.dataset.page);
    document.getElementById('mobileMoreMenu').classList.add('hidden');
    document.getElementById('mobileMoreButton').setAttribute('aria-expanded', 'false');
  });
});
document.querySelectorAll('[data-go-page]').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.goPage));
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await fetchJson('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: formData.get('password') }),
    });
    setAuthenticated(true);
    showPage('overview');
    await loadAdminData();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetchJson('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    loginForm.reset();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById('mobileLogoutButton').addEventListener('click', () => {
  document.getElementById('logoutBtn').click();
});
document.getElementById('mobileMoreButton').addEventListener('click', (event) => {
  const menu = document.getElementById('mobileMoreMenu');
  const isExpanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
  event.currentTarget.setAttribute('aria-expanded', String(!isExpanded));
  menu.classList.toggle('hidden', isExpanded);
});

document.getElementById('appointmentSearch').addEventListener('input', renderAppointments);
document.getElementById('appointmentDateFilter').addEventListener('change', renderAppointments);
document.getElementById('clearAppointmentFilters').addEventListener('click', () => {
  document.getElementById('appointmentSearch').value = '';
  document.getElementById('appointmentDateFilter').value = '';
  renderAppointments();
});

serviceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(serviceForm);
  const payload = {
    name: form.get('name').trim(),
    price: Number(form.get('price')),
    duration: Number(form.get('duration')),
  };
  const id = serviceForm.dataset.editId;
  try {
    await fetchJson(id ? `/api/admin/services/${id}` : '/api/admin/services', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    resetServiceForm();
    await loadAdminData();
    showMessage(id ? 'Service updated.' : 'Service added.');
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById('cancelServiceEdit').addEventListener('click', resetServiceForm);

barberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(barberForm);
  const payload = {
    name: form.get('name').trim(),
    title: form.get('title').trim(),
    image: form.get('image').trim(),
  };
  const id = barberForm.dataset.editId;
  try {
    await fetchJson(id ? `/api/admin/barbers/${id}` : '/api/admin/barbers', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    resetBarberForm();
    await loadAdminData();
    showMessage(id ? 'Barber profile updated.' : 'Barber added.');
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.getElementById('cancelBarberEdit').addEventListener('click', resetBarberForm);

document.getElementById('bundleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    price: Number(form.elements.price.value),
    serviceIds: [...form.querySelectorAll('input[name="serviceIds"]:checked')].map((input) => Number(input.value)),
  };
  const id = form.dataset.editId;
  try {
    await fetchJson(id ? `/api/admin/bundles/${id}` : '/api/admin/bundles', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    resetBundleForm();
    await loadAdminData();
    showMessage(id ? 'Bundle updated.' : 'Bundle created.');
  } catch (error) {
    showMessage(error.message, true);
  }
});
document.getElementById('cancelBundleEdit').addEventListener('click', resetBundleForm);

document.getElementById('employeeForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    barberId: Number(form.elements.barberId.value),
    username: form.elements.username.value.trim(),
    password: form.elements.password.value,
  };
  const id = form.dataset.editId;
  try {
    await fetchJson(id ? `/api/admin/employees/${id}` : '/api/admin/employees', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    resetEmployeeForm();
    await loadAdminData();
    showMessage(id ? 'Employee login updated.' : 'Employee login created.');
  } catch (error) {
    showMessage(error.message, true);
  }
});
document.getElementById('cancelEmployeeEdit').addEventListener('click', resetEmployeeForm);

hoursForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(hoursForm);
  const payload = {
    barberId: Number(form.get('barberId')),
    dayOfWeek: Number(form.get('dayOfWeek')),
    startTime: form.get('startTime'),
    endTime: form.get('endTime'),
  };
  try {
    await fetchJson('/api/admin/working-hours', { method: 'POST', body: JSON.stringify(payload) });
    await loadAdminData();
    showMessage('Working hours saved.');
  } catch (error) {
    showMessage(error.message, true);
  }
});

hoursForm.elements.barberId.addEventListener('change', syncWorkingHoursInputs);
hoursForm.elements.dayOfWeek.addEventListener('change', syncWorkingHoursInputs);

unavailableForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(unavailableForm);
  const payload = {
    barberId: Number(form.get('barberId')),
    date: form.get('date'),
    reason: form.get('reason').trim(),
  };
  try {
    await fetchJson('/api/admin/unavailable-dates', { method: 'POST', body: JSON.stringify(payload) });
    unavailableForm.reset();
    await loadAdminData();
    showMessage('Date marked unavailable.');
  } catch (error) {
    showMessage(error.message, true);
  }
});

const settingsForm = document.getElementById('settingsForm');
const businessNameInput = document.getElementById('businessName');
const businessLogoInput = document.getElementById('businessLogoUrl');

businessNameInput.addEventListener('input', () => {
  updateLogoPreview(businessNameInput.value, businessLogoInput.value);
});
businessLogoInput.addEventListener('input', () => {
  updateLogoPreview(businessNameInput.value, businessLogoInput.value);
});

document.querySelectorAll('input[name="businessType"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    document.body.dataset.businessType = radio.value;
  });
});

document.querySelectorAll('input[name="supportedLanguages"]').forEach((input) => {
  input.addEventListener('change', () => {
    const enabled = [...document.querySelectorAll('input[name="supportedLanguages"]:checked')].map((item) => item.value);
    const defaultLanguage = document.getElementById('businessLanguage');
    [...defaultLanguage.options].forEach((option) => { option.disabled = !enabled.includes(option.value); });
    if (!enabled.includes(defaultLanguage.value) && enabled.length) defaultLanguage.value = enabled[0];
  });
});
document.getElementById('businessCountry').addEventListener('change', (event) => {
  const currency = event.target.value === 'XK' ? 'EUR' : 'MKD';
  document.getElementById('serviceCurrencyLabel').textContent = currency;
  document.querySelectorAll('.currencyLabel').forEach((element) => { element.textContent = currency; });
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settingsError = document.getElementById('settingsError');
  const saveButton = document.getElementById('saveSettingsButton');
  settingsError.textContent = '';
  saveButton.disabled = true;
  const form = new FormData(settingsForm);
  const payload = {
    businessName: form.get('businessName'),
    logoUrl: form.get('logoUrl'),
    businessType: form.get('businessType'),
    country: form.get('country'),
    language: form.get('language'),
    supportedLanguages: form.getAll('supportedLanguages'),
    googleReviewUrl: form.get('googleReviewUrl'),
    facebookUrl: form.get('facebookUrl'),
    instagramUrl: form.get('instagramUrl'),
  };

  try {
    const result = await fetchJson('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    applyBusinessSettings(result.settings);
    renderAppointments();
    renderServices();
    showMessage('Business settings saved.');
  } catch (error) {
    settingsError.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

setAuthenticated(false);
showPage('overview');

fetchJson('/api/settings')
  .then(applyBusinessSettings)
  .catch((error) => showMessage(error.message, true));
