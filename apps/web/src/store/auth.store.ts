import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  twoFaEnabled?: boolean
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string, twoFaCode?: string) => Promise<void | { requiresTwoFa: boolean }>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password, twoFaCode?) => {
        set({ isLoading: true })
        try {
          const { data } = await authApi.login({ email, password, twoFaCode })
          // 2FA required
          if ((data as any).requiresTwoFa) {
            set({ isLoading: false })
            return { requiresTwoFa: true }
          }
          // Login success - twoFaEnabled ist im user Objekt enthalten
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          set({ user: data.user, accessToken: data.accessToken, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null })
      },

      loadUser: async () => {
        try {
          // /auth/me liefert immer aktuellen Status inkl. twoFaEnabled
          const { default: axios } = await import('axios')
          const token = localStorage.getItem('accessToken')
          if (!token) { get().logout(); return }
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          set({ user: data })
        } catch {
          get().logout()
        }
      },
    }),
    {
      name: 'dressa-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken })
    }
  )
)
