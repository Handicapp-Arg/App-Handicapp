import { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, FileText } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { useAuth } from '../../../lib/auth';
import { useAgenda, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { useHorses } from '../../../hooks/use-horses';
import { useBills, monthLabel } from '../../../hooks/use-billing';
import { useNotifications } from '../../../lib/notifications';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { formatMoney } from '../../../lib/currency';
import { diaLargo, fechaHumana, hora, vence } from '../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';
import { fontFamily } from '../../../styles/fonts';
import { AppImage } from '../../../components/AppImage';
import { PressableScale } from '../../../components/PressableScale';
import { Skeleton } from '../../../components/Skeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';

/**
 * INICIO — la primera pantalla de la app.
 *
 * Responde de un vistazo las tres preguntas de la ley del 03/09: "¿está todo
 * bien?" (la tarjeta oscura de pendientes), "¿qué se viene?" (el próximo turno)
 * y "¿hay algo para mí?" (el punto de la campana). Nada más: el muro quedó
 * fuera a propósito — es una pantalla aparte que hoy no se usa.
 *
 * Todo lo que se muestra sale de datos reales (sanidad en rojo, facturas
 * enviadas, la agenda). Si el backend no manda nada, no inventamos un resumen.
 */

// ─── Pendientes ──────────────────────────────────────────────────────────────

/** Un pendiente ya normalizado: sale de datos reales (sanidad vencida o factura). */
type Pendiente = {
  id: string;
  titulo: string;
  detalle: string;
  /** Foto del caballo, cuando el pendiente tiene una. */
  fotoUrl?: string | null;
  accion: string;
  /** El principal se marca con el chip sólido; el resto con el chip velado. */
  solido: boolean;
  onPress: () => void;
};

/**
 * Chip sobre la tarjeta invertida. El "velado" no usa un rgba literal: apila un
 * velo del color del fondo con opacidad, así funciona igual en claro y oscuro
 * (donde la tarjeta invertida pasa a ser crema sobre negro).
 */
function ChipInverso({ label, solido, onPress, s }: {
  label: string; solido: boolean; onPress: () => void; s: Styles;
}) {
  return (
    <PressableScale
      onPress={() => { haptic.selection(); onPress(); }}
      style={[s.chipInv, solido && s.chipInvSolido]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {!solido && <View style={[StyleSheet.absoluteFill, s.velo]} />}
      <Text style={[s.chipInvText, solido && s.chipInvTextSolido]}>{label}</Text>
    </PressableScale>
  );
}

function TarjetaPendientes({ pendientes, c, s }: { pendientes: Pendiente[]; c: ThemeColors; s: Styles }) {
  return (
    <View style={s.pendientes}>
      <View style={s.pendientesHead}>
        <View style={s.puntoAlerta} />
        <Text style={s.pendientesHeadText}>
          {pendientes.length === 1 ? '1 cosa para resolver' : `${pendientes.length} cosas para resolver`}
        </Text>
      </View>

      {pendientes.map((p, i) => (
        <View key={p.id}>
          {i > 0 && <View style={s.divisorInv} />}
          <View style={s.pendienteFila}>
            {p.fotoUrl ? (
              <AppImage source={{ uri: p.fotoUrl }} style={s.pendienteThumb} contentFit="cover" />
            ) : (
              <View style={[s.pendienteThumb, s.pendienteThumbVacio]}>
                <View style={[StyleSheet.absoluteFill, s.velo]} />
                <FileText size={20} color={c.bg} strokeWidth={1.9} />
              </View>
            )}
            <View style={s.pendienteTexto}>
              <Text style={s.pendienteTitulo} numberOfLines={1}>{p.titulo}</Text>
              {!!p.detalle && <Text style={s.pendienteDetalle} numberOfLines={1}>{p.detalle}</Text>}
            </View>
            <ChipInverso label={p.accion} solido={p.solido} onPress={p.onPress} s={s} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Próximo turno ───────────────────────────────────────────────────────────

function TarjetaProximoTurno({ turno, onPress, c, s }: {
  turno: NonNullable<ReturnType<typeof useAgenda>['data']>[number];
  onPress: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  const meta = APPOINTMENT_TYPES[turno.type] ?? APPOINTMENT_TYPES.otro;
  // El título lo escribe el usuario: si repite la etiqueta del tipo, no lo
  // mostramos dos veces.
  const bajada = [turno.title !== meta.label ? turno.title : '', fechaHumana(turno.scheduled_at)]
    .filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={() => { haptic.selection(); onPress(); }}
      style={s.turno}
      accessibilityRole="button"
      accessibilityLabel={`Próximo turno: ${meta.label}${turno.horse ? `, ${turno.horse.name}` : ''}`}
    >
      <View style={s.turnoHora}>
        <Text style={s.turnoHoraText}>{hora(turno.scheduled_at)}</Text>
      </View>
      <View style={s.turnoTexto}>
        <Text style={s.turnoTitulo} numberOfLines={1}>
          {meta.label}{turno.horse ? ` · ${turno.horse.name}` : ''}
        </Text>
        {!!bajada && <Text style={s.turnoBajada} numberOfLines={1}>{bajada}</Text>}
      </View>
      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
    </PressableScale>
  );
}

// ─── Esqueleto ───────────────────────────────────────────────────────────────

/**
 * Misma silueta que el contenido real (tarjeta oscura alta + tarjeta de turno):
 * si el esqueleto tuviera otra forma, al llegar los datos saltaría todo de lugar.
 */
function InicioSkeleton({ s }: { s: Styles }) {
  return (
    <View>
      <View style={s.bloque}>
        <Skeleton height={168} borderRadius={radius.sheet} />
      </View>
      <View style={s.bloque}>
        <Skeleton height={76} borderRadius={radius['2xl']} />
      </View>
    </View>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function InicioTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { user } = useAuth();
  const { unread } = useNotifications();

  const agenda = useAgenda(true);
  const caballos = useHorses();
  const facturas = useBills();

  const nombre = (user?.name ?? '').split(' ')[0] || 'Hola';
  const fecha = diaLargo(new Date().toISOString());
  const proximoTurno = (agenda.data ?? []).filter(Boolean)[0];

  // Los pendientes salen de datos reales: sanidad en rojo (viene en el listado
  // de caballos) y facturas enviadas sin responder. Si no hay nada, la tarjeta
  // no se dibuja — no inventamos un "todo en orden" que el backend no afirma.
  const pendientes = useMemo<Pendiente[]>(() => {
    const deSanidad: Pendiente[] = (caballos.data ?? [])
      .filter((h) => h.health?.status === 'rojo')
      .map((h) => ({
        id: `sanidad-${h.id}`,
        titulo: `${h.name}, ${h.health!.name}`,
        detalle: vence(h.health!.next_due),
        fotoUrl: h.image_url,
        accion: 'Resolver',
        solido: true,
        onPress: () => router.push(Routes.caballo(h.id) as never),
      }));

    const deFacturas: Pendiente[] = (facturas.data ?? [])
      .filter((b) => b.status === 'enviada')
      .map((b) => ({
        id: `factura-${b.id}`,
        titulo: `Factura de ${monthLabel(b.month, b.year)}`,
        detalle: [b.horse?.name, formatMoney(b.total, b.currency)].filter(Boolean).join(' · '),
        accion: 'Ver',
        solido: false,
        onPress: () => router.push(Routes.factura(b.id) as never),
      }));

    return [...deSanidad, ...deFacturas].slice(0, 3);
  }, [caballos.data, facturas.data, router]);

  // Una sola carga para las tres consultas: el resumen no se dibuja a pedazos.
  const cargando = agenda.isLoading || caballos.isLoading || facturas.isLoading;
  // El error solo manda si además no hay nada que mostrar: si una de las tres
  // falló pero las otras trajeron datos, mostrar el resumen es mejor que un
  // cartel de error sobre información que sí tenemos.
  const sinDatos = pendientes.length === 0 && !proximoTurno;
  const falló = agenda.isError || caballos.isError || facturas.isError;
  const refrescando = agenda.isRefetching || caballos.isRefetching || facturas.isRefetching;

  const refrescar = useCallback(() => {
    void agenda.refetch();
    void caballos.refetch();
    void facturas.refetch();
  }, [agenda.refetch, caballos.refetch, facturas.refetch]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.brand} />
        }
      >
        {/* Encabezado propio de índice de pestaña: título grande + botón
            cuadrado negro al costado (regla de encabezados). */}
        <View style={s.saludo}>
          <View style={s.saludoTexto}>
            <Text style={s.saludoFecha}>{fecha}</Text>
            <Text style={s.saludoHola}>Hola, {nombre}</Text>
          </View>
          <PressableScale
            onPress={() => { haptic.selection(); router.push(Routes.notificaciones as never); }}
            style={s.campana}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
          >
            <Bell size={21} color={c.text} strokeWidth={1.9} />
            {unread > 0 && <View style={s.campanaPunto} />}
          </PressableScale>
        </View>

        {cargando ? (
          <InicioSkeleton s={s} />
        ) : falló && sinDatos ? (
          <ErrorState onRetry={refrescar} />
        ) : sinDatos ? (
          <EmptyState
            icon="calendar-outline"
            title="Nada para resolver"
            message="No hay vencimientos ni turnos próximos. Cuando aparezca algo, lo vas a ver acá."
          />
        ) : (
          <>
            {/* Bloques fijos (no es una lista virtualizada): `entradaFila` está
                permitido y son dos, así que no compite con la transición. */}
            {pendientes.length > 0 && (
              <Animated.View entering={entradaFila(0)} style={s.bloque}>
                <TarjetaPendientes pendientes={pendientes} c={c} s={s} />
              </Animated.View>
            )}

            {proximoTurno && (
              <Animated.View entering={entradaFila(1)} style={s.bloque}>
                <TarjetaProximoTurno
                  turno={proximoTurno}
                  onPress={() => router.push(Routes.tabsAgenda as never)}
                  c={c}
                  s={s}
                />
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 120 },
  bloque: { paddingHorizontal: space[4], paddingTop: space[4] },
  /** Velo del color del fondo: reemplaza cualquier rgba literal sobre la tarjeta invertida. */
  velo: { backgroundColor: c.bg, opacity: 0.13, borderRadius: radius.full },

  // --- Saludo ---------------------------------------------------------------
  saludo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
    paddingHorizontal: space[4], paddingTop: space[3],
  },
  saludoTexto: { flex: 1 },
  saludoFecha: { fontSize: text.sm, color: c.textMuted, textTransform: 'capitalize', fontFamily: fontFamily.regular },
  saludoHola: {
    fontSize: text['2xl'], fontWeight: weight.bold, color: c.text,
    letterSpacing: -1.1, marginTop: space[1], fontFamily: fontFamily.semibold,
  },
  campana: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : shadow.sm),
  },
  campanaPunto: {
    position: 'absolute', top: 9, right: 10,
    width: 9, height: 9, borderRadius: radius.full,
    backgroundColor: c.danger,
    // El anillo del color de la tarjeta despega el punto del ícono.
    borderWidth: 2.5, borderColor: c.surface,
  },

  // --- Pendientes (superficie invertida) -----------------------------------
  pendientes: { backgroundColor: c.text, borderRadius: radius.sheet, padding: space[4] + 2 },
  pendientesHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  puntoAlerta: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: c.danger },
  pendientesHeadText: { fontSize: text.sm, color: c.textFaint, fontFamily: fontFamily.regular },
  divisorInv: { height: 1, backgroundColor: c.bg, opacity: 0.1, marginVertical: space[3] + 2 },
  pendienteFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3] + 2 },
  pendienteThumb: { width: 44, height: 44, borderRadius: radius.thumb - 1, overflow: 'hidden' },
  pendienteThumbVacio: { alignItems: 'center', justifyContent: 'center' },
  pendienteTexto: { flex: 1, minWidth: 0 },
  pendienteTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg, fontFamily: fontFamily.semibold },
  pendienteDetalle: { fontSize: text.sm, color: c.textFaint, marginTop: 2, fontFamily: fontFamily.regular },
  chipInv: {
    height: 34, paddingHorizontal: space[3] + 1, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  chipInvSolido: { backgroundColor: c.bg },
  chipInvText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.bg, fontFamily: fontFamily.semibold },
  chipInvTextSolido: { color: c.text },

  // --- Próximo turno --------------------------------------------------------
  turno: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius['2xl'],
    paddingHorizontal: space[4], paddingVertical: space[4] - 1,
    ...(c.isDark ? {} : shadow.md),
  },
  turnoHora: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  turnoHoraText: {
    fontSize: 15, fontWeight: weight.bold, color: c.brand,
    fontVariant: ['tabular-nums'], fontFamily: fontFamily.bold,
  },
  turnoTexto: { flex: 1, minWidth: 0 },
  turnoTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text, fontFamily: fontFamily.semibold },
  turnoBajada: { fontSize: text.sm, color: c.textMuted, marginTop: 2, fontFamily: fontFamily.regular },
});
