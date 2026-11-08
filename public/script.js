const state = {
  services: [],
  barbers: [],
  selectedService: null,
  selectedBarber: null,
  selectedDate: '',
  selectedTime: '',
  bundles: [],
  currentStep: 1,
  pageType: 'barber',
  settings: {
    business_name: 'Old Gold',
    logo_url: '',
    business_type: 'barber',
    currency: 'MKD',
    language: 'mk',
    supported_languages: ['mk', 'sq'],
  },
};

const serviceList = document.getElementById('service-list');
const serviceSelect = document.getElementById('serviceSelect');
const barberList = document.getElementById('barber-list');
const barberSelect = document.getElementById('barberSelect');
const bookingDate = document.getElementById('bookingDate');
const timeSlots = document.getElementById('timeSlots');
const bookingForm = document.getElementById('booking-form');
const bookingSuccess = document.getElementById('bookingSuccess');
const bookingDataStatus = document.getElementById('bookingDataStatus');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function setTextIfPresent(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function formatCurrency(amount) {
  const locale = state.settings.language === 'sq' ? 'sq-XK' : 'mk-MK';
  const value = Number(amount) || 0;
  if (state.settings.currency === 'MKD') {
    const formattedAmount = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${formattedAmount} MKD`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: state.settings.currency,
  }).format(value);
}

function setLogo(image, name, url) {
  if (!image) return;
  image.onerror = () => image.classList.add('hidden');
  if (!url) {
    image.removeAttribute('src');
    image.classList.add('hidden');
    return;
  }
  image.src = url;
  image.alt = `${name} logo`;
  image.classList.remove('hidden');
}

function applyBusinessSettings(settings) {
  state.settings = { ...state.settings, ...settings };
  if (!Array.isArray(state.settings.supported_languages)) {
    state.settings.supported_languages = String(state.settings.supported_languages || 'mk,sq').split(',');
  }
  const savedLanguage = localStorage.getItem('site-language');
  if (state.settings.supported_languages.includes(savedLanguage)) state.settings.language = savedLanguage;
  const pageType = document.body.dataset.landingType || state.settings.business_type;
  const isSalon = pageType === 'salon';
  state.pageType = pageType;
  document.documentElement.lang = state.settings.language;
  document.body.dataset.businessType = pageType;
  document.title = `${state.settings.business_name} | ${isSalon ? 'Beauty Studio' : 'Barber Studio'}`;
  setTextIfPresent('#siteBusinessName', state.settings.business_name);
  setTextIfPresent('#footerBusinessName', state.settings.business_name);
  setTextIfPresent('#footerBusinessNameCopy', state.settings.business_name);
  setLogo(document.getElementById('siteLogo'), state.settings.business_name, state.settings.logo_url);
  setFooterLink('googleReviewLink', state.settings.google_review_url);
  setFooterLink('facebookLink', state.settings.facebook_url);
  setFooterLink('instagramLink', state.settings.instagram_url);

  setTextIfPresent('#heroEyebrow', isSalon ? 'Your beauty studio' : 'Tailored grooming');
  setTextIfPresent('#heroHeadline', isSalon ? 'Feel Beautiful. Be Yourself.' : 'Look Sharp. Feel Confident.');
  setTextIfPresent('#heroIntro', isSalon
    ? 'Thoughtful beauty services, refined details, and a welcoming studio experience made around you.'
    : 'Precision cuts, refined details, and a modern barber experience built for the way you live.');
  setTextIfPresent('#teamEyebrow', isSalon ? 'Meet our specialists' : 'Meet our barbers');
  setTextIfPresent('#teamHeadline', isSalon ? 'A little time, just for you.' : 'Crafted by professionals.');
  setTextIfPresent('#barberSelectLabel', isSalon ? 'Choose Specialist' : 'Choose Barber');
  setTextIfPresent('nav a[href="#barbers"]', isSalon ? 'Our Team' : 'Barbers');
  setTextIfPresent('.highlights li:nth-child(1)', isSalon ? 'Thoughtful beauty' : 'Premium grooming');
  setTextIfPresent('.highlights li:nth-child(2)', isSalon ? 'Easy online booking' : 'Fast, easy booking');
  setTextIfPresent('.highlights li:nth-child(3)', isSalon ? 'Care by trusted specialists' : 'Trusted by local clients');
  const reviews = document.querySelectorAll('.review-card > p');
  if (isSalon) {
    if (reviews[0]) reviews[0].textContent = '“A beautiful experience from start to finish. The care and attention to detail were exceptional.”';
    if (reviews[1]) reviews[1].textContent = '“Booking was effortless and I left feeling refreshed. Such a lovely, professional studio.”';
    if (reviews[2]) reviews[2].textContent = '“Thoughtful service in a welcoming space. I have already booked my next visit.”';
  } else {
    if (reviews[0]) reviews[0].textContent = '“The fade was flawless and the attention to detail was unreal. Fast, clean, and professional.”';
    if (reviews[1]) reviews[1].textContent = '“I booked my haircut in seconds and loved the experience from start to finish. Very polished.”';
    if (reviews[2]) reviews[2].textContent = '“The beard trim and hot towel service is a game-changer. This place is worth every minute.”';
  }

  renderLanguageSwitcher();
  applyLanguage(state.settings.language);
  renderServices();
  renderBundles();
}

const siteTranslations = {
  mk: {
    language: 'Јазик',
    navigation: ['Услуги', 'Тим', 'Рецензии', 'Контакт'],
    book: 'Резервирај термин',
    explore: 'Разгледај услуги',
    highlights: ['Внимателна нега', 'Лесна онлајн резервација', 'Нега од доверливи специјалисти'],
    serviceIntro: 'Персонализирани услуги, внимателни детали и време за да се чувствувате најдобро.',
    reviewEyebrow: 'Убави зборови',
    salonReviews: [
      '„Прекрасно искуство од почеток до крај. Грижата и вниманието кон деталите беа извонредни.“',
      '„Резервацијата беше лесна, а си заминав освежена. Прекрасно и професионално студио.“',
      '„Внимателна услуга во пријатен простор. Веќе го резервирав следниот термин.“',
    ],
    barberReviews: [
      '„Совршен fade и неверојатно внимание кон деталите. Брзо, чисто и професионално.“',
      '„Резервирав шишање за неколку секунди и уживав во целото искуство.“',
      '„Средувањето брада со топла крпа е одлично. Вреди секоја минута.“',
    ],
    salonContactTitle: 'Ви заштедивме малку време.',
    barberContactTitle: 'Резервирајте лично или онлајн.',
    salonMap: 'Вашето локално студио за убавина',
    barberMap: 'Студио за врвно машко дотерување',
    clientRating: 'Оценка од клиенти',
    address: '32 улица Мерсер, Лондон',
    hours: 'Пон. – Саб.: 09:00 – 19:00',
    fullNamePlaceholder: 'Вашето име',
    phonePlaceholder: 'Вашиот телефонски број',
    emailPlaceholder: 'you@example.com',
    footerTagline: 'Внимателна нега, лесна резервација.',
    copyright: 'Сите права се задржани.',
    heroEyebrow: 'Вашето студио за убавина',
    heroHeadline: 'Бидете убави. Бидете свои.',
    heroIntro: 'Внимателни третмани за убавина, префинети детали и пријатно студио создадено за вас.',
    salonHeroEyebrow: 'Вашето студио за убавина',
    barberHeroEyebrow: 'Прецизно машко дотерување',
    barberHeadline: 'Изгледајте одлично. Чувствувајте се самоуверено.',
    barberIntro: 'Прецизни фризури, префинети детали и современо берберско искуство создадено за вас.',
    serviceTitle: 'Услуги',
    salonServicesTitle: 'Нега што ви прилега.',
    barberServicesTitle: 'Прецизно шишање со класични детали.',
    bundleEyebrow: 'Избрани пакети',
    bundleTitle: 'Повеќе нега, заедно.',
    bundleDescription: 'Откријте внимателно составени комбинации од нашето студио.',
    bookingEyebrow: 'Резервирајте лесно',
    salonBookingTitle: 'Вашето следно освежување започнува тука.',
    barberBookingTitle: 'Одвојте време за нов изглед.',
    bookingIntro: 'Изберете услуга, член на тимот и слободен термин. Резервирајте во неколку чекори.',
    serviceLabel: 'Изберете услуга',
    dateLabel: 'Изберете датум',
    timeLabel: 'Слободен термин',
    nameLabel: 'Име и презиме',
    phoneLabel: 'Телефонски број',
    emailLabel: 'Е-пошта (по избор)',
    next: 'Продолжи',
    back: 'Назад',
    confirm: 'Потврди резервација',
    teamEyebrow: 'Запознајте го нашиот тим',
    salonTeamTitle: 'Малку време само за вас.',
    barberTeamTitle: 'Професионална услуга.',
    reviewTitle: 'Убави зборови од клиентите.',
    contactTitle: 'Посетете нè',
    createBooking: 'Направете резервација',
    employeeLogin: 'Најава за вработени',
    ownerPortal: 'Портал за сопственици',
    googleReview: 'Оставете рецензија на Google ↗',
    noBundles: 'Наскоро ќе бидат достапни пакети.',
    included: 'Вклучува',
    chooseBundle: 'Резервирајте пакет',
    noTimes: 'Нема слободни термини за овој датум.',
    availabilityError: 'Не може да се вчитаат слободните термини.',
    bookingConfirmed: 'Резервацијата е потврдена!',
    chooseTime: 'Изберете слободен термин.',
  },
  sq: {
    language: 'Gjuha',
    navigation: ['Shërbimet', 'Ekipi', 'Vlerësimet', 'Kontakti'],
    book: 'Rezervo termin',
    explore: 'Shiko shërbimet',
    highlights: ['Kujdes i veçantë', 'Rezervim i lehtë online', 'Kujdes nga specialistë të besuar'],
    serviceIntro: 'Shërbime personale, detaje të kujdesshme dhe kohë për t’u ndier sa më mirë.',
    reviewEyebrow: 'Fjalë të mira',
    salonReviews: [
      '“Një përvojë e mrekullueshme nga fillimi në fund. Kujdesi dhe vëmendja ndaj detajeve ishin të jashtëzakonshme.”',
      '“Rezervimi ishte i lehtë dhe u largova e rifreskuar. Studio e këndshme dhe profesionale.”',
      '“Shërbim i kujdesshëm në një ambient mikpritës. Tashmë e kam rezervuar vizitën e radhës.”',
    ],
    barberReviews: [
      '“Prerje fade e përsosur dhe vëmendje e jashtëzakonshme ndaj detajeve. Shpejt, pastër dhe profesionalisht.”',
      '“Rezervova prerjen për pak sekonda dhe e shijova përvojën nga fillimi në fund.”',
      '“Rregullimi i mjekrës me peshqir të ngrohtë është fantastik. Ia vlen çdo minutë.”',
    ],
    salonContactTitle: 'Ju kursyem pak kohë.',
    barberContactTitle: 'Rezervoni personalisht ose online.',
    salonMap: 'Studioja juaj lokale e bukurisë',
    barberMap: 'Studio moderne berberie',
    clientRating: 'Vlerësimi i klientëve',
    address: 'Rruga Mercer 32, Londër',
    hours: 'Hën. – Sht.: 09:00 – 19:00',
    fullNamePlaceholder: 'Emri juaj',
    phonePlaceholder: 'Numri juaj i telefonit',
    emailPlaceholder: 'you@example.com',
    footerTagline: 'Kujdes i veçantë, rezervim i lehtë.',
    copyright: 'Të gjitha të drejtat e rezervuara.',
    heroEyebrow: 'Studioja juaj e bukurisë',
    heroHeadline: 'Ndihuni bukur. Jini vetvetja.',
    heroIntro: 'Shërbime bukurie me kujdes, detaje elegante dhe një përvojë mikpritëse e krijuar për ju.',
    salonHeroEyebrow: 'Studioja juaj e bukurisë',
    barberHeroEyebrow: 'Kujdes i përpiktë për flokët',
    barberHeadline: 'Dukuni bukur. Ndihuni të sigurt.',
    barberIntro: 'Prerje të sakta, detaje elegante dhe përvojë moderne berberie e krijuar për ju.',
    serviceTitle: 'Shërbimet',
    salonServicesTitle: 'Kujdes që ju përshtatet.',
    barberServicesTitle: 'Prerje të sakta me stil klasik.',
    bundleEyebrow: 'Paketa të zgjedhura',
    bundleTitle: 'Më shumë kujdes, së bashku.',
    bundleDescription: 'Zbuloni kombinime të menduara me kujdes nga studioja jonë.',
    bookingEyebrow: 'Rezervim i lehtë',
    salonBookingTitle: 'Rifreskimi juaj i radhës fillon këtu.',
    barberBookingTitle: 'Gjeni kohë për një pamje më të mirë.',
    bookingIntro: 'Zgjidhni shërbimin, anëtarin e ekipit dhe një orar të lirë. Rezervoni në pak hapa.',
    serviceLabel: 'Zgjidhni shërbimin',
    dateLabel: 'Zgjidhni datën',
    timeLabel: 'Oraret e lira',
    nameLabel: 'Emri dhe mbiemri',
    phoneLabel: 'Numri i telefonit',
    emailLabel: 'Email (opsionale)',
    next: 'Vazhdo',
    back: 'Prapa',
    confirm: 'Konfirmo rezervimin',
    teamEyebrow: 'Njihuni me ekipin tonë',
    salonTeamTitle: 'Pak kohë vetëm për ju.',
    barberTeamTitle: 'Punuar nga profesionistë.',
    reviewTitle: 'Fjalë të mira nga klientët.',
    contactTitle: 'Na vizitoni',
    createBooking: 'Krijo rezervim',
    employeeLogin: 'Hyrja e punonjësve',
    ownerPortal: 'Portali i pronarit',
    googleReview: 'Shkruani një vlerësim në Google ↗',
    noBundles: 'Paketat do të jenë të disponueshme së shpejti.',
    included: 'Përfshin',
    chooseBundle: 'Rezervo paketën',
    noTimes: 'Nuk ka orare të lira për këtë datë.',
    availabilityError: 'Nuk mund të ngarkohen oraret e lira.',
    bookingConfirmed: 'Rezervimi u konfirmua!',
    chooseTime: 'Ju lutemi zgjidhni një orar të lirë.',
  },
};

function setFooterLink(id, url) {
  const link = document.getElementById(id);
  if (!link) return;
  if (!url) {
    link.removeAttribute('href');
    link.classList.add('hidden');
    return;
  }
  link.href = url;
  link.classList.remove('hidden');
}

function renderLanguageSwitcher() {
  const switcher = document.getElementById('languageSwitcher');
  if (!switcher) return;
  const names = { mk: 'Македонски', sq: 'Shqip' };
  switcher.innerHTML = state.settings.supported_languages
    .map((language) => `<option value="${language}">${names[language]}</option>`).join('');
  switcher.value = state.settings.language;
  switcher.classList.toggle('hidden', state.settings.supported_languages.length < 2);
}

function applyLanguage(language) {
  const text = siteTranslations[language] || siteTranslations.mk;
  const isSalon = state.pageType === 'salon';
  document.documentElement.lang = language;
  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };
  document.querySelectorAll('.topbar nav a').forEach((link, index) => {
    if (text.navigation[index]) link.textContent = text.navigation[index];
  });
  document.querySelectorAll('.topbar .button, .hero .cta-row .button:first-child').forEach((button) => { button.textContent = text.book; });
  setText('#heroEyebrow', isSalon ? text.salonHeroEyebrow : text.barberHeroEyebrow);
  setText('#heroHeadline', isSalon ? text.heroHeadline : text.barberHeadline);
  setText('#heroIntro', isSalon ? text.heroIntro : text.barberIntro);
  setText('#teamEyebrow', text.teamEyebrow);
  setText('#teamHeadline', isSalon ? text.salonTeamTitle : text.barberTeamTitle);
  setText('#barberSelectLabel', isSalon ? (language === 'mk' ? 'Изберете специјалист' : 'Zgjidhni specialistin') : (language === 'mk' ? 'Изберете бербер' : 'Zgjidhni berberin'));
  setText('#bundles .section-heading .eyebrow', text.bundleEyebrow);
  setText('#bundles .section-heading h2', text.bundleTitle);
  setText('#bundles .section-heading p:last-child', text.bundleDescription);
  setText('#booking .booking-copy .eyebrow', text.bookingEyebrow);
  setText('#booking .booking-copy h2', isSalon ? text.salonBookingTitle : text.barberBookingTitle);
  setText('#booking .booking-copy > p:last-child', text.bookingIntro);
  setText('#services .section-heading .eyebrow', text.serviceTitle);
  setText('#services .section-heading h2', isSalon ? text.salonServicesTitle : text.barberServicesTitle);
  setText('#reviews .section-heading h2', text.reviewTitle);
  setText('#contact .contact-grid .eyebrow', text.contactTitle);
  setText('#services .section-heading > p:last-child', text.serviceIntro);
  setText('#reviews .section-heading .eyebrow', text.reviewEyebrow);
  setText('#contact .contact-grid h2', isSalon ? text.salonContactTitle : text.barberContactTitle);
  setText('.map-overlay span', isSalon ? text.salonMap : text.barberMap);
  setText('.card-badge small', text.clientRating);
  setText('#googleReviewLink', text.googleReview);
  document.querySelectorAll('.hero .cta-row .button-ghost').forEach((button) => { button.textContent = text.explore; });
  document.querySelectorAll('.highlights li').forEach((item, index) => {
    item.textContent = text.highlights[index];
  });
  document.querySelectorAll('.review-card > p').forEach((review, index) => {
    review.textContent = text[isSalon ? 'salonReviews' : 'barberReviews'][index];
  });
  const contactItems = document.querySelectorAll('.contact-list li');
  if (contactItems[0]) contactItems[0].textContent = text.address;
  if (contactItems[1]) contactItems[1].textContent = text.hours;
  const labels = [
    ['label[for="serviceSelect"]', text.serviceLabel],
    ['label[for="bookingDate"]', text.dateLabel],
    ['.slots-label', text.timeLabel],
    ['label[for="customerName"]', text.nameLabel],
    ['label[for="phone"]', text.phoneLabel],
    ['label[for="email"]', text.emailLabel],
  ];
  labels.forEach(([selector, value]) => setText(selector, value));
  const customerName = document.getElementById('customerName');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  if (customerName) customerName.placeholder = text.fullNamePlaceholder;
  if (phone) phone.placeholder = text.phonePlaceholder;
  if (email) email.placeholder = text.emailPlaceholder;
  const progress = document.querySelector('.progress');
  if (progress) progress.setAttribute('aria-label', text.bookingEyebrow);
  document.querySelectorAll('.bundle-card .eyebrow').forEach((eyebrow) => { eyebrow.textContent = text.included; });
  document.querySelectorAll('.next-step').forEach((button) => { button.textContent = text.next; });
  document.querySelectorAll('.prev-step').forEach((button) => { button.textContent = text.back; });
  setText('#booking-form button[type="submit"]', text.confirm);
  const languageLabel = document.querySelector('.language-switcher > span');
  if (languageLabel) languageLabel.textContent = text.language;
  const languageSwitcher = document.getElementById('languageSwitcher');
  if (languageSwitcher) languageSwitcher.setAttribute('aria-label', text.language);
  setText('#footerTagline', text.footerTagline);
  setText('#footerCopyrightSuffix', text.copyright);
  const footerLinks = document.querySelectorAll('.footer-links');
  if (footerLinks[0]) {
    if (footerLinks[0].children[0]) footerLinks[0].children[0].textContent = text.createBooking;
    if (footerLinks[0].children[1]) footerLinks[0].children[1].textContent = text.employeeLogin;
    if (footerLinks[0].children[2]) footerLinks[0].children[2].textContent = text.ownerPortal;
  }
  renderServices();
  renderBundles();
}

function renderServices() {
  const previousService = serviceSelect.value || state.selectedService;
  if (serviceList) {
    serviceList.innerHTML = state.services
      .map(
        (service) => `
        <article class="service-card">
          <p class="eyebrow">${state.settings.language === 'mk' ? 'Услуга' : 'Shërbim'}</p>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${Number(service.duration)} ${state.settings.language === 'mk' ? 'мин.' : 'min'} ${state.pageType === 'salon' ? (state.settings.language === 'mk' ? 'термин' : 'termin') : (state.settings.language === 'mk' ? 'посета' : 'vizitë')}</p>
          <div class="service-meta">
            <span class="service-price">${escapeHtml(formatCurrency(service.price))}</span>
            <span>${state.settings.language === 'mk' ? 'Од' : 'Nga'}</span>
          </div>
        </article>
      `
      )
      .join('');
  }

  serviceSelect.innerHTML = state.services
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)} — ${escapeHtml(formatCurrency(service.price))}</option>`)
    .join('') + state.bundles.map((bundle) => `<option value="${bundle.booking_service_id}">${escapeHtml(bundle.name)} — ${escapeHtml(formatCurrency(bundle.price))}</option>`).join('');

  const availableServiceIds = new Set([
    ...state.services.map((service) => String(service.id)),
    ...state.bundles.map((bundle) => String(bundle.booking_service_id)),
  ]);
  state.selectedService = availableServiceIds.has(String(previousService))
    ? previousService
    : state.services[0]?.id || state.bundles[0]?.booking_service_id || null;
  if (state.selectedService) {
    serviceSelect.value = String(state.selectedService);
  }
}

function renderBundles() {
  const list = document.getElementById('bundle-list');
  if (!list) return;
  const text = siteTranslations[state.settings.language] || siteTranslations.mk;
  list.innerHTML = state.bundles.length ? state.bundles.map((bundle) => `
    <article class="bundle-card">
      <p class="eyebrow">${escapeHtml(text.included)}</p>
      <h3>${escapeHtml(bundle.name)}</h3>
      <p>${escapeHtml(bundle.description)}</p>
      <p class="bundle-includes">${escapeHtml(bundle.included_services || '')}</p>
      <div class="bundle-card-bottom"><strong>${escapeHtml(formatCurrency(bundle.price))}</strong><button type="button" class="button button-small" data-book-bundle="${bundle.booking_service_id}">${escapeHtml(text.chooseBundle)}</button></div>
    </article>
  `).join('') : `<p class="bundle-empty">${escapeHtml(text.noBundles)}</p>`;
  list.querySelectorAll('[data-book-bundle]').forEach((button) => {
    button.addEventListener('click', () => {
      serviceSelect.value = button.dataset.bookBundle;
      state.selectedService = button.dataset.bookBundle;
      state.selectedTime = '';
      fetchAvailability();
      document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderBarbers() {
  if (barberList) {
    barberList.innerHTML = state.barbers
      .map(
        (barber) => `
        <article class="barber-card">
          <div class="barber-image" style="background-image: url('${escapeHtml(barber.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80')}');"></div>
          <div class="barber-info">
            <div class="barber-role">${escapeHtml(barber.title || (state.pageType === 'salon' ? 'Specialist' : 'Barber'))}</div>
            <h3>${escapeHtml(barber.name)}</h3>
          </div>
        </article>
      `
      )
      .join('');
  }

  barberSelect.innerHTML = state.barbers
    .map((barber) => `<option value="${barber.id}">${escapeHtml(barber.name)}</option>`)
    .join('');

  state.selectedBarber = state.barbers[0]?.id || null;
  if (state.selectedBarber) {
    barberSelect.value = String(state.selectedBarber);
  }
}

function updateStepIndicators() {
  document.querySelectorAll('.step').forEach((stepEl, index) => {
    stepEl.classList.toggle('active', index + 1 === state.currentStep);
  });
}

function showCurrentStep(step) {
  state.currentStep = step;
  document.querySelectorAll('.form-step').forEach((formStep) => {
    formStep.classList.toggle('active', Number(formStep.dataset.step) === step);
  });
  updateStepIndicators();
}

function renderTimeSlots(slots) {
  const text = siteTranslations[state.settings.language] || siteTranslations.mk;
  if (!slots.length) {
    timeSlots.innerHTML = `<p>${escapeHtml(text.noTimes)}</p>`;
    return;
  }

  timeSlots.innerHTML = slots
    .map(
      (slot) => `
        <button type="button" class="time-button ${state.selectedTime === slot ? 'active' : ''}" data-time="${slot}">${slot}</button>
      `
    )
    .join('');

  document.querySelectorAll('.time-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedTime = button.dataset.time;
      renderTimeSlots(slots);
    });
  });
}

function formatBookingDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(state.settings.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function fetchAvailability() {
  const selectedService = serviceSelect.value;
  const selectedBarber = barberSelect.value;
  const selectedDate = bookingDate.value;
  const text = siteTranslations[state.settings.language] || siteTranslations.mk;

  if (!selectedService || !selectedBarber || !selectedDate) {
    timeSlots.innerHTML = '';
    return;
  }

  timeSlots.innerHTML = `<p>${escapeHtml(state.settings.language === 'mk' ? 'Се вчитуваат слободните термини…' : 'Po ngarkohen oraret e lira…')}</p>`;
  try {
    const response = await fetch(`/api/availability?serviceId=${selectedService}&barberId=${selectedBarber}&date=${selectedDate}`);
    if (!response.ok) throw new Error(`Failed to load availability (${response.status}).`);
    const data = await response.json();
    if (data.success && Array.isArray(data.slots)) {
      renderTimeSlots(data.slots);
    } else {
      timeSlots.innerHTML = `<p>${escapeHtml(data.error || text.noTimes)}</p>`;
    }
  } catch (error) {
    console.error('Failed to load booking availability', error);
    timeSlots.innerHTML = `<p>${escapeHtml(text.availabilityError)}</p>`;
  }
}

async function loadData() {
  setBookingDataState('loading');
  try {
    const endpoints = ['/api/services', '/api/barbers', '/api/settings', '/api/bundles'];
    const [services, barbers, settings, bundles] = await Promise.all(endpoints.map(async (endpoint) => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to load ${endpoint} (${response.status}).`);
      return response.json();
    }));

    if (!Array.isArray(services) || !Array.isArray(barbers) || !Array.isArray(bundles) || !settings || typeof settings !== 'object') {
      throw new Error('The booking data response has an invalid format.');
    }
    if (services.length === 0 || barbers.length === 0) {
      throw new Error('No active services or specialists are available for booking.');
    }

    state.services = services;
    state.barbers = barbers;
    state.bundles = bundles;
    applyBusinessSettings(settings);
    renderServices();
    renderBarbers();

    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    bookingDate.min = nextDay.toISOString().split('T')[0];
    bookingDate.value = nextDay.toISOString().split('T')[0];
    state.selectedDate = bookingDate.value;
    fetchAvailability();
    setBookingDataState('ready');
  } catch (error) {
    console.error('Failed to load site data', error);
    setBookingDataState('error');
  }
}

function setBookingDataState(status) {
  if (!bookingDataStatus) return;

  const messages = {
    mk: {
      loading: 'Се вчитуваат услугите и слободните термини…',
      error: 'Не успеавме да ги вчитаме услугите. Проверете ја интернет-врската и обидете се повторно.',
      retry: 'Обиди се повторно',
    },
    sq: {
      loading: 'Po ngarkohen shërbimet dhe terminet e lira…',
      error: 'Shërbimet nuk u ngarkuan. Kontrolloni internetin dhe provoni përsëri.',
      retry: 'Provo përsëri',
    },
  };
  const text = messages[state.settings.language] || messages.sq;
  const message = bookingDataStatus.querySelector('[data-booking-status-message]');
  const retryButton = bookingDataStatus.querySelector('[data-booking-retry]');
  message.textContent = status === 'loading' ? text.loading : text.error;
  retryButton.textContent = text.retry;
  retryButton.classList.toggle('hidden', status !== 'error');
  bookingDataStatus.classList.toggle('hidden', status === 'ready');
  bookingForm.setAttribute('aria-busy', String(status === 'loading'));
  bookingForm.querySelectorAll('button, input, select').forEach((control) => {
    control.disabled = status !== 'ready';
  });
}

const bookingRetryButton = bookingDataStatus?.querySelector('[data-booking-retry]');
if (bookingRetryButton) bookingRetryButton.addEventListener('click', loadData);

serviceSelect.addEventListener('change', () => {
  state.selectedService = serviceSelect.value;
  fetchAvailability();
});

barberSelect.addEventListener('change', () => {
  state.selectedBarber = barberSelect.value;
  fetchAvailability();
});

bookingDate.addEventListener('change', () => {
  state.selectedDate = bookingDate.value;
  fetchAvailability();
});

document.querySelectorAll('.next-step').forEach((button) => {
  button.addEventListener('click', () => {
    const current = state.currentStep;
    const next = Math.min(current + 1, 4);

    if (current === 1 && !serviceSelect.value) return;
    if (current === 2 && !barberSelect.value) return;
    if (current === 3 && !state.selectedTime) return;

    showCurrentStep(next);
  });
});

document.querySelectorAll('.prev-step').forEach((button) => {
  button.addEventListener('click', () => {
    showCurrentStep(Math.max(state.currentStep - 1, 1));
  });
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(bookingForm);
  const payload = {
    serviceId: formData.get('serviceId'),
    barberId: formData.get('barberId'),
    date: formData.get('date'),
    time: state.selectedTime,
    customerName: formData.get('customerName'),
    phone: formData.get('phone'),
    email: formData.get('email') || ''
  };

  if (!payload.time) {
    alert((siteTranslations[state.settings.language] || siteTranslations.mk).chooseTime);
    return;
  }

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Booking failed.');
    }

    bookingForm.classList.add('hidden');
    bookingSuccess.classList.remove('hidden');
    bookingSuccess.innerHTML = `
      <strong>${escapeHtml((siteTranslations[state.settings.language] || siteTranslations.mk).bookingConfirmed)}</strong><br />
      ${state.settings.language === 'mk' ? 'Референца' : 'Referenca'}: <strong>${escapeHtml(data.booking.reference)}</strong><br />
      ${data.booking.service} with ${data.booking.barber}<br />
      ${formatBookingDate(data.booking.date)} at ${data.booking.time}
    `;
  } catch (error) {
    alert(error.message);
  }
});

const languageSwitcher = document.getElementById('languageSwitcher');
if (languageSwitcher) {
  languageSwitcher.addEventListener('change', (event) => {
    const language = event.target.value;
    if (!state.settings.supported_languages.includes(language)) return;
    state.settings.language = language;
    localStorage.setItem('site-language', language);
    applyLanguage(language);
  });
}

showCurrentStep(1);
loadData();
