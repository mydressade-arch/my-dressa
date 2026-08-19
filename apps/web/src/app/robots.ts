import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de'

/**
 * robots.txt — steuert, was Suchmaschinen crawlen dürfen.
 * Private/geschützte Bereiche werden ausgeschlossen (kein SEO-Wert,
 * sollen nicht in Google auftauchen).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/support',
        '/support/',
        '/merchant',
        '/merchant/',
        '/account',
        '/checkout',
        '/auth/',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
