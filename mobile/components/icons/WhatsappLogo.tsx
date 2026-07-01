import Svg, { Path } from 'react-native-svg';

type Props = { size?: number };

/**
 * Logo OFICIAL de WhatsApp: globo de chat verde (#25D366) con el auricular
 * blanco. Reconocible como la marca real (no un ícono genérico de chat).
 * Solo visual — se usa donde se nombra la feature de WhatsApp.
 */
export function WhatsappLogo({ size = 18 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Globo de chat verde con la colita inferior izquierda */}
      <Path
        fill="#25D366"
        d="M16 3C8.82 3 3 8.82 3 16c0 2.3.61 4.47 1.68 6.35L3 29l6.83-1.66A12.9 12.9 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3z"
      />
      {/* Auricular blanco */}
      <Path
        fill="#fff"
        d="M22.9 19.32c-.38-.19-2.24-1.1-2.58-1.23-.35-.13-.6-.19-.85.19-.25.38-.98 1.23-1.2 1.48-.22.25-.44.28-.82.09-.38-.19-1.6-.59-3.05-1.88-1.13-1-1.89-2.25-2.11-2.63-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.09-.19-.85-2.05-1.16-2.8-.31-.74-.62-.64-.85-.65l-.72-.01c-.25 0-.66.09-1 .47-.35.38-1.32 1.29-1.32 3.15 0 1.85 1.35 3.65 1.54 3.9.19.25 2.66 4.06 6.44 5.69.9.39 1.6.62 2.15.79.9.29 1.72.25 2.37.15.72-.11 2.24-.92 2.55-1.8.32-.88.32-1.64.22-1.8-.09-.16-.34-.25-.72-.44z"
      />
    </Svg>
  );
}

export default WhatsappLogo;
