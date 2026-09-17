import { useMemo, type ComponentType } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { haptic } from '../lib/haptics';
import { useTheme, type ThemeColors } from '../lib/theme';
import { BottomSheet } from './BottomSheet';

export type Accion = {
  label: string;
  /** Ícono de lucide-react-native. */
  Icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: () => void;
  /** Acciones peligrosas (eliminar, rechazar) en rojo. */
  destructiva?: boolean;
  disabled?: boolean;
};

/**
 * Menú de acciones sobre un elemento. Reemplaza los menús flotantes que había
 * repetidos en cada pantalla: acá se comportan todos igual y aparecen donde el
 * pulgar llega, como en cualquier app nativa.
 */
export function ActionSheet({
  visible,
  onClose,
  acciones,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  acciones: Accion[];
  title?: string;
}) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={s.lista}>
        {acciones.map((a, i) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [
              s.item,
              i > 0 && s.itemBorde,
              pressed && s.itemPressed,
              a.disabled && s.itemDisabled,
            ]}
            disabled={a.disabled}
            // La acción corre recién cuando la hoja terminó de cerrarse: en iOS,
            // abrir un Alert u otro Modal mientras éste se desmonta lo descarta.
            onPress={() => { haptic.selection(); onClose(); setTimeout(a.onPress, 260); }}
          >
            {a.Icon ? (
              <a.Icon size={20} color={a.destructiva ? c.danger : c.textMuted} strokeWidth={1.8} />
            ) : null}
            <Text style={[s.itemText, a.destructiva && s.itemTextDanger]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // Filas planas directo sobre la hoja, separadas por lineas finas: la lista
  // no es una tarjeta dentro de la hoja, es la hoja misma (patron iOS actual).
  lista: { paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 15 },
  itemBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  itemPressed: { backgroundColor: c.surfaceAlt },
  itemDisabled: { opacity: 0.4 },
  itemText: { fontSize: 17, color: c.text, fontWeight: '400', letterSpacing: -0.2 },
  itemTextDanger: { color: c.danger },
});
