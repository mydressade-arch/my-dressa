import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          'w-full px-4 py-3 text-sm bg-surface-container-lowest border text-on-surface outline-none transition-colors',
          'placeholder:text-on-surface-variant/50',
          error ? 'border-error' : 'border-outline-variant focus:border-primary',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
