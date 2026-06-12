'use client'
import { useEffect } from 'react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-surface-container-lowest w-full shadow-2xl', sizes[size])}
        style={{ boxShadow: '0px 20px 40px rgba(0,0,0,0.08)' }}>
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant">
            <h2 className="font-serif text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}
