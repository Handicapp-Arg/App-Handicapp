import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Lock, ShieldCheck, FileText, MoreVertical, Trash2 } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import {
  useMedicalRecords, useDeleteMedicalRecord, useDownloadMedicalPdf, useDownloadHealthCertificate,
  MEDICAL_TYPE_LABELS, makeMedicalTypeColors, SANITARY_DISEASES, healthStatusFromNextDue,
  type HealthStatus,
} from '../../../../hooks/use-medical';
import { useHorse, useWeightRecords, useAddWeightRecord } from '../../../../hooks/use-horses';
import { usePlanStatus } from '../../../../hooks/use-plan';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { DatePicker } from '../../../../components/DatePicker';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, vence } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { FormSheet } from '../../../../components/FormSheet';
import { ActionSheet } from '../../../../components/ActionSheet';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';
import { todayISO } from '../../../../hooks/use-routines';
import { Routes, nav } from '../../../../lib/routes';

const RING = 96;          // diámetro del anillo del resumen
const RING_STROKE = 11;   // grosor del arco

/**
 * Anillo de estado sanitario: un arco por cada estado, proporcional a cuántas
 * enfermedades de la libreta están en él. Se dibuja con SVG y no con tres Views
 * porque un `conic-gradient` no existe en React Native y las tres franjas tienen
 * que cerrar el círculo exacto, sin costuras.
 */
function AnilloSanidad({ verde, amarillo, rojo, c }: { verde: number; amarillo: number; rojo: number; c: ThemeColors }) {
  const total = Math.max(verde + amarillo + rojo, 1);
  const r = (RING - RING_STROKE) / 2;
  const circ = 2 * Math.PI * r;
  // Cada arco arranca donde terminó el anterior: el offset acumula la fracción ya dibujada.
  const arcos = [
    { n: verde, color: c.success },
    { n: amarillo, color: c.warning },
    { n: rojo, color: c.danger },
  ];
  let acumulado = 0;

  return (
    <View style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING}>
        {arcos.map((a, i) => {
          const largo = (a.n / total) * circ;
          const offset = -acumulado;
          acumulado += largo;
          if (a.n === 0) return null;
          return (
            <Circle
              key={i}
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              stroke={a.color}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${largo} ${circ - largo}`}
              strokeDashoffset={offset}
              // -90° para que el círculo arranque arriba y no a las 3 en punto.
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const ESTADO_LABEL: Record<HealthStatus, string> = {
  verde: 'Vigentes',
  amarillo: 'Por vencer',
  rojo: 'Vencidas',
};

export default function SanidadScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);
  const medicalColors = makeMedicalTypeColors(c);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: medicalRecords } = useMedicalRecords(id);
  const deleteMedical = useDeleteMedicalRecord(id);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadMedicalPdf(id, horse?.name ?? '');
  const { download: downloadCert, loading: certLoading } = useDownloadHealthCertificate(id, horse?.name ?? '');
  const { data: planStatus } = usePlanStatus();
  const isApprovedVet = user?.role === 'veterinario' && user?.vet_license_status === 'approved';
  const canCertify = isApprovedVet && (planStatus?.features?.includes('libreta_digital') ?? false);

  const { data: weightRecords } = useWeightRecords(id);
  const addWeight = useAddWeightRecord(id);

  const today = todayISO();
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(today);
  const [medMenuRecord, setMedMenuRecord] = useState<{ id: string; name: string } | null>(null);

  /**
   * La libreta se resuelve una sola vez: cada enfermedad oficial cruzada con el
   * último registro de tipo "sanidad" que le coincida. De acá salen tanto las
   * filas como los números del anillo, para que nunca se contradigan.
   */
  const libreta = useMemo(() => {
    const sanidad = medicalRecords?.filter((r) => r.type === 'sanidad') ?? [];
    return SANITARY_DISEASES.map((d) => {
      const last = sanidad.find((r) => d.match.test(r.name)) ?? null;
      const nextDue = last?.next_due ?? null;
      return { ...d, nextDue, estado: healthStatusFromNextDue(nextDue) };
    });
  }, [medicalRecords]);

  const conteo = useMemo(() => ({
    verde: libreta.filter((l) => l.estado === 'verde').length,
    amarillo: libreta.filter((l) => l.estado === 'amarillo').length,
    rojo: libreta.filter((l) => l.estado === 'rojo').length,
  }), [libreta]);

  // El registro médico (formulario de varios campos) es una pantalla empujada:
  // ./sanidad-nuevo.tsx. La hoja de peso (1 campo) se queda como hoja.
  const irANuevoRegistro = (prefill?: { type: string; name: string }) => {
    haptic.light();
    const base = Routes.caballoSanidadNuevo(id);
    const url = prefill
      ? `${base}?type=${encodeURIComponent(prefill.type)}&name=${encodeURIComponent(prefill.name)}`
      : base;
    nav.push(router, url);
  };

  useEffect(() => {
    if (!showAddWeight) return;
    setNewWeight('');
    setNewWeightDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddWeight]);

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Sanidad" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Misma silueta que el contenido real: anillo + tres líneas de leyenda,
    // título de sección y filas. Así no salta nada cuando llega la respuesta.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Sanidad" />
        <View style={s.resumen}>
          <Skeleton width={RING} height={RING} borderRadius={radius.full} />
          <View style={{ flex: 1, gap: space[3] }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={14} />)}
          </View>
        </View>
        <View style={{ paddingHorizontal: space[4], marginTop: space[8], gap: space[5] }}>
          <Skeleton width={160} height={20} />
          {[1, 2, 3].map((i) => <Skeleton key={i} height={38} />)}
        </View>
      </View>
    );
  }

  const puedeEditar = can('horses', 'update');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Sanidad" subtitle={horse.name} />
      {/* El historial médico puede tener decenas de registros: es la ÚNICA
          lista larga de la pantalla, así que la pantalla entera es una FlatList
          que lo virtualiza y todo lo demás (resumen, libreta, peso) viaja como
          encabezado. Antes era un `.map()` dentro de un ScrollView: montaba
          todos los registros de una, cada uno con su animación de entrada. */}
      <FlatList
        style={{ flex: 1 }}
        data={medicalRecords ?? []}
        keyExtractor={(rec) => rec.id}
        // El CTA flota abajo: el contenido reserva su alto para que la última
        // fila no quede escondida detrás del botón.
        contentContainerStyle={{ paddingBottom: insets.bottom + space[20] }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={7}
        renderItem={({ item: rec, index }) => {
          const mc = medicalColors[rec.type] ?? medicalColors.tratamiento;
          const dueStatus = rec.next_due ? healthStatusFromNextDue(rec.next_due) : null;
          const dueColor = dueStatus === 'rojo' ? c.danger : dueStatus === 'amarillo' ? c.warning : c.textFaint;
          const esUltimo = index === (medicalRecords?.length ?? 0) - 1;
          return (
            // Sin `entering` por ítem: la lista recicla celdas al scrollear y la
            // animación se volvería a disparar sobre vistas reusadas.
            <View style={s.lista}>
              <View style={[s.medFila, !esUltimo && s.filaBorde]}>
                <View style={[s.medIcono, { backgroundColor: mc.bg }]}>
                  <FileText size={18} color={mc.text} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.filaNombre} numberOfLines={1}>{rec.name}</Text>
                  <Text style={s.filaSub} numberOfLines={1}>
                    {MEDICAL_TYPE_LABELS[rec.type] ?? rec.type} · {fechaHumana(rec.date)}
                  </Text>
                  {rec.next_due && (
                    <Text style={[s.medVence, { color: dueColor }]}>{vence(rec.next_due)}</Text>
                  )}
                  {rec.notes && <Text style={s.medNotas} numberOfLines={2}>{rec.notes}</Text>}
                </View>
                {puedeEditar && (
                  <PressableScale
                    onPress={() => { haptic.selection(); setMedMenuRecord({ id: rec.id, name: rec.name }); }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Más opciones de ${rec.name}`}
                  >
                    <MoreVertical size={20} color={c.textFaint} strokeWidth={2} />
                  </PressableScale>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.lista}>
            <EmptyState
              icon="medkit-outline"
              title="Sin registros médicos"
              message="Agregá vacunas, desparasitaciones y tratamientos."
            />
          </View>
        }
        ListHeaderComponent={
          <>
        {/* ─── Resumen: anillo + leyenda ───
            Sin `entering`: la pantalla ya entra con la transición del stack. */}
        <View style={s.resumen}>
          <View style={s.anilloWrap}>
            <AnilloSanidad verde={conteo.verde} amarillo={conteo.amarillo} rojo={conteo.rojo} c={c} />
            <View style={s.anilloCentro}>
              <Text style={s.anilloValor}>{conteo.verde}/{libreta.length}</Text>
              <Text style={s.anilloCaption}>al día</Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: space[3] }}>
            {(['rojo', 'amarillo', 'verde'] as HealthStatus[]).map((estado) => (
              <View key={estado} style={s.leyendaRow}>
                <View style={[s.leyendaDot, { backgroundColor: estado === 'rojo' ? c.danger : estado === 'amarillo' ? c.warning : c.success }]} />
                <Text style={s.leyendaLabel}>{ESTADO_LABEL[estado]}</Text>
                <Text style={s.leyendaValor}>{conteo[estado]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Libreta sanitaria ─── */}
        <View style={s.tituloRow}>
          <Text style={s.tituloSeccion}>Libreta sanitaria</Text>
          {puedeEditar && (
            <PressableScale
              onPress={() => irANuevoRegistro()}
              style={s.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Agregar un registro sanitario"
            >
              <Text style={s.linkBtnText}>Agregar</Text>
            </PressableScale>
          )}
        </View>

        <View style={s.lista}>
          {libreta.map((d, i) => {
            const vencida = d.estado === 'rojo';
            const dotColor = vencida ? c.danger : d.estado === 'amarillo' ? c.warning : c.success;
            return (
              // Fila quieta: las 5 filas de la libreta no necesitan su propia
              // animación de entrada encima de la transición de la pantalla.
              <View key={d.key}>
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => puedeEditar && irANuevoRegistro({ type: 'sanidad', name: d.name })}
                  disabled={!puedeEditar}
                  style={[s.fila, i < libreta.length - 1 && s.filaBorde]}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.name}, ${ESTADO_LABEL[d.estado].toLowerCase()}`}
                >
                  <View style={[s.filaDot, { backgroundColor: dotColor }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.filaNombre} numberOfLines={1}>{d.name}</Text>
                    <Text style={[s.filaSub, vencida && { color: c.danger }]} numberOfLines={1}>
                      {d.nextDue ? vence(d.nextDue) : 'Sin registro'}
                    </Text>
                  </View>
                  {vencida && puedeEditar ? (
                    // La acción urgente se muestra como pastilla de tinta: es la
                    // única fila que pide algo, y se tiene que notar.
                    <View style={s.pildoraTinta}>
                      <Text style={s.pildoraTintaText}>Certificar</Text>
                    </View>
                  ) : (
                    <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
                  )}
                </PressableScale>
              </View>
            );
          })}
        </View>

        {isApprovedVet && (
          <PressableScale
            style={[s.secundario, !canCertify && { opacity: 0.6 }]}
            disabled={certLoading || !canCertify}
            onPress={() => {
              if (!canCertify) {
                toast.error('Certificado no disponible. Requiere plan Pro + matrícula aprobada.');
                return;
              }
              haptic.light();
              downloadCert();
            }}
            accessibilityRole="button"
            accessibilityLabel="Emitir certificado sanitario"
          >
            {canCertify
              ? <ShieldCheck size={17} color={c.text} strokeWidth={2} />
              : <Lock size={16} color={c.textMuted} strokeWidth={2} />}
            <Text style={s.secundarioText}>{certLoading ? 'Emitiendo…' : 'Emitir certificado'}</Text>
          </PressableScale>
        )}

        {/* ─── Peso y condición ─── */}
        <View style={s.tituloRow}>
          <Text style={s.tituloSeccion}>Peso y condición</Text>
          {puedeEditar && (
            <PressableScale
              onPress={() => { haptic.light(); setShowAddWeight(true); }}
              style={s.linkBtn}
              accessibilityRole="button"
              accessibilityLabel="Registrar un peso"
            >
              <Text style={s.linkBtnText}>Registrar</Text>
            </PressableScale>
          )}
        </View>

        {!weightRecords?.length ? (
          <View style={s.lista}>
            <EmptyState
              icon="scale-outline"
              title="Sin registros de peso"
              message="Registrá el primer peso para seguir la condición del caballo."
            />
          </View>
        ) : (
          <View style={s.lista}>
            {/* Un solo dato hero: el último peso. Los anteriores son contexto. */}
            <View style={s.pesoHero}>
              <Text style={s.pesoValor}>{Number(weightRecords[0].weight_kg)} kg</Text>
              <Text style={s.pesoMeta}>
                {fechaHumana(weightRecords[0].date)}
                {weightRecords[0].body_condition ? ` · CC ${weightRecords[0].body_condition}/9` : ''}
              </Text>
            </View>
            {weightRecords.slice(1, 6).map((r, i, arr) => (
              <View key={r.id} style={[s.filaChica, i < arr.length - 1 && s.filaBorde]}>
                <Text style={s.filaChicaValor}>{Number(r.weight_kg)} kg</Text>
                <Text style={s.filaSub}>{fechaHumana(r.date)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── Historial médico ─── */}
        <View style={s.tituloRow}>
          <Text style={s.tituloSeccion}>Historial médico</Text>
          <Text style={s.tituloMeta}>{medicalRecords?.length ?? 0} registros</Text>
        </View>
          </>
        }
      />

      {/* ─── CTA fijo: descargar la libreta ─── */}
      {/* El degradado apaga el contenido debajo del botón en vez de cortarlo en seco. */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', c.bg]}
        style={[s.velo, { height: insets.bottom + space[20] }]}
      />
      <View style={[s.ctaWrap, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={s.cta}
          disabled={pdfLoading}
          onPress={() => { haptic.light(); downloadPdf(); }}
          accessibilityRole="button"
          accessibilityLabel="Descargar la libreta sanitaria en PDF"
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color={c.bg} />
            : <>
                <FileText size={19} color={c.bg} strokeWidth={1.9} />
                <Text style={s.ctaText}>Descargar la libreta</Text>
              </>}
        </PressableScale>
      </View>

      {/* ─── Hoja agregar peso ─── */}
      <FormSheet
        visible={showAddWeight}
        onClose={() => setShowAddWeight(false)}
        title="Registrar peso"
        footer={
          <PressableScale
            style={[s.btnPrimary, { flex: 1 }, (!newWeight || addWeight.isPending) && { opacity: 0.6 }]}
            disabled={!newWeight || addWeight.isPending}
            onPress={async () => {
              await addWeight.mutateAsync({ weight_kg: newWeight, date: newWeightDate });
              setShowAddWeight(false);
              haptic.success();
              toast.success('Peso registrado');
            }}
            accessibilityRole="button"
            accessibilityLabel="Guardar peso registrado"
          >
            {addWeight.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.btnPrimaryText}>Guardar</Text>}
          </PressableScale>
        }
      >
        <TextInput
          style={s.input}
          value={newWeight}
          onChangeText={setNewWeight}
          placeholder="Peso en kg, ej: 450.0"
          placeholderTextColor={c.textFaint}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        <DatePicker label="Fecha" value={newWeightDate} onChange={setNewWeightDate} maxDate={new Date()} />
      </FormSheet>

      {/* ─── Menú de acciones del registro médico ─── */}
      <ActionSheet
        visible={!!medMenuRecord}
        onClose={() => setMedMenuRecord(null)}
        title={medMenuRecord?.name}
        acciones={[
          {
            label: 'Eliminar',
            Icon: Trash2,
            destructiva: true,
            onPress: () => { if (medMenuRecord) { haptic.medium(); deleteMedical.mutate(medMenuRecord.id); } },
          },
        ]}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* Resumen */
  resumen: { flexDirection: 'row', alignItems: 'center', gap: space[5], paddingHorizontal: space[4], paddingTop: space[5] },
  anilloWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  anilloCentro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  anilloValor: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  anilloCaption: { fontSize: text.xs - 1, color: c.textFaint, marginTop: 3 },
  leyendaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] + 1 },
  leyendaDot: { width: 8, height: 8, borderRadius: radius.full },
  leyendaLabel: { flex: 1, fontSize: text.base - 1, color: c.textMuted },
  leyendaValor: { fontSize: text.base - 1, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  /* Secciones */
  tituloRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4], marginTop: space[8], marginBottom: space[1],
  },
  tituloSeccion: { fontSize: text.md + 1, fontWeight: weight.bold, color: c.text, letterSpacing: -0.4 },
  tituloMeta: { fontSize: text.sm, color: c.textFaint },
  linkBtn: { minHeight: touch.min, justifyContent: 'center', paddingLeft: space[3] },
  linkBtnText: { fontSize: text.base - 1, fontWeight: weight.semibold, color: c.brand },

  /* Filas planas sobre el lienzo: solo un hairline las separa. */
  lista: { paddingHorizontal: space[4] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  filaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaDot: { width: 10, height: 10, borderRadius: radius.full },
  filaNombre: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaSub: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  filaChica: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[3] },
  filaChicaValor: { fontSize: text.base, fontWeight: weight.semibold, color: c.text, fontVariant: ['tabular-nums'] },

  pildoraTinta: { height: 36, paddingHorizontal: space[3] + 2, borderRadius: radius.full, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  pildoraTintaText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.bg },

  secundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    marginHorizontal: space[4], marginTop: space[4],
    height: touch.field, borderRadius: radius.field, backgroundColor: c.surfaceAlt,
  },
  secundarioText: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },

  /* Peso */
  pesoHero: { paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  pesoValor: { fontSize: text.xl, fontWeight: weight.bold, color: c.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  pesoMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 3 },

  /* Historial médico */
  medFila: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  medIcono: { width: 40, height: 40, borderRadius: radius.thumb - 2, alignItems: 'center', justifyContent: 'center' },
  medVence: { fontSize: text.sm, marginTop: 3, fontWeight: weight.medium },
  medNotas: { fontSize: text.sm, color: c.textFaint, marginTop: 3 },

  /* CTA */
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaWrap: { position: 'absolute', left: space[4], right: space[4], bottom: 0 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] + 1,
    height: touch.button, borderRadius: radius.button, backgroundColor: c.text,
    ...(c.isDark ? {} : shadow.lg),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg },

  /* Hoja de peso */
  input: {
    height: touch.field, borderRadius: radius.field, paddingHorizontal: space[4],
    fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt,
  },
  btnPrimary: { height: touch.button, borderRadius: radius.button, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
