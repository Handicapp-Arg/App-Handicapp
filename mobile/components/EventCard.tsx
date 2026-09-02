import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Camera } from 'lucide-react-native';
import { EventTypeBadge } from './EventTypeBadge';
import { TrainingMetricsPanel } from './TrainingMetricsPanel';
import { formatCurrency } from '../lib/currency';
import { fechaHumana } from '../lib/fechas';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, weight } from '../styles/tokens';
import { useCommonStyles } from '../styles/common';
import type { Event } from '../../packages/shared/src';

interface Props {
  event: Event;
  showHorse?: boolean;
  canEditMetrics?: boolean;
  onDelete?: (id: string) => void;
}

export function EventCard({ event, showHorse = true, canEditMetrics = false, onDelete }: Props) {
  const { c } = useTheme();
  const { card } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const date = fechaHumana(event.date);

  return (
    <View style={[card.padded, s.wrap]}>
      {/* Header: badge + horse name + fecha + borrar */}
      <View style={s.header}>
        <View style={s.left}>
          <EventTypeBadge type={event.type} />
          {showHorse && event.horse && (
            <Text style={s.horseName} numberOfLines={1}>{event.horse.name}</Text>
          )}
        </View>
        <View style={s.right}>
          <Text style={s.date}>{date}</Text>
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

      {/* Monto (solo gastos) */}
      {event.amount != null && (
        <Text style={s.amount}>
          {formatCurrency(event.amount, event.currency ?? 'ARS')}
        </Text>
      )}

      {/* Descripción */}
      <Text style={s.desc}>{event.description}</Text>

      {/* Fotos */}
      {event.photos && event.photos.length > 0 && (
        <View style={s.photoCountRow}>
          <Camera size={14} color={c.textFaint} strokeWidth={2} />
          <Text style={s.photoCount}>{event.photos.length} foto{event.photos.length > 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Métricas de entrenamiento */}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEditMetrics} />
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { gap: space[2], backgroundColor: c.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, flexWrap: 'wrap' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 0 },
  horseName: { fontSize: text.xs, color: c.textFaint, fontWeight: weight.medium },
  date: { fontSize: text.xs, color: c.textFaint },
  deleteBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  desc: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },
  photoCountRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  photoCount: { fontSize: text.xs, color: c.textFaint },
});
