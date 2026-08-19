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
  themeColor: '#1A1A1A',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de'),
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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'My Dressa' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Dressa | Luxuriöse Mode mieten & kaufen',
    description: 'Entdecke kuratierte Designer-Mode. Mieten für den Moment, kaufen für die Ewigkeit.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
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
      </head>
      <body suppressHydrationWarning>
        {/* Strukturierte Daten für Google (Organisation) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OnlineStore',
              name: 'My Dressa',
              description: 'Kuratierte Designer-Mode zum Mieten und Kaufen.',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de'}/icon-192.png`,
              image: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de'}/og-image.png`,
            }),
          }}
        />
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
