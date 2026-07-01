import { View, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Text as SvgText, Rect, Circle, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { shadow } from '../styles/tokens';

/**
 * Logos de medios de pago como SVG (react-native-svg), en chips blancos
 * tipo "checkout real". Solo visual / sello de confianza — NUNCA captura
 * datos de tarjeta. Los datos los procesa MercadoPago.
 */

/* ─── Logos (colores oficiales) ─── */

/** Visa — wordmark azul #1434CB. */
export function VisaLogo({ h = 14 }: { h?: number }) {
  const w = h * 3.1;
  return (
    <Svg width={w} height={h} viewBox="0 0 62 20">
      <SvgText
        x="1" y="16" fontSize="18" fontWeight="700" fontStyle="italic"
        fill="#1434CB" fontFamily="Arial" letterSpacing="0.5"
      >
        VISA
      </SvgText>
    </Svg>
  );
}

/** Mastercard — dos círculos rojo #EB001B / ámbar #F79E1B. */
export function MastercardLogo({ h = 18 }: { h?: number }) {
  const w = h * (48 / 30);
  return (
    <Svg width={w} height={h} viewBox="0 0 48 30">
      <Circle cx="19" cy="15" r="11" fill="#EB001B" />
      <Circle cx="29" cy="15" r="11" fill="#F79E1B" fillOpacity={0.85} />
    </Svg>
  );
}

/** American Express — chip azul #006FCF con "AMEX". */
export function AmexLogo({ h = 20 }: { h?: number }) {
  const w = h * (40 / 28);
  return (
    <Svg width={w} height={h} viewBox="0 0 40 28">
      <Rect x="0" y="0" width="40" height="28" rx="4" fill="#006FCF" />
      <SvgText
        x="20" y="18.5" fontSize="10" fontWeight="700" fill="#ffffff"
        textAnchor="middle" fontFamily="Arial" letterSpacing="0.5"
      >
        AMEX
      </SvgText>
    </Svg>
  );
}

/** MercadoPago — chip celeste #00B1EA con handshake amarillo. */
export function MercadoPagoLogo({ h = 20 }: { h?: number }) {
  const w = h * (40 / 28);
  return (
    <Svg width={w} height={h} viewBox="0 0 40 28">
      <Rect x="0" y="0" width="40" height="28" rx="6" fill="#00B1EA" />
      {/* handshake amarillo simplificado */}
      <Ellipse cx="20" cy="15" rx="12" ry="6.5" fill="#FFE600" />
      <Path
        d="M11 15 q4.5 -5 9 0 q4.5 5 9 0"
        stroke="#00B1EA" strokeWidth="1.7" fill="none" strokeLinecap="round"
      />
    </Svg>
  );
}

/* ─── Fila de chips ─── */

export function PaymentMethods({
  size = 'md',
  style,
}: {
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const chipH = size === 'sm' ? 28 : 34;
  const logoH = size === 'sm' ? 12 : 15;

  const chip: ViewStyle = {
    height: chipH,
    minWidth: chipH * 1.55,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: c.isDark ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    ...shadow.sm,
  };

  return (
    <View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, style]}>
      <View style={chip}><VisaLogo h={logoH} /></View>
      <View style={chip}><MastercardLogo h={logoH + 3} /></View>
      <View style={chip}><AmexLogo h={logoH + 4} /></View>
      <View style={chip}><MercadoPagoLogo h={logoH + 4} /></View>
    </View>
  );
}

export default PaymentMethods;
