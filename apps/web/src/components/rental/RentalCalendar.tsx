'use client'
import { useState, useEffect } from 'react'
import { format, addDays, differenceInDays, isBefore, isAfter, startOfDay, parseISO, eachDayOfInterval } from 'date-fns'
import { useLangStore } from '@/store/lang.store'
import { rentalsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'

interface Props {
  productVariantId: string
  rentalPricePerDay: number
  shippingCost?: number
  depositAmount?: number
  stockQuantity?: number
  onConfirm: (startDate: string, endDate: string) => void
}

export function RentalCalendar({ productVariantId, rentalPricePerDay, shippingCost = 0, depositAmount, stockQuantity, onConfirm }: Props) {
  const depositValue = depositAmount ? Number(depositAmount) : 0;
  const { t } = useLangStore()
  const today = startOfDay(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [blockedRanges, setBlockedRanges] = useState<{start:string,end:string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productVariantId) return
    setLoading(true)
    const from = format(today, 'yyyy-MM-dd')
    const to   = format(addDays(today, 90), 'yyyy-MM-dd')
    rentalsApi.checkAvailability({ productVariantId, startDate: from, endDate: to })
      .then(({ data }) => setBlockedRanges(data.blockedRanges || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productVariantId])

  // Alle gesperrten Tage als Set für O(1) Lookup
  const blockedSet = new Set<string>()
  blockedRanges.forEach(range => {
    try {
      eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) })
        .forEach(d => blockedSet.add(format(d, 'yyyy-MM-dd')))
    } catch {}
  })

  const isBlocked = (date: Date) => blockedSet.has(format(date, 'yyyy-MM-dd'))
  const isPast    = (date: Date) => isBefore(date, today)

  const handleDayClick = (date: Date) => {
    if (isPast(date) || isBlocked(date)) return
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null)
    } else {
      if (isBefore(date, startDate)) { setStartDate(date); return }
      const days = differenceInDays(date, startDate)
      if (days > 7) { setEndDate(addDays(startDate, 7)); return }
      // Prüfen ob zwischen start und end ein blockierter Tag liegt
      const range = eachDayOfInterval({ start: startDate, end: date })
      const hasBlocked = range.some(d => isBlocked(d))
      if (hasBlocked) { setStartDate(date); setEndDate(null); return }
      setEndDate(date)
    }
  }

  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false
    return !isBefore(date, startDate) && !isAfter(date, endDate)
  }
  const isStart = (date: Date) => startDate && format(date,'yyyy-MM-dd') === format(startDate,'yyyy-MM-dd')
  const isEnd   = (date: Date) => endDate   && format(date,'yyyy-MM-dd') === format(endDate,'yyyy-MM-dd')

  const getDays = () => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay  = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  const duration    = startDate && endDate ? Math.max(1, differenceInDays(endDate, startDate)) : 0
  const rentalTotal = duration * rentalPricePerDay
  const total       = rentalTotal + shippingCost

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))

  return (
    <div>
      {/* Month Navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#1c1b1b' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </p>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={prevMonth} style={{ width:28, height:28, border:'1px solid #c4c7c7', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_left</span>
          </button>
          <button onClick={nextMonth} style={{ width:28, height:28, border:'1px solid #c4c7c7', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9e9e9b', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#9e9e9b', fontSize:13 }}>
          <div style={{ width:20, height:20, border:'2px solid #c4c7c7', borderTopColor:'#9E896A', borderRadius:'50%', animation:'spin 0.8s linear infinite', marginRight:8 }} />
          Verfügbarkeit laden...
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', border:'1px solid #e8e3e1', borderRight:'none', borderBottom:'none' }}>
          {getDays().map((date, i) => {
            if (!date) return (
              <div key={i} style={{ borderRight:'1px solid #e8e3e1', borderBottom:'1px solid #e8e3e1', height:44 }} />
            )
            const past    = isPast(date)
            const blocked = isBlocked(date)
            const start   = isStart(date)
            const end     = isEnd(date)
            const range   = isInRange(date)
            const today_  = format(date,'yyyy-MM-dd') === format(today,'yyyy-MM-dd')
            const disabled = past || blocked

            let bg = '#fff'
            let color = '#1c1b1b'
            let cursor = 'pointer'
            let opacity = 1

            if (start || end)   { bg = '#9E896A'; color = '#fff' }
            else if (range)     { bg = 'rgba(158,137,106,0.12)' }
            else if (blocked)   { bg = '#f0f0f0'; color = '#bbb'; cursor = 'not-allowed' }
            else if (past)      { bg = '#fafafa'; color = '#ddd'; cursor = 'not-allowed'; opacity = 0.6 }
            else if (today_)    { bg = '#f1edec' }

            return (
              <button key={i}
                onClick={() => !disabled && handleDayClick(date)}
                disabled={disabled}
                title={blocked ? 'Nicht verfügbar — bereits gebucht' : past ? 'Vergangener Tag' : undefined}
                style={{
                  borderRight:'1px solid #e8e3e1', borderBottom:'1px solid #e8e3e1',
                  height:44, fontSize:13, fontWeight: (start || end) ? 700 : 400,
                  background: bg, color, cursor, opacity,
                  position:'relative', transition:'background 0.1s',
                  outline: today_ && !start && !end ? '1px solid #9E896A' : 'none',
                  outlineOffset: '-1px',
                }}>
                {/* Durchgestrichene Linie für blockierte Tage */}
                {blocked && (
                  <div style={{
                    position:'absolute', top:'50%', left:'10%', right:'10%',
                    height:1, background:'#ccc', transform:'translateY(-50%) rotate(-45deg)',
                    pointerEvents:'none'
                  }} />
                )}
                {date.getDate()}
              </button>
            )
          })}
        </div>
      )}

      {/* Legende */}
      <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
        {[
          { color:'#9E896A', label:t('Ausgewählt', 'Selected') },
          { color:'rgba(158,137,106,0.12)', border:'1px solid #c4c7c7', label:t('Zeitraum', 'Range') },
          { color:'#f0f0f0', label:t('Nicht verfügbar', 'Unavailable'), textColor:'#aaa' },
          { color:'#fafafa', label:t('Vergangen', 'Past'), textColor:'#ccc' },
        ].map(({ color, label, border, textColor }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:14, height:14, background:color, border: border || '1px solid #e8e3e1', flexShrink:0 }} />
            <span style={{ fontSize:10, color: textColor || '#5e5e5b' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ marginTop:12, padding:'10px 14px', background:'#f7f3f2', border:'1px solid #e8e3e1', fontSize:12, color:'#5e5e5b', display:'flex', gap:8, alignItems:'flex-start' }}>
        <span className="material-symbols-outlined" style={{ fontSize:15, color:'#9E896A', flexShrink:0, marginTop:1 }}>info</span>
        <span>Rote Tage sind bereits vergeben. Max. 7 Tage Mietdauer. Kaution €{depositValue} wird beim Buchen reserviert.</span>
      </div>
      <div style={{ marginTop:8, padding:'10px 14px', background:'#E6F1FB', border:'1px solid #cce0ff', fontSize:12, color:'#0C447C', display:'flex', gap:8, alignItems:'flex-start' }}>
        <span className="material-symbols-outlined" style={{ fontSize:15, color:'#0C447C', flexShrink:0, marginTop:1 }}>local_shipping</span>
        <span><strong>Lieferzeit:</strong> DHL liefert in 1–2 Werktagen. Startdatum mind. 2 Tage vor der Feier wählen. Rückgabe spätestens 2–3 Tage danach.</span>
      </div>

      {/* Summary */}
      {startDate && endDate && (
        <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid #e8e3e1' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'#5e5e5b' }}>{format(startDate,'dd.MM.')} → {format(endDate,'dd.MM.yyyy')}</span>
              <span style={{ fontWeight:600, color:'#9E896A' }}>{duration} Tag{duration > 1 ? 'e' : ''}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'#5e5e5b' }}>Mietgebühr (€{rentalPricePerDay}/Tag × {duration})</span>
              <span style={{ fontWeight:600 }}>€{rentalTotal.toFixed(2)}</span>
            </div>
            {shippingCost > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'#5e5e5b' }}>Versand (DHL)</span>
                <span style={{ fontWeight:600 }}>€{shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:700, paddingTop:10, borderTop:'1px solid #e8e3e1' }}>
              <span>Gesamt</span>
              <span>€{total.toFixed(2)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#9e9e9b' }}>
              <span>Kaution (wird zurückgebucht)</span>
              <span>€{depositValue.toFixed(2)}</span>
            </div>
          </div>
          {/* Stock Warning */}
          {stockQuantity != null && stockQuantity < 3 && stockQuantity > 0 && (
            <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#633806' }}>
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>warning</span>
              Nur noch <strong>{stockQuantity}</strong> {stockQuantity === 1 ? 'Stück' : 'Stücke'} verfügbar
            </div>
          )}
          <Button variant="rent" size="lg" className="w-full"
            onClick={() => onConfirm(format(startDate,'yyyy-MM-dd'), format(endDate,'yyyy-MM-dd'))}>
            Rental bestätigen — €{total.toFixed(2)}
          </Button>
        </div>
      )}

      {startDate && !endDate && (
        <p style={{ marginTop:12, fontSize:12, color:'#9E896A', textAlign:'center', fontWeight:500 }}>
          Enddatum auswählen (max. 7 Tage ab {format(startDate,'dd.MM.')})
        </p>
      )}
    </div>
  )
}
