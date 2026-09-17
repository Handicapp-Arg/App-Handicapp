import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, touch } from '../styles/tokens';

/**
 * Fila de selección nativa, patrón Ajustes de iOS: label a la izquierda,
 * valor elegido (o placeholder) + chevron a la derecha. Al tocarla se abre
 * la hoja de opciones que corresponda. Reemplaza a las burbujas/chips de
 * selección de los formularios.
 */
export function FilaSelector({
  label, valor, placeholder = 'Elegir', onPress, primera,
}: {
  label: string;
  valor?: string;
  placeholder?: string;
  onPress: () => void;
  /** La primera fila del grupo no dibuja línea superior. */
  primera?: boolean;
}) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable
      style={({ pressed }) => [s.row, !primera && s.borde, pressed && { backgroundColor: c.surfaceAlt }]}
      onPress={() => { haptic.selection(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valor ?? placeholder}`}
    >
      <Text style={s.label}>{label}</Text>
      <View style={s.valorWrap}>
        <Text style={[s.valor, !valor && s.placeholder]} numberOfLines={1}>
          {valor ?? placeholder}
        </Text>
        <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: touch.min + 6, gap: space[3],
  },
  borde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  label: { fontSize: text.md, color: c.text },
  valorWrap: { flexDirection: 'row', alignItems: 'center', gap: space[1], flexShrink: 1 },
  valor: { fontSize: text.md, color: c.textMuted, flexShrink: 1 },
  placeholder: { color: c.textFaint },
});
