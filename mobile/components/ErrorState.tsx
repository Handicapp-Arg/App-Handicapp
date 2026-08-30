import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CloudOff, RotateCw, TriangleAlert } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { useSinConexion } from '../lib/network';
import { useTheme, type ThemeColors } from '../lib/theme';
import { text, space, radius, weight } from '../styles/tokens';

/**
 * Qué mostrar cuando una consulta falla.
 *
 * Distingue los dos casos que hoy se ven iguales: si no hay señal lo dice, y si
 * el problema es del servidor lo dice de otra forma. Antes ambos terminaban en
 * una pantalla vacía, indistinguible de "todavía no cargaste nada".
 */
export function ErrorState({
  onRetry,
  titulo,
  detalle,
}: {
  onRetry?: () => void;
  titulo?: string;
  detalle?: string;
}) {
  const { c } = useTheme();
  const sinConexion = useSinConexion();
  const s = useMemo(() => makeStyles(c), [c]);

  const Icono = sinConexion ? CloudOff : TriangleAlert;
  const encabezado = titulo ?? (sinConexion ? 'Sin conexión' : 'No pudimos cargar esto');
  const cuerpo = detalle ?? (sinConexion
    ? 'Revisá tu señal. Vamos a reintentar solos cuando vuelva.'
    : 'Puede ser algo temporal del servidor.');

  return (
    <View style={s.wrap}>
      <View style={s.circulo}>
        <Icono size={26} color={c.textFaint} strokeWidth={1.8} />
      </View>
      <Text style={s.titulo}>{encabezado}</Text>
      <Text style={s.detalle}>{cuerpo}</Text>

      {onRetry ? (
        <Pressable
          style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
          onPress={() => { haptic.light(); onRetry(); }}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
        >
          <RotateCw size={16} color={c.brand} strokeWidth={2.2} />
          <Text style={s.btnTexto}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[8], paddingVertical: space[12], gap: space[2] },
  circulo: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space[2],
  },
  titulo: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4, textAlign: 'center' },
  detalle: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    marginTop: space[4],
    paddingHorizontal: space[5], height: 48, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surfaceAlt,
  },
  btnPressed: { opacity: 0.75 },
  btnTexto: { fontSize: text.base, fontWeight: weight.bold, color: c.brand, letterSpacing: -0.2 },
});
