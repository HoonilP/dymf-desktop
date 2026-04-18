import { getDb } from './database'
import type { CollateralSchema } from '../types'

// --- Interfaces ---

export interface CreateCollateralInput {
  type: string
  name: string
  detail: string
  price?: number
  loan_id?: number
}

export interface UpdateCollateralInput {
  type?: string
  name?: string
  detail?: string
  price?: number | null
  loan_id?: number | null
}

export interface GetCollateralsParams {
  page?: number
  limit?: number
  name?: string
}

// --- Row mapper ---

function rowToCollateral(row: Record<string, unknown>): CollateralSchema {
  return {
    id: row.id as number,
    type: row.type as CollateralSchema['type'],
    name: row.name as string,
    detail: row.detail as string,
    price: (row.price as number) || undefined,
    loan_id: (row.loan_id as number) || undefined,
  }
}

// --- CRUD ---

export async function createCollateral(
  data: CreateCollateralInput
): Promise<void> {
  const db = await getDb()

  // type CHECK 검증
  if (data.type !== 'Property' && data.type !== 'Car') {
    throw new Error('담보 유형은 "Property" 또는 "Car"만 가능합니다')
  }

  if (!data.name || !data.detail) {
    throw new Error('담보 이름과 상세 정보는 필수입니다')
  }

  await db.execute(
    `INSERT INTO collateral (type, name, detail, price, loan_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.type,
      data.name,
      data.detail,
      data.price ?? null,
      data.loan_id ?? null,
    ]
  )
}

export async function getCollaterals(
  params: GetCollateralsParams = {}
): Promise<{ data: CollateralSchema[]; total: number }> {
  const db = await getDb()
  const { page = 1, limit = 20, name } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total count
  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM collateral ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  // Data
  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM collateral
     ${whereClause}
     ORDER BY id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return {
    data: rows.map(rowToCollateral),
    total,
  }
}

export async function getCollateral(
  id: number
): Promise<CollateralSchema | null> {
  const db = await getDb()
  const rows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM collateral WHERE id = $1',
    [id]
  )

  if (rows.length === 0) return null
  return rowToCollateral(rows[0])
}

export async function updateCollateral(
  id: number,
  data: UpdateCollateralInput
): Promise<void> {
  const db = await getDb()

  // type CHECK 검증
  if (data.type && data.type !== 'Property' && data.type !== 'Car') {
    throw new Error('담보 유형은 "Property" 또는 "Car"만 가능합니다')
  }

  const setClauses: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  const fields: (keyof UpdateCollateralInput)[] = [
    'type',
    'name',
    'detail',
    'price',
    'loan_id',
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
    `UPDATE collateral SET ${setClauses.join(', ')} WHERE id = $${bindIdx}`,
    bindings
  )
}

export async function deleteCollateral(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM collateral WHERE id = $1', [id])
}

export async function getCollateralCount(
  params: Pick<GetCollateralsParams, 'name'> = {}
): Promise<number> {
  const db = await getDb()
  const { name } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM collateral ${whereClause}`,
    bindings
  )
  return rows[0].count
}
