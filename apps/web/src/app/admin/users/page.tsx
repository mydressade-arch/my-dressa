'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

const ROLES = ['customer', 'merchant', 'support'] // admin nicht wählbar

export default function AdminUsersPage() {
  const { t } = useLangStore()
  const [data, setData] = useState<any>({ users: [], total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')
  const [roleChangingId, setRoleChangingId] = useState<string|null>(null)

  const load = (p = 1) => {
    setLoading(true)
    api.get('/admin/users', { params: { page: p, limit: 20 } })
      .then(({ data }) => { setData(data); setPage(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  const toggleActive = async (id: string) => {
    try {
      const { data: res } = await api.post(`/admin/users/${id}/toggle-active`)
      notify(res.message)
      load(page)
    } catch (e: any) { notify(e.response?.data?.message || 'Error', 'err') }
  }

  const changeRole = async (id: string, role: string) => {
    setRoleChangingId(id)
    try {
      const { data: res } = await api.patch(`/admin/users/${id}/role`, { role })
      notify(res.message)
      load(page)
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.status === 401 ? 'Bitte neu einloggen' : 'Fehler'
      notify(msg, 'err')
    }
    finally { setRoleChangingId(null) }
  }

  const roleColor: Record<string, string> = {
    admin: '#791F1F', merchant: '#633806', customer: '#444748', support: '#185FA5',
  }
  const roleBg: Record<string, string> = {
    admin: '#FCEBEB', merchant: '#FAEEDA', customer: '#f1edec', support: '#E6F1FB',
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Users</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>{data.total} registered accounts</p>
        </div>
      </div>

      {msg && (
        <div style={{ padding:'12px 16px', background: msgType==='ok'?'#EAF3DE':'#FCEBEB', color:msgType==='ok'?'#27500A':'#791F1F', fontSize:13, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
          {msg}
          <button onClick={()=>setMsg('')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16 }}>×</button>
        </div>
      )}

      <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {[t('Name', 'Name'),t('E-Mail', 'Email'),t('Rolle', 'Role'),'Verified','Active',t('Beigetreten', 'Joined'),'Actions'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i=>(
                <tr key={i}><td colSpan={7} style={{ padding:'12px 16px' }}>
                  <div style={{ height:16, background:'#f1edec', borderRadius:4 }} />
                </td></tr>
              ))
            ) : data.users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                <td style={{ padding:'12px 16px', fontWeight:500 }}>{u.firstName} {u.lastName}</td>
                <td style={{ padding:'12px 16px', color:'#5e5e5b' }}>{u.email}</td>
                <td style={{ padding:'12px 16px' }}>
                  {u.role === 'admin' ? (
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 8px', background:roleBg['admin'], color:roleColor['admin'] }}>
                      admin
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={roleChangingId === u.id}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{
                        fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em',
                        padding:'3px 6px', background:roleBg[u.role]||'#f1edec',
                        color:roleColor[u.role]||'#444748', border:'1px solid #c4c7c7',
                        cursor:'pointer', borderRadius:2, opacity: roleChangingId===u.id ? 0.5 : 1,
                      }}>
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={{ padding:'12px 16px', fontSize:13, color:u.isVerified?'#27500A':'#ba1a1a', fontWeight:600 }}>
                  {u.isVerified ? '✓' : '✗'}
                </td>
                <td style={{ padding:'12px 16px', fontSize:13, color:u.isActive?'#27500A':'#ba1a1a', fontWeight:600 }}>
                  {u.isActive ? 'Active' : 'Suspended'}
                </td>
                <td style={{ padding:'12px 16px', color:'#5e5e5b' }}>
                  {new Date(u.createdAt).toLocaleDateString('de-DE')}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  {u.role !== 'admin' && (
                    <button onClick={()=>toggleActive(u.id)}
                      style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', background:'none', border:'none', cursor:'pointer', color:u.isActive?'#ba1a1a':'#27500A' }}>
                      {u.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.totalPages > 1 && (
          <div style={{ padding:'12px 16px', borderTop:'1px solid #c4c7c7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:12, color:'#5e5e5b' }}>Page {page} of {data.totalPages}</p>
            <div style={{ display:'flex', gap:8 }}>
              <button disabled={page===1} onClick={()=>load(page-1)}
                style={{ padding:'6px 14px', border:'1px solid #c4c7c7', background:'none', cursor:page===1?'not-allowed':'pointer', fontSize:12, opacity:page===1?0.4:1 }}>
                Prev
              </button>
              <button disabled={page===data.totalPages} onClick={()=>load(page+1)}
                style={{ padding:'6px 14px', border:'1px solid #c4c7c7', background:'none', cursor:page===data.totalPages?'not-allowed':'pointer', fontSize:12, opacity:page===data.totalPages?0.4:1 }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
