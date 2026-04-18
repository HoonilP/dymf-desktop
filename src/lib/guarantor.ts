import { getDb } from './database'
import type { GuarantorSchema, GetGuarantorSchema } from '../types'

// --- JSON array helper ---

function parseJsonArray(val: unknown): string[] {
  if (val === null || val === undefined || val === '') return []
  if (typeof val !== 'string') return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// --- Interfaces ---

export interface CreateGuarantorInput {
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  father_name: string
  email?: string
  gender?: string
  cp_number_id: number
  loan_type?: string
  home_address: string
  home_postal_code: string
  office_address: string
  office_postal_code: string
  details?: string[]
  image?: string
}

export interface UpdateGuarantorInput {
  name?: string
  nrc_number?: string
  birth?: string
  phone_number?: string
  father_name?: string
  email?: string
  gender?: string
  cp_number_id?: number
  loan_type?: string
  home_address?: string
  home_postal_code?: string
  office_address?: string
  office_postal_code?: string
  details?: string[]
  image?: string
}

export interface GetGuarantorsParams {
  page?: number
  limit?: number
  name?: string
  nrc_number?: string
}

// --- Row mapper ---

function rowToGuarantor(row: Record<string, unknown>): GetGuarantorSchema {
  return {
    id: row.id as number,
    name: row.name as string,
    nrc_number: row.nrc_number as string,
    birth: row.birth as string,
    phone_number: row.phone_number as string,
    father_name: row.father_name as string,
    email: (row.email as string) || undefined,
    gender: row.gender as GuarantorSchema['gender'],
    area_number: (row.cp_area_number as string) || '',
    cp_number_id: row.cp_number_id as number,
    loan_type: row.loan_type as GuarantorSchema['loan_type'],
    home_address: row.home_address as string,
    home_postal_code: row.home_postal_code as string,
    office_address: (row.office_address as string) || undefined,
    office_postal_code: (row.office_postal_code as string) || undefined,
    details: parseJsonArray(row.details),
    image: (row.image as string) || undefined,
    cp_area_number: (row.cp_area_number as string) || '',
  }
}

// --- CRUD ---

export async function createGuarantor(
  data: CreateGuarantorInput
): Promise<void> {
  const db = await getDb()

  // nrc_number 중복 검증
  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM guarantor WHERE nrc_number = $1',
    [data.nrc_number]
  )
  if (existing[0].count > 0) {
    throw new Error(`NRC 번호 "${data.nrc_number}"은(는) 이미 등록되어 있습니다`)
  }

  // cp_number_id FK 검증
  const cpExists = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM cp_number WHERE id = $1',
    [data.cp_number_id]
  )
  if (cpExists[0].count === 0) {
    throw new Error('존재하지 않는 CP Number입니다')
  }

  await db.execute(
    `INSERT INTO guarantor (
      name, nrc_number, birth, phone_number, father_name, email, gender,
      cp_number_id, loan_type, home_address, home_postal_code,
      office_address, office_postal_code, details, image
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      data.name,
      data.nrc_number,
      data.birth,
      data.phone_number,
      data.father_name,
      data.email || null,
      data.gender || 'notdefinded',
      data.cp_number_id,
      data.loan_type || 'etc',
      data.home_address,
      data.home_postal_code,
      data.office_address,
      data.office_postal_code,
      JSON.stringify(data.details || []),
      data.image || 'empty',
    ]
  )
}

export async function getGuarantors(
  params: GetGuarantorsParams = {}
): Promise<{ data: GetGuarantorSchema[]; total: number }> {
  const db = await getDb()
  const { page = 1, limit = 20, name, nrc_number } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`g.name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }
  if (nrc_number) {
    conditions.push(`g.nrc_number LIKE $${bindIdx}`)
    bindings.push(`%${nrc_number}%`)
    bindIdx++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total count
  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM guarantor g ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  // Data with JOIN
  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT g.*, cp.area_number as cp_area_number
     FROM guarantor g
     LEFT JOIN cp_number cp ON g.cp_number_id = cp.id
     ${whereClause}
     ORDER BY g.id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return {
    data: rows.map(rowToGuarantor),
    total,
  }
}

export async function getGuarantor(
  id: number
): Promise<GetGuarantorSchema | null> {
  const db = await getDb()
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT g.*, cp.area_number as cp_area_number
     FROM guarantor g
     LEFT JOIN cp_number cp ON g.cp_number_id = cp.id
     WHERE g.id = $1`,
    [id]
  )

  if (rows.length === 0) return null
  return rowToGuarantor(rows[0])
}

export async function updateGuarantor(
  id: number,
  data: UpdateGuarantorInput
): Promise<void> {
  const db = await getDb()

  // nrc_number 중복 검증 (자신 제외)
  if (data.nrc_number) {
    const existing = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM guarantor WHERE nrc_number = $1 AND id != $2',
      [data.nrc_number, id]
    )
    if (existing[0].count > 0) {
      throw new Error(
        `NRC 번호 "${data.nrc_number}"은(는) 이미 등록되어 있습니다`
      )
    }
  }

  // cp_number_id FK 검증
  if (data.cp_number_id) {
    const cpExists = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM cp_number WHERE id = $1',
      [data.cp_number_id]
    )
    if (cpExists[0].count === 0) {
      throw new Error('존재하지 않는 CP Number입니다')
    }
  }

  const setClauses: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  const fields: { key: keyof UpdateGuarantorInput; serialize?: boolean }[] = [
    { key: 'name' },
    { key: 'nrc_number' },
    { key: 'birth' },
    { key: 'phone_number' },
    { key: 'father_name' },
    { key: 'email' },
    { key: 'gender' },
    { key: 'cp_number_id' },
    { key: 'loan_type' },
    { key: 'home_address' },
    { key: 'home_postal_code' },
    { key: 'office_address' },
    { key: 'office_postal_code' },
    { key: 'details', serialize: true },
    { key: 'image' },
  ]

  for (const { key, serialize } of fields) {
    if (data[key] !== undefined) {
      setClauses.push(`${key} = $${bindIdx}`)
      bindings.push(serialize ? JSON.stringify(data[key]) : data[key])
      bindIdx++
    }
  }

  if (setClauses.length === 0) return

  setClauses.push(`updated_at = datetime('now')`)
  setClauses.push(`version = version + 1`)

  bindings.push(id)
  await db.execute(
    `UPDATE guarantor SET ${setClauses.join(', ')} WHERE id = $${bindIdx}`,
    bindings
  )
}

export async function deleteGuarantor(id: number): Promise<void> {
  const db = await getDb()

  // guarantee 테이블 참조 체크
  const refs = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM guarantee WHERE guarantor_id = $1',
    [id]
  )
  if (refs[0].count > 0) {
    throw new Error(
      `이 보증인에게 ${refs[0].count}건의 보증이 있어 삭제할 수 없습니다`
    )
  }

  await db.execute('DELETE FROM guarantor WHERE id = $1', [id])
}

export async function getGuarantorCount(
  params: Pick<GetGuarantorsParams, 'name' | 'nrc_number'> = {}
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
    `SELECT COUNT(*) as count FROM guarantor ${whereClause}`,
    bindings
  )
  return rows[0].count
}
