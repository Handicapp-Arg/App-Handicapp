/**
 * Logo OFICIAL de WhatsApp (dos tonos): globo verde de marca (#25D366) con el
 * teléfono blanco dentro. NO es el `MessageCircle` genérico de lucide — es la
 * forma reconocible de la marca. Se usa donde se nombra la feature "WhatsApp".
 */

type Props = { size?: number; className?: string };

/** Verde oficial de marca WhatsApp. */
export const WHATSAPP_GREEN = '#25D366';

export function WhatsApp({ size = 18, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="WhatsApp"
    >
      {/* Globo de la marca (verde, con la colita inferior izquierda) */}
      <path
        fill={WHATSAPP_GREEN}
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.33-1.4a9.9 9.9 0 0 0 4.7 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z"
      />
      {/* Teléfono (blanco) */}
      <path
        fill="#FFFFFF"
        d="M17.5 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.21-.24-.57-.49-.5-.67-.5l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48 0 1.46 1.07 2.88 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.69.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35Z"
      />
    </svg>
  );
}
