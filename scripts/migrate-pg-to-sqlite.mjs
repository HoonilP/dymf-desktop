import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ─── Conversion Helpers ────────────────────────────────────────────────
export function convertArray(val) {
  if (val == null) return '[]';
  if (Array.isArray(val)) return JSON.stringify(val);
  return '[]';
}

export function convertBool(val) {
  if (val === true) return 1;
  return 0;
}

export function convertDate(val) {
  if (val == null) return null;
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    const h = String(val.getUTCHours()).padStart(2, '0');
    const mi = String(val.getUTCMinutes()).padStart(2, '0');
    const s = String(val.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${mi}:${s}`;
  }
  if (typeof val === 'string') return val;
  return String(val);
}

export function convertDateOnly(val) {
  if (val == null) return null;
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') return val.slice(0, 10);
  return String(val);
}

export function convertBigint(val) {
  if (val == null) return 0;
  return Number(val);
}

export function convertDecimal(val) {
  if (val == null) return 0.0;
  return parseFloat(val);
}

export function convertEnum(val, mapping, defaultVal) {
  if (val == null) return defaultVal;
  const result = mapping[val];
  return result !== undefined ? result : defaultVal;
}

// ─── Enum Mappings ─────────────────────────────────────────────────────
export const ENUM_ROLE = { 0: 'admin', 1: 'paidUser' };
export const ENUM_GENDER = { 0: 'man', 1: 'woman', 2: 'notdefinded' };
export const ENUM_WORKING_STATUS = { 0: 'working', 1: 'notworking', 2: 'etc' };
export const ENUM_LOAN_TYPE = { 0: 'special_loan', 1: 'group_loan', 2: 'etc' };
export const ENUM_REPAYMENT_METHOD = { 0: 'Equal', 1: 'Equal_Principal', 2: 'Bullet' };
export const ENUM_COLLATERAL_TYPE = { 0: 'Property', 1: 'Car' };

// ─── SQLite DDL (verbatim from src-tauri/src/lib.rs lines 9-235) ───────
export const SQLITE_DDL = `
-- 1. user (standalone)
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'paidUser' CHECK (role IN ('admin', 'paidUser')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1
);

-- 2. personal (standalone)
CREATE TABLE IF NOT EXISTS personal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nrc_number TEXT NOT NULL UNIQUE,
    birth TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'notdefinded' CHECK (gender IN ('man', 'woman', 'notdefinded')),
    salary INTEGER NOT NULL DEFAULT 0,
    ssb INTEGER NOT NULL DEFAULT 0,
    income_tax INTEGER NOT NULL DEFAULT 0,
    bonus INTEGER NOT NULL DEFAULT 0,
    working_status TEXT NOT NULL DEFAULT 'etc' CHECK (working_status IN ('working', 'notworking', 'etc')),
    image TEXT NOT NULL DEFAULT 'empty',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1
);

-- 3. loan_officier (FK -> personal)
CREATE TABLE IF NOT EXISTS loan_officier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personnel_id_id INTEGER NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (personnel_id_id) REFERENCES personal(id)
);

-- 4. cp_number (standalone)
CREATE TABLE IF NOT EXISTS cp_number (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_number TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1
);

-- 5. loan_officier_cp_numbers (join table: loan_officier <-> cp_number)
CREATE TABLE IF NOT EXISTS loan_officier_cp_numbers (
    loan_officier_id INTEGER NOT NULL,
    cp_number_id INTEGER NOT NULL,
    PRIMARY KEY (loan_officier_id, cp_number_id),
    FOREIGN KEY (loan_officier_id) REFERENCES loan_officier(id) ON DELETE CASCADE,
    FOREIGN KEY (cp_number_id) REFERENCES cp_number(id) ON DELETE CASCADE
);

-- 6. customer (FK -> cp_number)
CREATE TABLE IF NOT EXISTS customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nrc_number TEXT NOT NULL UNIQUE,
    father_name TEXT NOT NULL,
    family_information TEXT NOT NULL DEFAULT '[]',
    birth TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    home_address TEXT NOT NULL,
    email TEXT,
    gender TEXT NOT NULL DEFAULT 'notdefinded' CHECK (gender IN ('man', 'woman', 'notdefinded')),
    loan_type TEXT NOT NULL DEFAULT 'etc' CHECK (loan_type IN ('special_loan', 'group_loan', 'etc')),
    home_postal_code TEXT NOT NULL,
    office_address TEXT NOT NULL,
    office_postal_code TEXT NOT NULL,
    details TEXT DEFAULT '[]',
    image TEXT DEFAULT 'empty',
    cp_number_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cp_number_id) REFERENCES cp_number(id)
);

-- 7. guarantor (FK -> cp_number)
CREATE TABLE IF NOT EXISTS guarantor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nrc_number TEXT NOT NULL UNIQUE,
    birth TEXT NOT NULL,
    father_name TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'notdefinded' CHECK (gender IN ('man', 'woman', 'notdefinded')),
    phone_number TEXT NOT NULL,
    email TEXT,
    loan_type TEXT NOT NULL DEFAULT 'etc' CHECK (loan_type IN ('special_loan', 'group_loan', 'etc')),
    home_address TEXT NOT NULL,
    home_postal_code TEXT NOT NULL,
    office_address TEXT NOT NULL,
    office_postal_code TEXT NOT NULL,
    details TEXT DEFAULT '[]',
    image TEXT NOT NULL DEFAULT 'empty',
    cp_number_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cp_number_id) REFERENCES cp_number(id)
);

-- 8. loan (FK -> loan_officier, customer)
CREATE TABLE IF NOT EXISTS loan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_officer_id INTEGER NOT NULL,
    loan_amount INTEGER NOT NULL,
    repayment_cycle INTEGER NOT NULL,
    interest_rate REAL NOT NULL DEFAULT 0.28,
    contract_date TEXT NOT NULL,
    number_of_repayment INTEGER NOT NULL,
    repayment_method TEXT NOT NULL DEFAULT 'Equal' CHECK (repayment_method IN ('Equal', 'Equal_Principal', 'Bullet')),
    overdue_status INTEGER NOT NULL DEFAULT 0,
    complete_status INTEGER NOT NULL DEFAULT 0,
    customer_id INTEGER NOT NULL,
    consulting_info TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_officer_id) REFERENCES loan_officier(id),
    FOREIGN KEY (customer_id) REFERENCES customer(id)
);

-- 9. loan_schedule (FK -> loan)
CREATE TABLE IF NOT EXISTS loan_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    principal INTEGER NOT NULL,
    interest INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    period INTEGER NOT NULL,
    remaining_balance INTEGER NOT NULL,
    total INTEGER NOT NULL,
    loan_payment_status INTEGER NOT NULL DEFAULT 0,
    loan_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE
);

-- 10. loan_transaction (FK -> loan)
CREATE TABLE IF NOT EXISTS loan_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    before_re INTEGER NOT NULL,
    repayment_amount INTEGER NOT NULL,
    loan_id INTEGER NOT NULL,
    is_overdue INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE
);

-- 11. collateral (FK -> loan)
CREATE TABLE IF NOT EXISTS collateral (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'Car' CHECK (type IN ('Property', 'Car')),
    name TEXT NOT NULL,
    detail TEXT NOT NULL,
    price INTEGER,
    loan_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE
);

-- 12. guarantee (FK -> loan, guarantor)
CREATE TABLE IF NOT EXISTS guarantee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER,
    guarantor_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE,
    FOREIGN KEY (guarantor_id) REFERENCES guarantor(id)
);

-- 13. overdue_schedule (FK -> loan)
CREATE TABLE IF NOT EXISTS overdue_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    principal INTEGER NOT NULL,
    interest INTEGER NOT NULL,
    overdue_interest INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    loan_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE
);

-- 14. overdue_transaction (FK -> overdue_schedule)
CREATE TABLE IF NOT EXISTS overdue_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_principal INTEGER NOT NULL,
    received_interest INTEGER NOT NULL,
    received_overdue_interest INTEGER NOT NULL,
    overdue_schedule_id INTEGER NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (overdue_schedule_id) REFERENCES overdue_schedule(id) ON DELETE CASCADE
);

-- 15. fixedasset (standalone)
CREATE TABLE IF NOT EXISTS fixedasset (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    purchase_date TEXT NOT NULL,
    price INTEGER NOT NULL,
    method_status INTEGER NOT NULL DEFAULT 0,
    depreciation_period INTEGER NOT NULL DEFAULT 0,
    depreciation_ratio REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    version INTEGER NOT NULL DEFAULT 1
);
`;

// ─── FK-safe insertion order ───────────────────────────────────────────
export const TABLE_ORDER = [
  'user',
  'personal',
  'cp_number',
  'fixedasset',
  'loan_officier',
  'loan_officier_cp_numbers',
  'customer',
  'guarantor',
  'loan',
  'loan_schedule',
  'loan_transaction',
  'collateral',
  'guarantee',
  'overdue_schedule',
  'overdue_transaction',
];

// ─── PG table names (TypeORM snake_case entity names) ──────────────────
const PG_TABLES = {
  user: 'user',
  personal: 'personal',
  cp_number: 'cp_number',
  fixedasset: 'fixedasset',
  loan_officier: 'loan_officier',
  loan_officier_cp_numbers: 'loan_officier_cp_numbers_cp_number',
  customer: 'customer',
  guarantor: 'guarantor',
  loan: 'loan',
  loan_schedule: 'loan_schedule',
  loan_transaction: 'loan_transaction',
  collateral: 'collateral',
  guarantee: 'guarantee',
  overdue_schedule: 'overdue_schedule',
  overdue_transaction: 'overdue_transaction',
};

// ─── FK Column Mapping (PG camelCase -> SQLite snake_case) ─────────────
export const FK_COLUMN_MAP = {
  personnelIdId: 'personnel_id_id',
  cpNumberId: 'cp_number_id',
  loanOfficerId: 'loan_officer_id',
  customerId: 'customer_id',
  loanId: 'loan_id',
  guarantorId: 'guarantor_id',
  overdueScheduleId: 'overdue_schedule_id',
  // Join table columns
  loanOfficierId: 'loan_officier_id',
  // cpNumberId already mapped above -> cp_number_id
};

// ─── Main Migration ────────────────────────────────────────────────────
async function main() {
  dotenv.config();

  const { PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD } = process.env;
  if (!PG_HOST || !PG_DATABASE || !PG_USER || !PG_PASSWORD) {
    console.error('Missing PG connection env vars. Required: PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD');
    process.exit(1);
  }

  const pgClient = new pg.Client({
    host: PG_HOST,
    port: parseInt(PG_PORT || '5432'),
    database: PG_DATABASE,
    user: PG_USER,
    password: PG_PASSWORD,
    connectionTimeoutMillis: 30000,
  });

  try {
    await pgClient.connect();
    console.log('[preflight] Connected to PostgreSQL');
  } catch (err) {
    console.error(`[error] PostgreSQL connection failed (${PG_HOST}:${PG_PORT || 5432}): ${err.message}`);
    process.exit(1);
  }

  // ── Pre-flight: verify PG table/column names ──────────────────────
  console.log('[preflight] Verifying PG table and column names...');

  // Check join table name
  const joinTableResult = await pgClient.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE '%loan_officier%cp_number%'`
  );
  if (joinTableResult.rows.length > 0) {
    const actualJoinTable = joinTableResult.rows[0].table_name;
    PG_TABLES.loan_officier_cp_numbers = actualJoinTable;
    console.log(`[preflight] Join table found: ${actualJoinTable}`);
  } else {
    console.error('[preflight] WARNING: Join table for loan_officier<->cp_number not found');
  }

  // Verify FK columns exist in PG tables
  const fkVerifications = [
    { table: 'loan_officier', expectedCol: 'personnelIdId' },
    { table: 'customer', expectedCol: 'cpNumberId' },
    { table: 'guarantor', expectedCol: 'cpNumberId' },
    { table: 'loan', expectedCol: 'loanOfficerId' },
    { table: 'loan', expectedCol: 'customerId' },
    { table: 'loan_schedule', expectedCol: 'loanId' },
    { table: 'loan_transaction', expectedCol: 'loanId' },
    { table: 'collateral', expectedCol: 'loanId' },
    { table: 'guarantee', expectedCol: 'loanId' },
    { table: 'guarantee', expectedCol: 'guarantorId' },
    { table: 'overdue_schedule', expectedCol: 'loanId' },
    { table: 'overdue_transaction', expectedCol: 'overdueScheduleId' },
  ];

  for (const { table, expectedCol } of fkVerifications) {
    const colResult = await pgClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const colNames = colResult.rows.map(r => r.column_name);
    if (!colNames.includes(expectedCol)) {
      console.error(`[preflight] WARNING: Column "${expectedCol}" not found in PG table "${table}". Found: ${colNames.join(', ')}`);
    } else {
      console.log(`[preflight] Verified: ${table}."${expectedCol}" exists`);
    }
  }

  // ── Create SQLite database ────────────────────────────────────────
  const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dymf.db');
  const db = new Database(outputPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  console.log(`[sqlite] Created database: ${outputPath}`);
  console.log('[sqlite] PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(SQLITE_DDL);
  console.log('[sqlite] All 15 tables created');

  // ── Migration (single transaction) ────────────────────────────────
  const transaction = db.transaction(async () => {});
  // We manually manage the transaction since we have async PG queries
  db.exec('BEGIN');

  try {
    // 1. user
    await migrateUser(pgClient, db);
    // 2. personal
    await migratePersonal(pgClient, db);
    // 3. cp_number
    await migrateCpNumber(pgClient, db);
    // 4. fixedasset
    await migrateFixedasset(pgClient, db);
    // 5. loan_officier
    await migrateLoanOfficier(pgClient, db);
    // 6. loan_officier_cp_numbers (join table)
    await migrateLoanOfficierCpNumbers(pgClient, db);
    // 7. customer
    await migrateCustomer(pgClient, db);
    // 8. guarantor
    await migrateGuarantor(pgClient, db);
    // 9. loan
    await migrateLoan(pgClient, db);
    // 10. loan_schedule
    await migrateLoanSchedule(pgClient, db);
    // 11. loan_transaction
    await migrateLoanTransaction(pgClient, db);
    // 12. collateral
    await migrateCollateral(pgClient, db);
    // 13. guarantee
    await migrateGuarantee(pgClient, db);
    // 14. overdue_schedule
    await migrateOverdueSchedule(pgClient, db);
    // 15. overdue_transaction
    await migrateOverdueTransaction(pgClient, db);

    db.exec('COMMIT');
    console.log('\n[migration] All tables committed successfully');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`[error] Migration failed, transaction rolled back: ${err.message}`);
    console.error(err.stack);
    await pgClient.end();
    db.close();
    process.exit(1);
  }

  // ── Post-migration verification ───────────────────────────────────
  console.log('\n[verify] Post-migration row count comparison:');
  let allMatch = true;
  for (const sqliteTable of TABLE_ORDER) {
    const pgTable = PG_TABLES[sqliteTable];
    const pgCount = (await pgClient.query(`SELECT COUNT(*) as cnt FROM "${pgTable}"`)).rows[0].cnt;
    const sqliteCount = db.prepare(`SELECT COUNT(*) as cnt FROM "${sqliteTable}"`).get().cnt;
    const match = parseInt(pgCount) === sqliteCount ? 'OK' : 'MISMATCH';
    if (match === 'MISMATCH') allMatch = false;
    console.log(`  ${sqliteTable}: PG=${pgCount} SQLite=${sqliteCount} [${match}]`);
  }

  // FK integrity check
  const fkCheck = db.pragma('foreign_key_check');
  if (fkCheck.length === 0) {
    console.log('[verify] PRAGMA foreign_key_check: PASSED (no violations)');
  } else {
    console.error(`[verify] PRAGMA foreign_key_check: FAILED (${fkCheck.length} violations)`);
    for (const v of fkCheck) {
      console.error(`  table=${v.table} rowid=${v.rowid} parent=${v.parent} fkid=${v.fkid}`);
    }
    allMatch = false;
  }

  if (allMatch) {
    console.log('\n[done] Migration completed successfully!');
  } else {
    console.error('\n[done] Migration completed with warnings — check mismatches above');
  }

  await pgClient.end();
  db.close();
}

// ─── Per-Table Migration Functions ─────────────────────────────────────

async function migrateUser(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "user"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user (id, user_name, password, role, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.user_name)) {
      console.error(`  [user] WARNING: duplicate user_name "${r.user_name}", skipping`);
      continue;
    }
    seen.add(r.user_name);
    stmt.run(
      r.id,
      r.user_name,
      r.password,
      convertEnum(r.role, ENUM_ROLE, 'paidUser'),
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[user] migrated: ${count} rows`);
}

async function migratePersonal(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "personal"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO personal (id, name, nrc_number, birth, phone_number, address, email, gender, salary, ssb, income_tax, bonus, working_status, image, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.nrc_number)) {
      console.error(`  [personal] WARNING: duplicate nrc_number "${r.nrc_number}", skipping`);
      continue;
    }
    seen.add(r.nrc_number);
    stmt.run(
      r.id,
      r.name,
      r.nrc_number,
      convertDateOnly(r.birth),
      r.phone_number,
      r.address,
      r.email,
      convertEnum(r.gender, ENUM_GENDER, 'notdefinded'),
      convertBigint(r.salary),
      convertBigint(r.ssb),
      convertBigint(r.income_tax),
      convertBigint(r.bonus),
      convertEnum(r.working_status, ENUM_WORKING_STATUS, 'etc'),
      r.image ?? 'empty',
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[personal] migrated: ${count} rows`);
}

async function migrateCpNumber(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "cp_number"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO cp_number (id, area_number, description, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.area_number)) {
      console.error(`  [cp_number] WARNING: duplicate area_number "${r.area_number}", skipping`);
      continue;
    }
    seen.add(r.area_number);
    stmt.run(
      r.id,
      r.area_number,
      r.description,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[cp_number] migrated: ${count} rows`);
}

async function migrateFixedasset(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "fixedasset"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO fixedasset (id, name, purchase_date, price, method_status, depreciation_period, depreciation_ratio, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.name)) {
      console.error(`  [fixedasset] WARNING: duplicate name "${r.name}", skipping`);
      continue;
    }
    seen.add(r.name);
    stmt.run(
      r.id,
      r.name,
      convertDateOnly(r.purchase_date),
      convertBigint(r.price),
      convertBool(r.method_status),
      r.depreciation_period ?? 0,
      convertDecimal(r.depreciation_ratio),
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[fixedasset] migrated: ${count} rows`);
}

async function migrateLoanOfficier(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "loan_officier"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO loan_officier (id, personnel_id_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    const personnelId = r.personnelIdId;
    if (seen.has(personnelId)) {
      console.error(`  [loan_officier] WARNING: duplicate personnel_id_id "${personnelId}", skipping`);
      continue;
    }
    seen.add(personnelId);
    stmt.run(
      r.id,
      personnelId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[loan_officier] migrated: ${count} rows`);
}

async function migrateLoanOfficierCpNumbers(pgClient, db) {
  // Debug: verify actual row counts in SQLite before inserting join rows
  const loCount = db.prepare('SELECT COUNT(*) as cnt FROM loan_officier').get();
  const cpCount = db.prepare('SELECT COUNT(*) as cnt FROM cp_number').get();
  console.log(`[debug] SQLite loan_officier: ${loCount.cnt} rows, cp_number: ${cpCount.cnt} rows`);

  const joinTable = PG_TABLES.loan_officier_cp_numbers;
  const { rows } = await pgClient.query(`SELECT * FROM "${joinTable}"`);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO loan_officier_cp_numbers (loan_officier_id, cp_number_id)
    VALUES (?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    // TypeORM join table columns are camelCase
    const loanOfficierId = r.loanOfficierId ?? r.loan_officier_id ?? r.loanOfficierIdId;
    const cpNumberId = r.cpNumberId ?? r.cp_number_id ?? r.cpNumberIdId;
    if (loanOfficierId == null || cpNumberId == null) {
      console.error(`  [loan_officier_cp_numbers] WARNING: null FK values in join row, skipping`);
      continue;
    }
    // Debug: check FK existence before insert
    const loExists = db.prepare('SELECT id FROM loan_officier WHERE id = ?').get(loanOfficierId);
    const cpExists = db.prepare('SELECT id FROM cp_number WHERE id = ?').get(cpNumberId);
    if (!loExists || !cpExists) {
      console.error(`  [loan_officier_cp_numbers] FK missing: loan_officier(${loanOfficierId})=${loExists ? 'ok' : 'MISSING'}, cp_number(${cpNumberId})=${cpExists ? 'ok' : 'MISSING'}`);
      continue;
    }
    stmt.run(loanOfficierId, cpNumberId);
    count++;
  }
  console.log(`[loan_officier_cp_numbers] migrated: ${count} rows`);
}

async function migrateCustomer(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "customer"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO customer (id, name, nrc_number, father_name, family_information, birth, phone_number, home_address, email, gender, loan_type, home_postal_code, office_address, office_postal_code, details, image, cp_number_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.nrc_number)) {
      console.error(`  [customer] WARNING: duplicate nrc_number "${r.nrc_number}", skipping`);
      continue;
    }
    seen.add(r.nrc_number);
    stmt.run(
      r.id,
      r.name,
      r.nrc_number,
      r.father_name,
      convertArray(r.family_information),
      convertDateOnly(r.birth),
      r.phone_number,
      r.home_address,
      r.email ?? null,
      convertEnum(r.gender, ENUM_GENDER, 'notdefinded'),
      convertEnum(r.loan_type, ENUM_LOAN_TYPE, 'etc'),
      r.home_postal_code,
      r.office_address,
      r.office_postal_code,
      convertArray(r.details),
      r.image ?? 'empty',
      r.cpNumberId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[customer] migrated: ${count} rows`);
}

async function migrateGuarantor(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "guarantor"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO guarantor (id, name, nrc_number, birth, father_name, gender, phone_number, email, loan_type, home_address, home_postal_code, office_address, office_postal_code, details, image, cp_number_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seen = new Set();
  let count = 0;
  for (const r of rows) {
    if (seen.has(r.nrc_number)) {
      console.error(`  [guarantor] WARNING: duplicate nrc_number "${r.nrc_number}", skipping`);
      continue;
    }
    seen.add(r.nrc_number);
    stmt.run(
      r.id,
      r.name,
      r.nrc_number,
      convertDateOnly(r.birth),
      r.father_name,
      convertEnum(r.gender, ENUM_GENDER, 'notdefinded'),
      r.phone_number,
      r.email ?? null,
      convertEnum(r.loan_type, ENUM_LOAN_TYPE, 'etc'),
      r.home_address,
      r.home_postal_code,
      r.office_address,
      r.office_postal_code,
      convertArray(r.details),
      r.image ?? 'empty',
      r.cpNumberId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[guarantor] migrated: ${count} rows`);
}

async function migrateLoan(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "loan"');
  const stmt = db.prepare(`
    INSERT INTO loan (id, loan_officer_id, loan_amount, repayment_cycle, interest_rate, contract_date, number_of_repayment, repayment_method, overdue_status, complete_status, customer_id, consulting_info, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      r.loanOfficerId,
      convertBigint(r.loan_amount),
      r.repayment_cycle,
      convertDecimal(r.interest_rate),
      convertDateOnly(r.contract_date),
      r.number_of_repayment,
      convertEnum(r.repayment_method, ENUM_REPAYMENT_METHOD, 'Equal'),
      convertBool(r.overdue_status),
      convertBool(r.complete_status),
      r.customerId,
      convertArray(r.consulting_info),
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[loan] migrated: ${count} rows`);
}

async function migrateLoanSchedule(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "loan_schedule"');
  const stmt = db.prepare(`
    INSERT INTO loan_schedule (id, principal, interest, payment_date, period, remaining_balance, total, loan_payment_status, loan_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      convertBigint(r.principal),
      convertBigint(r.interest),
      convertDateOnly(r.payment_date),
      r.period,
      convertBigint(r.remaining_balance),
      convertBigint(r.total),
      convertBool(r.loan_payment_status),
      r.loanId ?? null,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[loan_schedule] migrated: ${count} rows`);
}

async function migrateLoanTransaction(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "loan_transaction"');
  const stmt = db.prepare(`
    INSERT INTO loan_transaction (id, before_re, repayment_amount, loan_id, is_overdue, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      convertBigint(r.before_re),
      convertBigint(r.repayment_amount),
      r.loanId,
      convertBool(r.is_overdue),
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[loan_transaction] migrated: ${count} rows`);
}

async function migrateCollateral(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "collateral"');
  const stmt = db.prepare(`
    INSERT INTO collateral (id, type, name, detail, price, loan_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      convertEnum(r.type, ENUM_COLLATERAL_TYPE, 'Car'),
      r.name,
      r.detail,
      r.price != null ? convertBigint(r.price) : null,
      r.loanId ?? null,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[collateral] migrated: ${count} rows`);
}

async function migrateGuarantee(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "guarantee"');
  const stmt = db.prepare(`
    INSERT INTO guarantee (id, loan_id, guarantor_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      r.loanId ?? null,
      r.guarantorId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[guarantee] migrated: ${count} rows`);
}

async function migrateOverdueSchedule(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "overdue_schedule"');
  const stmt = db.prepare(`
    INSERT INTO overdue_schedule (id, principal, interest, overdue_interest, payment_date, loan_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      convertBigint(r.principal),
      convertBigint(r.interest),
      convertBigint(r.overdue_interest),
      convertDateOnly(r.payment_date),
      r.loanId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[overdue_schedule] migrated: ${count} rows`);
}

async function migrateOverdueTransaction(pgClient, db) {
  const { rows } = await pgClient.query('SELECT * FROM "overdue_transaction"');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO overdue_transaction (id, received_principal, received_interest, received_overdue_interest, overdue_schedule_id, created_at, updated_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const r of rows) {
    stmt.run(
      r.id,
      convertBigint(r.received_principal),
      convertBigint(r.received_interest),
      convertBigint(r.received_overdue_interest),
      r.overdueScheduleId,
      convertDate(r.created_at),
      convertDate(r.updated_at),
      r.version ?? 1
    );
    count++;
  }
  console.log(`[overdue_transaction] migrated: ${count} rows`);
}

// ─── Run if executed directly ──────────────────────────────────────────
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch(err => {
    console.error(`[fatal] ${err.message}`);
    process.exit(1);
  });
}
