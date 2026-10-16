import { themeConfig } from '@/config/theme.config'
import { useAppearance } from '@/features/appearance/AppearanceProvider'
/** Keep the mascot's original colors; only its nightcap changes with the theme. */
export function Mascot({ variant = 'avatar', className }: { variant?: 'avatar' | 'hero'; className?: string }) {
  const { night } = useAppearance()
  const src = night ? (variant === 'avatar' ? themeConfig.assets.avatarNight : themeConfig.assets.heroNight) : themeConfig.assets[variant]
  return <img src={src} alt="" className={className} />
}
