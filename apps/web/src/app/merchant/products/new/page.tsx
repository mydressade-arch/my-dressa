'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { productsApi, api } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'

const DEFAULT_CATEGORIES = ['Abendmode','Casual','Vintage','Accessoires','Anzüge','Kleider','Schuhe']

export default function NewProductPage() {
  const { t } = useLangStore()
  const router = useRouter()
  const { toast } = useUI()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving]     = useState(false)
  const [images, setImages]     = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [variants, setVariants] = useState([{ size: '', color: '', stockQuantity: 1 }])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  useEffect(() => {
    api.get('/categories').then(({ data }: any) => {
      const names = Array.isArray(data) ? data.map((c: any) => typeof c === 'string' ? c : c.name).filter(Boolean) : []
      if (names.length) setCategories(names)
    }).catch(() => {})
  }, [])
  const [form, setForm] = useState({
    title: '', description: '', category: '',
    salePrice: '', rentalPrice: '', shippingCost: '4.99', depositAmount: '',
    isForSale: false, isForRent: false,
  })

  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const addImages = (files: FileList | null) => {
    if (!files?.length) return
    const newFiles = Array.from(files)
    setImages(prev => [...prev, ...newFiles])
    newFiles.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (!form.isForSale && !form.isForRent) { toast('Bitte Verkauf oder Miete wählen', 'error'); return }
    if (form.isForRent && !form.depositAmount) { toast('Kaution für Miete erforderlich', 'error'); return }
    setSaving(true)
    try {
      // Produkt erstellen
      const { data: product } = await productsApi.create({
        title:         form.title.trim(),
        description:   form.description.trim(),
        category:      form.category || 'Kleider',
        salePrice:     form.isForSale && form.salePrice ? parseFloat(form.salePrice) : undefined,
        rentalPrice:   form.isForRent && form.rentalPrice ? parseFloat(form.rentalPrice) : undefined,
        shippingCost:  parseFloat(form.shippingCost || '0'),
        depositAmount: form.isForRent ? parseFloat(form.depositAmount) : undefined,
        isForSale:     form.isForSale,
        isForRent:     form.isForRent,
        variants:      variants.filter(v => v.size || v.color),
      }) as any

      // Bilder hochladen falls vorhanden
      if (images.length > 0) {
        const fd = new FormData()
        images.forEach(f => fd.append('images', f))
        await api.post(`/products/${product.id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      toast('Produkt erstellt ✓', 'success')
      router.push('/merchant/products')
    } catch (e: any) {
      toast(e.response?.data?.message || 'Fehler beim Erstellen', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:720 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
        <button onClick={() => router.push('/merchant/products')}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'#5e5e5b', fontSize:13 }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
          Zurück
        </button>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700 }}>
          Neues Produkt
        </h1>
      </div>

      <form onSubmit={save}>
        {/* Basis */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Produkt-Details
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Titel *</label>
              <input value={form.title} onChange={up('title')} required placeholder="z.B. Elegantes Abendkleid"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Beschreibung</label>
              <textarea value={form.description} onChange={up('description')} rows={3} placeholder="Produktbeschreibung..."
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

        {/* Typ & Preise */}
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Typ & Preise
          </h2>
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            {[['isForSale',t('Zum Verkauf', 'For Sale')],['isForRent',t('Zur Miete', 'For Rent')]].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', border:`1.5px solid ${(form as any)[key]?'#1c1b1b':'#c4c7c7'}`, cursor:'pointer', flex:1, justifyContent:'center', background:(form as any)[key]?'#f7f3f2':'#fff' }}>
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
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Verkaufspreis (€) *</label>
                <input type="number" step="0.01" min="0" value={form.salePrice} onChange={up('salePrice')} placeholder="0.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Mietpreis pro Tag (€) *</label>
                <input type="number" step="0.01" min="0" value={form.rentalPrice} onChange={up('rentalPrice')} placeholder="0.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Versandkosten (€)</label>
              <input type="number" step="0.01" min="0" value={form.shippingCost} onChange={up('shippingCost')} placeholder="4.99"
                style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            {form.isForRent && (
              <div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#0C447C', display:'block', marginBottom:6 }}>Kaution (€) *</label>
                <input type="number" step="0.01" min="0" value={form.depositAmount} onChange={up('depositAmount')} placeholder="z.B. 50.00"
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'2px solid #0C447C', outline:'none', boxSizing:'border-box' as const }} />
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
                <input value={v.size} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, size:e.target.value} : x))}
                  placeholder="Größe (z.B. S, M, L, XL)"
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
                <input value={v.color} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, color:e.target.value} : x))}
                  placeholder="Farbe (optional)"
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
                <input type="number" min="0" value={v.stockQuantity||1} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, stockQuantity:parseInt(e.target.value)||0} : x))}
                  placeholder="Stk"
                  style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', textAlign:'center' }} />
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
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:8, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            Bilder <span style={{ fontSize:13, fontWeight:400, color:'#9e9e9b' }}>(optional — kannst du später hinzufügen)</span>
          </h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:14 }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position:'relative', width:100, height:120 }}>
                <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', border:'1px solid #e8e3e1' }} />
                <button type="button" onClick={() => removeImage(i)}
                  style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ width:100, height:120, border:'2px dashed #c4c7c7', background:'#fdf8f8', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'#9e9e9b' }}>
              <span className="material-symbols-outlined" style={{ fontSize:28 }}>add_photo_alternate</span>
              <span style={{ fontSize:11 }}>Hinzufügen</span>
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }}
            onChange={e => addImages(e.target.files)} />
        </div>

        {/* Submit */}
        <div style={{ display:'flex', gap:12 }}>
          <button type="submit" disabled={saving || !form.title || (!form.isForSale && !form.isForRent)}
            style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:14, fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:(saving||!form.title||(!form.isForSale&&!form.isForRent))?0.5:1 }}>
            {saving ? t('Erstelle...', 'Creating...') : t('✓ Produkt erstellen', '✓ Create Product')}
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
