'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

export default function SupportDamagePage() {
  const { t } = useLangStore()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  const load = (st = filter) => {
    setLoading(true)
    api.get(`/support/damage-reports${st ? `?status=${st}` : ''}`)
      .then(({ data }: any) => setReports(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const SEVERITY_COLOR: Record<string, string> = { minor:'#633806', moderate:'#791F1F', severe:'#ba1a1a', lost:'#791F1F' }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:24 }}>
        {t('Schadensmeldungen', 'Damage Reports')}
      </h1>
      <p style={{ color:'#9e9e9b', fontSize:13, marginBottom:20 }}>
        {t('Nur Admins können Schadensmeldungen lösen. Support kann einsehen und kommentieren.', 'Only admins can resolve damage reports. Support can view and comment.')}
      </p>

      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['open','resolved','all'].map(s => (
          <button key={s} onClick={() => { setFilter(s); load(s) }}
            style={{ padding:'8px 16px', fontSize:11, fontWeight:600, textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${filter===s?'#1c1b1b':'transparent'}`, color:filter===s?'#1c1b1b':'#5e5e5b' }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? <p style={{ color:'#9e9e9b', textAlign:'center', padding:40 }}>{t('Laden...', 'Loading...')}</p>
        : reports.length === 0 ? <p style={{ color:'#9e9e9b', textAlign:'center', padding:40 }}>{t('Keine Meldungen', 'No reports')}</p>
        : reports.map((r: any) => (
          <div key={r.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background: r.status==='open' ? '#FCEBEB' : '#EAF3DE', color: r.status==='open' ? '#791F1F' : '#27500A', marginRight:8 }}>
                  {r.status}
                </span>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:'#FAEEDA', color: SEVERITY_COLOR[r.severity] || '#633806' }}>
                  {r.severity}
                </span>
              </div>
              <span style={{ fontSize:11, color:'#9e9e9b' }}>{new Date(r.createdAt).toLocaleDateString('de-DE')}</span>
            </div>
            <p style={{ fontSize:14, color:'#1c1b1b', marginBottom:6 }}>{r.description}</p>
            {r.resolution && (
              <div style={{ background:'#EAF3DE', padding:'8px 12px', fontSize:12, color:'#27500A', marginTop:8 }}>
                {r.resolution}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
