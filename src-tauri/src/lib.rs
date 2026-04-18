use tauri_plugin_sql::{Migration, MigrationKind};

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_all_tables",
            sql: r#"
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

-- 3. loan_officier (FK → personal)
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

-- 5. loan_officier_cp_numbers (join table: loan_officier ↔ cp_number)
CREATE TABLE IF NOT EXISTS loan_officier_cp_numbers (
    loan_officier_id INTEGER NOT NULL,
    cp_number_id INTEGER NOT NULL,
    PRIMARY KEY (loan_officier_id, cp_number_id),
    FOREIGN KEY (loan_officier_id) REFERENCES loan_officier(id) ON DELETE CASCADE,
    FOREIGN KEY (cp_number_id) REFERENCES cp_number(id) ON DELETE CASCADE
);

-- 6. customer (FK → cp_number)
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

-- 7. guarantor (FK → cp_number)
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

-- 8. loan (FK → loan_officier, customer)
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

-- 9. loan_schedule (FK → loan)
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

-- 10. loan_transaction (FK → loan)
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

-- 11. collateral (FK → loan)
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

-- 12. guarantee (FK → loan, guarantor)
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

-- 13. overdue_schedule (FK → loan)
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

-- 14. overdue_transaction (FK → overdue_schedule)
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
"#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_app_settings",
            sql: r#"
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dymf.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
