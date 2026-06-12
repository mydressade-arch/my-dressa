'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Lang = 'de' | 'en'

interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
  t: (de: string, en: string) => string
}

// SSR-safe: always return 'de' on server
const getInitialLang = (): Lang => {
  if (typeof window === 'undefined') return 'de'
  try {
    const stored = localStorage.getItem('dressa-lang')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.lang || 'de'
    }
  } catch {}
  return 'de'
}

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang: 'de' as Lang, // always 'de' on server
      setLang: (lang: Lang) => set({ lang }),
      t: (de: string, en: string) => get().lang === 'de' ? de : en,
    }),
    {
      name: 'dressa-lang',
      storage: createJSONStorage(() => {
        // SSR-safe storage
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return localStorage
      }),
      skipHydration: true, // prevent SSR mismatch
    }
  )
)

// Hydrate on client only
if (typeof window !== 'undefined') {
  useLangStore.persist.rehydrate()
}

export const useLang = useLangStore
