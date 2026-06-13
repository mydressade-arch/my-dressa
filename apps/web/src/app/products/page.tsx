'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { productsApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { ProductCard } from '@/components/product/ProductCard'

const DEFAULT_CATEGORIES = ['All','Abendmode','Casual','Vintage','Accessories','Suits']
const SIZES = ['XS','S','M','L','XL','XXL']

function ProductsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { t } = useLangStore()
  const [products, setProducts] = useState<any[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters — lesen direkt aus URL params
  const [category, setCategory]       = useState(searchParams.get('category') || 'All')
  const [forRent, setForRent]         = useState(searchParams.get('forRent') === 'true')
  const [forSale, setForSale]         = useState(searchParams.get('forSale') === 'true')
  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') || '')
  const [categories, setCategories]   = useState<string[]>(DEFAULT_CATEGORIES)
  const [mounted, setMounted]         = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.get('/categories')
        .then(({ data }: any) => {
          if (data?.length) setCategories(['All', ...data.map((c: any) => c.name)])
        })
        .catch(() => {})
    })
  }, [])
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch]           = useState(searchParams.get('search') || '')

  // URL sync wenn Filter sich ändern
  const updateUrl = useCallback((params: Record<string, string | boolean | undefined>) => {
    const url = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== false && v !== 'All') url.set(k, String(v)) })
    router.replace(`/products${url.toString() ? '?' + url.toString() : ''}`, { scroll: false })
  }, [router])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const params: any = {}
        if (category !== 'All') params.category = category
        if (forRent)       params.forRent = true
        if (forSale)       params.forSale = true
        if (search.trim()) params.search = search.trim()
        if (selectedSize)  params.size = selectedSize
        const { data } = await productsApi.list(params)
        if (!cancelled) {
          setProducts(data.items || [])
          setTotal(data.total || 0)
        }
      } catch { if (!cancelled) setProducts([]) }
      finally { if (!cancelled) setLoading(false) }
    }
    run()
    return () => { cancelled = true }
  }, [category, forRent, forSale, search, selectedSize])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    updateUrl({ category, forRent, forSale, size: selectedSize, search: searchInput })
  }

  const handleCategory = (cat: string) => {
    setCategory(cat)
    updateUrl({ category: cat, forRent, forSale, size: selectedSize, search })
  }

  const handleForRent = (val: boolean) => {
    setForRent(val)
    updateUrl({ category, forRent: val, forSale, size: selectedSize, search })
  }

  const handleForSale = (val: boolean) => {
    setForSale(val)
    updateUrl({ category, forRent, forSale: val, size: selectedSize, search })
  }

  const handleSize = (s: string) => {
    const next = selectedSize === s ? '' : s
    setSelectedSize(next)
    updateUrl({ category, forRent, forSale, size: next, search })
  }

  const clearFilters = () => {
    setCategory('All'); setForRent(false); setForSale(false)
    setSelectedSize(''); setSearch(''); setSearchInput('')
    router.replace('/products', { scroll: false })
  }

  const hasFilters = category !== 'All' || forRent || forSale || selectedSize || search

  // Page title based on active filter
  const pageTitle = forRent ? 'For Rent' : forSale ? 'For Sale' : category !== 'All' ? category : 'Collection'

  return (
    <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(16px,2vw,32px) clamp(16px,4vw,48px)' }}>

      {/* Page Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:36, fontWeight:700, letterSpacing:'-0.02em', color:'#1c1b1b', marginBottom:4 }}>
              {pageTitle}
            </h1>
            <p style={{ color:'#9e9e9b', fontSize:13 }}>
              {loading ? '—' : `${total} piece${total !== 1 ? 's' : ''}`}
              {hasFilters && ' · filtered'}
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit}
            style={{ display:'flex', border:'1px solid #c4c7c7', background:'#fff', maxWidth:320, flex:1 }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, style..."
              style={{ padding:'10px 16px', fontSize:13, background:'transparent', border:'none', outline:'none', flex:1, color:'#1c1b1b', minWidth:0 }}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); updateUrl({ category, forRent, forSale, size: selectedSize }) }}
                style={{ padding:'10px 8px', background:'none', border:'none', cursor:'pointer', color:'#9e9e9b', display:'flex', alignItems:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>close</span>
              </button>
            )}
            <button type="submit"
              style={{ padding:'10px 14px', background:'#1c1b1b', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>search</span>
            </button>
          </form>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:14, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#9e9e9b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Active:</span>
            {search && <Chip label={`"${search}"`} onRemove={() => { setSearch(''); setSearchInput(''); updateUrl({ category, forRent, forSale, size: selectedSize }) }} />}
            {category !== 'All' && <Chip label={category} onRemove={() => handleCategory('All')} />}
            {forRent && <Chip label={mounted ? t("Mieten", 'For Rent') : 'Mieten'} onRemove={() => handleForRent(false)} gold />}
            {forSale && <Chip label={mounted ? t("Kaufen", 'For Sale') : 'Kaufen'} onRemove={() => handleForSale(false)} />}
            {selectedSize && <Chip label={`Size ${selectedSize}`} onRemove={() => handleSize(selectedSize)} />}
            <button onClick={clearFilters}
              style={{ fontSize:11, fontWeight:600, color:'#ba1a1a', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:'2px 4px' }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filter-Button nur auf Mobile */}
      <button onClick={() => setFiltersOpen(o => !o)} className="filter-toggle-btn"
        style={{ display:'none', alignItems:'center', gap:8, width:'100%', padding:'12px 16px', marginBottom:16, background:'#fff', border:'1px solid #c4c7c7', cursor:'pointer', fontSize:13, fontWeight:600, color:'#1c1b1b' }}>
        <span className="material-symbols-outlined" style={{ fontSize:18 }}>tune</span>
        {filtersOpen ? (mounted ? t('Filter ausblenden', 'Hide Filters') : 'Filter') : (mounted ? t('Filter anzeigen', 'Show Filters') : 'Filter')}
        {hasFilters && <span style={{ marginLeft:'auto', background:'#9E896A', color:'#fff', fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:10 }}>!</span>}
      </button>

      <div className="products-layout" style={{ display:'flex', gap:40 }}>

        {/* Sidebar */}
        <aside className={`products-sidebar ${filtersOpen ? 'filters-open' : ''}`} style={{ width:190, flexShrink:0 }}>
          <div style={{ position:'sticky', top:88 }}>

            {/* Type filter */}
            <FilterSection title="Type">
              <FilterToggle
                label={mounted ? t("Mieten", 'For Rent') : 'Mieten'}
                sublabel={mounted ? t("Ausleihen & zurückgeben", 'Borrow & return') : 'Ausleihen & zurückgeben'}
                active={forRent}
                onClick={() => {
                  const newVal = !forRent
                  setForRent(newVal)
                  setForSale(false)
                  updateUrl({ category, forRent: newVal, forSale: false, size: selectedSize, search })
                }}
                accent="#9E896A"
              />
              <FilterToggle
                label={mounted ? t("Kaufen", 'For Sale') : 'Kaufen'}
                sublabel={mounted ? t("Kaufen & behalten", 'Buy & keep') : 'Kaufen & behalten'}
                active={forSale}
                onClick={() => {
                  const newVal = !forSale
                  setForSale(newVal)
                  setForRent(false)
                  updateUrl({ category, forRent: false, forSale: newVal, size: selectedSize, search })
                }}
              />
            </FilterSection>

            {/* Category */}
            <FilterSection title={mounted ? t("Kategorie", 'Category') : 'Kategorie'}>
              {categories.map(cat => (
                <button key={cat} onClick={() => handleCategory(cat)}
                  style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'6px 0 6px 10px', fontSize:13, background:'none', border:'none',
                    cursor:'pointer', borderLeft:`2px solid ${category === cat ? '#9E896A' : 'transparent'}`,
                    color: category === cat ? '#1c1b1b' : '#5e5e5b',
                    fontWeight: category === cat ? 600 : 400,
                    transition:'all 0.12s',
                  }}>
                  {cat}
                </button>
              ))}
            </FilterSection>

            {/* Size */}
            <FilterSection title={mounted ? t("Größe", 'Size') : 'Größe'}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => handleSize(s)}
                    style={{
                      width:38, height:38, fontSize:11, fontWeight:600, cursor:'pointer',
                      border:`1.5px solid ${selectedSize === s ? '#1c1b1b' : '#d4cfcd'}`,
                      background: selectedSize === s ? '#1c1b1b' : '#fff',
                      color: selectedSize === s ? '#fff' : '#1c1b1b',
                      transition:'all 0.12s',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </FilterSection>

          </div>
        </aside>

        {/* Product Grid */}
        <div style={{ flex:1, minWidth:0 }}>
          {loading ? (
            <div className="responsive-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
              {Array.from({ length:9 }).map((_, i) => (
                <div key={i}>
                  <div style={{ paddingBottom:'130%', background:'#f1edec', animation:'pulse 1.5s infinite' }} />
                  <div style={{ height:10, background:'#f1edec', width:'40%', marginTop:12, marginBottom:7 }} />
                  <div style={{ height:14, background:'#f1edec', width:'70%' }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0', borderTop:'1px solid #e8e3e1' }}>
              <span className="material-symbols-outlined" style={{ fontSize:'clamp(28px,4vw,48px)', color:'#d4cfcd', display:'block', marginBottom:16 }}>search_off</span>
              <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, marginBottom:8, color:'#1c1b1b' }}>
                No pieces found
              </h3>
              <p style={{ color:'#9e9e9b', fontSize:14, marginBottom:24 }}>
                Try adjusting your filters or search terms
              </p>
              {hasFilters && (
                <button onClick={clearFilters}
                  style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', cursor:'pointer' }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="product-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
              {products.map((p: any) => (
                <ProductCard
                  key={p.id} id={p.id} title={p.title}
                  merchantName={p.merchant?.shopName || 'My Dressa'}
                  rentalPrice={p.rentalPrice} salePrice={p.salePrice}
                  imageUrl={p.images?.[0]?.url}
                  isForRent={p.isForRent} isForSale={p.isForSale}
                  isAvailable={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper components
function FilterSection({ title, children }: { title:string, children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:28 }}>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'#9e9e9b', marginBottom:10 }}>{title}</p>
      {children}
    </div>
  )
}

function FilterToggle({ label, sublabel, active, onClick, accent }: any) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      width:'100%', padding:'8px 10px', marginBottom:4, background: active ? (accent ? 'rgba(158,137,106,0.1)' : 'rgba(28,27,27,0.06)') : '#fff',
      border:`1.5px solid ${active ? (accent || '#1c1b1b') : '#e8e3e1'}`,
      cursor:'pointer', textAlign:'left', transition:'all 0.12s',
    }}>
      <div>
        <p style={{ fontSize:13, fontWeight:600, color: active ? (accent || '#1c1b1b') : '#1c1b1b', marginBottom:1 }}>{label}</p>
        <p style={{ fontSize:10, color:'#9e9e9b' }}>{sublabel}</p>
      </div>
      <div style={{
        width:16, height:16, border:`1.5px solid ${active ? (accent || '#1c1b1b') : '#c4c7c7'}`,
        background: active ? (accent || '#1c1b1b') : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        {active && <span className="material-symbols-outlined" style={{ fontSize:11, color:'#fff', lineHeight:1 }}>check</span>}
      </div>
    </button>
  )
}

function Chip({ label, onRemove, gold }: { label:string, onRemove:()=>void, gold?:boolean }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:500, padding:'3px 10px', background: gold ? 'rgba(158,137,106,0.12)' : '#f1edec', border:`1px solid ${gold ? '#9E896A' : '#d4cfcd'}`, color: gold ? '#9E896A' : '#1c1b1b' }}>
      {label}
      <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', lineHeight:1 }}>
        <span className="material-symbols-outlined" style={{ fontSize:13, color: gold ? '#9E896A' : '#5e5e5b' }}>close</span>
      </button>
    </span>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding:80, textAlign:'center', color:'#9e9e9b' }}>
        <span className="material-symbols-outlined" style={{ fontSize:32, display:'block', marginBottom:8 }}>sync</span>
        Loading...
      </div>
    }>
      <ProductsInner />
    </Suspense>
  )
}
