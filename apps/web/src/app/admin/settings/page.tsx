'use client'

import { useState, useEffect } from 'react'
import { settingsApi } from '@/lib/api'
import { HomeImagesManager } from './HomeImagesManager'

/** Wiederverwendbarer Block: Liste von Werten als Chips + Eingabefeld. */
function ListSetting({
  title,
  description,
  placeholder,
  values,
  onSave,
  numeric = false,
  suffix = '',
}: {
  title: string
  description: string
  placeholder: string
  values: string[]
  onSave: (vals: string[]) => Promise<void>
  numeric?: boolean
  suffix?: string
}) {
  const [input, setInput] = useState(values.join(', '))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setInput(values.join(', ')) }, [values])

  const save = async () => {
    const parsed = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && (!numeric || Number.isFinite(parseInt(s, 10))))
    if (parsed.length === 0) return
    setSaving(true)
    try { await onSave(parsed) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24, marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 16, lineHeight: 1.6 }}>
        {description}
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {values.map(v => (
          <span key={v} style={{ padding: '4px 12px', background: '#fdf8f8', border: '1px solid #9E896A', fontSize: 13, color: '#1c1b1b' }}>
            {v}{suffix}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none' }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600, background: '#1A1A1A', color: '#fff', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
        >
          {saving ? '...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [durations, setDurations] = useState<number[]>([7, 10])
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    Promise.all([
      settingsApi.rentalDurations().catch(() => ({ data: { durations: [7, 10] } })),
      settingsApi.productColors().catch(() => ({ data: { colors: [] } })),
      settingsApi.productSizes().catch(() => ({ data: { sizes: [] } })),
    ]).then(([d, c, s]) => {
      setDurations((d as any).data?.durations ?? [7, 10])
      setColors((c as any).data?.colors ?? [])
      setSizes((s as any).data?.sizes ?? [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 8 }}>
        Einstellungen
      </h1>
      <p style={{ color: '#5e5e5b', fontSize: 14, marginBottom: 28 }}>
        Zentrale Werte, die ohne Code-Änderung angepasst werden können.
      </p>

      {msg && (
        <div style={{ padding: '10px 14px', marginBottom: 20, background: '#EAF3DE', color: '#27500A', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={{ height: 120, background: '#f1edec' }} />
      ) : (
        <>
          <ListSetting
            title="Mietdauern"
            description="Welche Mietdauern darf der Händler pro Kleid auswählen? Mehrere Werte mit Komma trennen."
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
            description="Farben, aus denen der Händler beim Anlegen eines Produkts wählen kann."
            placeholder="Schwarz, Weiß, Rot, Blau"
            values={colors}
            onSave={async (vals) => {
              const res = await settingsApi.adminSetProductColors(vals)
              setColors((res as any).data?.colors ?? vals)
              notify('Farben gespeichert ✓')
            }}
          />

          <HomeImagesManager notify={notify} />

          <p style={{ fontSize: 12, color: '#8a8a87', lineHeight: 1.6 }}>
            Hinweis: Bestehende Produkte und Mieten bleiben unverändert. Neue
            Auswahlen greifen sofort in den Händler-Formularen und auf der Startseite.
          </p>
        </>
      )}
    </div>
  )
}
