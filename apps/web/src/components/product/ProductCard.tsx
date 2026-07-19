'use client'
import { NEW_DESIGN } from '@/lib/flags'
import { ProductCardClassic } from './ProductCardClassic'
import { ProductCardNew } from './ProductCardNew'

export interface ProductCardProps {
  id: string
  title: string
  merchantName: string
  rentalPrice?: number
  salePrice?: number
  imageUrl?: string
  images?: { url: string }[]
  isAvailable?: boolean
  isForRent?: boolean
  isForSale?: boolean
  initialSaved?: boolean
  availableNow?: boolean
  nextAvailableDate?: string | null
}

/**
 * Wählt die Kartenvariante.
 *
 * Neu (Standard): Preis-Erzählung, zweites Bild beim Hover, Verfügbarkeit.
 * Alt:            unveränderte Fassung — greift bei NEXT_PUBLIC_NEW_DESIGN=0
 *
 * Die alte Karte bleibt vollständig erhalten (ProductCardClassic.tsx),
 * es geht also nichts verloren.
 */
export function ProductCard(props: ProductCardProps) {
  if (!NEW_DESIGN) {
    const { images, availableNow, nextAvailableDate, ...classic } = props
    return <ProductCardClassic {...classic} />
  }
  return <ProductCardNew {...props} />
}
