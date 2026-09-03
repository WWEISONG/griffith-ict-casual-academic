import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn, initials, avatarColor } from '@/lib/utils'

// --- Button -----------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-griffith-700 text-white hover:bg-griffith-800 active:bg-griffith-900 disabled:bg-griffith-300',
  secondary: 'border border-ink-300 bg-white text-ink-800 hover:bg-ink-50 active:bg-ink-100 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  subtle: 'bg-ink-100 text-ink-800 hover:bg-ink-200 disabled:text-ink-400',
}
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant], SIZES[size], className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  )
})

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

// --- Inputs -------------------------------------------------------------------
interface FieldProps { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; htmlFor?: string }

export function Field({ label, hint, error, required, children, htmlFor }: FieldProps) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-griffith-700" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-red-700">{error}</p>
             : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

const CONTROL =
  'w-full rounded-lg border border-ink-300 bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors hover:border-ink-400 focus:border-griffith-600 focus:outline-none focus:ring-2 focus:ring-griffith-600/20 ' +
  'disabled:bg-ink-100 disabled:text-ink-500 aria-[invalid=true]:border-red-500'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-11', className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(CONTROL, 'min-h-[9rem] py-3 leading-relaxed', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(CONTROL, 'h-11 appearance-none bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat pr-9',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23657493'%3E%3Cpath fill-rule='evenodd' d='M5.2 7.5L10 12.3l4.8-4.8' clip-rule='evenodd' stroke='%23657493' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")]",
        className)} {...rest}>
        {children}
      </select>
    )
  },
)

export function Checkbox({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-griffith-700 focus:ring-griffith-600"
        {...rest}
      />
      <span className="text-sm text-ink-800">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
    </label>
  )
}

// --- Badge ---------------------------------------------------------------------
type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  brand: 'bg-griffith-50 text-griffith-800 ring-griffith-200',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
      {children}
    </span>
  )
}

// --- Card ------------------------------------------------------------------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>
}

export function CardHeader({ title, description, action, className }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// --- Avatar --------------------------------------------------------------------------
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

// --- Empty / loading / error states -----------------------------------------------------
export function EmptyState({ title, description, action, icon }: {
  title: string; description?: string; action?: ReactNode; icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-6 py-14 text-sm text-ink-500">
      <Spinner className="h-4 w-4" /> {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-semibold text-red-800">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-ink-600">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

// --- Modal ---------------------------------------------------------------------------------
export function Modal({ open, onClose, title, description, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; description?: string
  children: ReactNode; footer?: ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
         role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cn(
        'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift animate-slide-up sm:rounded-2xl',
        wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
      )}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
                  className="-mr-1 -mt-1 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

// --- Stat tile ---------------------------------------------------------------------------------
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums',
        tone === 'brand' ? 'text-griffith-800' : 'text-ink-900')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
    </div>
  )
}

// --- Progress ------------------------------------------------------------------------------------
export function Meter({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'neutral' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200" role="presentation">
      <div className={cn('h-full rounded-full transition-all', tone === 'brand' ? 'bg-griffith-600' : 'bg-ink-500')}
           style={{ width: `${pct}%` }} />
    </div>
  )
}
