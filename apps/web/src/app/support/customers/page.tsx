'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

export default function SupportCustomersPage() {
  const { t } = useLangStore()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  const search = (query = q) => {
    setLoading(true)
    api.get(`/support/customers${query ? `?q=${query}` : ''}`)
      .then(({ data }: any) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { search() }, [])

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:24 }}>
        {t('Kunden', 'Customers')}
      </h1>

      <form onSubmit={e => { e.preventDefault(); search() }} style={{ display:'flex', gap:10, marginBottom:20 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={t('E-Mail, Name suchen...', 'Search email, name...')}
          style={{ flex:1, padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
        <button type="submit" style={{ padding:'8px 20px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          {t('Suchen', 'Search')}
        </button>
      </form>

      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['Name','E-Mail','Registriert','Status',''].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'#9e9e9b' }}>{t('Laden...', 'Loading...')}</td></tr>
            ) : customers.map((c: any) => (
              <tr key={c.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                <td style={{ padding:'12px 16px', fontWeight:600 }}>{c.firstName} {c.lastName}</td>
                <td style={{ padding:'12px 16px', color:'#5e5e5b' }}>{c.email}</td>
                <td style={{ padding:'12px 16px', fontSize:12, color:'#9e9e9b' }}>{new Date(c.createdAt).toLocaleDateString('de-DE')}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background: c.isActive ? '#EAF3DE' : '#FCEBEB', color: c.isActive ? '#27500A' : '#791F1F' }}>
                    {c.isActive ? t('Aktiv', 'Active') : t('Gesperrt', 'Suspended')}
                  </span>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <Link href={`/support/customers/${c.id}`} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9E896A', textDecoration:'none' }}>
                    {t('Details', 'Details')} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
