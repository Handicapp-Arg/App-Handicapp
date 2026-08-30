import { Image, type ImageProps, type ImageContentFit } from 'expo-image';
import { type StyleProp, type ImageStyle } from 'react-native';

/**
 * Imagen estándar de la app.
 *
 * Envuelve `expo-image` en lugar del `<Image>` de React Native para tres cosas
 * que el de RN no hace: cachea en disco (las fotos de los caballos no se vuelven
 * a bajar al volver a una lista), aparece con un fundido en vez de un salto, y
 * mientras carga muestra un fondo neutro en lugar de un hueco blanco.
 */
export function AppImage({
  source,
  style,
  contentFit = 'cover',
  transition = 220,
  ...rest
}: {
  source: ImageProps['source'];
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
} & Omit<ImageProps, 'source' | 'style' | 'contentFit' | 'transition'>) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={typeof source === 'object' && source && 'uri' in source ? source.uri : undefined}
      {...rest}
    />
  );
}
