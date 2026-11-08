require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123');
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'salon.db');

if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;
let pool;

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    });
    await pool.query('SELECT 1');
    console.log('Connected to Neon PostgreSQL database.');
    return;
  }

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }
  console.log('Connected to SQLite database.');
}

function persistDatabase() {
  if (!db || pool) return;
  const binary = Buffer.from(db.export());
  fs.writeFileSync(dbPath, binary);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

function postgresSql(sql) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

async function run(sql, params = []) {
  if (pool) {
    const result = await pool.query(postgresSql(sql), params);
    return { id: Number(result.rows[0]?.id) || 0, changes: result.rowCount || 0 };
  }

  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql.replace(/\s+RETURNING\s+id\s*$/i, ''));
      if (params.length) {
        stmt.bind(params);
      }
      stmt.step();
      const changes = db.getRowsModified();
      const selectId = db.exec('SELECT last_insert_rowid() AS id');
      const info = {
        id: selectId && selectId[0] && selectId[0].values && selectId[0].values[0] ? selectId[0].values[0][0] : 0,
        changes
      };
      stmt.free();
      persistDatabase();
      resolve(info);
    } catch (error) {
      reject(error);
    }
  });
}

async function get(sql, params = []) {
  if (pool) {
    const result = await pool.query(postgresSql(sql), params);
    return result.rows[0] || null;
  }

  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      if (params.length) {
        stmt.bind(params);
      }
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      resolve(row);
    } catch (error) {
      reject(error);
    }
  });
}

async function all(sql, params = []) {
  if (pool) {
    const result = await pool.query(postgresSql(sql), params);
    return result.rows;
  }

  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      if (params.length) {
        stmt.bind(params);
      }
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
}

function toMinutes(timeValue) {
  if (!timeValue) return 0;
  const [hours, minutes] = timeValue.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const safe = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function dayName(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

async function initDatabase() {
  if (process.env.NODE_ENV === 'production' && (!process.env.DATABASE_URL || !ADMIN_PASSWORD)) {
    throw new Error('DATABASE_URL and ADMIN_PASSWORD must be set in production.');
  }
  await initializeDatabase();

  const idPrimaryKey = pool ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const priceType = pool ? 'DOUBLE PRECISION' : 'REAL';
  const timestampType = pool ? 'TIMESTAMP' : 'TEXT';
  const expiryType = pool ? 'BIGINT' : 'INTEGER';

  await run(`
    CREATE TABLE IF NOT EXISTS services (
      id ${idPrimaryKey},
      name TEXT NOT NULL,
      price ${priceType} NOT NULL,
      duration INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS barbers (
      id ${idPrimaryKey},
      name TEXT NOT NULL,
      title TEXT,
      image TEXT,
      active INTEGER DEFAULT 1
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id ${idPrimaryKey},
      service_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      status TEXT DEFAULT 'pending',
      reference TEXT UNIQUE NOT NULL,
      created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS working_hours (
      id ${idPrimaryKey},
      barber_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS unavailable_dates (
      id ${idPrimaryKey},
      barber_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      reason TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
  `);

  const savedCountry = await get("SELECT setting_value FROM business_settings WHERE setting_key = 'country'");
  const savedCurrency = await get("SELECT setting_value FROM business_settings WHERE setting_key = 'currency'");
  const defaultCountry = savedCountry?.setting_value || (savedCurrency?.setting_value === 'EUR' ? 'XK' : 'MK');
  const defaultSettings = {
    business_name: 'Old Gold',
    logo_url: '',
    business_type: 'barber',
    country: defaultCountry,
    currency: defaultCountry === 'XK' ? 'EUR' : 'MKD',
    language: 'mk',
    supported_languages: 'mk,sq',
    google_review_url: '',
    facebook_url: '',
    instagram_url: ''
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await run(
      'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO NOTHING',
      [key, value]
    );
  }
  const savedLanguage = await get("SELECT setting_value FROM business_settings WHERE setting_key = 'language'");
  const savedLanguages = await get("SELECT setting_value FROM business_settings WHERE setting_key = 'supported_languages'");
  const normalizedCountry = defaultCountry === 'XK' ? 'XK' : 'MK';
  await run("UPDATE business_settings SET setting_value = ? WHERE setting_key = 'country'", [normalizedCountry]);
  await run("UPDATE business_settings SET setting_value = ? WHERE setting_key = 'currency'", [normalizedCountry === 'XK' ? 'EUR' : 'MKD']);
  if (!['mk', 'sq'].includes(savedLanguage?.setting_value)) {
    await run("UPDATE business_settings SET setting_value = 'mk' WHERE setting_key = 'language'");
  }
  if (!savedLanguages || !savedLanguages.setting_value.split(',').some((language) => ['mk', 'sq'].includes(language))) {
    await run("UPDATE business_settings SET setting_value = 'mk,sq' WHERE setting_key = 'supported_languages'");
  }

  await run(`
    CREATE TABLE IF NOT EXISTS bundles (
      id ${idPrimaryKey},
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price ${priceType} NOT NULL,
      booking_service_id INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bundle_services (
      bundle_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (bundle_id, service_id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS employee_accounts (
      id ${idPrimaryKey},
      barber_id INTEGER NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS employee_sessions (
      token_hash TEXT PRIMARY KEY,
      barber_id INTEGER NOT NULL,
      expires_at ${expiryType} NOT NULL
    );
  `);

  await run(
    `INSERT INTO business_settings (setting_key, setting_value)
     VALUES ('country', ?) ON CONFLICT (setting_key) DO NOTHING`,
    [defaultCountry]
  );

  const serviceCount = await get('SELECT COUNT(*) as count FROM services');
  if (Number(serviceCount.count) === 0) {
    await run(`INSERT INTO services (name, price, duration) VALUES
      ('Classic Haircut', 15, 30),
      ('Skin Fade', 18, 40),
      ('Beard Trim', 10, 20),
      ('Haircut & Beard', 25, 50)
    `);
  }

  const barberCount = await get('SELECT COUNT(*) as count FROM barbers');
  if (Number(barberCount.count) === 0) {
    await run(`INSERT INTO barbers (name, title, image) VALUES
      ('Marcus Reid', 'Senior Barber', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'),
      ('Daniel Ross', 'Fade Specialist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'),
      ('Aiden Cole', 'Beard Artist', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80')
    `);
  }

  const workHoursCount = await get('SELECT COUNT(*) as count FROM working_hours');
  if (Number(workHoursCount.count) === 0) {
    const barbers = await all('SELECT id FROM barbers WHERE active = 1');
    const rows = [];
    for (const barber of barbers) {
      for (let day = 1; day <= 5; day += 1) {
        rows.push([barber.id, day, '09:00', '18:00']);
      }
    }

    const placeholders = rows.map(() => '(?, ?, ?, ?)').join(', ');
    const flattened = rows.flat();
    if (flattened.length) {
      await run(`INSERT INTO working_hours (barber_id, day_of_week, start_time, end_time) VALUES ${placeholders}`, flattened);
    }
  }
}

function overlapExists(existingStart, existingEnd, bookingStart, bookingEnd) {
  return bookingStart < existingEnd && bookingEnd > existingStart;
}

async function getAvailableSlots(barberId, date, serviceId) {
  const barber = await get('SELECT * FROM barbers WHERE id = ? AND active = 1', [barberId]);
  if (!barber) {
    return [];
  }

  const service = await get('SELECT * FROM services WHERE id = ? AND active = 1', [serviceId]);
  const duration = service ? service.duration : 30;

  const unavailable = await all('SELECT date FROM unavailable_dates WHERE barber_id = ? AND date = ?', [barberId, date]);
  if (unavailable.length > 0) {
    return [];
  }

  const dayNumber = new Date(`${date}T00:00:00`).getDay();
  let hours = await get('SELECT * FROM working_hours WHERE barber_id = ? AND day_of_week = ?', [barberId, dayNumber]);

  if (!hours) {
    hours = { start_time: '09:00', end_time: '17:00' };
  }

  const openMinutes = toMinutes(hours.start_time);
  const closeMinutes = toMinutes(hours.end_time);
  const existingAppointments = await all(
    `SELECT a.appointment_time, s.duration
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     WHERE a.barber_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'`,
    [barberId, date]
  );

  const slots = [];
  for (let start = openMinutes; start + duration <= closeMinutes; start += 30) {
    const slotEnd = start + duration;
    const timeValue = formatTime(start);
    const isBooked = existingAppointments.some((appointment) => {
      const appointmentStart = toMinutes(appointment.appointment_time);
      const appointmentEnd = appointmentStart + appointment.duration;
      return overlapExists(appointmentStart, appointmentEnd, start, slotEnd);
    });

    if (!isBooked) {
      slots.push(timeValue);
    }
  }

  return slots;
}

function isAdminAuthenticated(req) {
  return req.cookies && req.cookies.admin_session === 'salon-admin';
}

function requireAdmin(req, res, next) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

const settingOptions = {
  business_type: ['salon', 'barber'],
  country: ['MK', 'XK'],
  language: ['mk', 'sq']
};

async function readBusinessSettings() {
  const rows = await all('SELECT setting_key, setting_value FROM business_settings');
  const settings = rows.reduce((result, row) => {
    result[row.setting_key] = row.setting_value;
    return result;
  }, {});
  settings.supported_languages = (settings.supported_languages || 'mk,sq')
    .split(',')
    .filter((language) => ['mk', 'sq'].includes(language));
  return settings;
}

app.get('/api/settings', async (req, res) => {
  try {
    res.json(await readBusinessSettings());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    res.json(await readBusinessSettings());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function isOptionalWebUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && value.length <= 2048;
  } catch (error) {
    return false;
  }
}

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const {
    businessName,
    logoUrl,
    businessType,
    country,
    language,
    supportedLanguages,
    googleReviewUrl,
    facebookUrl,
    instagramUrl
  } = req.body;
  const trimmedName = typeof businessName === 'string' ? businessName.trim() : '';
  const trimmedLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  const languages = Array.isArray(supportedLanguages)
    ? [...new Set(supportedLanguages.filter((item) => ['mk', 'sq'].includes(item)))]
    : [];

  if (!trimmedName || trimmedName.length > 80) {
    return res.status(400).json({ success: false, error: 'Business name must be between 1 and 80 characters.' });
  }
  const optionalUrls = [
    ['Logo', trimmedLogoUrl],
    ['Google review', String(googleReviewUrl || '').trim()],
    ['Facebook', String(facebookUrl || '').trim()],
    ['Instagram', String(instagramUrl || '').trim()]
  ];
  for (const [label, url] of optionalUrls) {
    if (!isOptionalWebUrl(url)) {
      return res.status(400).json({ success: false, error: `${label} link must be a valid HTTP or HTTPS URL.` });
    }
  }
  if (
    !settingOptions.business_type.includes(businessType)
    || !settingOptions.country.includes(country)
    || !settingOptions.language.includes(language)
    || languages.length < 1
    || !languages.includes(language)
  ) {
    return res.status(400).json({ success: false, error: 'Choose a supported business type, country, and one or more languages including the default language.' });
  }

  const settings = {
    business_name: trimmedName,
    logo_url: trimmedLogoUrl,
    business_type: businessType,
    country,
    currency: country === 'XK' ? 'EUR' : 'MKD',
    language,
    supported_languages: languages.join(','),
    google_review_url: String(googleReviewUrl || '').trim(),
    facebook_url: String(facebookUrl || '').trim(),
    instagram_url: String(instagramUrl || '').trim()
  };

  try {
    for (const [key, value] of Object.entries(settings)) {
      await run(
        'INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = excluded.setting_value',
        [key, value]
      );
    }
    res.json({ success: true, settings: { ...settings, supported_languages: languages } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function hashEmployeePassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function isValidUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9._-]{3,40}$/.test(username);
}

async function getEmployeeSession(req) {
  const token = req.cookies && req.cookies.employee_session;
  if (!token) return null;
  const session = await get(
    `SELECT e.barber_id, b.name
     FROM employee_sessions es
     INNER JOIN employee_accounts e ON e.barber_id = es.barber_id
     INNER JOIN barbers b ON b.id = e.barber_id AND b.active = 1
     WHERE es.token_hash = ? AND es.expires_at > ?`,
    [crypto.createHash('sha256').update(token).digest('hex'), Date.now()]
  );
  return session;
}

app.get('/api/admin/employees', requireAdmin, async (req, res) => {
  try {
    const employees = await all(`
      SELECT e.barber_id, e.username, b.name, b.title
      FROM employee_accounts e
      INNER JOIN barbers b ON b.id = e.barber_id
      WHERE b.active = 1
      ORDER BY b.name
    `);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/employees', requireAdmin, async (req, res) => {
  const barberId = Number(req.body.barberId);
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!Number.isInteger(barberId) || barberId <= 0 || !isValidUsername(username) || password.length < 10 || password.length > 200) {
    return res.status(400).json({ success: false, error: 'Choose a barber, use a 3–40 character username, and a password of at least 10 characters.' });
  }

  try {
    const barber = await get('SELECT id FROM barbers WHERE id = ? AND active = 1', [barberId]);
    if (!barber) {
      return res.status(400).json({ success: false, error: 'Selected team member is not active.' });
    }
    const existingUsername = await get('SELECT barber_id FROM employee_accounts WHERE username = ?', [username]);
    if (existingUsername) {
      return res.status(409).json({ success: false, error: 'That username is already in use.' });
    }
    const existingBarber = await get('SELECT id FROM employee_accounts WHERE barber_id = ?', [barberId]);
    if (existingBarber) {
      return res.status(409).json({ success: false, error: 'This team member already has a login. Update their access instead.' });
    }
    const credentials = hashEmployeePassword(password);
    await run(
      'INSERT INTO employee_accounts (barber_id, username, password_salt, password_hash) VALUES (?, ?, ?, ?)',
      [barberId, username, credentials.salt, credentials.hash]
    );
    res.status(201).json({ success: true, employee: await get('SELECT barber_id, username FROM employee_accounts WHERE barber_id = ?', [barberId]) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/employees/:barberId', requireAdmin, async (req, res) => {
  const barberId = Number(req.params.barberId);
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!Number.isInteger(barberId) || barberId <= 0 || !isValidUsername(username) || (password && (password.length < 10 || password.length > 200))) {
    return res.status(400).json({ success: false, error: 'Use a 3–40 character username and, if changing it, a password of at least 10 characters.' });
  }

  try {
    const existing = await get('SELECT * FROM employee_accounts WHERE barber_id = ?', [barberId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee login not found.' });
    }
    const duplicate = await get('SELECT barber_id FROM employee_accounts WHERE username = ? AND barber_id != ?', [username, barberId]);
    if (duplicate) {
      return res.status(409).json({ success: false, error: 'That username is already in use.' });
    }
    if (password) {
      const credentials = hashEmployeePassword(password);
      await run(
        'UPDATE employee_accounts SET username = ?, password_salt = ?, password_hash = ? WHERE barber_id = ?',
        [username, credentials.salt, credentials.hash, barberId]
      );
      await run('DELETE FROM employee_sessions WHERE barber_id = ?', [barberId]);
    } else {
      await run('UPDATE employee_accounts SET username = ? WHERE barber_id = ?', [username, barberId]);
    }
    res.json({ success: true, employee: await get('SELECT barber_id, username FROM employee_accounts WHERE barber_id = ?', [barberId]) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/employees/:barberId', requireAdmin, async (req, res) => {
  const barberId = Number(req.params.barberId);
  if (!Number.isInteger(barberId) || barberId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid employee.' });
  }
  try {
    await run('DELETE FROM employee_sessions WHERE barber_id = ?', [barberId]);
    const result = await run('DELETE FROM employee_accounts WHERE barber_id = ?', [barberId]);
    if (!result.changes) {
      return res.status(404).json({ success: false, error: 'Employee login not found.' });
    }
    res.json({ success: true, message: 'Employee login removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/employee/login', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  try {
    const employee = await get(
      `SELECT e.*, b.name FROM employee_accounts e
       INNER JOIN barbers b ON b.id = e.barber_id AND b.active = 1
       WHERE e.username = ?`,
      [username]
    );
    const suppliedHash = crypto.scryptSync(password, employee?.password_salt || 'missing-account-salt', 64);
    const storedHash = employee ? Buffer.from(employee.password_hash, 'hex') : Buffer.alloc(64);
    if (!employee || storedHash.length !== suppliedHash.length || !crypto.timingSafeEqual(storedHash, suppliedHash)) {
      return res.status(401).json({ success: false, error: 'Incorrect username or password.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    await run('DELETE FROM employee_sessions WHERE expires_at <= ?', [Date.now()]);
    await run(
      'INSERT INTO employee_sessions (token_hash, barber_id, expires_at) VALUES (?, ?, ?)',
      [crypto.createHash('sha256').update(token).digest('hex'), employee.barber_id, expiresAt]
    );
    res.cookie('employee_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    res.json({ success: true, employee: { name: employee.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/employee/logout', async (req, res) => {
  const token = req.cookies && req.cookies.employee_session;
  if (token) {
    try {
      await run('DELETE FROM employee_sessions WHERE token_hash = ?', [crypto.createHash('sha256').update(token).digest('hex')]);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  res.clearCookie('employee_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true });
});

app.get('/api/employee/appointments', async (req, res) => {
  try {
    const employee = await getEmployeeSession(req);
    if (!employee) {
      return res.status(401).json({ success: false, error: 'Please sign in again.' });
    }
    const appointments = await all(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.customer_name, a.phone, a.email,
        a.status, a.reference, s.name AS service_name, s.duration AS service_duration, s.price
      FROM appointments a
      INNER JOIN services s ON s.id = a.service_id
      WHERE a.barber_id = ?
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `, [employee.barber_id]);
    const currency = await get("SELECT setting_value FROM business_settings WHERE setting_key = 'currency'");
    res.json({ employee: { name: employee.name }, appointments, currency: currency?.setting_value || 'MKD' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/employee/appointments/:id/confirm', async (req, res) => {
  const appointmentId = Number(req.params.id);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid appointment.' });
  }

  try {
    const employee = await getEmployeeSession(req);
    if (!employee) {
      return res.status(401).json({ success: false, error: 'Please sign in again.' });
    }

    const appointment = await get(
      'SELECT id, status FROM appointments WHERE id = ? AND barber_id = ?',
      [appointmentId, employee.barber_id]
    );
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }
    if (appointment.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Only pending appointments can be confirmed.' });
    }

    await run(
      'UPDATE appointments SET status = ? WHERE id = ? AND barber_id = ? AND status = ?',
      ['confirmed', appointmentId, employee.barber_id, 'pending']
    );
    res.json({ success: true, message: 'Appointment confirmed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const services = await all(
      `SELECT * FROM services
       WHERE active = 1
       AND id NOT IN (SELECT booking_service_id FROM bundles WHERE active = 1)
       ORDER BY price`
    );
    res.json(services);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function getBundles() {
  const aggregate = pool ? 'STRING_AGG' : 'GROUP_CONCAT';
  const includedServiceIds = pool
    ? "STRING_AGG(s.id::text, ',')"
    : "GROUP_CONCAT(s.id, ',')";
  return all(`
    SELECT b.id, b.name, b.description, b.price, b.booking_service_id,
      ${aggregate}(s.name, ', ') AS included_services,
      ${includedServiceIds} AS included_service_ids
    FROM bundles b
    LEFT JOIN bundle_services bs ON bs.bundle_id = b.id
    LEFT JOIN services s ON s.id = bs.service_id
    WHERE b.active = 1
    GROUP BY b.id
    ORDER BY b.id DESC
  `);
}

app.get('/api/bundles', async (req, res) => {
  try {
    res.json(await getBundles());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/bundles', requireAdmin, async (req, res) => {
  try {
    res.json(await getBundles());
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function validateBundleInput(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const price = Number(body.price);
  const serviceIds = Array.isArray(body.serviceIds)
    ? [...new Set(body.serviceIds.map(Number))]
    : [];
  if (!name || name.length > 80 || !description || description.length > 500) {
    return { error: 'Enter a bundle name and a description (up to 500 characters).' };
  }
  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return { error: 'Enter a valid bundle price.' };
  }
  if (!serviceIds.length || serviceIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return { error: 'Choose at least one existing service for the bundle.' };
  }
  return { name, description, price, serviceIds };
}

async function validateBundleServices(serviceIds) {
  const placeholders = serviceIds.map(() => '?').join(', ');
  const services = await all(
    `SELECT id, duration FROM services
     WHERE active = 1
     AND id IN (${placeholders})
     AND id NOT IN (SELECT booking_service_id FROM bundles WHERE active = 1)`,
    serviceIds
  );
  return services.length === serviceIds.length ? services : null;
}

app.post('/api/admin/bundles', requireAdmin, async (req, res) => {
  const bundle = validateBundleInput(req.body);
  if (bundle.error) {
    return res.status(400).json({ success: false, error: bundle.error });
  }

  try {
    const services = await validateBundleServices(bundle.serviceIds);
    if (!services) {
      return res.status(400).json({ success: false, error: 'One or more selected services are unavailable.' });
    }
    const duration = services.reduce((total, service) => total + Number(service.duration), 0);
    const serviceResult = await run(
      'INSERT INTO services (name, price, duration, active) VALUES (?, ?, ?, 1) RETURNING id',
      [bundle.name, bundle.price, duration]
    );
    const bundleResult = await run(
      'INSERT INTO bundles (name, description, price, booking_service_id, active) VALUES (?, ?, ?, ?, 1) RETURNING id',
      [bundle.name, bundle.description, bundle.price, serviceResult.id]
    );
    for (const serviceId of bundle.serviceIds) {
      await run('INSERT INTO bundle_services (bundle_id, service_id) VALUES (?, ?)', [bundleResult.id, serviceId]);
    }
    res.status(201).json({ success: true, bundle: await get('SELECT * FROM bundles WHERE id = ?', [bundleResult.id]) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/bundles/:id', requireAdmin, async (req, res) => {
  const bundle = validateBundleInput(req.body);
  const bundleId = Number(req.params.id);
  if (!Number.isInteger(bundleId) || bundleId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid bundle.' });
  }
  if (bundle.error) {
    return res.status(400).json({ success: false, error: bundle.error });
  }

  try {
    const existing = await get('SELECT * FROM bundles WHERE id = ? AND active = 1', [bundleId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Bundle not found.' });
    }
    const services = await validateBundleServices(bundle.serviceIds);
    if (!services) {
      return res.status(400).json({ success: false, error: 'One or more selected services are unavailable.' });
    }
    const duration = services.reduce((total, service) => total + Number(service.duration), 0);
    await run('UPDATE bundles SET name = ?, description = ?, price = ? WHERE id = ?', [bundle.name, bundle.description, bundle.price, bundleId]);
    await run('UPDATE services SET name = ?, price = ?, duration = ? WHERE id = ?', [bundle.name, bundle.price, duration, existing.booking_service_id]);
    await run('DELETE FROM bundle_services WHERE bundle_id = ?', [bundleId]);
    for (const serviceId of bundle.serviceIds) {
      await run('INSERT INTO bundle_services (bundle_id, service_id) VALUES (?, ?)', [bundleId, serviceId]);
    }
    res.json({ success: true, bundle: await get('SELECT * FROM bundles WHERE id = ?', [bundleId]) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/bundles/:id', requireAdmin, async (req, res) => {
  const bundleId = Number(req.params.id);
  if (!Number.isInteger(bundleId) || bundleId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid bundle.' });
  }
  try {
    const bundle = await get('SELECT * FROM bundles WHERE id = ? AND active = 1', [bundleId]);
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Bundle not found.' });
    }
    await run('UPDATE bundles SET active = 0 WHERE id = ?', [bundleId]);
    await run('UPDATE services SET active = 0 WHERE id = ?', [bundle.booking_service_id]);
    res.json({ success: true, message: 'Bundle removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/barbers', async (req, res) => {
  try {
    const barbers = await all('SELECT * FROM barbers WHERE active = 1 ORDER BY name');
    res.json(barbers);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/availability', async (req, res) => {
  const { barberId, date, serviceId } = req.query;

  if (!barberId || !date || !serviceId) {
    return res.status(400).json({ success: false, error: 'barberId, date, and serviceId are required' });
  }

  try {
    const slots = await getAvailableSlots(Number(barberId), date, Number(serviceId));
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { serviceId, barberId, date, time, customerName, phone, email } = req.body;

  if (!serviceId || !barberId || !date || !time || !customerName || !phone) {
    return res.status(400).json({ success: false, error: 'Missing required booking details.' });
  }

  try {
    const service = await get('SELECT * FROM services WHERE id = ? AND active = 1', [Number(serviceId)]);
    const barber = await get('SELECT * FROM barbers WHERE id = ? AND active = 1', [Number(barberId)]);

    if (!service || !barber) {
      return res.status(400).json({ success: false, error: 'Selected service or barber is not available.' });
    }

    const existingSlots = await getAvailableSlots(Number(barberId), date, Number(serviceId));
    if (!existingSlots.includes(time)) {
      return res.status(400).json({ success: false, error: 'Selected appointment time is no longer available.' });
    }

    const reference = `SAL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const insertResult = await run(
      `INSERT INTO appointments (service_id, barber_id, appointment_date, appointment_time, customer_name, phone, email, reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id`,
      [Number(serviceId), Number(barberId), date, time, customerName, phone, email || '', reference]
    );

    const booking = {
      id: insertResult.id,
      reference,
      service: service.name,
      barber: barber.name,
      date,
      day: dayName(date),
      time,
      customerName,
      phone,
      email: email || '',
      status: 'pending',
      duration: service.duration,
      price: service.price
    };

    res.status(201).json({ success: true, message: 'Appointment booked successfully.', booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  res.cookie('admin_session', 'salon-admin', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  });

  res.json({ success: true, message: 'Admin access granted.' });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logged out.' });
});

app.get('/api/admin/appointments', requireAdmin, async (req, res) => {
  try {
    const appointments = await all(`
      SELECT a.*, s.name AS service_name, s.duration AS service_duration, s.price, b.name AS barber_name
      FROM appointments a
      INNER JOIN services s ON s.id = a.service_id
      INNER JOIN barbers b ON b.id = a.barber_id
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/appointments/:id/confirm', requireAdmin, async (req, res) => {
  try {
    await run('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', Number(req.params.id)]);
    res.json({ success: true, message: 'Appointment confirmed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/appointments/:id/cancel', requireAdmin, async (req, res) => {
  try {
    await run('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', Number(req.params.id)]);
    res.json({ success: true, message: 'Appointment cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/services', requireAdmin, async (req, res) => {
  try {
    const services = await all('SELECT * FROM services WHERE active = 1 ORDER BY price');
    res.json(services);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/services', requireAdmin, async (req, res) => {
  const { name, price, duration } = req.body;
  if (!name || !price || !duration) {
    return res.status(400).json({ success: false, error: 'Name, price, and duration are required.' });
  }

  try {
    const item = await run('INSERT INTO services (name, price, duration) VALUES (?, ?, ?) RETURNING id', [name, Number(price), Number(duration)]);
    const service = await get('SELECT * FROM services WHERE id = ?', [item.id]);
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/services/:id', requireAdmin, async (req, res) => {
  const { name, price, duration } = req.body;
  if (!name || !price || !duration) {
    return res.status(400).json({ success: false, error: 'Name, price, and duration are required.' });
  }

  try {
    await run('UPDATE services SET name = ?, price = ?, duration = ? WHERE id = ?', [name, Number(price), Number(duration), Number(req.params.id)]);
    const affectedBundles = await all(`
      SELECT b.booking_service_id, SUM(s.duration) AS duration
      FROM bundles b
      INNER JOIN bundle_services bs ON bs.bundle_id = b.id
      INNER JOIN services s ON s.id = bs.service_id AND s.active = 1
      WHERE b.active = 1 AND bs.service_id = ?
      GROUP BY b.id
    `, [Number(req.params.id)]);
    for (const bundle of affectedBundles) {
      await run('UPDATE services SET duration = ? WHERE id = ?', [bundle.duration, bundle.booking_service_id]);
    }
    const service = await get('SELECT * FROM services WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const bundleUsage = await get(
      'SELECT b.id FROM bundles b INNER JOIN bundle_services bs ON bs.bundle_id = b.id WHERE b.active = 1 AND bs.service_id = ? LIMIT 1',
      [Number(req.params.id)]
    );
    if (bundleUsage) {
      return res.status(409).json({ success: false, error: 'Remove this service from active bundles before deleting it.' });
    }
    await run('UPDATE services SET active = 0 WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: 'Service removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/barbers', requireAdmin, async (req, res) => {
  try {
    const barbers = await all('SELECT * FROM barbers WHERE active = 1 ORDER BY name');
    res.json(barbers);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/barbers', requireAdmin, async (req, res) => {
  const { name, title, image } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Barber name is required.' });
  }

  try {
    const item = await run('INSERT INTO barbers (name, title, image) VALUES (?, ?, ?) RETURNING id', [name, title || '', image || '']);
    const barber = await get('SELECT * FROM barbers WHERE id = ?', [item.id]);
    res.status(201).json({ success: true, barber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/barbers/:id', requireAdmin, async (req, res) => {
  const { name, title, image } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Barber name is required.' });
  }

  try {
    await run('UPDATE barbers SET name = ?, title = ?, image = ? WHERE id = ?', [name, title || '', image || '', Number(req.params.id)]);
    const barber = await get('SELECT * FROM barbers WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, barber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/barbers/:id', requireAdmin, async (req, res) => {
  try {
    await run('UPDATE barbers SET active = 0 WHERE id = ?', [Number(req.params.id)]);
    res.json({ success: true, message: 'Barber removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/working-hours', requireAdmin, async (req, res) => {
  try {
    const hours = await all('SELECT * FROM working_hours ORDER BY barber_id, day_of_week');
    res.json(hours);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/working-hours', requireAdmin, async (req, res) => {
  const { barberId, dayOfWeek, startTime, endTime } = req.body;
  if (!barberId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  const numericBarberId = Number(barberId);
  const numericDayOfWeek = Number(dayOfWeek);
  if (
    !Number.isInteger(numericBarberId)
    || !Number.isInteger(numericDayOfWeek)
    || numericDayOfWeek < 0
    || numericDayOfWeek > 6
    || !/^\d{2}:\d{2}$/.test(startTime)
    || !/^\d{2}:\d{2}$/.test(endTime)
    || toMinutes(endTime) <= toMinutes(startTime)
  ) {
    return res.status(400).json({ success: false, error: 'Choose a valid barber, day, and time range.' });
  }

  try {
    const barber = await get('SELECT id FROM barbers WHERE id = ? AND active = 1', [numericBarberId]);
    if (!barber) {
      return res.status(400).json({ success: false, error: 'Selected barber is not available.' });
    }

    const existing = await get(
      'SELECT id FROM working_hours WHERE barber_id = ? AND day_of_week = ? ORDER BY id LIMIT 1',
      [numericBarberId, numericDayOfWeek]
    );
    if (existing) {
      await run(
        'UPDATE working_hours SET start_time = ?, end_time = ? WHERE id = ?',
        [startTime, endTime, existing.id]
      );
      await run(
        'DELETE FROM working_hours WHERE barber_id = ? AND day_of_week = ? AND id != ?',
        [numericBarberId, numericDayOfWeek, existing.id]
      );
    } else {
      await run(
        'INSERT INTO working_hours (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [numericBarberId, numericDayOfWeek, startTime, endTime]
      );
    }
    res.status(201).json({ success: true, message: 'Working hours saved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/unavailable-dates', requireAdmin, async (req, res) => {
  try {
    const dates = await all('SELECT * FROM unavailable_dates ORDER BY date DESC');
    res.json(dates);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/unavailable-dates', requireAdmin, async (req, res) => {
  const { barberId, date, reason } = req.body;
  if (!barberId || !date) {
    return res.status(400).json({ success: false, error: 'Barber and date are required.' });
  }

  try {
    const item = await run('INSERT INTO unavailable_dates (barber_id, date, reason) VALUES (?, ?, ?) RETURNING id', [Number(barberId), date, reason || '']);
    const record = await get('SELECT * FROM unavailable_dates WHERE id = ?', [item.id]);
    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/unavailable-dates/:id', requireAdmin, async (req, res) => {
  try {
    const result = await run('DELETE FROM unavailable_dates WHERE id = ?', [Number(req.params.id)]);
    if (!result.changes) {
      return res.status(404).json({ success: false, error: 'Unavailable date not found.' });
    }
    res.json({ success: true, message: 'Unavailable date removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/salon', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'salon.html'));
});

app.get('/barber', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'barber.html'));
});

app.get('/employee', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employee.html'));
});

app.get('/', async (req, res) => {
  try {
    const settings = await readBusinessSettings();
    const page = settings.business_type === 'salon' ? 'salon.html' : 'barber.html';
    res.sendFile(path.join(__dirname, 'public', page));
  } catch (error) {
    res.status(500).send('Unable to load the business website.');
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  await initDatabase();
  if (process.argv.includes('--init-db')) {
    if (pool) await pool.end();
    if (db) db.close();
    return;
  }
  app.listen(PORT, () => {
    console.log(`Salon booking app running on http://localhost:${PORT}`);
  });
}

module.exports = { app, initDatabase };

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

  process.on('SIGINT', () => {
    Promise.resolve(pool ? pool.end() : db?.close()).finally(() => process.exit(0));
  });
}
