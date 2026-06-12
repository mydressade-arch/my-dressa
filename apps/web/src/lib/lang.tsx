'use client'
import { useState, useEffect } from 'react'
export { useLangStore, useLang } from '@/store/lang.store'
import { useLangStore } from '@/store/lang.store'

export function LangProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function LangSwitcher() {
  const { lang, setLang } = useLangStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return (
    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
      <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', background:'#1c1b1b', color:'#fff', borderRadius:3 }}>DE</span>
      <span style={{ color:'#c4c7c7', fontSize:10, padding:'0 2px' }}>|</span>
      <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', color:'#9e9e9b', borderRadius:3 }}>EN</span>
    </div>
  )

  return (
    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
      {(['de','en'] as const).map((l, i) => (
        <span key={l} style={{ display:'flex', alignItems:'center', gap:2 }}>
          {i > 0 && <span style={{ color:'#c4c7c7', fontSize:10, padding:'0 2px' }}>|</span>}
          <button onClick={() => setLang(l)}
            style={{ padding:'2px 7px', fontSize:11, fontWeight:600, letterSpacing:'0.05em', background: lang === l ? '#1c1b1b' : 'transparent', color: lang === l ? '#fff' : '#9e9e9b', border:'none', cursor:'pointer', borderRadius:3, transition:'all 0.15s' }}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
