import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Griffith University mark.
 *
 * Renders `public/griffith-logo.svg` when that file exists. When it does not,
 * this renders NOTHING and the surrounding text carries the identity.
 *
 * That is deliberate. Earlier versions drew a red tile — first a "G", then the
 * word "Griffith" — which read as a logo without being one. A stand-in that
 * imitates a university's brand is worse than no logo: it looks official, and
 * it is wrong. Griffith's website blocks automated requests, so the real asset
 * has to come from Griffith's brand resources, which staff can access.
 *
 * To add it: save the approved file as `public/griffith-logo.svg`. Nothing
 * else needs to change.
 */
export function Brand({ size = 48, className }: { size?: number; className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null

  return (
    <img
      src={`${import.meta.env.BASE_URL}griffith-logo.svg`}
      alt="Griffith University"
      onError={() => setMissing(true)}
      className={cn('object-contain', className)}
      style={{ height: size, width: 'auto' }}
    />
  )
}
