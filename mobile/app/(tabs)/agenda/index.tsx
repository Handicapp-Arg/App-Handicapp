import { useState, useMemo, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Check, List, CalendarDays, Trash2, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgenda, useCompleteAppointment, useDeleteAppointment, APPOINTMENT_TYPES, type ServiceAppointment } from '../../../hooks/use-agenda';
import { useHorses } from '../../../hooks/use-horses';
import { AppImage } from '../../../components/AppImage';
import { MonthCalendar } from '../../../components/MonthCalendar';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { haptic } from '../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { entradaLista } from '../../../styles/motion';
import { hora, fechaHumana, diaLargo } from '../../../lib/fechas';
import { ActionSheet } from '../../../components/ActionSheet';
import { SwipeableRow } from '../../../components/SwipeableRow';

/**
 * El color de la barrita de cada turno sale del THEME, no del hex que trae
 * `APPOINTMENT_TYPES` (esos hexes son de la paleta vieja y no tienen versión
 * oscura). Acá se traduce tipo -> token semántico: así la agenda se lee igual
 * en claro y en oscuro sin escribir un solo hexadecimal.
 */
const COLOR_TIPO: Record<string, (c: ThemeColors) => string> = {
  veterinario: (c) => c.brand,
  herrador: (c) => c.warning,
  competencia: (c) => c.info,
  desparasitacion: (c) => c.success,
  vacuna: (c) => c.info,
  entrenamiento: (c) => c.warning,
  otro: (c) => c.textMuted,
};

const colorDeTipo = (tipo: string, c: ThemeColors) => (COLOR_TIPO[tipo] ?? COLOR_TIPO.otro)(c);

/** Etiquetas relativas: son las únicas que justifican repetir el día abajo. */
const RELATIVAS = new Set(['Hoy', 'Mañana', 'Ayer']);

type Grupo = { clave: string; titulo: string; detalle: string; turnos: ServiceAppointment[] };

/**
 * Fila de turno: hora, barrita de color y TÍTULO SOLO.
 *
 * No lleva subtítulo a propósito (pedido del dueño): la agenda se mira de
 * reojo para saber qué hay, y una segunda línea por fila convierte la pestaña
 * en un bloque de texto. El caballo y el tipo se ven al tocar la fila.
 */
const FilaTurno = memo(function FilaTurno({
  appt, fotoCaballo, onComplete, onDelete, onAbrirMenu, isLast, c, s,
}: {
  appt: ServiceAppointment;
  /** Foto del caballo del turno. La respuesta de agenda no la trae: se cruza
   *  en la pantalla contra el listado de caballos, que sí la tiene. */
  fotoCaballo?: string | null;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onAbrirMenu: (appt: ServiceAppointment) => void;
  isLast?: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  // Las acciones del swipe se memorizan: si fueran un array literal nuevo en
  // cada render, `SwipeableRow` rearmaría su contenido derecho cada vez.
  const acciones = useMemo(() => [
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
  ], [appt.completed, appt.id, c.success, c.danger, onComplete, onDelete]);

  const abrir = useCallback(() => { haptic.selection(); onAbrirMenu(appt); }, [appt, onAbrirMenu]);

  // El ActionSheet NO vive acá: uno por fila significaba montar un BottomSheet
  // por turno (5 useSharedValue, 2 useAnimatedStyle y un Gesture.Pan cada uno)
  // aunque estuviera cerrado. Ahora hay UNO solo a nivel de pantalla.
  return (
    <SwipeableRow acciones={acciones}>
      <PressableScale
        style={[s.fila, !isLast && s.filaDivisor, appt.completed && s.filaCompletada]}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`Turno ${appt.title}`}
      >
        <Text style={s.filaHora}>{hora(appt.scheduled_at)}</Text>
        <View style={[s.filaBarra, { backgroundColor: colorDeTipo(appt.type, c) }]} />
        {fotoCaballo ? (
          <AppImage source={{ uri: fotoCaballo }} style={s.filaFoto} contentFit="cover" />
        ) : appt.horse ? (
          // Sin foto va la inicial, no un hueco: la columna tiene que mantener
          // su ancho o los títulos de las filas dejan de alinearse entre sí.
          <View style={[s.filaFoto, s.filaFotoVacia]}>
            <Text style={s.filaFotoInicial}>{appt.horse.name.charAt(0).toUpperCase()}</Text>
          </View>
        ) : null}
        <Text style={s.filaTitulo} numberOfLines={1}>{appt.title}</Text>
      </PressableScale>
    </SwipeableRow>
  );
});

/** Misma silueta que la fila real (hora + barrita + una sola línea de título). */
function FilaTurnoSkeleton({ s }: { s: Styles }) {
  return (
    <View style={s.fila}>
      <Skeleton width={40} height={15} />
      <View style={s.filaBarraHueco}>
        <Skeleton width={3} height={38} borderRadius={radius.full} />
      </View>
      <Skeleton width={38} height={38} borderRadius={radius.md} />
      <Skeleton height={15} width="55%" />
    </View>
  );
}

export default function AgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [upcoming, setUpcoming] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const { data: appointments, isLoading, isError, refetch, isRefetching } = useAgenda(viewMode === 'list' ? upcoming : false);
  const caballos = useHorses();
  const complete = useCompleteAppointment();
  const deleteAppt = useDeleteAppointment();
  const listRef = useRef<FlatList<Grupo>>(null);
  useScrollToTop(listRef);
  // Un solo turno abierto a la vez: el menú es de la pantalla, no de la fila.
  const [turnoAbierto, setTurnoAbierto] = useState<ServiceAppointment | null>(null);

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /**
   * Grupos por día en el orden en que vienen del backend (ya ordenados).
   * El título es la fecha humana ("Hoy", "Mañana", "vie 5 sep") y el detalle
   * repite el día largo SOLO cuando el título es relativo: "Hoy · jueves 19"
   * ubica; "vie 5 sep · viernes 5 de septiembre" es ruido.
   */
  const grupos = useMemo<Grupo[]>(() => {
    const salida: Grupo[] = [];
    for (const a of appointments ?? []) {
      if (!a) continue;
      const clave = ymd(new Date(a.scheduled_at));
      const ultimo = salida[salida.length - 1];
      if (ultimo?.clave === clave) { ultimo.turnos.push(a); continue; }
      const titulo = fechaHumana(a.scheduled_at);
      salida.push({
        clave,
        titulo,
        detalle: RELATIVAS.has(titulo) ? diaLargo(a.scheduled_at) : '',
        turnos: [a],
      });
    }
    return salida;
  }, [appointments]);

  const markedDays = useMemo(
    () => new Set((appointments ?? []).filter(Boolean).map((a) => ymd(new Date(a.scheduled_at)))),
    [appointments],
  );
  const dayAppts = (appointments ?? []).filter((a) => !!a && ymd(new Date(a.scheduled_at)) === selectedDay);

  /**
   * Los tres callbacks que bajan a cada fila se estabilizan con useCallback:
   * antes `onComplete={(id) => complete.mutate(id)}` creaba una función nueva
   * por fila en cada render, lo que rompía cualquier memoización posible.
   */
  const handleDelete = useCallback((id: string) => {
    Alert.alert('Eliminar turno', '¿Querés eliminar este turno?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteAppt.mutate(id); } },
    ]);
    // `mutate` es estable en react-query; el objeto de la mutación no lo es.
  }, [deleteAppt.mutate]);

  /**
   * La respuesta de agenda trae del caballo solo `{ id, name }`, sin la foto.
   * En vez de pedirle al backend un campo más, se cruza contra el listado de
   * caballos, que la app ya tiene cargado y cacheado: misma foto, cero
   * consultas extra.
   */
  const fotosPorCaballo = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const h of caballos.data ?? []) m[h.id] = h.image_url;
    return m;
  }, [caballos.data]);

  const handleComplete = useCallback((id: string) => { complete.mutate(id); }, [complete.mutate]);
  const abrirMenu = useCallback((appt: ServiceAppointment) => setTurnoAbierto(appt), []);
  const cerrarMenu = useCallback(() => setTurnoAbierto(null), []);

  const irANuevo = () => { haptic.medium(); router.push('/(tabs)/agenda/nuevo' as never); };

  /**
   * `renderItem` estable: si fuera una closure nueva en cada render, la
   * FlatList re-renderizaría todas sus celdas montadas ante cualquier cambio
   * de estado de la pantalla (abrir el menú, tirar para refrescar).
   */
  const renderGrupo = useCallback(({ item }: { item: Grupo }) => (
    <View style={s.grupo}>
      <View style={s.grupoHead}>
        <Text style={s.grupoTitulo}>{item.titulo}</Text>
        {item.detalle ? <Text style={s.grupoDetalle}>{item.detalle}</Text> : null}
      </View>
      {item.turnos.map((appt, i) => (
        <FilaTurno
          key={appt.id}
          appt={appt}
          fotoCaballo={appt.horse ? fotosPorCaballo[appt.horse.id] : null}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onAbrirMenu={abrirMenu}
          isLast={i === item.turnos.length - 1}
          c={c} s={s}
        />
      ))}
    </View>
  ), [s, c, handleComplete, handleDelete, abrirMenu]);

  /**
   * Encabezado propio (título grande + dos acciones cuadradas), igual que la
   * lista de caballos: es el índice de una pestaña, no una pantalla empujada.
   * El `+` va en negro (`c.text`) porque el verde es la acción de guardar, no
   * la de navegar.
   */
  const encabezado = (
    <View style={s.header}>
      <Text style={s.titulo}>Agenda</Text>
      <View style={s.headerAcciones}>
        <PressableScale
          style={s.btnSecundario}
          onPress={() => { haptic.selection(); setViewMode(viewMode === 'list' ? 'calendar' : 'list'); }}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Ver como calendario' : 'Ver como lista'}
        >
          {viewMode === 'list'
            ? <CalendarDays size={20} color={c.text} strokeWidth={1.9} />
            : <List size={20} color={c.text} strokeWidth={1.9} />}
        </PressableScale>
        <PressableScale
          style={s.btnMas}
          onPress={irANuevo}
          accessibilityRole="button"
          accessibilityLabel="Nuevo turno"
        >
          <Plus size={24} color={c.bg} strokeWidth={2.2} />
        </PressableScale>
      </View>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {encabezado}
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <>
              <MonthCalendar
                monthCursor={monthCursor}
                onMonthChange={setMonthCursor}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                markedDays={markedDays}
              />
              {/* El fade es del bloque del día (key = día), no de cada fila. */}
              <Animated.View key={selectedDay ?? 'sin-dia'} entering={entradaLista()} style={s.calCuerpo}>
                {!selectedDay ? (
                  <Text style={s.calHint}>Tocá un día para ver sus turnos</Text>
                ) : dayAppts.length === 0 ? (
                  <Text style={s.calHint}>Sin turnos para este día</Text>
                ) : (
                  /*
                   * Los turnos de UN día caben en pantalla (rara vez pasan de
                   * una docena), así que el ScrollView + map se queda: meter
                   * una FlatList anidada dentro de un ScrollView vertical es
                   * peor que no virtualizar. Lo que sí se va es el `entering`
                   * por fila: anima el bloque entero, no cada turno.
                   */
                  dayAppts.map((appt, index) => (
                    <FilaTurno
                      key={appt!.id}
                      appt={appt!}
                      fotoCaballo={appt!.horse ? fotosPorCaballo[appt!.horse.id] : null}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onAbrirMenu={abrirMenu}
                      isLast={index === dayAppts.length - 1}
                      c={c} s={s}
                    />
                  ))
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>
      ) : isLoading ? (
        <View>
          {encabezado}
          <View style={s.esqueleto}>
            <Skeleton width={90} height={17} />
            {[1, 2, 3].map((i) => <FilaTurnoSkeleton key={i} s={s} />)}
            <Skeleton width={110} height={17} style={{ marginTop: space[5] }} />
            {[4, 5].map((i) => <FilaTurnoSkeleton key={i} s={s} />)}
          </View>
        </View>
      ) : isError ? (
        <View>
          {encabezado}
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : !grupos.length ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {encabezado}
          <EmptyState
            icon="calendar-outline"
            title={upcoming ? 'No hay turnos próximos' : 'Sin turnos registrados'}
            message={upcoming ? 'No tenés turnos programados. Creá el primero.' : 'Los turnos veterinarios y de servicio aparecerán aquí.'}
            actionLabel="Crear turno"
            onAction={irANuevo}
          />
        </ScrollView>
      ) : (
        // La entrada la hace la lista entera, una sola vez, no cada celda.
        <Animated.View entering={entradaLista()} style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            ListHeaderComponent={encabezado}
            data={grupos}
            keyExtractor={(g) => g.clave}
            contentContainerStyle={s.lista}
            renderItem={renderGrupo}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
            showsVerticalScrollIndicator={false}
            // Cada celda es un día entero (varios turnos): pocas de golpe y
            // ventana chica alcanzan, y soltar las de fuera de pantalla saca
            // sus gestos nativos de memoria.
            initialNumToRender={6}
            maxToRenderPerBatch={5}
            windowSize={7}
            ListFooterComponent={
              <PressableScale
                style={s.pasadosLink}
                onPress={() => { haptic.selection(); setUpcoming(!upcoming); }}
                accessibilityRole="button"
                accessibilityLabel={upcoming ? 'Ver turnos anteriores' : 'Ver solo los próximos'}
              >
                <Text style={s.pasadosLinkText}>{upcoming ? 'Ver turnos anteriores' : 'Solo próximos'}</Text>
              </PressableScale>
            }
          />
        </Animated.View>
      )}

      {/* UN solo menú de acciones para toda la agenda (antes: uno por fila). */}
      <ActionSheet
        visible={!!turnoAbierto}
        onClose={cerrarMenu}
        title={turnoAbierto
          ? `${turnoAbierto.horse?.name ? `${turnoAbierto.horse.name} · ` : ''}${APPOINTMENT_TYPES[turnoAbierto.type]?.label ?? 'Turno'}`
          : undefined}
        acciones={turnoAbierto ? [
          ...(turnoAbierto.completed ? [] : [{
            label: 'Marcar como completado',
            Icon: Check,
            onPress: () => handleComplete(turnoAbierto.id),
          }]),
          {
            label: 'Eliminar turno',
            Icon: Trash2,
            destructiva: true,
            onPress: () => handleDelete(turnoAbierto.id),
          },
        ] : []}
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  lista: { paddingBottom: 140 },
  esqueleto: { paddingHorizontal: space[4] + 2, paddingTop: space[3] },

  /* ─── Encabezado ───────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4] + 2, paddingTop: space[3], paddingBottom: space[2],
  },
  titulo: { fontSize: text['2xl'], fontWeight: weight.bold, color: c.text, letterSpacing: -1.1 },
  headerAcciones: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  btnSecundario: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : shadow.sm),
  },
  btnMas: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.text, alignItems: 'center', justifyContent: 'center',
  },

  /* ─── Grupos por día ───────────────────────────────────────────────────── */
  grupo: { paddingHorizontal: space[4] + 2, marginTop: space[6] },
  grupoHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  grupoTitulo: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4, textTransform: 'capitalize' },
  grupoDetalle: { fontSize: text.sm, color: c.textFaint, flexShrink: 1 },

  /* ─── Fila ─────────────────────────────────────────────────────────────── */
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaCompletada: { opacity: 0.45 },
  filaHora: { width: 52, fontSize: text.md, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  filaBarra: { width: 3, height: 38, borderRadius: radius.full, flexShrink: 0 },
  filaFoto: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.surfaceAlt, flexShrink: 0 },
  filaFotoVacia: { alignItems: 'center', justifyContent: 'center' },
  filaFotoInicial: { fontSize: text.base, fontWeight: weight.bold, color: c.textFaint },
  // El esqueleto necesita ocupar el mismo ancho que la barrita real.
  filaBarraHueco: { width: 3, flexShrink: 0 },
  filaTitulo: { flex: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },

  /* ─── Calendario ───────────────────────────────────────────────────────── */
  calCuerpo: { paddingHorizontal: space[4] + 2, marginTop: space[2] },
  calHint: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', paddingVertical: space[6] },

  pasadosLink: { alignItems: 'center', paddingVertical: space[6], marginTop: space[2] },
  pasadosLinkText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
});
