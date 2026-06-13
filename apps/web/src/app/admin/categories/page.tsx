'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
}

export default function AdminCategoriesPage() {
  const { t } = useLangStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [msg, setMsg]               = useState('')
  const [msgType, setMsgType]       = useState<'ok'|'err'>('ok')

  // Form state
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState<string|null>(null)
  const [form, setForm]             = useState({ name:'', description:'', sortOrder:'', isActive: true })
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<string|null>(null)

  const load = () => {
    setLoading(true)
    api.get('/categories/admin')
      .then(({ data }: any) => setCategories(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ name:'', description:'', sortOrder: String(categories.length + 1), isActive: true })
    setShowForm(true)
  }

  const openEdit = (cat: Category) => {
    setEditId(cat.id)
    setForm({ name: cat.name, description: cat.description||'', sortOrder: String(cat.sortOrder), isActive: cat.isActive })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
        sortOrder:   Number(form.sortOrder) || 99,
        isActive:    form.isActive,
      }
      if (editId) {
        await api.patch(`/categories/${editId}`, payload)
        notify('Kategorie aktualisiert')
      } else {
        await api.post('/categories', payload)
        notify('Kategorie erstellt')
      }
      setShowForm(false)
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler', 'err')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const { data } = await api.delete(`/categories/${id}`) as any
      notify(data.message)
      setDeleteId(null)
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler beim Löschen', 'err')
    }
  }

  const toggleActive = async (cat: Category) => {
    try {
      await api.patch(`/categories/${cat.id}`, { isActive: !cat.isActive })
      notify(`${cat.name} ${cat.isActive ? 'deaktiviert' : 'aktiviert'}`)
      load()
    } catch { notify('Fehler', 'err') }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Kategorien</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>{categories.length} Kategorien verwalten</p>
        </div>
        <button onClick={openCreate}
          style={{ display:'flex', alignItems:'center', gap:8, background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span>
          Neue Kategorie
        </button>
      </div>

      {msg && (
        <div style={{ padding:'12px 16px', background:msgType==='ok'?'#EAF3DE':'#FCEBEB', color:msgType==='ok'?'#27500A':'#791F1F', fontSize:13, marginBottom:20, display:'flex', justifyContent:'space-between' }}>
          {msg}
          <button onClick={()=>setMsg('')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16 }}>×</button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28, marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20 }}>
            {editId ? 'Kategorie bearbeiten' : t('Neue Kategorie', 'New Category')}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="z.B. Abendmode"
                  required
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }}
                />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Reihenfolge</label>
                <input
                  type="number" min="1"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({...f, sortOrder: e.target.value}))}
                  placeholder="1"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }}
                />
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Beschreibung</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Kurze Beschreibung (optional)"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div
                onClick={() => setForm(f => ({...f, isActive: !f.isActive}))}
                style={{ width:40, height:22, borderRadius:11, background:form.isActive?'#27500A':'#c4c7c7', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:2, left:form.isActive?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
              </div>
              <span style={{ fontSize:13, color:'#5e5e5b' }}>
                {form.isActive ? 'Aktiv — sichtbar im Shop' : 'Inaktiv — versteckt'}
              </span>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={saving}
                style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving ? 'Speichern...' : editId ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 20px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['#','Name','Beschreibung','Status','Aktionen'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={5} style={{ padding:'12px 16px' }}>
                  <div style={{ height:16, background:'#f1edec', borderRadius:4 }} />
                </td></tr>
              ))
            ) : categories.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'48px 16px', textAlign:'center', color:'#5e5e5b' }}>
                Keine Kategorien — erstelle die erste!
              </td></tr>
            ) : categories.map(cat => (
              <tr key={cat.id} style={{ borderBottom:'1px solid #f9f6f5', opacity: cat.isActive ? 1 : 0.5 }}>
                <td style={{ padding:'14px 16px', color:'#9e9e9b', fontWeight:600, width:40 }}>{cat.sortOrder}</td>
                <td style={{ padding:'14px 16px', fontWeight:600, color:'#1c1b1b' }}>{cat.name}</td>
                <td style={{ padding:'14px 16px', color:'#5e5e5b', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {cat.description || <span style={{ color:'#c4c7c7' }}>—</span>}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <button onClick={() => toggleActive(cat)}
                    style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 8px', background:cat.isActive?'#EAF3DE':'#f1edec', color:cat.isActive?'#27500A':'#5e5e5b', border:'none', cursor:'pointer' }}>
                    {cat.isActive ? 'Aktiv' : 'Inaktiv'}
                  </button>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  {deleteId === cat.id ? (
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'#ba1a1a', marginRight:4 }}>Sicher?</span>
                      <button onClick={() => handleDelete(cat.id)}
                        style={{ fontSize:11, fontWeight:600, background:'#ba1a1a', color:'#fff', border:'none', padding:'4px 10px', cursor:'pointer' }}>
                        Ja
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        style={{ fontSize:11, background:'none', border:'1px solid #c4c7c7', padding:'4px 10px', cursor:'pointer', color:'#5e5e5b' }}>
                        Nein
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => openEdit(cat)}
                        style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', color:'#5e5e5b', padding:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:18 }}>edit</span>
                      </button>
                      <button onClick={() => setDeleteId(cat.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', color:'#ba1a1a', padding:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:18 }}>delete</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div style={{ marginTop:16, padding:'12px 16px', background:'#f7f3f2', border:'1px solid #e8e3e1', fontSize:12, color:'#5e5e5b', display:'flex', gap:8 }}>
        <span className="material-symbols-outlined" style={{ fontSize:15, color:'#9E896A', flexShrink:0 }}>info</span>
        Kategorien werden sofort im Shop und im Händler-Formular angezeigt. Inaktive Kategorien sind nur hier sichtbar.
      </div>
    </div>
  )
}
