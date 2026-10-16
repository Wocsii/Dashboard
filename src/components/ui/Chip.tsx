import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ChipTone = 'mint' | 'coral' | 'sun' | 'sky' | 'blush' | 'lilac' | 'neutral' | 'dark'

const tones: Record<ChipTone, string> = {
  mint: 'bg-mint-strong-accessible text-on-accent',
  coral: 'bg-coral-accessible text-on-accent',
  sun: 'bg-sun text-ink',
  sky: 'bg-sky text-ink-soft',
  blush: 'bg-blush text-ink-soft',
  lilac: 'bg-lilac text-ink-soft',
  neutral: 'bg-sky-50 text-ink-soft',
  dark: 'bg-ink text-on-solid',
}

export function Chip({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10.5px] font-semibold leading-none',
        tones[tone],
        className,
      )}
      {...rest}
    />
  )
}
