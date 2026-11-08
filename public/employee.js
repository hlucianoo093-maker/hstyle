const loginForm = document.getElementById('employeeLoginForm');
const loginError = document.getElementById('employeeLoginError');
const dashboard = document.getElementById('employeeDashboard');
const appointmentsList = document.getElementById('employeeAppointments');
const currentTime = document.getElementById('currentTime');
const currentDate = document.getElementById('currentDate');
const languageSelect = document.getElementById('employeeLanguage');
let employeeName = '';
let employeeAppointments = [];
let employeeCurrency = 'MKD';
let calendarDate = new Date();
let selectedDate = localDateString(calendarDate);
let currentLanguage = localStorage.getItem('employee-language') === 'sq' ? 'sq' : 'mk';

const translations = {
  mk: {
    language: 'Јазик',
    portal: 'ПОРТАЛ ЗА ВРАБОТЕНИ',
    heading: 'Вашите резервации',
    username: 'Корисничко име',
    password: 'Лозинка',
    signIn: 'Најави се',
    signOut: 'Одјави се',
    appointmentsNav: 'Резервации',
    nextAppointment: 'Следна резервација',
    noNextAppointment: 'Нема претстојни резервации.',
    monthBookings: 'Резервации овој месец',
    pendingBookings: 'Чекаат потврда',
    confirmedValue: 'Потврдена вредност овој месец',
    noDayAppointments: 'Нема резервации за овој ден.',
    previousMonth: 'Претходен месец',
    nextMonth: 'Следен месец',
    appointmentsFor: (date) => `Резервации · ${date}`,
    installApp: 'Инсталирај апликација',
    ownerPortal: 'Портал за сопственици',
    weekdays: ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'],
    months: ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември'],
    welcome: (name) => `Добредојдовте, ${name}`,
    noAppointments: 'Сè уште немате резервации.',
    confirm: 'Потврди резервација',
    minutes: 'мин.',
    statuses: { pending: 'На чекање', confirmed: 'Потврдена', cancelled: 'Откажана' },
    clockLabel: 'Тековно локално време',
    signInAgain: 'Ju lutemi hyni përsëri.',
    fallbackError: 'Не може да се вчитаат резервациите.',
  },
  sq: {
    language: 'Gjuha',
    portal: 'PORTALI I PUNONJËSVE',
    heading: 'Rezervimet tuaja',
    username: 'Emri i përdoruesit',
    password: 'Fjalëkalimi',
    signIn: 'Hyr',
    signOut: 'Dil',
    appointmentsNav: 'Rezervimet',
    nextAppointment: 'Termini i radhës',
    noNextAppointment: 'Nuk ka rezervime të ardhshme.',
    monthBookings: 'Rezervime këtë muaj',
    pendingBookings: 'Në pritje të konfirmimit',
    confirmedValue: 'Vlera e konfirmuar këtë muaj',
    noDayAppointments: 'Nuk ka rezervime për këtë ditë.',
    previousMonth: 'Muaji i kaluar',
    nextMonth: 'Muaji i ardhshëm',
    appointmentsFor: (date) => `Rezervimet · ${date}`,
    installApp: 'Instalo aplikacionin',
    ownerPortal: 'Portali i pronarit',
    weekdays: ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'],
    months: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
    welcome: (name) => `Mirë se u kthyet, ${name}`,
    noAppointments: 'Nuk keni ende rezervime.',
    confirm: 'Konfirmo rezervimin',
    minutes: 'min',
    statuses: { pending: 'Në pritje', confirmed: 'E konfirmuar', cancelled: 'E anuluar' },
    clockLabel: 'Ora lokale aktuale',
    signInAgain: 'Ju lutemi hyni përsëri.',
    fallbackError: 'Nuk mund të ngarkohen rezervimet.',
  },
};

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalizedDate(date) {
  const text = translations[currentLanguage];
  return `${text.weekdays[date.getDay()]}, ${date.getDate()} ${text.months[date.getMonth()]} ${date.getFullYear()}`;
}

function localizedError(message) {
  const errors = {
    'Please sign in again.': {
      mk: 'Најавете се повторно.',
      sq: 'Ju lutemi hyni përsëri.',
    },
    'Incorrect username or password.': {
      mk: 'Неточно корисничко име или лозинка.',
      sq: 'Emri i përdoruesit ose fjalëkalimi është gabim.',
    },
    'Only pending appointments can be confirmed.': {
      mk: 'Може да се потврдат само резервации што чекаат.',
      sq: 'Mund të konfirmohen vetëm rezervimet në pritje.',
    },
    'Appointment not found.': {
      mk: 'Резервацијата не е пронајдена.',
      sq: 'Rezervimi nuk u gjet.',
    },
  };
  return errors[message]?.[currentLanguage]
    || (currentLanguage === 'sq' ? message : translations.mk.fallbackError);
}

function applyLanguage() {
  const text = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.getElementById('languageLabel').textContent = text.language;
  languageSelect.setAttribute('aria-label', text.language);
  document.getElementById('portalEyebrow').textContent = text.portal;
  document.getElementById('portalHeading').textContent = text.heading;
  document.getElementById('usernameLabel').textContent = text.username;
  document.getElementById('passwordLabel').textContent = text.password;
  document.getElementById('loginButton').textContent = text.signIn;
  document.getElementById('employeeLogout').textContent = text.signOut;
  document.getElementById('installEmployeeApp').textContent = text.installApp;
  document.getElementById('employeeLogoutNavLabel').textContent = text.signOut;
  document.getElementById('employeeAppointmentsNavLabel').textContent = text.appointmentsNav;
  document.getElementById('ownerPortalLink').textContent = text.ownerPortal;
  document.getElementById('employeeClock').setAttribute('aria-label', text.clockLabel);
  document.getElementById('employeeWelcome').textContent = employeeName ? text.welcome(employeeName) : '';
  document.getElementById('employeeActionError').textContent = '';
  languageSelect.value = currentLanguage;
  renderDashboard();
  updateClock();
}

function updateClock() {
  const now = new Date();
  currentTime.dateTime = now.toISOString();
  currentTime.textContent = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  currentDate.textContent = formatLocalizedDate(now);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatAppointmentDate(date) {
  return formatLocalizedDate(new Date(`${date}T00:00:00`));
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  if (employeeCurrency === 'MKD') {
    const formattedAmount = new Intl.NumberFormat(currentLanguage, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${formattedAmount} MKD`;
  }
  return new Intl.NumberFormat(currentLanguage, {
    style: 'currency',
    currency: employeeCurrency,
  }).format(value);
}

function monthAppointments(date = calendarDate) {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return employeeAppointments.filter((appointment) => appointment.appointment_date.startsWith(month));
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || translations[currentLanguage].fallbackError);
  return data;
}

function renderAppointments() {
  const text = translations[currentLanguage];
  const selectedAppointments = employeeAppointments.filter((appointment) => appointment.appointment_date === selectedDate);
  appointmentsList.innerHTML = selectedAppointments.length ? selectedAppointments.map((appointment) => `
    <article class="employee-appointment">
      <div class="employee-appointment-date"><strong>${escapeHtml(formatAppointmentDate(appointment.appointment_date))}</strong><span>${escapeHtml(appointment.appointment_time)}</span></div>
      <div><h2>${escapeHtml(appointment.customer_name)}</h2><p>${escapeHtml(appointment.service_name)} · ${Number(appointment.service_duration)} ${text.minutes}</p><p>${escapeHtml(formatCurrency(appointment.price))}</p></div>
      <div class="employee-appointment-contact"><a href="tel:${escapeHtml(appointment.phone)}">${escapeHtml(appointment.phone)}</a>${appointment.email ? `<a href="mailto:${escapeHtml(appointment.email)}">${escapeHtml(appointment.email)}</a>` : ''}<span class="appointment-status">${escapeHtml(text.statuses[appointment.status] || appointment.status)}</span>${appointment.status === 'pending' ? `<button type="button" class="employee-confirm-button" data-confirm-appointment="${Number(appointment.id)}">${text.confirm}</button>` : ''}</div>
    </article>
  `).join('') : `<p class="schedule-empty">${text.noDayAppointments}</p>`;
  document.getElementById('employeeAppointmentsHeading').textContent = text.appointmentsFor(formatAppointmentDate(selectedDate));
  appointmentsList.querySelectorAll('[data-confirm-appointment]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await request(`/api/employee/appointments/${button.dataset.confirmAppointment}/confirm`, { method: 'POST' });
        await loadAppointments();
      } catch (error) {
        button.disabled = false;
        document.getElementById('employeeActionError').textContent = localizedError(error.message);
      }
    });
  });
}

function renderCalendar() {
  const text = translations[currentLanguage];
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = new Intl.DateTimeFormat(currentLanguage, { month: 'long', year: 'numeric' })
    .format(new Date(year, month, 1));
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const appointmentsByDate = new Map();
  employeeAppointments.forEach((appointment) => {
    if (appointment.status === 'cancelled') return;
    appointmentsByDate.set(appointment.appointment_date, (appointmentsByDate.get(appointment.appointment_date) || 0) + 1);
  });
  const calendar = document.getElementById('employeeCalendar');
  document.getElementById('employeeCalendarMonth').textContent = monthName;
  document.getElementById('employeePreviousMonth').setAttribute('aria-label', text.previousMonth);
  document.getElementById('employeeNextMonth').setAttribute('aria-label', text.nextMonth);

  const weekdays = text.weekdays.map((day) => `<span class="employee-calendar-weekday" role="columnheader">${escapeHtml(day.slice(0, 2))}</span>`).join('');
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    const date = new Date(year, month, day);
    const dateString = localDateString(date);
    const inMonth = day > 0 && day <= daysInMonth;
    const count = appointmentsByDate.get(dateString) || 0;
    return `<button type="button" class="employee-calendar-day${inMonth ? '' : ' outside-month'}${dateString === selectedDate ? ' selected' : ''}${count ? ' has-appointments' : ''}" role="gridcell" aria-pressed="${dateString === selectedDate}" aria-label="${escapeHtml(formatAppointmentDate(dateString))}${count ? `, ${count}` : ''}" data-calendar-date="${dateString}"><span>${date.getDate()}</span>${count ? `<small>${count}</small>` : ''}</button>`;
  }).join('');
  calendar.innerHTML = `${weekdays}${cells}`;
  document.getElementById('employeeSelectedDate').textContent = formatAppointmentDate(selectedDate);
  calendar.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedDate = button.dataset.calendarDate;
      calendarDate = new Date(`${selectedDate}T00:00:00`);
      renderDashboard();
    });
  });
}

function renderOverview() {
  const text = translations[currentLanguage];
  const currentMonth = monthAppointments();
  const activeMonthAppointments = currentMonth.filter((appointment) => appointment.status !== 'cancelled');
  const confirmedValue = currentMonth
    .filter((appointment) => appointment.status === 'confirmed')
    .reduce((total, appointment) => total + (Number(appointment.price) || 0), 0);
  const now = new Date();
  const nextAppointment = employeeAppointments.find((appointment) => {
    if (appointment.status === 'cancelled') return false;
    return new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00`) >= now;
  });

  document.getElementById('employeeNextLabel').textContent = text.nextAppointment;
  document.getElementById('employeeMonthBookingsLabel').textContent = text.monthBookings;
  document.getElementById('employeePendingLabel').textContent = text.pendingBookings;
  document.getElementById('employeeConfirmedValueLabel').textContent = text.confirmedValue;
  document.getElementById('employeeMonthBookings').textContent = activeMonthAppointments.length;
  document.getElementById('employeePendingCount').textContent = employeeAppointments.filter((appointment) => appointment.status === 'pending').length;
  document.getElementById('employeeConfirmedValue').textContent = formatCurrency(confirmedValue);
  document.getElementById('employeeNextAppointment').innerHTML = nextAppointment ? `
    <strong>${escapeHtml(formatAppointmentDate(nextAppointment.appointment_date))} · ${escapeHtml(nextAppointment.appointment_time)}</strong>
    <span>${escapeHtml(nextAppointment.customer_name)} · ${escapeHtml(nextAppointment.service_name)}</span>
    <span class="employee-next-price">${escapeHtml(formatCurrency(nextAppointment.price))} · ${escapeHtml(text.statuses[nextAppointment.status] || nextAppointment.status)}</span>
  ` : `<span>${text.noNextAppointment}</span>`;
}

function renderDashboard() {
  renderOverview();
  renderCalendar();
  renderAppointments();
}

async function loadAppointments() {
  const data = await request('/api/employee/appointments');
  employeeName = data.employee.name;
  employeeAppointments = data.appointments;
  employeeCurrency = data.currency || 'MKD';
  loginForm.classList.add('hidden');
  loginError.textContent = '';
  dashboard.classList.remove('hidden');
  applyLanguage();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await request('/api/employee/login', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
      }),
    });
    loginForm.reset();
    await loadAppointments();
  } catch (error) {
    loginError.textContent = localizedError(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById('employeeLogout').addEventListener('click', async () => {
  try {
    await request('/api/employee/logout', { method: 'POST' });
    dashboard.classList.add('hidden');
    loginForm.classList.remove('hidden');
  } catch (error) {
    document.getElementById('employeeActionError').textContent = localizedError(error.message);
  }
});

document.getElementById('employeeLogoutNav').addEventListener('click', () => {
  document.getElementById('employeeLogout').click();
});
document.getElementById('employeeAppointmentsNav').addEventListener('click', () => {
  document.getElementById('employeeAppointments').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

languageSelect.value = currentLanguage;
languageSelect.addEventListener('change', () => {
  currentLanguage = languageSelect.value;
  localStorage.setItem('employee-language', currentLanguage);
  applyLanguage();
});

document.getElementById('employeePreviousMonth').addEventListener('click', () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  selectedDate = localDateString(calendarDate);
  renderDashboard();
});
document.getElementById('employeeNextMonth').addEventListener('click', () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  selectedDate = localDateString(calendarDate);
  renderDashboard();
});

loadAppointments().catch((error) => {
  const expectedAuthError = ['Please sign in again.', translations.mk.signInAgain].includes(error.message);
  if (!expectedAuthError) loginError.textContent = localizedError(error.message);
});

applyLanguage();
window.setInterval(updateClock, 1000);
