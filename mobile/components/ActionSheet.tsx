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
              <a.Icon size={19} color={a.destructiva ? c.danger : c.text} strokeWidth={2} />
            ) : null}
            <Text style={[s.itemText, a.destructiva && s.itemTextDanger]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={({ pressed }) => [s.cancelar, pressed && s.itemPressed]} onPress={onClose}>
        <Text style={s.cancelarText}>Cancelar</Text>
      </Pressable>
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  lista: {
    backgroundColor: c.surfaceAlt, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: c.border,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  itemBorde: { borderTopWidth: 1, borderTopColor: c.border },
  itemPressed: { backgroundColor: c.border },
  itemDisabled: { opacity: 0.4 },
  itemText: { fontSize: 16, color: c.text, fontWeight: '500', letterSpacing: -0.2 },
  itemTextDanger: { color: c.danger },

  cancelar: {
    marginTop: 4, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border,
  },
  cancelarText: { fontSize: 16, fontWeight: '700', color: c.textMuted, letterSpacing: -0.2 },
});
