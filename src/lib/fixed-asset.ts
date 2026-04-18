import { getDb } from './database'
import type { FixedAssetSchema } from '../types'

// --- Interfaces ---

export interface CreateFixedAssetInput {
  name: string
  purchase_date: string
  price: number
  method_status: boolean
  depreciation_period?: number
  depreciation_ratio?: number
}

export interface UpdateFixedAssetInput {
  name?: string
  purchase_date?: string
  price?: number
  method_status?: boolean
  depreciation_period?: number
  depreciation_ratio?: number
}

export interface GetFixedAssetsParams {
  page?: number
  limit?: number
  name?: string
}

// --- Row mapper ---

function rowToFixedAsset(row: Record<string, unknown>): FixedAssetSchema {
  return {
    id: row.id as number,
    name: row.name as string,
    purchase_date: row.purchase_date as string,
    price: row.price as number,
    method_status: (row.method_status as number) === 1,
    depreciation_period: (row.depreciation_period as number) || undefined,
    depreciation_ratio: (row.depreciation_ratio as number) || undefined,
  }
}

// --- CRUD ---

export async function createFixedAsset(
  data: CreateFixedAssetInput
): Promise<void> {
  const db = await getDb()

  // name UNIQUE 검증
  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM fixedasset WHERE name = $1',
    [data.name]
  )
  if (existing[0].count > 0) {
    throw new Error(`고정자산명 "${data.name}"은(는) 이미 등록되어 있습니다`)
  }

  // depreciation 검증
  let depPeriod = data.depreciation_period ?? 0
  let depRatio = data.depreciation_ratio ?? 0.0
  if (!data.method_status) {
    // method_status=false → depreciation 무시
    depPeriod = 0
    depRatio = 0.0
  } else {
    // method_status=true → period + ratio 모두 필요
    if (!depPeriod || !depRatio) {
      throw new Error(
        '감가상각 방식 사용 시 감가상각 기간과 비율을 모두 입력해야 합니다'
      )
    }
  }

  await db.execute(
    `INSERT INTO fixedasset (name, purchase_date, price, method_status, depreciation_period, depreciation_ratio)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.name,
      data.purchase_date,
      data.price,
      data.method_status ? 1 : 0,
      depPeriod,
      depRatio,
    ]
  )
}

export async function getFixedAssets(
  params: GetFixedAssetsParams = {}
): Promise<{ data: FixedAssetSchema[]; total: number }> {
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
    `SELECT COUNT(*) as count FROM fixedasset ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  // Data
  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM fixedasset
     ${whereClause}
     ORDER BY id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return {
    data: rows.map(rowToFixedAsset),
    total,
  }
}

export async function getFixedAsset(
  id: number
): Promise<FixedAssetSchema | null> {
  const db = await getDb()
  const rows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM fixedasset WHERE id = $1',
    [id]
  )

  if (rows.length === 0) return null
  return rowToFixedAsset(rows[0])
}

export async function updateFixedAsset(
  id: number,
  data: UpdateFixedAssetInput
): Promise<void> {
  const db = await getDb()

  // name 중복 검증 (자기 자신 제외)
  if (data.name) {
    const existing = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM fixedasset WHERE name = $1 AND id != $2',
      [data.name, id]
    )
    if (existing[0].count > 0) {
      throw new Error(
        `고정자산명 "${data.name}"은(는) 이미 등록되어 있습니다`
      )
    }
  }

  const setClauses: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (data.name !== undefined) {
    setClauses.push(`name = $${bindIdx}`)
    bindings.push(data.name)
    bindIdx++
  }
  if (data.purchase_date !== undefined) {
    setClauses.push(`purchase_date = $${bindIdx}`)
    bindings.push(data.purchase_date)
    bindIdx++
  }
  if (data.price !== undefined) {
    setClauses.push(`price = $${bindIdx}`)
    bindings.push(data.price)
    bindIdx++
  }
  if (data.method_status !== undefined) {
    setClauses.push(`method_status = $${bindIdx}`)
    bindings.push(data.method_status ? 1 : 0)
    bindIdx++
  }
  if (data.depreciation_period !== undefined) {
    setClauses.push(`depreciation_period = $${bindIdx}`)
    bindings.push(data.depreciation_period)
    bindIdx++
  }
  if (data.depreciation_ratio !== undefined) {
    setClauses.push(`depreciation_ratio = $${bindIdx}`)
    bindings.push(data.depreciation_ratio)
    bindIdx++
  }

  if (setClauses.length === 0) return

  setClauses.push(`updated_at = datetime('now')`)
  setClauses.push(`version = version + 1`)

  bindings.push(id)
  await db.execute(
    `UPDATE fixedasset SET ${setClauses.join(', ')} WHERE id = $${bindIdx}`,
    bindings
  )
}

export async function deleteFixedAsset(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM fixedasset WHERE id = $1', [id])
}

export async function getFixedAssetCount(
  params: Pick<GetFixedAssetsParams, 'name'> = {}
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
    `SELECT COUNT(*) as count FROM fixedasset ${whereClause}`,
    bindings
  )
  return rows[0].count
}
