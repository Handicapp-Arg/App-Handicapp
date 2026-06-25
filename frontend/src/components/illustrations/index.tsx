/**
 * Ilustraciones SVG propias — minimalistas, monocromáticas, escaladas a 1em.
 * Acompañan empty states, onboarding y hero blocks. Usan las CSS variables
 * de marca para soportar light/dark sin re-trabajar el SVG.
 */
import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

type Props = SVGProps<SVGSVGElement> & { className?: string };

const baseCls = 'h-32 w-32 text-navy-700';

/** Caballo abstracto con un círculo dorado al lomo (sutil) */
export function HorseIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn(baseCls, className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.2" strokeDasharray="3 5" />
      {/* Caballo silueta */}
      <path
        d="M58 132c0-8 4-16 12-22l8-6 4-12-8-4 2-10 12-2 6 4 10-12 16-2 14 8 12 16-2 16-6 10v18h-8v-18l-14 4-2 14h-8l-2-14-12 2-4 10h-10v-12h-6c-8 0-16 4-22 12z"
        fill="currentColor"
        opacity="0.92"
      />
      {/* Ojo */}
      <circle cx="138" cy="78" r="2.2" fill="#fff" />
      {/* Crin */}
      <path d="M124 64c-2-4-4-6-6-8 4 0 8 2 10 6z" fill="var(--color-gold-500)" opacity="0.85" />
    </svg>
  );
}

/** Calendario con check — eventos */
export function EventsIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn(baseCls, className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <rect x="50" y="56" width="100" height="98" rx="12" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.04" />
      <rect x="50" y="56" width="100" height="22" rx="12" fill="currentColor" />
      <line x1="76" y1="44" x2="76" y2="68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="124" y1="44" x2="124" y2="68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M76 116l16 16 28-30" stroke="var(--color-gold-500)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="76" cy="100" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="100" cy="100" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="124" cy="100" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Edificio — organización, establecimiento */
export function OrganizationIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn(baseCls, className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <path d="M58 156V72l42-22v36l40-14v84z" fill="currentColor" opacity="0.92" />
      <rect x="72" y="90"  width="8" height="10" fill="#fff" />
      <rect x="72" y="108" width="8" height="10" fill="#fff" />
      <rect x="72" y="126" width="8" height="10" fill="#fff" />
      <rect x="110" y="106" width="8" height="10" fill="#fff" />
      <rect x="110" y="124" width="8" height="10" fill="#fff" />
      <rect x="126" y="106" width="8" height="10" fill="#fff" />
      <rect x="126" y="124" width="8" height="10" fill="#fff" />
      <circle cx="100" cy="46" r="6" fill="var(--color-gold-500)" />
      <line x1="100" y1="52" x2="100" y2="68" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/** Sobre — invitaciones, notificaciones */
export function InboxIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn(baseCls, className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <rect x="42" y="68" width="116" height="80" rx="12" fill="currentColor" opacity="0.92" />
      <path d="M42 80l58 38 58-38" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" fill="none" />
      <circle cx="155" cy="62" r="14" fill="var(--color-gold-500)" />
      <text x="155" y="68" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fontWeight="700" fill="#9d6c35">!</text>
    </svg>
  );
}

/** Documento con check — contratos */
export function ContractIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn(baseCls, className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <path d="M68 42h48l28 28v94c0 4-4 8-8 8H68c-4 0-8-4-8-8V50c0-4 4-8 8-8z" fill="currentColor" opacity="0.92" />
      <path d="M116 42v22c0 4 4 8 8 8h20" stroke="#fff" strokeWidth="2.5" />
      <line x1="78" y1="100" x2="130" y2="100" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <line x1="78" y1="116" x2="120" y2="116" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M80 140l12 12 22-22" stroke="var(--color-gold-500)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hero combo — welcome */
export function WelcomeIllustration({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn('h-40 w-40 text-navy-700', className)} aria-hidden {...rest}>
      <circle cx="100" cy="100" r="92" fill="currentColor" opacity="0.08" />
      <circle cx="100" cy="100" r="72" fill="currentColor" opacity="0.12" />
      <circle cx="100" cy="100" r="52" fill="currentColor" />
      <path
        d="M76 112l16 16 32-36"
        stroke="var(--color-gold-500)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="160" cy="48" r="6" fill="var(--color-gold-500)" />
      <circle cx="40"  cy="160" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="166" cy="148" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
