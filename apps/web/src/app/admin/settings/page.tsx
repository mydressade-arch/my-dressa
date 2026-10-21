'use client'

import { useState, useEffect } from 'react'
import { settingsApi } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { HomeImagesManager } from './HomeImagesManager'

const ACCENT = '#9E896A'

/** Wiederverwendbarer Block: Liste von Werten als Chips + Eingabefeld. */
function ListSetting({
  title,
  description,
  placeholder,
  values,
  onSave,
  numeric = false,
  suffix = '',
  icon,
}: {
  title: string
  description: string
  placeholder: string
  values: string[]
  onSave: (vals: string[]) => Promise<void>
  numeric?: boolean
  suffix?: string
  icon: string
}) {
  const [input, setInput] = useState(values.join(', '))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setInput(values.join(', ')); setDirty(false) }, [values])

  const save = async () => {
    const parsed = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && (!numeric || Number.isFinite(parseInt(s, 10))))
    if (parsed.length === 0) return
    setSaving(true)
    try { await onSave(parsed); setDirty(false) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e3dedd', borderRadius: 10, padding: 24, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#faf6f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} style={{ fontSize: 18, color: ACCENT }} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 13, color: '#5e5e5b', margin: '0 0 16px 44px', lineHeight: 1.6 }}>
        {description}
      </p>

      {values.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {values.map(v => (
            <span key={v} style={{ padding: '5px 12px', background: '#faf6f5', border: `1px solid ${ACCENT}`, borderRadius: 999, fontSize: 12.5, color: '#1c1b1b', fontWeight: 500 }}>
              {v}{suffix}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setDirty(true) }}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 220, padding: '11px 14px', fontSize: 14, border: '1px solid #c4c7c7', borderRadius: 8, outline: 'none' }}
        />
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{ padding: '11px 24px', fontSize: 13, fontWeight: 600, background: dirty ? '#1A1A1A' : '#cfcac8', color: '#fff', border: 'none', borderRadius: 8, cursor: (saving || !dirty) ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
        >
          {saving ? '…' : 'Speichern'}
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#b0aca9', marginTop: 8 }}>
        Mehrere Werte mit Komma trennen.
      </p>
    </div>
  )
}

type Tab = 'payments' | 'catalog' | 'home'

export default function AdminSettingsPage() {
  const [durations, setDurations] = useState<number[]>([7, 10])
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [allowSepa, setAllowSepa] = useState(false)
  const [savingSepa, setSavingSepa] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<Tab>('payments')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    Promise.all([
      settingsApi.rentalDurations().catch(() => ({ data: { durations: [7, 10] } })),
      settingsApi.productColors().catch(() => ({ data: { colors: [] } })),
      settingsApi.productSizes().catch(() => ({ data: { sizes: [] } })),
      settingsApi.paymentMethods().catch(() => ({ data: { allowSepaPurchase: false } })),
    ]).then(([d, c, s, p]) => {
      setDurations((d as any).data?.durations ?? [7, 10])
      setColors((c as any).data?.colors ?? [])
      setSizes((s as any).data?.sizes ?? [])
      setAllowSepa((p as any).data?.allowSepaPurchase ?? false)
    }).finally(() => setLoading(false))
  }, [])

  const toggleSepa = async () => {
    const next = !allowSepa
    setSavingSepa(true)
    try {
      await settingsApi.adminSetPaymentMethods(next)
      setAllowSepa(next)
      notify(next ? 'SEPA-Lastschrift beim Kauf aktiviert ✓' : 'SEPA-Lastschrift deaktiviert ✓')
    } catch {
      notify('Fehler beim Speichern')
    } finally { setSavingSepa(false) }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'payments', label: 'Zahlungen', icon: 'payments' },
    { id: 'catalog',  label: 'Katalog',   icon: 'category' },
    { id: 'home',     label: 'Startseite', icon: 'image' },
  ]

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
        Einstellungen
      </h1>
      <p style={{ color: '#5e5e5b', fontSize: 14, marginBottom: 24 }}>
        Zentrale Werte, die du ohne Code-Änderung anpassen kannst.
      </p>

      {/* Floating Toast */}
      {msg && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50, padding: '12px 18px', background: '#1c1b1b', color: '#fff', fontSize: 13, borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="check_circle" style={{ fontSize: 18, color: '#9bd67e' }} />
          {msg}
        </div>
      )}

      {/* Tab-Navigation */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e3dedd', marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map(ti => {
          const active = tab === ti.id
          return (
            <button key={ti.id} onClick={() => setTab(ti.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent', marginBottom: -1,
                fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#1c1b1b' : '#8a8a87', cursor: 'pointer',
              }}>
              <Icon name={ti.icon} style={{ fontSize: 18, color: active ? ACCENT : '#b0aca9' }} />
              {ti.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 120, background: '#f1edec', borderRadius: 10 }} />)}
        </div>
      ) : (
        <>
          {/* ── Zahlungen ─────────────────────────────────────────────── */}
          {tab === 'payments' && (
            <div style={{ background: '#fff', border: '1px solid #e3dedd', borderRadius: 10, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#faf6f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="account_balance" style={{ fontSize: 18, color: ACCENT }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Zahlungsmethoden beim Kauf</h2>
              </div>
              <p style={{ color: '#5e5e5b', fontSize: 13, margin: '0 0 18px 44px', lineHeight: 1.6 }}>
                Kreditkarte (Visa, Mastercard) ist immer möglich. Zusätzlich kannst du
                SEPA-Lastschrift (IBAN) beim <b>Kauf</b> erlauben. Beim <b>Mieten</b> ist
                immer nur Karte möglich — die Kaution braucht eine Karten-Reservierung.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#faf6f5', borderRadius: 8, border: '1px solid #efe9e7' }}>
                <button
                  onClick={toggleSepa}
                  disabled={savingSepa}
                  role="switch"
                  aria-checked={allowSepa}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', position: 'relative',
                    background: allowSepa ? '#064E3B' : '#c4c7c7', cursor: savingSepa ? 'wait' : 'pointer',
                    transition: 'background .2s', flexShrink: 0,
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, left: allowSepa ? 25 : 3, width: 20, height: 20,
                    borderRadius: '50%', background: '#fff', transition: 'left .2s',
                  }} />
                </button>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1b1b' }}>
                    SEPA-Lastschrift beim Kauf {allowSepa ? 'erlaubt' : 'deaktiviert'}
                  </p>
                  <p style={{ fontSize: 11.5, color: '#9e9e9b', marginTop: 2 }}>
                    {allowSepa
                      ? 'Kunden können per IBAN kaufen (Zahlung dauert einige Tage).'
                      : 'Nur Kreditkarte beim Kauf.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Katalog ───────────────────────────────────────────────── */}
          {tab === 'catalog' && (
            <>
              <ListSetting
                title="Mietdauern"
                icon="event"
                description="Welche Mietdauern darf der Händler pro Kleid auswählen?"
                placeholder="7, 10"
                values={durations.map(String)}
                numeric
                suffix=" Tage"
                onSave={async (vals) => {
                  const nums = vals.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n) && n > 0)
                  const res = await settingsApi.adminSetRentalDurations(nums)
                  setDurations((res as any).data?.durations ?? nums)
                  notify('Mietdauern gespeichert ✓')
                }}
              />
              <ListSetting
                title="Größen"
                icon="straighten"
                description="Größen, aus denen der Händler beim Anlegen eines Produkts wählen kann."
                placeholder="XS, S, M, L, XL, 36, 38, 40"
                values={sizes}
                onSave={async (vals) => {
                  const res = await settingsApi.adminSetProductSizes(vals)
                  setSizes((res as any).data?.sizes ?? vals)
                  notify('Größen gespeichert ✓')
                }}
              />
              <ListSetting
                title="Farben"
                icon="palette"
                description="Farben, aus denen der Händler beim Anlegen eines Produkts wählen kann."
                placeholder="Schwarz, Weiß, Rot, Blau"
                values={colors}
                onSave={async (vals) => {
                  const res = await settingsApi.adminSetProductColors(vals)
                  setColors((res as any).data?.colors ?? vals)
                  notify('Farben gespeichert ✓')
                }}
              />
            </>
          )}

          {/* ── Startseite ────────────────────────────────────────────── */}
          {tab === 'home' && (
            <HomeImagesManager notify={notify} />
          )}

          <p style={{ fontSize: 12, color: '#a8a4a1', lineHeight: 1.6, marginTop: 24 }}>
            Hinweis: Bestehende Produkte und Mieten bleiben unverändert. Neue
            Auswahlen greifen sofort in den Händler-Formularen und auf der Startseite.
          </p>
        </>
      )}
    </div>
  )
}
