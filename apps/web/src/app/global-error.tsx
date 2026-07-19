'use client'

import { useEffect } from 'react'

/**
 * Globaler Fehler-Handler.
 * Fängt u.a. den Next.js "Failed to find Server Action"-Fehler ab, der
 * auftritt, wenn während eines Deployments eine alte Seite im Browser
 * offen war. In dem Fall wird die Seite automatisch neu geladen — der
 * Nutzer sieht keinen technischen Fehler.
 */
export default function GlobalError({
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
      // Alte Deployment-Referenz → einmal frisch laden
      window.location.reload()
    }
  }, [isStaleDeployment])

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FDF8F8',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 28,
              color: '#1C1B1B',
              marginBottom: 12,
            }}
          >
            My Dressa
          </div>
          {isStaleDeployment ? (
            <p style={{ color: '#5E5E5B', fontSize: 15, lineHeight: 1.6 }}>
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
                Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es
                erneut.
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
      </body>
    </html>
  )
}
