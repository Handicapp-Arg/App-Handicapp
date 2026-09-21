import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ScrollView, Alert, Pressable,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Check, X, Clock, List, CalendarDays, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgenda, useCompleteAppointment, useDeleteAppointment, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { MonthCalendar } from '../../../components/MonthCalendar';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { EventRowSkeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { hora, diaLargo } from '../../../lib/fechas';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';
import { ActionSheet } from '../../../components/ActionSheet';
import { SwipeableRow } from '../../../components/SwipeableRow';

function AppointmentRow({
  appt,
  onComplete,
  onDelete,
  isLast,
  c,
  s,
}: {
  appt: ReturnType<typeof useAgenda>['data'] extends (infer T)[] | undefined ? T : never;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!appt) return null;
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const timeStr = hora(appt.scheduled_at);

  return (
    <SwipeableRow
      acciones={[
        ...(appt.completed ? [] : [{
          label: 'Completar',
          Icon: Check,
          color: c.success,
          onPress: () => onComplete(appt.id),
          accessibilityLabel: 'Marcar turno como completado',
        }]),
        {
          label: 'Eliminar',
          Icon: Trash2,
          color: c.danger,
          onPress: () => onDelete(appt.id),
          accessibilityLabel: 'Eliminar turno',
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [s.apptRow, !isLast && s.apptRowDivider, appt.completed && { opacity: 0.5 }, pressed && { backgroundColor: c.surfaceAlt }]}
        onPress={() => { haptic.selection(); setMenuOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`Turno ${appt.title}`}
      >
        <Text style={s.apptTime}>{timeStr}</Text>
        <View style={[s.typeDot, { backgroundColor: meta.color }]} />
        <View style={s.apptBody}>
          <Text style={s.apptTitle} numberOfLines={1}>{appt.title}</Text>
          <Text style={s.apptMeta} numberOfLines={1}>
            {appt.horse ? `${appt.horse.name} · ` : ''}{meta.label}{appt.completed ? ' · Completado' : ''}
          </Text>
        </View>
        <ActionSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          acciones={[
            ...(appt.completed ? [] : [{
              label: 'Marcar como completado',
              Icon: Check,
              onPress: () => onComplete(appt.id),
            }]),
            {
              label: 'Eliminar turno',
              Icon: Trash2,
              destructiva: true,
              onPress: () => onDelete(appt.id),
            },
          ]}
        />
      </Pressable>
    </SwipeableRow>
  );
}

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const [upcoming, setUpcoming] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const { data: appointments, isLoading, isError, refetch, isRefetching } = useAgenda(viewMode === 'list' ? upcoming : false);
  const complete = useCompleteAppointment();
  const deleteAppt = useDeleteAppointment();
  const listRef = useRef<FlatList<[string, typeof appointments]>>(null);
  useScrollToTop(listRef);

  const grouped = (appointments ?? []).reduce<Record<string, typeof appointments>>((acc, a) => {
    if (!a) return acc;
    const day = diaLargo(a.scheduled_at);
    return { ...acc, [day]: [...(acc[day] ?? []), a] };
  }, {});

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const markedDays = useMemo(
    () => new Set((appointments ?? []).filter(Boolean).map((a) => ymd(new Date(a!.scheduled_at)))),
    [appointments],
  );
  const dayAppts = (appointments ?? []).filter((a): a is NonNullable<typeof a> => !!a && ymd(new Date(a.scheduled_at)) === selectedDay);

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar turno', '¿Querés eliminar este turno?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteAppt.mutate(id); } },
    ]);
  };

  const Header = (
    <>
      <ScreenHeader
        scrollable
        title="Agenda"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            {/* Alternar lista/mes con un solo icono, como Calendario de iOS */}
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => { haptic.selection(); setViewMode(viewMode === 'list' ? 'calendar' : 'list'); }}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={viewMode === 'list' ? 'Ver como calendario' : 'Ver como lista'}
            >
              {viewMode === 'list'
                ? <CalendarDays size={17} color={c.text} strokeWidth={1.9} />
                : <List size={17} color={c.text} strokeWidth={1.9} />}
            </TouchableOpacity>
            <HeaderButton
              label="Turno"
              onPress={() => { haptic.medium(); router.push('/(tabs)/agenda/nuevo' as never); }}
            />
          </View>
        }
      />
    </>
  );

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      {viewMode === 'calendar' && isError ? (
        <View style={{ flex: 1 }}>
          {Header}
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {Header}
          <MonthCalendar
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            markedDays={markedDays}
          />
          <View style={{ paddingHorizontal: space[4], marginTop: space[2] }}>
            {!selectedDay ? (
              <Text style={s.calHint}>Tocá un día para ver sus turnos</Text>
            ) : dayAppts.length === 0 ? (
              <Text style={s.calHint}>Sin turnos para este día</Text>
            ) : (
              dayAppts.map((appt, index) => (
                <Animated.View key={appt.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                  <AppointmentRow
                    appt={appt}
                    onComplete={(id) => complete.mutate(id)}
                    onDelete={handleDelete}
                    isLast={index === dayAppts.length - 1}
                    c={c} s={s}
                  />
                </Animated.View>
              ))
            )}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <View style={{ flex: 1 }}>
          {Header}
          <View style={{ padding: space[4], gap: space[2] }}>
            {[1, 2, 3, 4, 5].map((i) => <EventRowSkeleton key={i} />)}
          </View>
        </View>
      ) : isError ? (
        <View style={{ flex: 1 }}>
          {Header}
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : !Object.keys(grouped).length ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {Header}
          <EmptyState
            icon="calendar-outline"
            title={upcoming ? 'No hay turnos próximos' : 'Sin turnos registrados'}
            message={upcoming ? 'No tenés turnos programados. Creá el primero.' : 'Los turnos veterinarios y de servicio aparecerán aquí.'}
            actionLabel="Crear turno"
            onAction={() => { haptic.medium(); router.push('/(tabs)/agenda/nuevo' as never); }}
          />
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          ListHeaderComponent={Header}
          data={Object.entries(grouped)}
          keyExtractor={([day]) => day}
          contentContainerStyle={{ paddingBottom: 120, gap: space[5] }}
          renderItem={({ item: [day, items], index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ gap: space[1], paddingHorizontal: space[4] }}>
              <Text style={s.dayLabel}>{day}</Text>
              {(items ?? []).map((appt, i) => appt ? (
                <AppointmentRow key={appt.id} appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={handleDelete}
                  isLast={i === (items?.length ?? 0) - 1}
                  c={c} s={s}
                />
              ) : null)}
            </Animated.View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={s.pasadosLink}
              onPress={() => { haptic.selection(); setUpcoming(!upcoming); }}
              activeOpacity={0.7}
            >
              <Text style={s.pasadosLinkText}>{upcoming ? 'Ver turnos anteriores' : 'Solo próximos'}</Text>
            </TouchableOpacity>
          }
        />
      )}

    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  pasadosLink: { alignItems: 'center', paddingVertical: space[4] },
  pasadosLinkText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  viewText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  viewTextActive: { color: c.text },
  calHint: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', paddingVertical: space[6] },
  dayLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'capitalize' },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  apptRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  apptBody: { flex: 1, gap: 2 },
  apptTitle: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  apptMeta: { fontSize: text.xs, color: c.textFaint, textTransform: 'capitalize' },
  apptTime: { fontSize: text.sm, color: c.text, fontWeight: weight.bold, width: 46, fontVariant: ['tabular-nums'] },
  errorText: { fontSize: text.sm, color: c.danger },
});
