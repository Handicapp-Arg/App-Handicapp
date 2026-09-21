import { memo, useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Platform, Alert, ActionSheetIOS, Share, InteractionManager,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, MoreHorizontal, QrCode, ShieldCheck, Megaphone,
  Trash2, Camera, Pencil, Stethoscope, Network, Clock, Images, DollarSign,
  Users, FileText, Copy, Share2, Check, CalendarPlus,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import {
  useHorse, useFinancialSummary, useDeleteHorse, useUploadHorseImage, useWeightRecords,
  useHorseDocuments, useHorseVets, useHorseAssignees,
} from '../../../../hooks/use-horses';
import { useMedicalRecords, SANITARY_DISEASES, healthStatusFromNextDue } from '../../../../hooks/use-medical';
import { useEventsByHorse } from '../../../../hooks/use-events';
import { useActivityPhotos } from '../../../../hooks/use-activity-photos';
import { useRoutines, ROUTINE_ITEMS, todayISO, type DailyRoutine } from '../../../../hooks/use-routines';
import { formatMoney } from '../../../../lib/currency';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { Routes, nav } from '../../../../lib/routes';
import { Skeleton } from '../../../../components/Skeleton';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { ErrorState } from '../../../../components/ErrorState';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { edadEnAnios, fechaHumana, vence } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, radius, touch, shadow, photoScrim } from '../../../../styles/tokens';
import { ActionSheet } from '../../../../components/ActionSheet';
import { BottomSheet } from '../../../../components/BottomSheet';
import { AppImage } from '../../../../components/AppImage';
import { PressableScale } from '../../../../components/PressableScale';

// Base URL para el enlace público del caballo (QR). Configurable via EXPO_PUBLIC_APP_URL
// (ej. IP LAN http://192.168.x.x:3005) para que el QR sea accesible desde otros dispositivos.
const PUBLIC_BASE = process.env.EXPO_PUBLIC_APP_URL ?? 'https://app.handicapp.com.ar';

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

/** Las píldoras del hero miden 44 (mínimo táctil de Apple) y el hitSlop les da aire extra. */
const HIT_PILL = { top: 8, bottom: 8, left: 8, right: 8 };

/** Proporción del hero: sale de la maqueta (390×300) pero en ratio, para que
 *  escale igual en un iPhone SE que en un Max en vez de fijarse a un alto. */
const HERO_RATIO = 390 / 300;

/* La edición del caballo ahora es una pantalla empujada: ./editar.tsx
   (los formularios con tipeo se rompían con el teclado dentro de las hojas). */

/* ─── Sparkline: la tendencia, no el gráfico ───
   Dos o más puntos dibujados a mano alzada. No lleva ejes ni valores: al lado
   ya está el número grande, y lo único que agrega la línea es "viene subiendo"
   o "viene bajando" de un vistazo. Con menos de dos puntos no hay tendencia
   que contar, así que no se dibuja nada. */
const SPARK_W = 62;
const SPARK_H = 26;

/* `memo` porque la ficha se re-renderiza cada vez que resuelve una query, y
   redibujar el SVG (min/max/join de puntos) en cada una es trabajo puro al
   pedo: mientras la serie no cambie de referencia, el gráfico es el mismo.
   Las series llegan memoizadas desde la pantalla, así que la comparación
   por referencia realmente corta. */
const Sparkline = memo(function Sparkline({ valores, color }: { valores: number[]; color: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1; // serie plana: la línea queda al medio, no dividida por cero
  const pad = 3;                // deja respirar al stroke redondeado en los extremos
  const puntos = valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * SPARK_W;
      const y = SPARK_H - pad - ((v - min) / rango) * (SPARK_H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={SPARK_W} height={SPARK_H} accessibilityElementsHidden>
      <Polyline points={puntos} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

/* ─── Anillo de progreso de la rutina ───
   Un círculo recortado con strokeDasharray: en RN no existe el conic-gradient
   de la maqueta, y el SVG da el mismo resultado sin capas superpuestas. */
const ANILLO = 34;

/* Mismo motivo que el sparkline: el anillo solo depende de hechas/total/tema. */
const AnilloProgreso = memo(function AnilloProgreso({ hechas, total, c }: { hechas: number; total: number; c: ThemeColors }) {
  const grosor = 4;
  const r = (ANILLO - grosor) / 2;
  const circunferencia = 2 * Math.PI * r;
  const avance = total > 0 ? Math.min(hechas / total, 1) : 0;

  return (
    <Svg width={ANILLO} height={ANILLO} accessibilityElementsHidden>
      <Circle cx={ANILLO / 2} cy={ANILLO / 2} r={r} stroke={c.border} strokeWidth={grosor} fill="none" />
      <Circle
        cx={ANILLO / 2}
        cy={ANILLO / 2}
        r={r}
        stroke={c.brand}
        strokeWidth={grosor}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circunferencia * avance} ${circunferencia}`}
        // Arranca arriba (12 en punto) y no a la derecha, que es como se lee un progreso.
        transform={`rotate(-90 ${ANILLO / 2} ${ANILLO / 2})`}
      />
    </Svg>
  );
});

/* ─── Acceso rápido del hero ─── */
function AccesoRapido({ Icon, label, onPress, c, s }: { Icon: LucideIcon; label: string; onPress: () => void; c: ThemeColors; s: Styles }) {
  return (
    <PressableScale style={s.acceso} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={21} color={c.brand} strokeWidth={1.9} />
      <Text style={s.accesoLabel}>{label}</Text>
    </PressableScale>
  );
}

/* ─── Fila de dato vital: rótulo chico arriba, número grande abajo, tendencia al costado ─── */
function FilaDato({
  label, valor, delta, deltaTono, grafico, onPress, s, c, isLast,
}: {
  label: string;
  valor: string;
  delta?: string;
  deltaTono?: 'brand' | 'danger';
  grafico?: React.ReactNode;
  onPress: () => void;
  s: Styles;
  c: ThemeColors;
  isLast?: boolean;
}) {
  return (
    <PressableScale
      style={[s.filaDato, isLast && s.filaDatoLast]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valor}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.filaDatoLabel} numberOfLines={1}>{label}</Text>
        <View style={s.filaDatoValorRow}>
          <Text style={s.filaDatoValor}>{valor}</Text>
          {delta ? (
            <Text style={[s.filaDatoDelta, { color: deltaTono === 'danger' ? c.danger : c.brand }]}>{delta}</Text>
          ) : null}
        </View>
      </View>
      {grafico}
      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
    </PressableScale>
  );
}

/* ─── SectionRow: fila de navegación estilo Más/Ajustes ─── */
function SectionRow({ Icon, label, sub, onPress, c, s }: { Icon: LucideIcon; label: string; sub?: string; onPress: () => void; c: ThemeColors; s: Styles }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.rowIconWrap}>
        <Icon size={20} color={c.text} strokeWidth={1.7} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/** Cuántas tareas de la rutina de hoy están hechas, sobre las 7 del sistema. */
function rutinaDeHoy(routines: DailyRoutine[] | undefined) {
  const hoy = todayISO();
  const r = routines?.find((x) => x.date?.slice(0, 10) === hoy);
  if (!r) return null;
  const hechas = ROUTINE_ITEMS.filter((item) => r[item.key]).length;
  return { hechas, total: ROUTINE_ITEMS.length };
}

/* ─── Main ─── */
export default function HorseDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  /* ─── Abrir la ficha NO puede disparar diez requests a la vez ───
     Cada query que resolvía re-renderizaba el árbol entero (hero + sparklines
     + anillo + secciones) justo mientras el stack hacía su slide de entrada:
     diez re-renders encima de la transición. Ahora se piden en dos tandas.

     Tanda 1 (ya): lo que se VE arriba — el caballo, la sanidad (aviso), las
     finanzas, el peso y la rutina.
     Tanda 2 (después de la transición): lo que solo alimenta el subtítulo
     "Sin registros" de las filas de abajo y la tira de fotos.

     El diferido se hace pasando `''` como id: todos estos hooks tienen
     `enabled: !!horseId`, así que con id vacío la query ni siquiera arranca.
     Es la forma de diferir sin tocar hooks compartidos con otras pantallas. */
  const [listo, setListo] = useState(false);
  useEffect(() => {
    // `runAfterInteractions` espera a que termine la animación de entrada del
    // stack; el timer es el paracaídas por si no hay interacción en curso.
    const tarea = InteractionManager.runAfterInteractions(() => setListo(true));
    const t = setTimeout(() => setListo(true), 450);
    return () => { tarea.cancel(); clearTimeout(t); };
  }, []);
  const idDiferido = listo ? id : '';

  const { data: horse, isLoading, refetch, isRefetching } = useHorse(id);
  const isJineteOrPeon = user?.role === 'jinete' || user?.role === 'peon';
  const { data: financial } = useFinancialSummary(id, !isJineteOrPeon);
  const { data: weightRecords } = useWeightRecords(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const { data: routines } = useRoutines(id);
  // Secundarias: nada de lo que traen cambia la silueta de arriba.
  const { data: events } = useEventsByHorse(idDiferido);
  const { data: activityPhotos } = useActivityPhotos(idDiferido);
  const { data: documents } = useHorseDocuments(idDiferido);
  const { data: horseVets } = useHorseVets(idDiferido);
  const { data: assignees } = useHorseAssignees(idDiferido);
  const deleteHorse = useDeleteHorse();
  const uploadImage = useUploadHorseImage();

  const [showQR, setShowQR] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  /* ─── Todo lo derivado, memoizado ───
     Estos cálculos (regex por enfermedad, filter+sort, series numéricas) se
     rehacían en CADA render de la pantalla, y la pantalla renderiza una vez
     por query que resuelve. Van arriba de los early returns porque un hook no
     puede quedar detrás de un `return` condicional. */

  // ─── Libreta sanitaria: el vencimiento MÁS urgente, dicho con nombre y fecha ───
  const vencimientos = useMemo(() => {
    const sanidad = medicalRecords?.filter((r) => r.type === 'sanidad') ?? [];
    return SANITARY_DISEASES.map((d) => {
      const ultimo = sanidad.find((r) => d.match.test(r.name)) ?? null;
      return { nombre: d.name, nextDue: ultimo?.next_due ?? null, estado: healthStatusFromNextDue(ultimo?.next_due ?? null) };
    });
  }, [medicalRecords]);

  const urgente = useMemo(() => (
    vencimientos
      .filter((v) => v.estado !== 'verde')
      // El rojo manda sobre el amarillo, y dentro del mismo estado, la fecha más
      // vieja primero. Sin registro (`nextDue` nulo) es lo más urgente de todo.
      .sort((a, b) => {
        if (a.estado !== b.estado) return a.estado === 'rojo' ? -1 : 1;
        if (!a.nextDue) return -1;
        if (!b.nextDue) return 1;
        return a.nextDue.localeCompare(b.nextDue);
      })[0] ?? null
  ), [vencimientos]);

  // Las series van memoizadas también porque son la prop de un componente
  // `memo`: si el array se recrea en cada render, el `memo` no sirve de nada.
  const serieGasto = useMemo(
    () => [...(financial?.monthly ?? [])].slice(0, 6).reverse().map((m) => Number(m.total)),
    [financial],
  );
  const seriePeso = useMemo(
    () => [...(weightRecords ?? [])].slice(0, 7).reverse().map((w) => Number(w.weight_kg)),
    [weightRecords],
  );

  const rutina = useMemo(() => rutinaDeHoy(routines), [routines]);

  const handlePickImage = () => {
    const doUpload = async (source: 'camera' | 'gallery') => {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a la galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!result.canceled && result.assets[0]) { await uploadImage.mutateAsync({ id, uri: result.assets[0].uri }); toast.success('Foto actualizada'); }
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tomar foto', 'Elegir de galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) doUpload('camera'); else if (i === 2) doUpload('gallery'); },
      );
    } else {
      Alert.alert('Foto del caballo', '¿De dónde querés actualizar la foto?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => doUpload('camera') },
        { text: 'Elegir de galería', onPress: () => doUpload('gallery') },
      ]);
    }
  };

  const handleDelete = () => {
    haptic.medium();
    Alert.alert('Eliminar caballo', `¿Eliminás a ${horse?.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteHorse.mutateAsync(id); router.back(); } },
    ]);
  };

  // Esqueleto con la MISMA silueta que la ficha cargada (hero a sangre, cuatro
  // accesos, tres filas de dato, tira de fotos). Si el esqueleto usara
  // ScreenHeader y la pantalla cargada un hero de foto, al llegar el dato
  // saltaría todo de lugar.
  if (isLoading) {
    return (
      <View style={s.root}>
        {/* El hero del esqueleto usa el MISMO aspectRatio que la foto real
            (no un alto fijo), así la pantalla no se acomoda al llegar el dato. */}
        <View style={s.heroWrap}>
          <Skeleton borderRadius={0} style={{ height: '100%' }} />
        </View>
        <View style={s.accesos}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} borderRadius={radius.button} style={{ flex: 1 }} />)}
        </View>
        <View style={s.datos}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={s.filaDato}>
              <View style={{ flex: 1, gap: space[2] }}>
                <Skeleton height={13} width="45%" />
                <Skeleton height={20} width="35%" />
              </View>
              <Skeleton width={ANILLO} height={ANILLO} borderRadius={radius.full} />
            </View>
          ))}
        </View>
        <View style={s.bloqueFotos}>
          <Skeleton height={18} width={90} />
          <View style={s.fotosTira}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={104} borderRadius={radius.field} style={{ flex: 1 }} />)}
          </View>
        </View>
      </View>
    );
  }
  if (!horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack backTo={Routes.tabsCaballos} title="Caballo" />
        <ErrorState
          titulo="No encontramos este caballo"
          detalle="Puede que lo hayan eliminado o que el enlace ya no sirva."
          onRetry={refetch}
        />
      </View>
    );
  }

  const base = Routes.caballo(horse.id);
  const goto = (path: string) => { haptic.selection(); nav.push(router, `${base}/${path}`); };

  // ─── Línea bajo el nombre: pelaje · edad · actividad ───
  const edad = edadEnAnios(horse.birth_date);
  const subtitulo = [
    horse.color,
    edad != null ? `${edad} ${edad === 1 ? 'año' : 'años'}` : null,
    horse.activity?.name ?? horse.breed?.name,
    // El sexo solo entra si no hay pelaje ni actividad: la línea tiene que
    // leerse de un vistazo, no ser la ficha entera.
    horse.color || horse.activity || horse.breed ? null : (horse.sex ? SEX_LABEL[horse.sex] ?? horse.sex : null),
  ].filter(Boolean).join(' · ');

  // ─── Gasto del mes ───
  const gastoDelMes = financial?.monthly?.[0];

  // ─── Último peso y su variación ───
  const ultimoPeso = weightRecords?.[0];
  const pesoAnterior = weightRecords?.[1];
  const deltaPeso = ultimoPeso && pesoAnterior ? Number(ultimoPeso.weight_kg) - Number(pesoAnterior.weight_kg) : null;

  const fotos = activityPhotos ?? [];
  const hasFinanzas = !isJineteOrPeon;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: space[20] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
    >
      {/* ─── Hero: foto a sangre, el nombre apoyado sobre el degradado ─── */}
      <View style={s.heroWrap}>
        {horse.image_url
          ? <AppImage source={{ uri: horse.image_url }} style={StyleSheet.absoluteFill} />
          : (
            <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]}>
              <Text style={s.heroPlaceholderInitial}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <LinearGradient
          colors={[...photoScrim]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Volver */}
        <TouchableOpacity
          style={[s.heroPill, { top: insets.top + space[3], left: space[4] }]}
          onPress={() => { haptic.light(); router.canGoBack() ? router.back() : router.navigate(Routes.tabsCaballos as never); }}
          activeOpacity={0.8}
          hitSlop={HIT_PILL}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de caballos"
        >
          <ChevronLeft size={20} color={colors.white} strokeWidth={1.9} />
        </TouchableOpacity>

        {/* QR + menú, arriba a la derecha como en la maqueta */}
        <View style={[s.heroActions, { top: insets.top + space[3] }]}>
          {horse.public_token && (
            <TouchableOpacity
              style={[s.heroPill, s.heroPillStatic]}
              onPress={() => { haptic.light(); setShowQR(true); }}
              activeOpacity={0.8}
              hitSlop={HIT_PILL}
              accessibilityRole="button"
              accessibilityLabel="Ver código QR del caballo"
            >
              <QrCode size={20} color={colors.white} strokeWidth={1.9} />
            </TouchableOpacity>
          )}
          {(can('horses', 'update') || can('horses', 'delete')) && (
            <TouchableOpacity
              style={[s.heroPill, s.heroPillStatic]}
              onPress={() => { haptic.light(); setShowMenu(true); }}
              activeOpacity={0.8}
              hitSlop={HIT_PILL}
              accessibilityRole="button"
              accessibilityLabel="Más opciones del caballo"
            >
              <MoreHorizontal size={20} color={colors.white} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nombre + sello de padrón + línea de identidad */}
        <View style={s.heroContent}>
          <View style={s.heroNameRow}>
            <Text style={s.horseName} numberOfLines={1}>{horse.name}</Text>
            {/* El escudo dice "está en el padrón": es el sello de confianza y
                por eso va pegado al nombre, no perdido en una esquina. */}
            {horse.horse_record_id ? <ShieldCheck size={19} color={colors.white} strokeWidth={1.9} /> : null}
          </View>
          {subtitulo ? <Text style={s.heroSub} numberOfLines={1}>{subtitulo}</Text> : null}
        </View>
      </View>

      {/* ─── Cuatro accesos: lo que se hace parado al lado del caballo ───
          Sin `entering` escalonado: la pantalla ya entra deslizándose con la
          transición del stack (280 ms). Sumarle cinco animaciones internas era
          lo que hacía que abrir la ficha se sintiera pesado. `entradaFila`
          sigue siendo válida en pantallas que no compiten con una transición. */}
      <View style={s.accesos}>
        {hasFinanzas && (
          <AccesoRapido
            Icon={DollarSign}
            label="Gasto"
            onPress={() => { haptic.selection(); router.push({ pathname: Routes.caballoEventoNuevo(horse.id), params: { tipo: 'gasto' } } as never); }}
            c={c} s={s}
          />
        )}
        <AccesoRapido Icon={Camera} label="Foto" onPress={() => goto('fotos')} c={c} s={s} />
        <AccesoRapido Icon={Check} label="Rutina" onPress={() => goto('rutina')} c={c} s={s} />
        <AccesoRapido
          Icon={CalendarPlus}
          label="Turno"
          onPress={() => { haptic.selection(); nav.push(router, `${Routes.tabsAgenda}/nuevo`); }}
          c={c} s={s}
        />
      </View>

      {/* ─── Aviso sanitario: el único color fuerte de la pantalla ─── */}
      {urgente && (
        <View style={s.avisoWrap}>
          <PressableScale
            style={[s.aviso, { backgroundColor: urgente.estado === 'rojo' ? c.dangerSoft : c.warningSoft }]}
            onPress={() => goto('sanidad')}
            accessibilityRole="button"
            accessibilityLabel="Ver la libreta sanitaria"
          >
            <View style={[s.avisoPunto, { backgroundColor: urgente.estado === 'rojo' ? c.danger : c.warning }]} />
            <Text style={[s.avisoText, { color: urgente.estado === 'rojo' ? c.danger : c.goldText }]} numberOfLines={2}>
              {urgente.nextDue
                ? `${urgente.nombre} ${vence(urgente.nextDue).toLowerCase()}`
                : `${urgente.nombre} sin registro`}
            </Text>
            <ChevronRight size={17} color={urgente.estado === 'rojo' ? c.danger : c.warning} strokeWidth={2.2} />
          </PressableScale>
        </View>
      )}

      {/* ─── Los datos vitales, uno por línea y sin cajas ─── */}
      <View style={s.datos}>
        {hasFinanzas && (
          <FilaDato
            label="Gasto del mes"
            valor={gastoDelMes ? formatMoney(gastoDelMes.total) : 'Sin gastos'}
            grafico={<Sparkline valores={serieGasto} color={c.brand} />}
            onPress={() => goto('finanzas')}
            s={s} c={c}
          />
        )}
        <FilaDato
          label={ultimoPeso ? `Último peso · ${fechaHumana(ultimoPeso.date)}` : 'Último peso'}
          valor={ultimoPeso ? `${Number(ultimoPeso.weight_kg)} kg` : 'Sin registros'}
          delta={deltaPeso != null && deltaPeso !== 0 ? `${deltaPeso > 0 ? '+' : ''}${Math.round(deltaPeso)}` : undefined}
          // Bajar de peso no es "malo" por sí solo, pero es lo que el dueño
          // quiere ver marcado: por eso el rojo va en la baja.
          deltaTono={deltaPeso != null && deltaPeso < 0 ? 'danger' : 'brand'}
          grafico={<Sparkline valores={seriePeso} color={c.brand} />}
          onPress={() => goto('sanidad')}
          s={s} c={c}
        />
        <FilaDato
          label="Rutina de hoy"
          valor={rutina ? `${rutina.hechas} de ${rutina.total}` : 'Sin cargar'}
          grafico={<AnilloProgreso hechas={rutina?.hechas ?? 0} total={rutina?.total ?? ROUTINE_ITEMS.length} c={c} />}
          onPress={() => goto('rutina')}
          s={s} c={c}
          isLast
        />
      </View>

      {/* ─── Fotos: tres miniaturas y el atajo al álbum ─── */}
      {fotos.length > 0 && (
        <View style={s.bloqueFotos}>
          <View style={s.bloqueHead}>
            <Text style={s.bloqueTitulo}>Fotos</Text>
            <TouchableOpacity onPress={() => goto('fotos')} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Ver las ${fotos.length} fotos`}>
              <Text style={s.bloqueLink}>{fotos.length > 3 ? `Ver las ${fotos.length}` : 'Ver todas'}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.fotosTira}>
            {fotos.slice(0, 3).map((f) => (
              <PressableScale
                key={f.id}
                style={s.fotoThumbWrap}
                onPress={() => goto('fotos')}
                accessibilityRole="imagebutton"
                accessibilityLabel={f.caption ?? 'Foto del caballo'}
              >
                <AppImage source={{ uri: f.url }} style={s.fotoThumb} />
              </PressableScale>
            ))}
          </View>
        </View>
      )}

      {/* ─── El resto de la ficha, en lista de opciones ───
          La maqueta muestra el resumen; estas secciones son la navegación
          profunda de la ficha y no tienen otra puerta de entrada. Finanzas,
          rutina y fotos no se repiten acá: ya tienen su fila arriba. */}
      <View style={s.sectionsList}>
        <SectionRow Icon={Clock} label="Historial" sub={!events?.length ? 'Sin registros' : undefined} onPress={() => goto('historial')} c={c} s={s} />
        <SectionRow Icon={Stethoscope} label="Sanidad" sub={!medicalRecords?.length ? 'Sin registros' : undefined} onPress={() => goto('sanidad')} c={c} s={s} />
        {fotos.length === 0 && <SectionRow Icon={Images} label="Fotos" sub="Sin fotos" onPress={() => goto('fotos')} c={c} s={s} />}
        <SectionRow Icon={Users} label="Equipo y veterinarios" sub={!horseVets?.length && !assignees?.length ? 'Sin asignaciones' : undefined} onPress={() => goto('equipo')} c={c} s={s} />
        <SectionRow Icon={FileText} label="Documentos" sub={!documents?.length ? 'Sin documentos' : undefined} onPress={() => goto('documentos')} c={c} s={s} />
        <SectionRow Icon={Network} label="Pedigrí" sub={horse.pedigree_status === 'unverified' ? 'Sin verificar' : undefined} onPress={() => goto('pedigree')} c={c} s={s} />
      </View>

      {/* ─── Menú de acciones ─── */}
      <ActionSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        acciones={[
          ...(can('horses', 'update') ? [
            { label: 'Cambiar foto', Icon: Camera, onPress: handlePickImage },
            { label: 'Editar caballo', Icon: Pencil, onPress: () => goto('editar') },
          ] : []),
          ...((user?.role === 'propietario' || can('auctions', 'create')) ? [{
            label: 'Publicar en venta',
            Icon: Megaphone,
            onPress: () => { haptic.medium(); nav.push(router, `${Routes.remateCrear}?horse=${horse.id}`); },
          }] : []),
          ...(can('horses', 'delete') ? [{
            label: 'Eliminar caballo',
            Icon: Trash2,
            destructiva: true,
            onPress: handleDelete,
          }] : []),
        ]}
      />

      {/* ─── Hoja QR ─── */}
      <BottomSheet visible={showQR} onClose={() => setShowQR(false)} title={horse.name}>
        <View style={{ paddingBottom: insets.bottom + space[2] }}>
          <View style={s.qrWrap}>
            <View style={s.qrInner}>
              {horse.public_token && (
                // Patron WhatsApp/Instagram: modulos casi negros (maxima lectura)
                // y la marca puesta como isotipo al centro, no tiñendo el codigo.
                <QRCode
                  value={`${PUBLIC_BASE}/caballo/${horse.public_token}`}
                  size={200}
                  color="#1c1917"
                  backgroundColor={colors.white}
                  ecl="H"
                  logo={require('../../../../assets/isotipo.png')}
                  logoSize={44}
                  logoBackgroundColor={colors.white}
                  logoBorderRadius={22}
                  logoMargin={4}
                />
              )}
            </View>
          </View>
          <Text style={s.qrHint}>Escaneá para ver el perfil público del caballo</Text>
          <View style={s.qrActions}>
            {/* Un solo CTA verde; copiar es un link de texto secundario */}
            <TouchableOpacity
              style={s.qrShareBtn}
              onPress={async () => {
                if (!horse.public_token) return;
                const url = `${PUBLIC_BASE}/caballo/${horse.public_token}`;
                try {
                  await Share.share({ message: `Mirá el perfil de ${horse.name} en HandicApp: ${url}`, url });
                } catch {
                  // usuario canceló
                }
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Compartir enlace público del caballo"
            >
              <Share2 size={15} color={colors.white} strokeWidth={2.2} />
              <Text style={s.qrShareBtnText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.qrLinkBtn}
              onPress={async () => {
                if (!horse.public_token) return;
                await Clipboard.setStringAsync(`${PUBLIC_BASE}/caballo/${horse.public_token}`);
                haptic.light();
                toast.success('Enlace copiado');
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copiar enlace público del caballo"
            >
              <Copy size={14} color={c.textMuted} strokeWidth={2} />
              <Text style={s.qrLinkBtnText}>Copiar enlace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* Hero */
  heroWrap: { width: '100%', aspectRatio: HERO_RATIO, position: 'relative', backgroundColor: c.surfaceAlt },
  heroPlaceholder: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderInitial: { fontSize: 80, fontWeight: weight.extrabold, color: c.textFaint },
  heroPill: {
    position: 'absolute', width: touch.min, height: touch.min, borderRadius: radius.thumb,
    // `c.overlay` es el scrim del sistema: oscurece lo justo para que el ícono
    // blanco se lea sobre cualquier foto, sin inventar un color nuevo.
    backgroundColor: c.overlay,
    justifyContent: 'center', alignItems: 'center',
  },
  heroPillStatic: { position: 'relative', top: undefined, left: undefined },
  heroActions: { position: 'absolute', right: space[4], flexDirection: 'row', gap: space[2] },
  heroContent: { position: 'absolute', bottom: 0, left: space[4], right: space[4], paddingBottom: space[5] },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  horseName: {
    flexShrink: 1,
    fontSize: text.display, fontWeight: weight.bold, letterSpacing: -1.2,
    color: colors.white, lineHeight: text.display + 4,
  },
  heroSub: { fontSize: text.sm, color: colors.white, opacity: 0.85, marginTop: space[1] + 2 },

  /* Accesos rápidos */
  accesos: { flexDirection: 'row', gap: space[2] + 1, paddingHorizontal: space[4], paddingTop: space[4] },
  acceso: {
    flex: 1, minHeight: 72, backgroundColor: c.surface, borderRadius: radius.button,
    alignItems: 'center', justifyContent: 'center', gap: space[2] - 1,
    // En oscuro la sombra no se ve: la jerarquía la da surface sobre bg.
    ...(c.isDark ? null : shadow.sm),
  },
  accesoLabel: { fontSize: text.xs, fontWeight: weight.medium, color: c.text },

  /* Aviso sanitario */
  avisoWrap: { paddingHorizontal: space[4], paddingTop: space[4] },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderRadius: radius.button, paddingHorizontal: space[4], paddingVertical: space[3] + 1 },
  avisoPunto: { width: 9, height: 9, borderRadius: radius.full },
  avisoText: { flex: 1, fontSize: text.base, fontWeight: weight.semibold },

  /* Filas de dato vital */
  datos: { paddingHorizontal: space[4], paddingTop: space[5] },
  filaDato: {
    flexDirection: 'row', alignItems: 'center', gap: space[4], paddingVertical: space[3] + 1,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  filaDatoLast: { borderBottomWidth: 0 },
  filaDatoLabel: { fontSize: text.xs + 1, color: c.textFaint },
  filaDatoValorRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] - 1, marginTop: 2 },
  filaDatoValor: { fontSize: text.lg - 2, fontWeight: weight.bold, letterSpacing: -0.6, color: c.text },
  filaDatoDelta: { fontSize: text.sm, fontWeight: weight.semibold },

  /* Bloque de fotos */
  bloqueFotos: { paddingHorizontal: space[4], paddingTop: space[5] },
  bloqueHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bloqueTitulo: { fontSize: text.md + 1, fontWeight: weight.bold, letterSpacing: -0.4, color: c.text },
  bloqueLink: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.brand },
  fotosTira: { flexDirection: 'row', gap: space[3] - 2, marginTop: space[3] },
  fotoThumbWrap: { flex: 1, height: 104, borderRadius: radius.field, overflow: 'hidden', backgroundColor: c.surfaceAlt },
  fotoThumb: { width: '100%', height: '100%' },

  /* Lista de secciones — patrón Más/Ajustes */
  sectionsList: { marginHorizontal: space[4], marginTop: space[6] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  /* Hoja QR */
  qrWrap: { alignItems: 'center', paddingTop: space[3], paddingBottom: space[5] - 2 },
  qrInner: { backgroundColor: colors.white, padding: space[4], borderRadius: radius.xl, ...shadow.sm },
  qrHint: { textAlign: 'center', fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted, paddingHorizontal: space[6], lineHeight: 18 },
  qrActions: { gap: space[3], marginTop: space[3] + 2 },
  qrLinkBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space[2] - 2, minHeight: touch.min },
  qrLinkBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  qrShareBtn: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space[2] - 2, borderRadius: radius.button, backgroundColor: c.brand, paddingVertical: space[4] },
  qrShareBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
