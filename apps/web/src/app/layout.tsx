import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { UIProvider } from '@/components/ui/UIProvider'
import { LangProvider } from '@/lib/lang'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { Footer } from '@/components/layout/Footer'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'My Dressa | Luxuriöse Mode mieten & kaufen',
    template: '%s | My Dressa',
  },
  description: 'Entdecke kuratierte Designer-Mode. Mieten für den Moment, kaufen für die Ewigkeit.',
  keywords: ['Mode mieten', 'Designer Mode', 'Fashion Rental', 'Luxury Fashion', 'My Dressa'],
  openGraph: {
    title: 'My Dressa | Luxuriöse Mode mieten & kaufen',
    description: 'Entdecke kuratierte Designer-Mode. Mieten für den Moment, kaufen für die Ewigkeit.',
    siteName: 'My Dressa',
    locale: 'de_DE',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>
        <UIProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CookieBanner />
        </UIProvider>
        </LangProvider>
      </body>
    </html>
  )
}
