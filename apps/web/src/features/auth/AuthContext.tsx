import { createContext, useContext, useState, type PropsWithChildren } from 'react'
import { apiClient } from '../../shared/api/client'

export type UserRole = 'Administrator' | 'Leader' | 'Worker'

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  campId: string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  activeCampId: string | null
  effectiveCampId: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setActiveCampId: (campId: string | null) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'camp_token'
const USER_KEY = 'camp_user'
const ACTIVE_CAMP_KEY = 'camp_active_camp'

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [activeCampIdState, setActiveCampIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_CAMP_KEY),
  )

  const activeCampId = user?.role === 'Administrator' ? activeCampIdState : user?.campId ?? null
  const effectiveCampId = user?.role === 'Administrator' ? activeCampIdState : user?.campId ?? null

  function setActiveCampId(campId: string | null) {
    if (campId) {
      localStorage.setItem(ACTIVE_CAMP_KEY, campId)
    } else {
      localStorage.removeItem(ACTIVE_CAMP_KEY)
    }
    setActiveCampIdState(campId)
  }

  async function login(email: string, password: string) {
    const { data } = await apiClient.post<{ token: string; user: AuthUser }>('/auth/login', {
      email,
      password,
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    localStorage.removeItem(ACTIVE_CAMP_KEY)
    setToken(data.token)
    setUser(data.user)
    setActiveCampIdState(null)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ACTIVE_CAMP_KEY)
    setToken(null)
    setUser(null)
    setActiveCampIdState(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeCampId,
        effectiveCampId,
        login,
        logout,
        setActiveCampId,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
