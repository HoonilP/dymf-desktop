import bcrypt from 'bcryptjs'
import { getDb } from './database'
import type { UserSchema } from '../types'

export async function seedAdmin(): Promise<void> {
  const db = await getDb()
  const result = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM user'
  )
  if (result[0].count === 0) {
    const hashedPassword = bcrypt.hashSync('admin1234', 10)
    await db.execute(
      'INSERT INTO user (user_name, password, role) VALUES ($1, $2, $3)',
      ['admin', hashedPassword, 'admin']
    )
  }
}

export async function login(
  username: string,
  password: string
): Promise<Omit<UserSchema, 'password'>> {
  if (!username || !password) {
    throw new Error('사용자 이름과 비밀번호를 입력해주세요')
  }

  const db = await getDb()
  const rows = await db.select<UserSchema[]>(
    'SELECT * FROM user WHERE user_name = $1',
    [username]
  )

  if (rows.length === 0) {
    throw new Error('사용자를 찾을 수 없습니다')
  }

  const user = rows[0]
  if (!bcrypt.compareSync(password, user.password)) {
    throw new Error('비밀번호가 일치하지 않습니다')
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}
