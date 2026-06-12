'use client'
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface UIContextType {
  toast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

// ── Context ───────────────────────────────────────────────────────────────────
const UIContext = createContext<UIContextType>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
})

export const useUI = () => useContext(UIContext)

// ── Provider ──────────────────────────────────────────────────────────────────
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ ...options, resolve })
    })
  }, [])

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value)
    setConfirmState(null)
  }

  const TOAST_STYLES: Record<ToastType, { bg: string; color: string; icon: string }> = {
    success: { bg: '#EAF3DE', color: '#27500A', icon: 'check_circle' },
    error:   { bg: '#FCEBEB', color: '#791F1F', icon: 'error' },
    info:    { bg: '#E6F1FB', color: '#0C447C', icon: 'info' },
    warning: { bg: '#FAEEDA', color: '#633806', icon: 'warning' },
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Container ── */}
      <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:380, pointerEvents:'none' }}>
        {toasts.map(t => {
          const s = TOAST_STYLES[t.type]
          return (
            <div key={t.id} style={{
              background: s.bg, color: s.color,
              padding:'12px 16px', display:'flex', alignItems:'center', gap:10,
              boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
              border:`1px solid ${s.color}22`,
              animation:'slideIn 0.25s ease',
              pointerEvents:'auto',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, flexShrink:0 }}>{s.icon}</span>
              <p style={{ fontSize:13, lineHeight:1.5, margin:0, flex:1 }}>{t.message}</p>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:s.color, display:'flex', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>close</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmState && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:400, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, marginBottom:8, color:'#1c1b1b' }}>
              {confirmState.title}
            </h3>
            <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.6, marginBottom:24 }}>
              {confirmState.message}
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => handleConfirm(false)}
                style={{ padding:'10px 20px', background:'none', border:'1px solid #c4c7c7', fontSize:13, fontWeight:600, cursor:'pointer', color:'#5e5e5b' }}>
                {confirmState.cancelLabel || 'Abbrechen'}
              </button>
              <button onClick={() => handleConfirm(true)}
                style={{ padding:'10px 20px', background: confirmState.danger ? '#ba1a1a' : '#1c1b1b', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', letterSpacing:'0.03em' }}>
                {confirmState.confirmLabel || 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </UIContext.Provider>
  )
}
