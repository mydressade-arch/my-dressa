import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mydressa.de'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://my-dressa-api-production.up.railway.app/api/v1'

/**
 * sitemap.xml — Liste aller öffentlichen Seiten für Suchmaschinen.
 * Statische Seiten fest + Produkte dynamisch von der API.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statische öffentliche Seiten
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,              changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/products`,      changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/designers`,     changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/about`,         changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,       changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/sustainability`,changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/rental-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`,         changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/privacy`,       changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/impressum`,     changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Produkte dynamisch laden (falls die API erreichbar ist)
  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${API_URL}/products?limit=1000`, {
      next: { revalidate: 3600 }, // 1x pro Stunde neu laden
    })
    if (res.ok) {
      const data = await res.json()
      const products = Array.isArray(data) ? data : data?.items || data?.data || []
      productPages = products
        .filter((p: any) => p?.id)
        .map((p: any) => ({
          url: `${SITE_URL}/products/${p.id}`,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        }))
    }
  } catch {
    // API nicht erreichbar → nur statische Seiten (kein Fehler)
  }

  return [...staticPages, ...productPages]
}
