'use client'
import { useEffect, useRef } from 'react'

interface Props {
  data: { date: string; purchases: number; rentals: number; purchaseRevenue: number; rentalRevenue: number }[]
  chartType: 'count' | 'revenue'
}

export function SalesChart({ data, chartType }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return
    if (typeof window === 'undefined') return

    const load = async () => {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      if (chartRef.current) chartRef.current.destroy()

      const labels = data.map(d => {
        // Defensiv: date kann '2026-06-11', Date-Objekt oder undefined sein
        if (!d.date) return ''
        const str = String(d.date).substring(0, 10) // nur YYYY-MM-DD
        const parts = str.split('-')
        if (parts.length !== 3) return str
        const [, m, day] = parts
        return `${day}.${m}` // schon 2-stellig aus DB
      })
      const purchases = data.map(d => chartType === 'count' ? (Number(d.purchases) || 0) : Math.round(Number(d.purchaseRevenue) || 0))
      const rentals   = data.map(d => chartType === 'count' ? (Number(d.rentals)   || 0) : Math.round(Number(d.rentalRevenue)   || 0))

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Käufe',
              data: purchases,
              backgroundColor: '#9E896A',
              borderRadius: 2,
              barPercentage: 0.5,
            },
            {
              label: 'Mieten',
              data: rentals,
              backgroundColor: '#0C447C',
              borderRadius: 2,
              barPercentage: 0.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const v = ctx.parsed.y
                  return ` ${ctx.dataset.label}: ${chartType === 'revenue' ? `€${v}` : v}`
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 11 },
                color: '#9e9e9b',
                maxTicksLimit: 8,
                maxRotation: 0,
              },
            },
            y: {
              grid: { color: '#f1edec' },
              ticks: {
                font: { size: 11 },
                color: '#9e9e9b',
                callback: (v) => chartType === 'revenue' ? `€${v}` : String(v),
              },
              beginAtZero: true,
            },
          },
        },
      })
    }

    load()
    return () => { chartRef.current?.destroy() }
  }, [data, chartType])

  return (
    <div style={{ position: 'relative', width: '100%', height: 240 }}>
      <canvas ref={canvasRef}
        role="img"
        aria-label="Balkendiagramm: Käufe und Mieten der letzten 30 Tage" />
    </div>
  )
}
