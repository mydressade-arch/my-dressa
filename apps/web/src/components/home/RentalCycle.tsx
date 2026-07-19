'use client'
import { useEffect, useState } from 'react'
import { useLangStore } from '@/store/lang.store'

/**
 * "So funktioniert's" — als Kreislauf, nicht als nummerierte Liste.
 *
 * Bewusste Entscheidung: 01/02/03 suggeriert Anfang und Ende. Ein Mietmodell
 * hat aber keins — das Kleid geht zurück und wieder hinaus. Deshalb ein Ring,
 * der dieselbe Form aufgreift wie das Markenzeichen.
 *
 * Desktop: Ring mit vier Stationen.
 * Handy:   gestapelt, mit einer Linie, die am Ende zurückführt.
 */
export function RentalCycle() {
  const { t } = useLangStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const steps = [
    {
      icon: 'search',
      title: t('Aussuchen', 'Choose'),
      text: t('Kleid und Zeitraum wählen.', 'Pick a dress and your dates.'),
    },
    {
      icon: 'local_shipping',
      title: t('Erhalten', 'Receive'),
      text: t('Wir liefern. Die Kaution wird hinterlegt.', 'We deliver. The deposit is charged.'),
    },
    {
      icon: 'celebration',
      title: t('Tragen', 'Wear'),
      text: t('Der Abend gehört dir.', 'The evening is yours.'),
    },
    {
      icon: 'restart_alt',
      title: t('Zurücksenden', 'Send back'),
      text: t('Kaution zurück — das Kleid zieht weiter.', 'Deposit refunded — the dress moves on.'),
    },
  ]

  // Positionen auf dem Ring: oben, rechts, unten, links
  const ringPos = [
    { top: '0%',   left: '50%',  tx: '-50%', ty: '0' },
    { top: '50%',  left: '100%', tx: '-100%', ty: '-50%' },
    { top: '100%', left: '50%',  tx: '-50%', ty: '-100%' },
    { top: '50%',  left: '0%',   tx: '0',    ty: '-50%' },
  ]

  const label = mounted ? t('So funktioniert\'s', 'How it works') : 'So funktioniert\'s'
  const heading = mounted
    ? t('Das Kleid bleibt in Bewegung', 'The dress keeps moving')
    : 'Das Kleid bleibt in Bewegung'

  return (
    <section style={{
      background: '#fdf8f8',
      padding: 'clamp(48px,7vw,96px) clamp(16px,4vw,40px)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px,5vw,64px)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9E896A', marginBottom: 12 }}>
            {label}
          </p>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, color: '#1c1b1b',
            margin: 0,
          }}>
            {heading}
          </h2>
        </div>

        {/* ── Ring (ab Tablet) ───────────────────────────────────────────── */}
        <div className="cycle-ring" style={{
          position: 'relative',
          width: '100%', maxWidth: 620, aspectRatio: '1 / 1',
          margin: '0 auto',
        }}>
          {/* Der Kreis selbst */}
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e3d9cb" strokeWidth="0.5" />
            {/* Pfeilspitzen deuten die Richtung an — im Uhrzeigersinn */}
            {[0, 90, 180, 270].map(deg => (
              <g key={deg} transform={`rotate(${deg + 45} 50 50)`}>
                <path d="M50 8.4 L51.5 11.2 L48.5 11.2 Z" fill="#9E896A" />
              </g>
            ))}
          </svg>

          {/* Markenzeichen in der Mitte */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '22%', maxWidth: 120,
          }}>
            <img src="/mark.svg" alt="" style={{ width: '100%', display: 'block', opacity: 0.9 }} />
          </div>

          {/* Die vier Stationen */}
          {steps.map((s, i) => (
            <div key={s.title} style={{
              position: 'absolute',
              top: ringPos[i].top, left: ringPos[i].left,
              transform: `translate(${ringPos[i].tx}, ${ringPos[i].ty})`,
              width: 'min(210px, 34%)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 44, height: 44, margin: '0 auto 10px',
                background: '#1c1b1b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9E896A' }}>
                  {s.icon}
                </span>
              </div>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 17, fontWeight: 700, color: '#1c1b1b', margin: '0 0 4px',
              }}>
                {s.title}
              </p>
              <p style={{ fontSize: 12.5, color: '#5e5e5b', lineHeight: 1.5, margin: 0 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>

        {/* ── Gestapelt (Handy) ──────────────────────────────────────────── */}
        <div className="cycle-list" style={{ display: 'none' }}>
          {steps.map((s, i) => (
            <div key={s.title} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: 28 }}>
              {/* Verbindungslinie */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', left: 21, top: 44, bottom: 0,
                  width: 1, background: '#e3d9cb',
                }} />
              )}
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: '#1c1b1b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9E896A' }}>
                  {s.icon}
                </span>
              </div>
              <div style={{ minWidth: 0, paddingTop: 2 }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 17, fontWeight: 700, color: '#1c1b1b', margin: '0 0 3px',
                }}>
                  {s.title}
                </p>
                <p style={{ fontSize: 13, color: '#5e5e5b', lineHeight: 1.55, margin: 0 }}>
                  {s.text}
                </p>
              </div>
            </div>
          ))}

          {/* Der Kreis schließt sich */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 4 }}>
            <div style={{ width: 44, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9E896A' }}>
                sync
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#9e9e9b', margin: 0, fontStyle: 'italic' }}>
              {mounted
                ? t('… und das Kleid beginnt von vorn.', '… and the dress starts over.')
                : '… und das Kleid beginnt von vorn.'}
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
