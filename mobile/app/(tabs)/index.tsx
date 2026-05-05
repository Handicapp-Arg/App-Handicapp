import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useDashboard } from '../../hooks/use-dashboard';
import { Spinner } from '../../components/Spinner';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { colors } from '../../lib/colors';
import type { Horse, Event } from '../../../packages/shared/src';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HorseRow({ horse }: { horse: Horse }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/(tabs)/caballos/${horse.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.horseAvatar}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={styles.horseImg} />
          : <Text style={styles.horseAvatarText}>{horse.name[0]}</Text>
        }
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{horse.name}</Text>
        {horse.establishment && (
          <Text style={styles.rowSub}>{horse.establishment.name}</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function EventRow({ event }: { event: Event }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  return (
    <View style={styles.eventRow}>
      <EventTypeBadge type={event.type} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{event.description}</Text>
        {event.horse && <Text style={styles.rowSub}>{event.horse.name}</Text>}
      </View>
      <Text style={styles.dateText}>{date}</Text>
    </View>
  );
}

export default function InicioScreen() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (isLoading) return <Spinner />;

  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Saludo */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.greetingSub}>
          {data?.role === 'admin' ? 'Panel de administración' : monthName}
        </Text>
      </View>

      {/* Admin */}
      {data?.role === 'admin' && data.stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Propietarios" value={data.stats.propietarios} />
          <StatCard label="Establecimientos" value={data.stats.establecimientos} />
          <StatCard label="Caballos" value={data.stats.caballos} />
        </View>
      )}

      {/* Propietario — gasto del mes */}
      {data?.role === 'propietario' && (
        <View style={styles.statsGrid}>
          <StatCard label="Mis caballos" value={data.horses?.length ?? 0} />
          <View style={[styles.statCard, { backgroundColor: colors.purple50 }]}>
            <Text style={[styles.statValue, { color: colors.purple700 }]}>
              ${(data.monthly_spend ?? 0).toLocaleString('es-AR')}
            </Text>
            <Text style={[styles.statLabel, { color: colors.purple700 }]}>Gasto del mes</Text>
          </View>
        </View>
      )}

      {/* Establecimiento */}
      {data?.role === 'establecimiento' && (
        <View style={styles.statsGrid}>
          <StatCard label="En pensión" value={data.horses?.length ?? 0} />
          <StatCard label="Eventos del mes" value={data.monthly_events_count ?? 0} />
        </View>
      )}

      {/* Caballos */}
      {data?.horses && data.horses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {data.role === 'establecimiento' ? 'Caballos en pensión' : 'Mis caballos'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/caballos')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {data.horses.slice(0, 5).map((h, i) => (
              <View key={h.id}>
                {i > 0 && <View style={styles.divider} />}
                <HorseRow horse={h} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actividad reciente */}
      {data?.recent_events && data.recent_events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actividad reciente</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/eventos')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {data.recent_events.map((ev, i) => (
              <View key={ev.id}>
                {i > 0 && <View style={styles.divider} />}
                <EventRow event={ev} />
              </View>
            ))}
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: 16, paddingBottom: 32, gap: 20 },
  greeting: { gap: 2 },
  greetingText: { fontSize: 22, fontWeight: '800', color: colors.gray900 },
  greetingSub: { fontSize: 14, color: colors.gray500 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.gray100,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.gray900 },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.gray500, marginTop: 2 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primary },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  horseAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.gray100, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  horseImg: { width: '100%', height: '100%' },
  horseAvatarText: { fontSize: 16, fontWeight: '700', color: colors.gray500 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  rowSub: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  chevron: { fontSize: 20, color: colors.gray300, fontWeight: '300' },
  dateText: { fontSize: 11, color: colors.gray400, minWidth: 40, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.gray100, marginHorizontal: 12 },
});
