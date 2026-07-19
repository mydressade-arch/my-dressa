'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsApi, api , settingsApi } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'

export default function EditProductPage() {
  const { t } = useLangStore()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useUI()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [durations, setDurations] = useState<number[]>([7,10])
  const [sizeOptions, setSizeOptions] = useState<string[]>([])
  const [colorOptions, setColorOptions] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [variants, setVariants] = useState<any[]>([{ size:'', color:'', stockQuantity:1 }])

  const [form, setForm] = useState({
    title: '', description: '', category: '',
    salePrice: '', rentalPrice: '', shippingCost: '', depositAmount: '', penaltyAmount: '', rentalDurationDays: 10,
    isForSale: false, isForRent: false,
  })

  useEffect(() => {
    settingsApi.rentalDurations()
      .then(r => { const d = (r as any).data?.durations; if (Array.isArray(d) && d.length) setDurations(d) })
      .catch(() => {})
    settingsApi.productSizes()
      .then(r => { const s2 = (r as any).data?.sizes; if (Array.isArray(s2) && s2.length) setSizeOptions(s2) })
      .catch(() => {})
    settingsApi.productColors()
      .then(r => { const c2 = (r as any).data?.colors; if (Array.isArray(c2) && c2.length) setColorOptions(c2) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      productsApi.detail(id),
      api.get('/categories').catch(() => ({ data: [] })),
      api.get('/users/merchant-profile').catch(() => ({ data: null })),
    ]).then(([{ data: prod }, { data: cats }, { data: profile }]: any) => {
      if (profile && prod.merchantId !== profile.id) {
        router.push('/merchant/products'); return
      }
      setProduct(prod)
      setVariants(prod.variants?.length ? prod.variants : [{ size:'', color:'', stockQuantity:1 }])
      setForm({
        title:         prod.title || '',
        description:   prod.description || '',
        category:      prod.category || '',
        salePrice:     prod.salePrice ? String(prod.salePrice) : '',
        rentalPrice:   prod.rentalPrice ? String(prod.rentalPrice) : '',
        shippingCost:  prod.shippingCost ? String(prod.shippingCost) : '',
        depositAmount: prod.depositAmount ? String(prod.depositAmount) : '',
        penaltyAmount: prod.penaltyAmount ? String(prod.penaltyAmount) : '',
        rentalDurationDays: prod.rentalDurationDays ?? 10,
        isForSale:     prod.isForSale || false,
        isForRent:     prod.isForRent || false,
      })
      if (cats?.length) setCategories(cats.map((c: any) => c.name))
    }).catch(() => router.push('/merchant/products'))
    .finally(() => setLoading(false))
  }, [id])

  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (!form.isForSale && !form.isForRent) {
      toast('Bitte wähle Verkauf oder Miete', 'error'); return
    }
    if (!variants.some(v => v.size && v.color)) { toast('Mindestens eine Variante mit Größe UND Farbe erforderlich', 'error'); return }
    setSaving(true)
    try {
      await productsApi.update(id, {
        title:         form.title.trim(),
        description:   form.description.trim(),
        category:      form.category,
        salePrice:     form.isForSale && form.salePrice ? parseFloat(form.salePrice) : undefined,
        rentalPrice:   form.isForRent && form.rentalPrice ? parseFloat(form.rentalPrice) : undefined,
        shippingCost:  form.shippingCost ? parseFloat(form.shippingCost) : 0,
        depositAmount: form.isForRent && form.depositAmount ? parseFloat(form.depositAmount) : undefined,
        penaltyAmount: form.isForRent && form.penaltyAmount ? parseFloat(form.penaltyAmount) : undefined,
        rentalDurationDays: form.isForRent ? Number(form.rentalDurationDays) : undefined,
        isForSale:     form.isForSale,
        isForRent:     form.isForRent,
        variants:      variants.filter(v => v.size && v.color),
      })
      toast('Produkt aktualisiert ✓', 'success')
      router.push('/merchant/products')
    } catch (e: any) {
      toast(e.response?.data?.message || 'Fehler beim Speichern', 'error')
    } finally { setSaving(false) }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('images', f))
      await api.post(`/products/${id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { data } = await productsApi.detail(id)
      setProduct(data)
      toast(`${files.length} Bild(er) hochgeladen`, 'success')
    } catch { toast('Fehler beim Upload', 'error') }
    finally { setUploading(false) }
  }

  const deleteImage = async (url: string) => {
    try {
      await api.delete(`/products/${id}/images`, { data: { url } })
      setProduct((p: any) => ({ ...p, images: p.images.filter((i: any) => i.url !== url) }))
      toast('Bild gelöscht', 'info')
    } catch { toast('Fehler', 'error') }
  }

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#5e5e5b' }}>Laden...</div>
  if (!product) return null

  return (
    <div style={{ maxWidth:720 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
        <button onClick={() => router.push('/merchant/products')}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'#5e5e5b', fontSize:13 }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
          Zurück
        </button>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700 }}>
          Produkt bearbeiten
        </h1>
      </div>

      <form onSubmit={save}>
        {/* Basis-Infos */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Produkt-Details
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Titel *</label>
              <input value={form.title} onChange={up('title')} required placeholder="Produktname"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Beschreibung</label>
              <textarea value={form.description} onChange={up('description')} rows={4} placeholder="Produktbeschreibung"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Kategorie</label>
              <select value={form.category} onChange={up('category')}
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }}>
                <option value="">Kategorie wählen</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Typ */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Typ & Preise
          </h2>
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            {[['isForSale',t('Zum Verkauf', 'For Sale')],['isForRent',t('Zur Miete', 'For Rent')]].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', border:`1.5px solid ${(form as any)[key] ? '#1c1b1b' : '#c4c7c7'}`, cursor:'pointer', flex:1, justifyContent:'center', background:(form as any)[key]?'#f7f3f2':'#fff' }}>
                <input type="checkbox" checked={(form as any)[key]}
                  onChange={e => setForm(f => ({...f, [key]: e.target.checked}))}
                  style={{ accentColor:'#1c1b1b' }} />
                <span style={{ fontSize:13, fontWeight:600 }}>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
            {form.isForSale && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Verkaufspreis (€)</label>
                <input type="number" step="0.01" min="0" value={form.salePrice} onChange={up('salePrice')} placeholder="0.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Mietpreis pro Tag (€)</label>
                <input type="number" step="0.01" min="0" value={form.rentalPrice} onChange={up('rentalPrice')} placeholder="0.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Versandkosten (€)</label>
              <input type="number" step="0.01" min="0" value={form.shippingCost} onChange={up('shippingCost')} placeholder="0.00"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#0C447C', display:'block', marginBottom:6 }}>Kaution (€) *</label>
                <input type="number" step="0.01" min="0" value={form.depositAmount} onChange={up('depositAmount')} placeholder="z.B. 50.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'2px solid #0C447C', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#0C447C', display:'block', marginBottom:6 }}>Strafgebühr bei Nichtrückgabe (€)</label>
                <input type="number" step="0.01" min="0" value={form.penaltyAmount} onChange={up('penaltyAmount')} placeholder="z.B. 80.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#0C447C', display:'block', marginBottom:6 }}>Mietdauer</label>
                <select value={form.rentalDurationDays} onChange={e => setForm(f => ({...f, rentalDurationDays: Number(e.target.value)}))}
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const, background:'#fff' }}>
                  {durations.map(d => <option key={d} value={d}>{d} Tage</option>)}
                </select>
              </div>
            )}

          </div>
        </div>

        {/* Varianten */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:8, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Varianten <span style={{ fontSize:13, fontWeight:400, color:'#9e9e9b' }}>(Größe, Farbe, Bestand)</span>
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:14 }}>
            {variants.map((v, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px 32px', gap:8, alignItems:'center' }}>
                <select value={v.size||''} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, size:e.target.value} : x))}
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', background:'#fff' }}>
                  <option value="">Größe wählen *</option>
                  {sizeOptions.map(s2 => <option key={s2} value={s2}>{s2}</option>)}
                </select>
                <select value={v.color||''} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, color:e.target.value} : x))}
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', background:'#fff' }}>
                  <option value="">Farbe wählen *</option>
                  {colorOptions.map(c2 => <option key={c2} value={c2}>{c2}</option>)}
                </select>
                <input type="number" min="0" value={v.stockQuantity||1} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, stockQuantity:parseInt(e.target.value)||0} : x))}
                  placeholder="Stk"
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', textAlign:'center' as const }} />
                {variants.length > 1 && (
                  <button type="button" onClick={() => setVariants(vs => vs.filter((_,j) => j!==i))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#ba1a1a', fontSize:18, padding:0 }}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setVariants(vs => [...vs, { size:'', color:'', stockQuantity:1 }])}
              style={{ alignSelf:'flex-start', background:'none', border:'1px dashed #c4c7c7', padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', color:'#9E896A', textTransform:'uppercase' as const, letterSpacing:'0.05em' }}>
              + Variante hinzufügen
            </button>
          </div>
        </div>

        {/* Bilder */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Bilder
          </h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14 }}>
            {product.images?.map((img: any) => (
              <div key={img.url} style={{ position:'relative', width:90, height:110 }}>
                <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', border:'1px solid #e8e3e1' }} />
                <button type="button" onClick={() => deleteImage(img.url)}
                  style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width:90, height:110, border:'2px dashed #c4c7c7', background:'#fdf8f8', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'#9e9e9b', opacity:uploading?0.5:1 }}>
              <span className="material-symbols-outlined" style={{ fontSize:24 }}>add_photo_alternate</span>
              <span style={{ fontSize:11 }}>{uploading ? 'Upload...' : t('Hinzufügen', 'Add')}</span>
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }}
            onChange={e => handleImageUpload(e.target.files)} />
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:12 }}>
          <button type="submit" disabled={saving}
            style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:'14px', fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:saving?0.5:1 }}>
            {saving ? t('Speichern...', 'Saving...') : t('✓ Änderungen speichern', '✓ Save Changes')}
          </button>
          <button type="button" onClick={() => router.push('/merchant/products')}
            style={{ padding:'14px 24px', background:'none', border:'1px solid #c4c7c7', fontSize:13, cursor:'pointer', color:'#5e5e5b' }}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
