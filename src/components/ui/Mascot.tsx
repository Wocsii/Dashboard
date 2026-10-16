import { themeConfig } from '@/config/theme.config'
import { useAppearance } from '@/features/appearance/AppearanceProvider'
/** Keep the mascot's original colors; only its nightcap changes with the theme. */
export function Mascot({ variant = 'avatar', className }: { variant?: 'avatar' | 'hero' | 'greeting'; className?: string }) {
  const { night } = useAppearance()
  const src = night ? themeConfig.assets[`${variant}Night`] : themeConfig.assets[variant]
  return <img src={src} alt="" className={className} />
}
