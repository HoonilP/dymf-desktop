import { getDb } from './database'
import type { EmployeeSchema } from '../types'

// --- Interfaces ---

export interface CreateEmployeeInput {
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  address: string
  email: string
  gender?: string
  salary: number
  ssb: number
  income_tax: number
  bonus?: number
  working_status?: string
  image?: string
}

export interface UpdateEmployeeInput {
  name?: string
  nrc_number?: string
  birth?: string
  phone_number?: string
  address?: string
  email?: string
  gender?: string
  salary?: number
  ssb?: number
  income_tax?: number
  bonus?: number
  working_status?: string
  image?: string
}

export interface GetEmployeesParams {
  page?: number
  limit?: number
  name?: string
  nrc_number?: string
}

// --- Row mapper ---

function rowToEmployee(row: Record<string, unknown>): EmployeeSchema {
  return {
    id: row.id as number,
    name: row.name as string,
    nrc_number: row.nrc_number as string,
    birth: row.birth as string,
    phone_number: row.phone_number as string,
    address: row.address as string,
    email: row.email as string,
    gender: row.gender as EmployeeSchema['gender'],
    salary: row.salary as number,
    ssb: row.ssb as number,
    income_tax: row.income_tax as number,
    bonus: (row.bonus as number) || undefined,
    working_status: row.working_status as EmployeeSchema['working_status'],
    image: (row.image as string) || undefined,
  }
}

// --- CRUD ---

export async function createEmployee(
  data: CreateEmployeeInput
): Promise<void> {
  const db = await getDb()

  // nrc_number 중복 검증
  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM personal WHERE nrc_number = $1',
    [data.nrc_number]
  )
  if (existing[0].count > 0) {
    throw new Error(`NRC 번호 "${data.nrc_number}"은(는) 이미 등록되어 있습니다`)
  }

  // working_status enum 검증
  const validStatuses = ['working', 'notworking', 'etc']
  const status = data.working_status || 'etc'
  if (!validStatuses.includes(status)) {
    throw new Error(
      `근무 상태는 "working", "notworking", "etc" 중 하나여야 합니다`
    )
  }

  await db.execute(
    `INSERT INTO personal (
      name, nrc_number, birth, phone_number, address, email, gender,
      salary, ssb, income_tax, bonus, working_status, image
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      data.name,
      data.nrc_number,
      data.birth,
      data.phone_number,
      data.address,
      data.email,
      data.gender || 'notdefinded',
      data.salary,
      data.ssb,
      data.income_tax,
      data.bonus ?? 0,
      status,
      data.image || 'empty',
    ]
  )
}

export async function getEmployees(
  params: GetEmployeesParams = {}
): Promise<{ data: EmployeeSchema[]; total: number }> {
  const db = await getDb()
  const { page = 1, limit = 20, name, nrc_number } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }
  if (nrc_number) {
    conditions.push(`nrc_number LIKE $${bindIdx}`)
    bindings.push(`%${nrc_number}%`)
    bindIdx++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total count
  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM personal ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  // Data
  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM personal
     ${whereClause}
     ORDER BY id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return {
    data: rows.map(rowToEmployee),
    total,
  }
}

export async function getEmployee(
  id: number
): Promise<EmployeeSchema | null> {
  const db = await getDb()
  const rows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM personal WHERE id = $1',
    [id]
  )

  if (rows.length === 0) return null
  return rowToEmployee(rows[0])
}

export async function updateEmployee(
  id: number,
  data: UpdateEmployeeInput
): Promise<void> {
  const db = await getDb()

  // nrc_number 중복 검증 (자신 제외)
  if (data.nrc_number) {
    const existing = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM personal WHERE nrc_number = $1 AND id != $2',
      [data.nrc_number, id]
    )
    if (existing[0].count > 0) {
      throw new Error(
        `NRC 번호 "${data.nrc_number}"은(는) 이미 등록되어 있습니다`
      )
    }
  }

  // working_status enum 검증
  if (data.working_status) {
    const validStatuses = ['working', 'notworking', 'etc']
    if (!validStatuses.includes(data.working_status)) {
      throw new Error(
        `근무 상태는 "working", "notworking", "etc" 중 하나여야 합니다`
      )
    }
  }

  const setClauses: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  const fields: (keyof UpdateEmployeeInput)[] = [
    'name',
    'nrc_number',
    'birth',
    'phone_number',
    'address',
    'email',
    'gender',
    'salary',
    'ssb',
    'income_tax',
    'bonus',
    'working_status',
    'image',
  ]

  for (const key of fields) {
    if (data[key] !== undefined) {
      setClauses.push(`${key} = $${bindIdx}`)
      bindings.push(data[key])
      bindIdx++
    }
  }

  if (setClauses.length === 0) return

  setClauses.push(`updated_at = datetime('now')`)
  setClauses.push(`version = version + 1`)

  bindings.push(id)
  await db.execute(
    `UPDATE personal SET ${setClauses.join(', ')} WHERE id = $${bindIdx}`,
    bindings
  )
}

export async function deleteEmployee(id: number): Promise<void> {
  const db = await getDb()

  // loan_officier 테이블 참조 체크
  const refs = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM loan_officier WHERE personnel_id_id = $1',
    [id]
  )
  if (refs[0].count > 0) {
    throw new Error(
      `이 직원은 대출 담당자로 등록되어 있어 삭제할 수 없습니다`
    )
  }

  await db.execute('DELETE FROM personal WHERE id = $1', [id])
}

export async function getEmployeeCount(
  params: Pick<GetEmployeesParams, 'name' | 'nrc_number'> = {}
): Promise<number> {
  const db = await getDb()
  const { name, nrc_number } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }
  if (nrc_number) {
    conditions.push(`nrc_number LIKE $${bindIdx}`)
    bindings.push(`%${nrc_number}%`)
    bindIdx++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM personal ${whereClause}`,
    bindings
  )
  return rows[0].count
}
