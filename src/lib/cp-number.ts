import { getDb } from './database'
import type { CpNumberSchema } from '../types'

export async function getCpNumbers(): Promise<CpNumberSchema[]> {
  const db = await getDb()
  return db.select<CpNumberSchema[]>(
    'SELECT * FROM cp_number ORDER BY area_number'
  )
}

export async function createCpNumber(
  area_number: string,
  description: string
): Promise<void> {
  const db = await getDb()
  try {
    await db.execute(
      'INSERT INTO cp_number (area_number, description) VALUES ($1, $2)',
      [area_number, description]
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('UNIQUE')) {
      throw new Error(`지역번호 "${area_number}"은(는) 이미 등록되어 있습니다`)
    }
    throw error
  }
}

export async function updateCpNumber(
  id: number,
  area_number: string,
  description: string
): Promise<void> {
  const db = await getDb()
  try {
    await db.execute(
      "UPDATE cp_number SET area_number = $1, description = $2, updated_at = datetime('now'), version = version + 1 WHERE id = $3",
      [area_number, description, id]
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('UNIQUE')) {
      throw new Error(`지역번호 "${area_number}"은(는) 이미 등록되어 있습니다`)
    }
    throw error
  }
}

export async function deleteCpNumber(id: number): Promise<void> {
  const db = await getDb()
  const refs = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM customer WHERE cp_number_id = $1',
    [id]
  )
  if (refs[0].count > 0) {
    throw new Error(
      `이 지역번호를 사용 중인 고객이 ${refs[0].count}명 있어 삭제할 수 없습니다`
    )
  }
  await db.execute('DELETE FROM cp_number WHERE id = $1', [id])
}
