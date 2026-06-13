'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLangStore } from '@/store/lang.store'

export function Footer() {
  const { t } = useLangStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const COLS = [
    { title: t('Entdecken', 'Browse'), links: [
      { label: t('Neu',             'New In'),        href: '/products' },
      { label: t(t('Designer', 'Designers'),        'Designers'),     href: '/designers' },
      { label: t('Mietbedingungen', 'Rental Policy'), href: '/rental-policy' },
      { label: t(t('Nachhaltigkeit', 'Sustainability'),  'Sustainability'), href: '/sustainability' },
    ]},
    { title: t('Unternehmen', 'Company'), links: [
      { label: t(t('Über uns', 'About Us'),        'About Us'),         href: '/about' },
      { label: t(t('AGB', 'Terms'),             'Terms of Service'), href: '/terms' },
      { label: t('Händler Portal',  'Merchant Portal'),  href: '/merchant/onboarding' },
      { label: t(t('Kontakt', 'Contact'),         'Contact'),          href: '/contact' },
    ]},
    { title: t('Support', 'Support'), links: [
      { label: t('Mietbedingungen', 'Rental Policy'),  href: '/rental-policy' },
      { label: t(t('Datenschutz', 'Privacy'),     'Privacy Policy'), href: '/privacy' },
      { label: t('AGB',             'Terms'),          href: '/terms' },
      { label: t('Kontakt',         'Contact'),        href: '/contact' },
    ]},
  ]

  return (
    <footer style={{ background:'#1c1b1b', color:'#f4f0ef', marginTop:'auto' }}>
      <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(32px,4vw,64px) clamp(16px,4vw,64px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'clamp(24px,4vw,48px)', marginBottom:48 }}>
          <div>
            <Link href="/" style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(18px,2.2vw,22px)', fontWeight:700, color:'#f4f0ef', textDecoration:'none', display:'block', marginBottom:12 }}>
              My Dressa
            </Link>
            <p style={{ fontSize:13, color:'#9c9a92', lineHeight:1.7, maxWidth:240, marginBottom:20 }}>
              {t(t('Mode-Verleih Plattform für bewussten Luxus und nachhaltige Kleiderschränke.', 'Fashion rental platform for conscious luxury and sustainable wardrobes.'), t('Mode-Verleih Plattform für bewussten Luxus und nachhaltige Kleiderschränke.', 'Redefining fashion ownership through conscious luxury and shared wardrobes.'))}
            </p>
          </div>
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em', color:'#9c9a92', marginBottom:16 }}>{col.title}</p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                {col.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} style={{ fontSize:13, color:'rgba(244,240,239,0.65)', textDecoration:'none' }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid #313030', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <p style={{ fontSize:12, color:'rgba(244,240,239,0.35)' }}>
            © 2025 My Dressa. {t(t('Alle Rechte vorbehalten', 'All rights reserved'), 'All rights reserved')}. Made in Germany 🇩🇪
          </p>
          <div style={{ display:'flex', gap:20 }}>
            <Link href="/privacy" style={{ fontSize:12, color:'rgba(244,240,239,0.35)', textDecoration:'none' }}>{t('Datenschutz', 'Privacy')}</Link>
            <Link href="/terms"   style={{ fontSize:12, color:'rgba(244,240,239,0.35)', textDecoration:'none' }}>{t('AGB', 'Terms')}</Link>
            <Link href="/impressum" style={{ fontSize:12, color:'rgba(244,240,239,0.35)', textDecoration:'none' }}>{t('Impressum', 'Legal Notice')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
