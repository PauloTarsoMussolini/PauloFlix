import { createContext, useContext, useState, type ReactNode } from 'react'
import { setAuthToken } from '../api/client'

interface AuthState {
  token: string | null
  email: string | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, email: null })

  function login(token: string, email: string) {
    setAuthToken(token)
    setState({ token, email })
  }

  function logout() {
    setAuthToken(null)
    setState({ token: null, email: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
