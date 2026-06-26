/**
 * Íconos ecuestres de marca — portados del móvil (mobile/components/icons/equine)
 * para mantener el MISMO ecosistema visual en web y móvil.
 * Estilo línea con `currentColor`, combinan con lucide-react.
 */

type Props = { size?: number; className?: string; strokeWidth?: number };

/** Herradura + H — isotipo de HandicApp (marca). */
export function HorseshoeH({ size = 24, className, strokeWidth = 2 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.8 3.4 C4.4 5 3.2 7.8 3.2 11.5 C3.2 16.6 7.2 20.8 12 20.8 C16.8 20.8 20.8 16.6 20.8 11.5 C20.8 7.8 19.6 5 17.2 3.4" />
      <path d="M6.8 3.4 L8.7 4.2" />
      <path d="M17.2 3.4 L15.3 4.2" />
      <path d="M9.7 9.6 L9.7 15.2" />
      <path d="M14.3 9.6 L14.3 15.2" />
      <path d="M9.7 12.4 L14.3 12.4" />
    </svg>
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

/** Cabeza de caballo de perfil en línea — combina con lucide. */
export function HorseHeadLine({ size = 24, className, strokeWidth = 2 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 21 C6.5 17.5 6.8 15 8.6 13.2 C7.4 12.6 6.9 11.2 7.4 9.8 C6.3 9.7 5.4 8.7 5.6 7.4 L7.9 8.4 C8.2 6.3 9.9 4.8 12.2 5 L13 2.8 L14.6 5.4 C17.2 6 19 8.6 19 11.6 C19 14.4 17.4 16.4 16.4 17.8 C15.7 18.8 15.4 19.8 15.4 21" />
      <circle cx="16.7" cy="11.6" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
