require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

const sqlitePath = path.join(__dirname, '..', 'data', 'salon.db');
const tables = [
  { name: 'business_settings', conflict: ['setting_key'] },
  { name: 'services', conflict: ['id'], serial: true },
  { name: 'barbers', conflict: ['id'], serial: true },
  { name: 'working_hours', conflict: ['id'], serial: true },
  { name: 'unavailable_dates', conflict: ['id'], serial: true },
  { name: 'bundles', conflict: ['id'], serial: true },
  { name: 'bundle_services', conflict: ['bundle_id', 'service_id'] },
  { name: 'appointments', conflict: ['id'], serial: true },
  { name: 'employee_accounts', conflict: ['id'], serial: true },
];

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function readRows(database, tableName) {
  const statement = database.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

async function copyRows(pool, table, rows) {
  for (const row of rows) {
    const columns = Object.keys(row);
    const columnList = columns.map(quoteIdentifier).join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const conflictColumns = table.conflict.map(quoteIdentifier).join(', ');
    const updates = columns
      .filter((column) => !table.conflict.includes(column))
      .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`);
    const conflictAction = updates.length
      ? `DO UPDATE SET ${updates.join(', ')}`
      : 'DO NOTHING';
    await pool.query(
      `INSERT INTO ${quoteIdentifier(table.name)} (${columnList}) VALUES (${placeholders}) ON CONFLICT (${conflictColumns}) ${conflictAction}`,
      columns.map((column) => row[column])
    );
  }

  if (table.serial) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${quoteIdentifier(table.name)}`,
      [table.name]
    );
  }
}

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to your Neon connection string first.');
  if (!fs.existsSync(sqlitePath)) throw new Error(`SQLite database not found: ${sqlitePath}`);

  const initialization = spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'server.js'), '--init-db'],
    { env: process.env, stdio: 'inherit' }
  );
  if (initialization.status !== 0) throw new Error('Could not initialize the Neon schema.');

  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(new Uint8Array(fs.readFileSync(sqlitePath)));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

  try {
    await pool.query('SELECT 1');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM appointments');
    if (Number(rows[0].count) > 0) {
      throw new Error('Neon already contains appointments. Migration stopped to avoid overwriting live booking data.');
    }

    for (const table of tables) {
      const sourceRows = readRows(sqlite, table.name);
      await copyRows(pool, table, sourceRows);
      console.log(`${table.name}: ${sourceRows.length} rows copied`);
    }
    console.log('Employee sessions were not copied; employees will sign in again.');
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});