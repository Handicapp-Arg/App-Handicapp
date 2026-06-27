/**
 * Íconos ecuestres de marca — portados del móvil (mobile/components/icons/equine)
 * para mantener el MISMO ecosistema visual en web y móvil.
 * Estilo línea con `currentColor`, combinan con lucide-react.
 */

type Props = { size?: number; className?: string; strokeWidth?: number };

/** Isotipo OFICIAL de la marca (cabeza + herradura + H), recortado del logo. */
const ISOTIPO_URL =
  'https://res.cloudinary.com/dh2m9ychv/image/upload/c_crop,g_north,w_0.80,h_0.62,y_0.06/v1762370534/logo-full-white_suu2qt.png';

/** Isotipo oficial de HandicApp. Se colorea con `currentColor` (cuero del tema). */
export function HorseshoeH({ size = 24, className }: Props) {
  return (
    <span
      role="img"
      aria-label="HandicApp"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url("${ISOTIPO_URL}")`,
        maskImage: `url("${ISOTIPO_URL}")`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}

/** Herradura — isotipo en línea (sin H). */
export function Horseshoe({ size = 24, className, strokeWidth = 2 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.8 3.4 C4.4 5 3.2 7.8 3.2 11.5 C3.2 16.6 7.2 20.8 12 20.8 C16.8 20.8 20.8 16.6 20.8 11.5 C20.8 7.8 19.6 5 17.2 3.4" />
      <path d="M6.8 3.4 L8.7 4.2" />
      <path d="M17.2 3.4 L15.3 4.2" />
      <circle cx="4.9" cy="9.2" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="6.0" cy="14.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="19.1" cy="9.2" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="18.0" cy="14.5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
