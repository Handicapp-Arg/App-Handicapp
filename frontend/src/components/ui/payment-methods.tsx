'use client';

import { cn } from '@/lib/cn';

/**
 * Logos de medios de pago dibujados como SVG inline sobre "chips" tipo tarjeta.
 * Los chips van sobre fondo blanco con borde sutil → se ven bien en claro y oscuro.
 * NO capturan datos de tarjeta: son un sello de confianza / checkout visual.
 */

/** Chip contenedor (~40x26, aspecto tarjeta). */
function Chip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      aria-label={title}
      role="img"
      className="inline-flex h-[26px] w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-300"
    >
      {children}
    </span>
  );
}

function VisaLogo() {
  return (
    <svg viewBox="0 0 40 26" className="h-full w-full">
      <text
        x="20"
        y="17.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="700"
        fontStyle="italic"
        letterSpacing="0.4"
        fill="#1434CB"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 40 26" className="h-full w-full">
      <defs>
        <clipPath id="mc-lens">
          <circle cx="16.5" cy="13" r="7.6" />
        </clipPath>
      </defs>
      <circle cx="16.5" cy="13" r="7.6" fill="#EB001B" />
      <circle cx="23.5" cy="13" r="7.6" fill="#F79E1B" />
      {/* intersección más oscura */}
      <g clipPath="url(#mc-lens)">
        <circle cx="23.5" cy="13" r="7.6" fill="#FF5F00" />
      </g>
    </svg>
  );
}

function AmexLogo() {
  return (
    <svg viewBox="0 0 40 26" className="h-full w-full">
      <rect width="40" height="26" fill="#006FCF" />
      <text
        x="20"
        y="16.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8"
        fontWeight="800"
        letterSpacing="0.3"
        fill="#ffffff"
      >
        AMEX
      </text>
    </svg>
  );
}

function MercadoPagoLogo() {
  return (
    <svg viewBox="0 0 40 26" className="h-full w-full">
      <rect width="40" height="26" fill="#00B1EA" />
      {/* handshake amarillo simplificado */}
      <path
        d="M11 15.5c2.2-2.6 5-2.6 7.2-0.9 0.7 0.5 1.4 0.5 2 0l0.6-0.5c1.9-1.6 4.5-1.5 6.6 0.5-1.5 2.3-4 3.3-6.3 2.4-0.6-0.2-1.1-0.2-1.7 0.1-2 1-4.4 0.6-6.4-1.1Z"
        fill="#FFE600"
      />
      <text
        x="20"
        y="9"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="5"
        fontWeight="800"
        letterSpacing="0.5"
        fill="#ffffff"
      >
        MP
      </text>
    </svg>
  );
}

const METHODS = [
  { key: 'visa', title: 'Visa', Logo: VisaLogo },
  { key: 'mastercard', title: 'Mastercard', Logo: MastercardLogo },
  { key: 'amex', title: 'American Express', Logo: AmexLogo },
  { key: 'mercadopago', title: 'MercadoPago', Logo: MercadoPagoLogo },
] as const;

/** Fila con los logos de los medios de pago aceptados. */
export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {METHODS.map(({ key, title, Logo }) => (
        <Chip key={key} title={title}>
          <Logo />
        </Chip>
      ))}
    </div>
  );
}

export default PaymentMethods;
