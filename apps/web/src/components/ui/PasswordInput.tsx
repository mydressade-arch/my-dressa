'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Passwort-Eingabefeld mit "Anzeigen/Verbergen"-Auge.
 * Ersetzt <input type="password" ... />.
 *
 * Nutzung:
 *   <PasswordInput value={pw} onChange={e => setPw(e.target.value)}
 *     placeholder="Passwort" />
 */
interface PasswordInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  style?: React.CSSProperties
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  autoComplete?: string
  required?: boolean
  name?: string
  id?: string
}

export function PasswordInput({
  value, onChange, placeholder, style, onKeyDown,
  autoComplete, required, name, id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        name={name}
        id={id}
        style={{ ...style, paddingRight: 44, width: '100%', boxSizing: 'border-box' as const }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          color: '#9E896A',
        }}
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} style={{ fontSize: 18 }} />
      </button>
    </div>
  )
}
