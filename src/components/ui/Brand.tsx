import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Griffith University mark.
 *
 * Drop the official asset at `public/griffith-logo.svg` (or .png) and it is
 * used everywhere automatically. Until then this falls back to a neutral
 * wordmark rather than an invented crest — an approximated university logo is
 * worse than none.
 *
 * Get the approved asset from Griffith's brand resources; staff have access.
 */
export function Brand({ size = 48, className }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = `${import.meta.env.BASE_URL}griffith-logo.svg`

  if (failed) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-griffith-700 px-3 font-semibold tracking-tight text-white',
          className,
        )}
        style={{ height: size, fontSize: size * 0.3 }}
      >
        Griffith
      </span>
    )
  }

  return (
    <img
      src={src}
      alt="Griffith University"
      onError={() => setFailed(true)}
      className={cn('object-contain', className)}
      style={{ height: size, width: 'auto' }}
    />
  )
}
