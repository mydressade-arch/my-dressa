'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'

export default function AdminRevenuePage() {
  const { t } = useLangStore()
  const [report, setReport] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/commissions/admin-report'),
      api.get('/admin/dashboard'),
    ]).then(([r, s]) => {
      setReport(r.data || [])
      setStats(s.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const total = report.reduce((s, r) => s + Number(r.totalPlatformRevenue || 0), 0)

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold mb-2">{t('Umsatz','Revenue')}</h1>
      <p className="text-secondary text-sm mb-8">{t('Übersicht der Plattform-Provisionen','Platform commission overview')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { label: t('Gesamtumsatz', 'Total Revenue'), value: `€${total.toFixed(2)}`, icon: 'payments', color: '#064E3B' },
          { label: t('Bestellungen gesamt','Total Orders'), value: stats?.totalOrders || 0, icon: 'package_2', color: '#9E896A' },
          { label: t('Aktive Nutzer','Active Users'), value: stats?.totalUsers || 0, icon: 'group', color: '#185FA5' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white border border-outline-variant p-6">
            <div className="w-10 h-10 flex items-center justify-center mb-4" style={{ background: '#f1edec' }}>
              <Icon name={icon} style={{ fontSize: 20, color }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">{label}</p>
            <p className="font-serif text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-outline-variant">
        <div className="px-6 py-5 border-b border-outline-variant">
          <h2 className="font-serif text-lg font-semibold">{t('Umsatz nach Typ','Revenue by Type')}</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1,2].map(i=><div key={i} className="h-12 bg-surface-container-high animate-pulse"/>)}</div>
        ) : report.length === 0 ? (
          <div className="px-6 py-12 text-center text-secondary text-sm">{t('Noch keine Umsatzdaten','No revenue data yet')}</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
<table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                {[t('Typ', 'Type'), t('Bestellungen', 'Orders'), t('Händler-Auszahlungen', 'Merchant Payouts'), t('Plattform-Umsatz', 'Platform Revenue'), t('Ø Provision', 'Avg Commission')].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {report.map((row: any) => (
                <tr key={row.type} className="hover:bg-surface-container-lowest">
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 uppercase tracking-widest ${
                      row.type === 'rental' ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-surface-container-highest text-secondary'
                    }`}>{row.type === 'rental' ? t('Miete','Rental') : t('Kauf','Purchase')}</span>
                  </td>
                  <td className="px-6 py-4 font-medium">{row.totalOrders}</td>
                  <td className="px-6 py-4 text-secondary">€{Number(row.totalMerchantPayouts||0).toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-emerald-deep">€{Number(row.totalPlatformRevenue||0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-secondary">
                    {row.type === 'rental' ? '10%' : '15%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </div>
    </div>
  )
}
