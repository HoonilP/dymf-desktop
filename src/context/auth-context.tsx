import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as authLogin, seedAdmin } from '../lib/auth'
import type { UserSchema } from '../types'

type AuthUser = Omit<UserSchema, 'password'>

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'dymf_auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        await seedAdmin()
      } catch {
        // user table may not exist yet during initial setup
      }

      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const login = async (username: string, password: string) => {
    const loggedInUser = await authLogin(username, password)
    setUser(loggedInUser)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser))
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
