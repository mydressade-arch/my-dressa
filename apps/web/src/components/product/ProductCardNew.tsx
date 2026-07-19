'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { wishlistApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useAuthStore } from '@/store/auth.store'

interface ProductCardNewProps {
  id: string
  title: string
  merchantName: string
  rentalPrice?: number
  salePrice?: number
  imageUrl?: string
  images?: { url: string }[]
  isAvailable?: boolean
  isForRent?: boolean
  isForSale?: boolean
  initialSaved?: boolean
  availableNow?: boolean
  nextAvailableDate?: string | null
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23f1edec' width='400' height='533'/%3E%3Ctext fill='%23c4c7c7' font-family='sans-serif' font-size='14' text-anchor='middle' x='200' y='270'%3EMy Dressa%3C/text%3E%3C/svg%3E"

/** "2026-07-20" → "20. Juli" */
function formatDay(iso: string, en: boolean): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(en ? 'en-GB' : 'de-DE', { day: 'numeric', month: 'long' })
}

export function ProductCardNew({
  id, title, merchantName, rentalPrice, salePrice,
  imageUrl, images, isForRent, isForSale,
  initialSaved = false,
  availableNow, nextAvailableDate,
}: ProductCardNewProps) {
  const { user } = useAuthStore()
  const { t, lang } = useLangStore() as any
  const [saved, setSaved]     = useState(initialSaved)
  const [mounted, setMounted] = useState(false)
  const [hover, setHover]     = useState(false)
  const [loaded, setLoaded]   = useState(false)
  useEffect(() => setMounted(true), [])

  const isEn = mounted && lang === 'en'
  // Vor dem Mount IMMER Deutsch rendern (wie Server) → kein Hydration-Mismatch
  const tt = (de: string, en: string) => (mounted ? t(de, en) : de)
  const primary = imageUrl || images?.[0]?.url || PLACEHOLDER
  const second  = images?.[1]?.url          // zweites Bild für Hover
  const hasBoth = !!(isForRent && rentalPrice && isForSale && salePrice)

  useEffect(() => {
    if (!user || !id || id.startsWith('demo-')) return
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) return
    wishlistApi.isSaved(id).then(({ data }: any) => setSaved(data.saved)).catch(() => {})
  }, [id, user])

  const toggleSaved = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!user) { window.location.href = '/auth/login'; return }
    try {
      const { data } = await wishlistApi.toggle(id) as any
      setSaved(data.saved)
    } catch {}
  }

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={`/products/${id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', paddingBottom: '133%', overflow: 'hidden', background: '#f1edec', marginBottom: 14 }}>
          {/* Hauptbild — blendet sanft ein statt hart aufzupoppen */}
          <img
            src={primary}
            alt={title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
            className="pc-img"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: loaded ? (hover && second ? 0 : 1) : 0,
              transition: 'opacity 0.45s ease, transform 0.7s ease',
              transform: hover ? 'scale(1.03)' : 'scale(1)',
            }}
          />
          {/* Zweites Bild: erscheint beim Darüberfahren */}
          {second && (
            <img
              src={second}
              alt=""
              loading="lazy"
              aria-hidden="true"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              className="pc-img"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: hover ? 1 : 0,
                transition: 'opacity 0.45s ease, transform 0.7s ease',
                transform: hover ? 'scale(1.03)' : 'scale(1)',
              }}
            />
          )}

          {/* Verfügbarkeit — nur bei Mietartikeln relevant */}
          {isForRent && mounted && availableNow !== undefined && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              {availableNow ? (
                <span style={{
                  display: 'inline-block', padding: '4px 10px',
                  background: '#064E3B', color: '#fdf8f8',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {tt('Sofort verfügbar', 'Available now')}
                </span>
              ) : nextAvailableDate ? (
                <span style={{
                  display: 'inline-block', padding: '4px 10px',
                  background: 'rgba(28,27,27,0.82)', color: '#d4b896',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {tt('Frei ab ', 'From ')}{formatDay(nextAvailableDate, isEn)}
                </span>
              ) : null}
            </div>
          )}

          {/* Merken — 40px, damit es sich auf dem Handy treffen lässt */}
          <button
            onClick={toggleSaved}
            aria-label={saved ? tt('Aus Merkliste entfernen', 'Remove from wishlist') : tt('Merken', 'Save')}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 40, height: 40, borderRadius: '50%',
              background: saved ? '#1c1b1b' : 'rgba(253,248,248,0.92)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease',
            }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18,
              color: saved ? '#fff' : '#1c1b1b',
              fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0",
            }}>favorite</span>
          </button>
        </div>
      </Link>

      {/* Händler */}
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9e9e9b', marginBottom: 4 }}>
        {merchantName}
      </p>

      {/* Titel */}
      <Link href={`/products/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h3 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600,
          color: '#1c1b1b', lineHeight: 1.3, margin: '0 0 10px',
          overflowWrap: 'break-word',
        }}>
          {title}
        </h3>
      </Link>

      {/* ── Die Preis-Erzählung ──────────────────────────────────────────────
          Die Miete steht groß, der Kaufpreis daneben als Einordnung.
          Kein durchgestrichener Preis, keine Rabattbehauptung — nur zwei
          ehrliche Angebote, deren Verhältnis die Typografie erzählt.        */}
      <div style={{ borderTop: '1px solid #ece7e5', paddingTop: 10 }}>
        {isForRent && rentalPrice ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9E896A' }}>
                {tt('Mieten', 'Rent')}
              </span>
              <span style={{
                fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
                color: '#1c1b1b', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                €{Number(rentalPrice).toFixed(0)}
              </span>
            </div>

            {hasBoth && (
              <p style={{ fontSize: 12, color: '#5e5e5b', marginTop: 6, lineHeight: 1.4 }}>
                {tt('oder kaufen für ', 'or buy for ')}
                <span style={{ fontWeight: 600, color: '#1c1b1b', fontVariantNumeric: 'tabular-nums' }}>
                  €{Number(salePrice).toFixed(0)}
                </span>
              </p>
            )}
          </>
        ) : isForSale && salePrice ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9E896A' }}>
              {tt('Kaufen', 'Buy')}
            </span>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700,
              color: '#1c1b1b', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              €{Number(salePrice).toFixed(0)}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  )
}
