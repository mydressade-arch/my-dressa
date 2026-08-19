'use client'

import {
  Wallet, Plus, ImagePlus, ArrowLeft, BarChart3, CalendarDays, Calendar,
  XCircle, Check, CheckCircle2, Shirt, ChevronLeft, ChevronRight, X,
  Copy, Trash2, Leaf, Pencil, AlertCircle, Heart, Hourglass, Info,
  Truck, MapPin, Lock, LogOut, Mail, CircleDollarSign, Clock3, Timer,
  ExternalLink, Package, CreditCard, RefreshCw, Search, SearchX, Shield,
  ShoppingBag, Store, RotateCw, SlidersHorizontal, Undo2, Upload,
  BadgeCheck, AlertTriangle,
  ShieldCheck, PackageOpen, Tag, PartyPopper, Cookie, LayoutDashboard,
  Sparkles, ChevronDown, Users, Home, Languages, Menu, User, UserSearch,
  Flag, AlertOctagon, RotateCcw, Settings, Star, Headphones, CalendarClock,
  Eye, EyeOff,
  type LucideIcon,
} from 'lucide-react'

/**
 * Zentrale Icon-Komponente.
 * Ersetzt die Material-Symbols-FONT durch echte SVG-Icons (lucide).
 * → Kein Text-Aufblitzen mehr, schnelleres Laden, keine Google-Font-Abhängigkeit.
 *
 * Nutzung (ersetzt <span class="material-symbols-outlined">home</span>):
 *   <Icon name="home" />
 *   <Icon name="favorite" style={{ fontSize: 20, color: '#9E896A' }} />
 *
 * Die Namen entsprechen 1:1 den bisherigen Material-Symbol-Namen.
 */

// Mapping: Material-Symbol-Name → lucide-Komponente
const MAP: Record<string, LucideIcon> = {
  account_balance: Wallet,
  add: Plus,
  add_photo_alternate: ImagePlus,
  arrow_back: ArrowLeft,
  bar_chart: BarChart3,
  calendar_month: CalendarDays,
  calendar_today: Calendar,
  cancel: XCircle,
  check: Check,
  check_circle: CheckCircle2,
  checkroom: Shirt,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  content_copy: Copy,
  delete: Trash2,
  eco: Leaf,
  edit: Pencil,
  error: AlertCircle,
  favorite: Heart,
  favorite_border: Heart,
  hourglass_empty: Hourglass,
  info: Info,
  local_shipping: Truck,
  location_on: MapPin,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  money_off: CircleDollarSign,
  more_time: Timer,
  open_in_new: ExternalLink,
  package_: Package,
  package_2: Package,
  payments: CreditCard,
  refresh: RefreshCw,
  schedule: Clock3,
  search: Search,
  search_off: SearchX,
  security: Shield,
  shopping_bag: ShoppingBag,
  storefront: Store,
  sync: RotateCw,
  tune: SlidersHorizontal,
  undo: Undo2,
  upload: Upload,
  verified: BadgeCheck,
  warning: AlertTriangle,
  admin_panel_settings: ShieldCheck,
  assignment_return: PackageOpen,
  category: Tag,
  celebration: PartyPopper,
  cookie: Cookie,
  dashboard: LayoutDashboard,
  dry_cleaning: Sparkles,
  expand_more: ChevronDown,
  group: Users,
  home: Home,
  language: Languages,
  menu: Menu,
  person: User,
  person_search: UserSearch,
  report: Flag,
  report_problem: AlertOctagon,
  restart_alt: RotateCcw,
  settings: Settings,
  star: Star,
  store: Store,
  support_agent: Headphones,
  today: CalendarClock,
  visibility: Eye,
  visibility_off: EyeOff,
}

// Welche Icons sollen gefüllt dargestellt werden (z.B. aktives Herz)
const FILLED = new Set(['favorite'])

interface IconProps {
  name: string
  /** Größe in px. Alternativ über style.fontSize (Material-Kompatibilität). */
  size?: number
  /** Farbe. Alternativ über style.color. */
  color?: string
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent) => void
}

export function Icon({ name, size, color, className, style, onClick }: IconProps) {
  const Cmp = MAP[name]
  if (!Cmp) {
    // Unbekanntes Icon → nichts anzeigen (statt Text-Fallback)
    if (typeof window !== 'undefined') {
      console.warn(`[Icon] Unbekanntes Icon: "${name}"`)
    }
    return null
  }

  // Größe bestimmen. fontSize kann eine Zahl (px) ODER ein CSS-String
  // wie 'clamp(...)', '2rem', '18px' sein.
  const rawFont = style?.fontSize
  let px: number = 20 // sinnvoller Default
  let cssSize: string | undefined // für CSS-Funktionen (clamp etc.)

  if (typeof size === 'number') {
    px = size
  } else if (typeof rawFont === 'number') {
    px = rawFont
  } else if (typeof rawFont === 'string') {
    const parsed = parseInt(rawFont, 10)
    if (!Number.isNaN(parsed) && /^\d/.test(rawFont.trim())) {
      // Sauberer Wert wie '18px' → als Zahl nutzen
      px = parsed
    } else {
      // CSS-Funktion wie 'clamp(...)' → per width/height im Style setzen
      cssSize = rawFont
    }
  }

  const col = color ?? (style?.color as string) ?? 'currentColor'

  // style ohne fontSize/color; bei CSS-Funktionen width/height ergänzen
  const { fontSize, color: _c, ...restStyle } = style || {}
  const finalStyle: React.CSSProperties = cssSize
    ? { ...restStyle, width: cssSize, height: cssSize }
    : restStyle

  return (
    <Cmp
      size={px}
      color={col}
      className={className}
      style={finalStyle}
      onClick={onClick}
      strokeWidth={2}
      {...(FILLED.has(name) ? { fill: col } : {})}
    />
  )
}

export default Icon
