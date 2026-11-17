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

// WICHTIG: KEINE Rehydration beim Import!
// Würde die gespeicherte Sprache schon vor der React-Hydration laden, rendert
// der Client sofort z.B. Englisch, während der Server (immer 'de') Deutsch
// geliefert hat → Hydration-Mismatch. Die Rehydration passiert stattdessen
// zentral im <LangProvider> per useEffect (also erst NACH dem ersten Render).

export const useLang = useLangStore
