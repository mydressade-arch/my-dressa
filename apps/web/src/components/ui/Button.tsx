import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'rent' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-sans font-semibold uppercase tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
    const variants = {
      primary: 'bg-status-sale text-white hover:opacity-90',
      rent:    'bg-status-rent text-white hover:opacity-90',
      ghost:   'bg-transparent border border-status-sale text-status-sale hover:bg-status-sale hover:text-white',
      danger:  'bg-error text-white hover:opacity-90',
    }
    const sizes = {
      sm: 'text-[12px] px-5 py-2.5 tracking-wider',
      md: 'text-btn px-8 py-3.5',
      lg: 'text-btn px-12 py-4',
    }
    return (
      <button ref={ref} disabled={disabled || loading} className={clsx(base, variants[variant], sizes[size], className)} {...props}>
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
