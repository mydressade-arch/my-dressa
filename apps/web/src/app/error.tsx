'use client'

import { useEffect } from 'react'

/**
 * Fehler-Handler auf Seitenebene. Fängt Render-Fehler in einzelnen
 * Seiten ab, ohne die ganze App zu ersetzen. Bei veralteten
 * Deployment-Referenzen wird automatisch neu geladen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isStaleDeployment =
    error?.message?.includes('Server Action') ||
    error?.message?.includes('older or newer deployment') ||
    error?.message?.includes('Failed to find')

  useEffect(() => {
    if (isStaleDeployment) {
      window.location.reload()
    }
  }, [isStaleDeployment])

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        {isStaleDeployment ? (
          <p style={{ color: '#5E5E5B', fontSize: 15 }}>
            Die Seite wird aktualisiert …
          </p>
        ) : (
          <>
            <p
              style={{
                color: '#5E5E5B',
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Es ist ein Fehler aufgetreten. Bitte versuche es erneut.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: '#1A1A1A',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
          </>
        )}
      </div>
    </div>
  )
}
