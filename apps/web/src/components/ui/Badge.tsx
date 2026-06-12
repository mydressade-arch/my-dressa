import { clsx } from 'clsx'

interface BadgeProps {
  variant?: 'available' | 'rented' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
  children: React.ReactNode
  className?: string
}

const styles: Record<string, string> = {
  available:  'bg-emerald-deep text-white',
  rented:     'bg-surface-container-highest text-on-surface-variant',
  pending:    'bg-tertiary-fixed text-on-tertiary-container',
  paid:       'bg-emerald-deep/10 text-emerald-deep',
  shipped:    'bg-blue-50 text-blue-700',
  delivered:  'bg-green-50 text-green-700',
  returned:   'bg-surface-container-high text-secondary',
  cancelled:  'bg-error-container text-error',
}

export function Badge({ variant = 'pending', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-block text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1', styles[variant], className)}>
      {children}
    </span>
  )
}
