import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EventTypeBadge } from './EventTypeBadge';
import { TrainingMetricsPanel } from './TrainingMetricsPanel';
import { formatCurrency } from '../lib/currency';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';
import { card } from '../styles/common';
import type { Event } from '../../packages/shared/src';

interface Props {
  event: Event;
  showHorse?: boolean;
  canEditMetrics?: boolean;
  onDelete?: (id: string) => void;
}

export function EventCard({ event, showHorse = true, canEditMetrics = false, onDelete }: Props) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={[card.padded, styles.wrap]}>
      {/* Header: badge + horse name + fecha + borrar */}
      <View style={styles.header}>
        <View style={styles.left}>
          <EventTypeBadge type={event.type} />
          {showHorse && event.horse && (
            <Text style={styles.horseName} numberOfLines={1}>{event.horse.name}</Text>
          )}
        </View>
        <View style={styles.right}>
          <Text style={styles.date}>{date}</Text>
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(event.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Monto (solo gastos) */}
      {event.amount != null && (
        <Text style={styles.amount}>
          {formatCurrency(event.amount, event.currency ?? 'ARS')}
        </Text>
      )}

      {/* Descripción */}
      <Text style={styles.desc}>{event.description}</Text>

      {/* Fotos */}
      {event.photos && event.photos.length > 0 && (
        <Text style={styles.photoCount}>📷 {event.photos.length} foto{event.photos.length > 1 ? 's' : ''}</Text>
      )}

      {/* Métricas de entrenamiento */}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEditMetrics} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1, flexWrap: 'wrap' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 0 },
  horseName: { fontSize: text.xs, color: colors.gray400, fontWeight: weight.medium },
  date: { fontSize: text.xs, color: colors.gray400 },
  deleteBtn: { padding: 2 },
  deleteBtnText: { fontSize: 13, color: colors.gray300 },
  amount: { fontSize: text.sm, fontWeight: weight.bold, color: colors.brand },
  desc: { fontSize: text.sm, color: colors.gray700, lineHeight: 20 },
  photoCount: { fontSize: text.xs, color: colors.gray400 },
});
