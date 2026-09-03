import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Camera } from 'lucide-react-native';
import { EventTypeBadge } from './EventTypeBadge';
import { TrainingMetricsPanel } from './TrainingMetricsPanel';
import { formatCurrency } from '../lib/currency';
import { fechaHumana } from '../lib/fechas';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, weight } from '../styles/tokens';
import type { Event } from '../../packages/shared/src';

interface Props {
  event: Event;
  showHorse?: boolean;
  canEditMetrics?: boolean;
  onDelete?: (id: string) => void;
}

/**
 * Fila de un feed de actividad: sin superficie propia, vive directo sobre el
 * fondo de la pantalla que la contiene. Fecha + tipo arriba, descripción como
 * contenido principal, monto y borrar a la derecha.
 */
export function EventCard({ event, showHorse = true, canEditMetrics = false, onDelete }: Props) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const date = fechaHumana(event.date);

  return (
    <View style={s.row}>
      <View style={s.main}>
        <View style={s.topLine}>
          <View style={s.topLeft}>
            <EventTypeBadge type={event.type} />
            {showHorse && event.horse && (
              <Text style={s.horseName} numberOfLines={1}>{event.horse.name}</Text>
            )}
          </View>
          <Text style={s.date}>{date}</Text>
        </View>

        <Text style={s.desc} numberOfLines={3}>{event.description}</Text>

        {event.photos && event.photos.length > 0 && (
          <View style={s.photoCountRow}>
            <Camera size={13} color={c.textFaint} strokeWidth={2} />
            <Text style={s.photoCount}>{event.photos.length} foto{event.photos.length > 1 ? 's' : ''}</Text>
          </View>
        )}

        {event.type === 'entrenamiento' && (
          <TrainingMetricsPanel eventId={event.id} canEdit={canEditMetrics} />
        )}
      </View>

      <View style={s.side}>
        {event.amount != null && (
          <Text style={s.amount}>{formatCurrency(event.amount, event.currency ?? 'ARS')}</Text>
        )}
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(event.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Eliminar evento"
          >
            <X size={16} color={c.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], paddingVertical: space[3] },
  main: { flex: 1, gap: space[1] + 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, flexWrap: 'wrap' },
  horseName: { fontSize: text.xs, color: c.textFaint, fontWeight: weight.medium },
  date: { fontSize: text.xs, color: c.textFaint, flexShrink: 0 },
  desc: { fontSize: text.md, color: c.text, lineHeight: 22 },
  photoCountRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  photoCount: { fontSize: text.xs, color: c.textFaint },
  side: { alignItems: 'flex-end', gap: space[2] },
  amount: { fontSize: text.sm, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  deleteBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
