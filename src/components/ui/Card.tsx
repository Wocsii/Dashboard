import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'white' | 'ivory' | 'glass' | 'sun'

const tones: Record<Tone, string> = {
  white: 'bg-card shadow-soft',
  ivory: 'bg-ivory shadow-soft',
  glass: 'bg-glass backdrop-blur-xl shadow-pill',
  sun: 'bg-sun shadow-soft',
}

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone
  /** inclinación en grados para el efecto "papeles apilados" */
  tilt?: number
  padded?: boolean
  as?: 'div' | 'section' | 'article' | 'aside'
}

export function Card({ tone = 'white', tilt, padded = true, as: Tag = 'div', className, style, ...rest }: Props) {
  return (
    <Tag
      {...(rest as HTMLAttributes<HTMLElement>)}
      className={cn('rounded-card', tones[tone], padded && 'p-5', className)}
      style={tilt ? { rotate: `${tilt}deg`, ...style } : style}
    />
  )
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[15px] font-semibold tracking-tight text-ink', className)} {...rest} />
}
