import assert from 'node:assert/strict';
import {
  convertArray,
  convertBool,
  convertDate,
  convertDateOnly,
  convertBigint,
  convertDecimal,
  convertEnum,
  ENUM_ROLE,
  ENUM_GENDER,
  ENUM_WORKING_STATUS,
  ENUM_LOAN_TYPE,
  ENUM_REPAYMENT_METHOD,
  ENUM_COLLATERAL_TYPE,
  SQLITE_DDL,
  TABLE_ORDER,
  FK_COLUMN_MAP,
} from './migrate-pg-to-sqlite.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ─── Enum Mappings ────────────────────────────────────────────────────

console.log('\n== Enum Mappings ==');

test('ENUM_ROLE: 0 → admin', () => {
  assert.equal(convertEnum(0, ENUM_ROLE, 'paidUser'), 'admin');
});
test('ENUM_ROLE: 1 → paidUser', () => {
  assert.equal(convertEnum(1, ENUM_ROLE, 'paidUser'), 'paidUser');
});
test('ENUM_ROLE: null → default', () => {
  assert.equal(convertEnum(null, ENUM_ROLE, 'paidUser'), 'paidUser');
});
test('ENUM_ROLE: unknown value → default', () => {
  assert.equal(convertEnum(99, ENUM_ROLE, 'paidUser'), 'paidUser');
});

test('ENUM_GENDER: 0 → man', () => {
  assert.equal(convertEnum(0, ENUM_GENDER, 'notdefinded'), 'man');
});
test('ENUM_GENDER: 1 → woman', () => {
  assert.equal(convertEnum(1, ENUM_GENDER, 'notdefinded'), 'woman');
});
test('ENUM_GENDER: 2 → notdefinded', () => {
  assert.equal(convertEnum(2, ENUM_GENDER, 'notdefinded'), 'notdefinded');
});
test('ENUM_GENDER: null → default', () => {
  assert.equal(convertEnum(null, ENUM_GENDER, 'notdefinded'), 'notdefinded');
});

test('ENUM_WORKING_STATUS: 0 → working', () => {
  assert.equal(convertEnum(0, ENUM_WORKING_STATUS, 'etc'), 'working');
});
test('ENUM_WORKING_STATUS: 1 → notworking', () => {
  assert.equal(convertEnum(1, ENUM_WORKING_STATUS, 'etc'), 'notworking');
});
test('ENUM_WORKING_STATUS: 2 → etc', () => {
  assert.equal(convertEnum(2, ENUM_WORKING_STATUS, 'etc'), 'etc');
});

test('ENUM_LOAN_TYPE: 0 → special_loan', () => {
  assert.equal(convertEnum(0, ENUM_LOAN_TYPE, 'etc'), 'special_loan');
});
test('ENUM_LOAN_TYPE: 1 → group_loan', () => {
  assert.equal(convertEnum(1, ENUM_LOAN_TYPE, 'etc'), 'group_loan');
});
test('ENUM_LOAN_TYPE: 2 → etc', () => {
  assert.equal(convertEnum(2, ENUM_LOAN_TYPE, 'etc'), 'etc');
});

test('ENUM_REPAYMENT_METHOD: 0 → Equal', () => {
  assert.equal(convertEnum(0, ENUM_REPAYMENT_METHOD, 'Equal'), 'Equal');
});
test('ENUM_REPAYMENT_METHOD: 1 → Equal_Principal', () => {
  assert.equal(convertEnum(1, ENUM_REPAYMENT_METHOD, 'Equal'), 'Equal_Principal');
});
test('ENUM_REPAYMENT_METHOD: 2 → Bullet', () => {
  assert.equal(convertEnum(2, ENUM_REPAYMENT_METHOD, 'Equal'), 'Bullet');
});

test('ENUM_COLLATERAL_TYPE: 0 → Property', () => {
  assert.equal(convertEnum(0, ENUM_COLLATERAL_TYPE, 'Car'), 'Property');
});
test('ENUM_COLLATERAL_TYPE: 1 → Car', () => {
  assert.equal(convertEnum(1, ENUM_COLLATERAL_TYPE, 'Car'), 'Car');
});

// ─── Array Conversion ─────────────────────────────────────────────────

console.log('\n== Array Conversion ==');

test('convertArray: null → "[]"', () => {
  assert.equal(convertArray(null), '[]');
});
test('convertArray: undefined → "[]"', () => {
  assert.equal(convertArray(undefined), '[]');
});
test('convertArray: [] → "[]"', () => {
  assert.equal(convertArray([]), '[]');
});
test('convertArray: ["a","b"] → \'["a","b"]\'', () => {
  assert.equal(convertArray(['a', 'b']), '["a","b"]');
});
test('convertArray: non-array string → "[]"', () => {
  assert.equal(convertArray('not-array'), '[]');
});

// ─── Boolean Conversion ──────────────────────────────────────────────

console.log('\n== Boolean Conversion ==');

test('convertBool: true → 1', () => {
  assert.equal(convertBool(true), 1);
});
test('convertBool: false → 0', () => {
  assert.equal(convertBool(false), 0);
});
test('convertBool: null → 0', () => {
  assert.equal(convertBool(null), 0);
});
test('convertBool: undefined → 0', () => {
  assert.equal(convertBool(undefined), 0);
});

// ─── Date Conversion ─────────────────────────────────────────────────

console.log('\n== Date Conversion ==');

test('convertDate: Date → "YYYY-MM-DD HH:MM:SS"', () => {
  assert.equal(convertDate(new Date('2024-01-15T10:30:00Z')), '2024-01-15 10:30:00');
});
test('convertDate: null → null', () => {
  assert.equal(convertDate(null), null);
});
test('convertDate: string passthrough', () => {
  assert.equal(convertDate('2024-01-15'), '2024-01-15');
});

test('convertDateOnly: Date → "YYYY-MM-DD"', () => {
  assert.equal(convertDateOnly(new Date('2024-01-15T10:30:00Z')), '2024-01-15');
});
test('convertDateOnly: null → null', () => {
  assert.equal(convertDateOnly(null), null);
});
test('convertDateOnly: string sliced to 10 chars', () => {
  assert.equal(convertDateOnly('2024-01-15T10:30:00Z'), '2024-01-15');
});

// ─── BigInt Conversion ───────────────────────────────────────────────

console.log('\n== BigInt Conversion ==');

test('convertBigint: "1000000" → 1000000', () => {
  assert.equal(convertBigint('1000000'), 1000000);
});
test('convertBigint: "0" → 0', () => {
  assert.equal(convertBigint('0'), 0);
});
test('convertBigint: null → 0', () => {
  assert.equal(convertBigint(null), 0);
});
test('convertBigint: undefined → 0', () => {
  assert.equal(convertBigint(undefined), 0);
});

// ─── Decimal Conversion ──────────────────────────────────────────────

console.log('\n== Decimal Conversion ==');

test('convertDecimal: "0.28" → 0.28', () => {
  assert.equal(convertDecimal('0.28'), 0.28);
});
test('convertDecimal: "15.50" → 15.5', () => {
  assert.equal(convertDecimal('15.50'), 15.5);
});
test('convertDecimal: null → 0', () => {
  assert.equal(convertDecimal(null), 0);
});
test('convertDecimal: undefined → 0', () => {
  assert.equal(convertDecimal(undefined), 0);
});

// ─── NULL Coalescing / Defaults ──────────────────────────────────────

console.log('\n== NULL Coalescing Defaults ==');

test('image default: null ?? "empty" → "empty"', () => {
  assert.equal(null ?? 'empty', 'empty');
});
test('gender default: convertEnum(null) → "notdefinded"', () => {
  assert.equal(convertEnum(null, ENUM_GENDER, 'notdefinded'), 'notdefinded');
});

// ─── DDL Completeness ────────────────────────────────────────────────

console.log('\n== DDL Completeness ==');

test('DDL contains 15 CREATE TABLE statements', () => {
  const matches = SQLITE_DDL.match(/CREATE TABLE IF NOT EXISTS/g);
  assert.equal(matches.length, 15);
});

const expectedTables = [
  'user', 'personal', 'loan_officier', 'cp_number',
  'loan_officier_cp_numbers', 'customer', 'guarantor', 'loan',
  'loan_schedule', 'loan_transaction', 'collateral', 'guarantee',
  'overdue_schedule', 'overdue_transaction', 'fixedasset',
];

for (const table of expectedTables) {
  test(`DDL contains CREATE TABLE for "${table}"`, () => {
    assert.ok(
      SQLITE_DDL.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      `Missing CREATE TABLE for ${table}`
    );
  });
}

// ─── FK Column Mapping Completeness ──────────────────────────────────

console.log('\n== FK Column Mapping ==');

const expectedFKMappings = [
  'personnelIdId', 'cpNumberId', 'loanOfficerId', 'customerId',
  'loanId', 'guarantorId', 'overdueScheduleId', 'loanOfficierId',
];

test(`FK_COLUMN_MAP has all ${expectedFKMappings.length} expected mappings`, () => {
  for (const key of expectedFKMappings) {
    assert.ok(key in FK_COLUMN_MAP, `Missing FK mapping: ${key}`);
  }
});

test('FK_COLUMN_MAP values are snake_case', () => {
  for (const [key, val] of Object.entries(FK_COLUMN_MAP)) {
    assert.ok(!(/[A-Z]/).test(val), `FK_COLUMN_MAP["${key}"] = "${val}" is not snake_case`);
  }
});

// ─── Insertion Order ─────────────────────────────────────────────────

console.log('\n== Insertion Order ==');

test('TABLE_ORDER has 15 tables', () => {
  assert.equal(TABLE_ORDER.length, 15);
});

test('TABLE_ORDER satisfies FK dependencies (parents before children)', () => {
  const deps = {
    loan_officier: ['personal'],
    loan_officier_cp_numbers: ['loan_officier', 'cp_number'],
    customer: ['cp_number'],
    guarantor: ['cp_number'],
    loan: ['loan_officier', 'customer'],
    loan_schedule: ['loan'],
    loan_transaction: ['loan'],
    collateral: ['loan'],
    guarantee: ['loan', 'guarantor'],
    overdue_schedule: ['loan'],
    overdue_transaction: ['overdue_schedule'],
  };

  for (const [child, parents] of Object.entries(deps)) {
    const childIdx = TABLE_ORDER.indexOf(child);
    assert.ok(childIdx !== -1, `${child} not in TABLE_ORDER`);
    for (const parent of parents) {
      const parentIdx = TABLE_ORDER.indexOf(parent);
      assert.ok(parentIdx !== -1, `${parent} not in TABLE_ORDER`);
      assert.ok(parentIdx < childIdx, `${parent} (idx=${parentIdx}) must come before ${child} (idx=${childIdx})`);
    }
  }
});

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n== Results: ${passed} passed, ${failed} failed ==\n`);
if (failed > 0) {
  process.exit(1);
}
