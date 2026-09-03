import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The CAP mark — Casual Academic Portal.
 *
 * A mortarboard, because the system's initials name one. This is the product's
 * own mark, not Griffith's crest: the university's identity is carried by the
 * words beside it. Drawing an approximation of a real university crest would
 * look official while being wrong, which is worse than not drawing one.
 *
 * To use Griffith's approved logo instead, save it as
 * `public/griffith-logo.svg` and point `src` at it.
 */
export function Brand({ size = 48, className }: { size?: number; className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null

  return (
    <img
      src={`${import.meta.env.BASE_URL}cap-logo.svg`}
      alt="Casual Academic Portal"
      onError={() => setMissing(true)}
      className={cn('object-contain', className)}
      style={{ height: size, width: 'auto' }}
    />
  )
}
