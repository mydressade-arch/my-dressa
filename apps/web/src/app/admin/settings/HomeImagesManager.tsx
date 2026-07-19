'use client'

import { useState, useEffect } from 'react'
import { settingsApi } from '@/lib/api'

const IMAGE_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: 'hero',    label: 'Hauptbild (Hero)',      hint: 'Großes Bild ganz oben. Quer, mind. 1600px breit.' },
  { key: 'dress',   label: 'Abendmode',             hint: 'Großes Kachelbild im Kollektionen-Bereich.' },
  { key: 'suit',    label: 'Business',              hint: 'Kleine Kachel. Hochformat wirkt am besten.' },
  { key: 'access',  label: 'Accessoires',           hint: 'Kleine Kachel. Hochformat wirkt am besten.' },
  { key: 'vintage', label: 'Vintage & Unikate',     hint: 'Breites Banner. Quer, mind. 900px breit.' },
]

export function HomeImagesManager({ notify }: { notify: (m: string) => void }) {
  const [images, setImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    settingsApi.homeImages()
      .then(({ data }: any) => {
        const imgs = data?.images ?? {}
        setImages(imgs)
        setUrlInputs(imgs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveUrl = async (key: string) => {
    const url = (urlInputs[key] ?? '').trim()
    if (!/^https?:\/\//i.test(url)) { notify('Bitte eine gültige URL (http/https)'); return }
    setBusy(key)
    try {
      await settingsApi.adminSetHomeImage(key, url)
      setImages(prev => ({ ...prev, [key]: url }))
      notify('Bild gespeichert ✓')
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Speichern fehlgeschlagen')
    } finally { setBusy(null) }
  }

  const uploadFile = async (key: string, file: File) => {
    if (!file.type.startsWith('image/')) { notify('Bitte eine Bilddatei wählen'); return }
    setBusy(key)
    try {
      const res = await settingsApi.adminUploadHomeImage(key, file)
      const url = (res as any).data?.url
      if (url) {
        setImages(prev => ({ ...prev, [key]: url }))
        setUrlInputs(prev => ({ ...prev, [key]: url }))
        notify('Bild hochgeladen ✓')
      }
    } catch (e: any) {
      notify(e?.response?.data?.message || 'Upload fehlgeschlagen — alternativ eine URL eintragen')
    } finally { setBusy(null) }
  }

  if (loading) {
    return <div style={{ height: 120, background: '#f1edec', marginBottom: 20 }} />
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24, marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Startseiten-Bilder</h2>
      <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 20, lineHeight: 1.6 }}>
        Ändere jedes Bild per Datei-Upload oder indem du eine Bild-Adresse einträgst.
        Änderungen erscheinen sofort auf der Startseite.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {IMAGE_FIELDS.map(field => (
          <div key={field.key} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', borderTop: '1px solid #f1edec', paddingTop: 20 }}>
            {/* Vorschau */}
            <div style={{ width: 120, flexShrink: 0 }}>
              <div style={{ width: 120, height: 90, background: '#f1edec', overflow: 'hidden', border: '1px solid #e3dddb' }}>
                {images[field.key] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[field.key]} alt={field.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }} />
                )}
              </div>
            </div>

            {/* Bedienung */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{field.label}</p>
              <p style={{ fontSize: 11, color: '#8a8a87', marginBottom: 10 }}>{field.hint}</p>

              {/* Upload */}
              <label style={{
                display: 'inline-block', padding: '7px 14px', fontSize: 12, fontWeight: 600,
                background: '#1A1A1A', color: '#fff', cursor: busy === field.key ? 'default' : 'pointer',
                opacity: busy === field.key ? 0.6 : 1, marginBottom: 10,
              }}>
                {busy === field.key ? 'Lädt …' : '📁 Bild hochladen'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  disabled={busy === field.key}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(field.key, f); e.target.value = '' }} />
              </label>

              {/* Oder URL */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={urlInputs[field.key] ?? ''}
                  onChange={e => setUrlInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="… oder Bild-Adresse (https://…) einfügen"
                  style={{ flex: 1, padding: '8px 12px', fontSize: 12, border: '1px solid #c4c7c7', outline: 'none', minWidth: 0 }}
                />
                <button
                  onClick={() => saveUrl(field.key)}
                  disabled={busy === field.key}
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: '#9E896A', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Speichern
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
