import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'dark' | 'light' | 'ghost' | 'danger' | 'sun'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  dark: 'bg-ink text-white hover:bg-ink-soft shadow-pill',
  light: 'bg-card text-ink hover:bg-sky-50 shadow-pill',
  ghost: 'bg-transparent text-ink-soft hover:bg-white/60',
  danger: 'bg-transparent text-coral hover:bg-blush/60',
  sun: 'bg-sun text-ink hover:brightness-95 shadow-pill',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'dark', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-colors disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  )
})

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant; size?: 'sm' | 'md' | 'lg' }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  const dims = { sm: 'size-7', md: 'size-9', lg: 'size-11' }[size]
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
        variants[variant],
        dims,
        className,
      )}
      {...rest}
    />
  )
})
