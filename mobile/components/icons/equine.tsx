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

/** Cabeza de caballo de perfil en CONTORNO (mirando a la izquierda) — line art. */
export function HorseHeadOutline({ size = 24, color = '#000', strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {/* contorno: hocico izq → caña → frente → oreja → nuca → cuello → quijada */}
      <Path d="M4.3 14.4
        C3.7 13.6 3.9 12.4 4.8 11.9
        L6.2 11.2
        C6.4 9.4 7.4 7.9 9 7.3
        L9.7 4.2
        C9.9 3.4 10.9 3.3 11.3 4
        L12.6 6.2
        C15.5 6.6 17.7 9 18 12
        C18.2 14.4 17.4 16.5 16.2 18.1
        C15.6 19 15.3 19.9 15.3 21
        L11.2 21
        C11.2 18.4 10.8 16.7 9.7 15.3
        C8 15 5.9 14.9 4.3 14.4 Z" />
      {/* oreja interior */}
      <Path d="M10.2 5.6 L11.4 6" />
      {/* ojo */}
      <Circle cx="12" cy="9.6" r="0.75" fill={color} stroke="none" />
    </Svg>
  );
}
