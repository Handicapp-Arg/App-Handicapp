import Svg, { Path, Circle } from 'react-native-svg';
import { Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Horse } from 'phosphor-react-native';

type Props = { size?: number; color?: string; strokeWidth?: number };

/** Caballo completo en línea (Phosphor) — reconocible y coherente con Lucide. */
export function HorseIcon({ size = 24, color = '#000' }: Props) {
  return <Horse size={size} color={color} weight="regular" />;
}

const ISOTIPO_URL = 'https://res.cloudinary.com/dh2m9ychv/image/upload/c_crop,g_north,w_0.80,h_0.56,y_0.13/v1762370534/logo-full-white_suu2qt.png';

/** Isotipo real de la marca (herradura + H), recoloreado con el color del contexto. */
export function BrandIsotipo({ size = 24, color = '#000' }: Props) {
  return <Image source={{ uri: ISOTIPO_URL }} style={{ width: size + 2, height: size + 2, tintColor: color }} resizeMode="contain" />;
}

/** Herradura — el isotipo de la marca, estilo línea (combina con Lucide). */
export function Horseshoe({ size = 24, color = '#000', strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* arco en U (abertura arriba) */}
      <Path d="M6.8 3.4 C4.4 5 3.2 7.8 3.2 11.5 C3.2 16.6 7.2 20.8 12 20.8 C16.8 20.8 20.8 16.6 20.8 11.5 C20.8 7.8 19.6 5 17.2 3.4" />
      {/* talones */}
      <Path d="M6.8 3.4 L8.7 4.2" />
      <Path d="M17.2 3.4 L15.3 4.2" />
      {/* clavos */}
      <Circle cx="4.9" cy="9.2" r="0.7" fill={color} stroke="none" />
      <Circle cx="6.0" cy="14.5" r="0.7" fill={color} stroke="none" />
      <Circle cx="19.1" cy="9.2" r="0.7" fill={color} stroke="none" />
      <Circle cx="18.0" cy="14.5" r="0.7" fill={color} stroke="none" />
    </Svg>
  );
}

/** Isotipo OFICIAL de la marca (cabeza + herradura + H), recortado del logo. */
const ISOTIPO_H_URL = 'https://res.cloudinary.com/dh2m9ychv/image/upload/c_crop,g_north,w_0.80,h_0.62,y_0.06/v1762370534/logo-full-white_suu2qt.png';

/** Isotipo oficial de HandicApp, recoloreado con el color del contexto (cuero del tema). */
export function HorseshoeH({ size = 24, color = '#000' }: Props) {
  return <Image source={{ uri: ISOTIPO_H_URL }} style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
}

/** Cabeza de caballo de perfil (FontAwesome sólido) — seria pero rellena. */
export function HorseHeadIcon({ size = 24, color = '#000' }: Props) {
  return <FontAwesome5 name="horse-head" size={size} color={color} />;
}

/** Path del horse-head de FontAwesome (viewBox 512) — renderizado en contorno. */
const HORSE_HEAD_PATH = 'M0 464L0 316.9C0 208.5 68.3 111.8 170.5 75.6L340.2 15.5c21.4-7.6 43.8 8.3 43.8 30.9 0 11-5.5 21.2-14.6 27.3L336 96c48.1 0 91.2 29.8 108.1 74.9l48.6 129.5c11.8 31.4 4.1 66.8-19.6 90.5-16 16-37.8 25.1-60.5 25.1l-3.4 0c-26.1 0-50.9-11.6-67.6-31.7l-32.3-38.7c-11.7 4.1-24.2 6.4-37.3 6.4l-.1 0c-6.3 0-12.5-.5-18.6-1.5-3.6-.6-7.2-1.4-10.7-2.3l0 0c-28.9-7.8-53.1-26.8-67.8-52.2-4.4-7.7-14.2-10.3-21.9-5.8s-10.3 14.2-5.8 21.9c24 41.5 68.3 70 119.3 71.9l47.2 70.8c4 6.1 6.2 13.2 6.2 20.4 0 20.3-16.5 36.8-36.8 36.8L48 512c-26.5 0-48-21.5-48-48zM328 224a24 24 0 1 0 0-48 24 24 0 1 0 0 48z';

/** Cabeza de caballo de FontAwesome renderizada en CONTORNO (mismo diseño, vacío). */
export function HorseHeadOutline({ size = 24, color = '#000', strokeWidth = 26 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
      <Path d={HORSE_HEAD_PATH} />
    </Svg>
  );
}
