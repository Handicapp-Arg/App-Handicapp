import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Search, XCircle, Building2, Plus, ChevronRight } from 'lucide-react-native';
import api from '../../lib/api';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { useBoardingRequests, useCreateBoardingRequest } from '../../hooks/use-boarding-requests';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useToast } from '../../components/Toast';
import { Skeleton } from '../../components/Skeleton';
import { PressableScale } from '../../components/PressableScale';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch, shadow } from '../../styles/tokens';
import { entradaFila } from '../../styles/motion';
import { FormSheet } from '../../components/FormSheet';

interface DirectorioItem {
  id: string;
  name: string;
  horse_count: number;
}

function useDirectorio(search: string) {
  return useQuery<DirectorioItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
    staleTime: 60_000,
  });
}

function RequestModal({
  visible,
  establishment,
  onClose,
  c,
  s,
}: {
  visible: boolean;
  establishment: DirectorioItem | null;
  onClose: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  const { data: horses } = useHorses();
  const { data: requests } = useBoardingRequests();
  const create = useCreateBoardingRequest();
  const toast = useToast();
  const [horseId, setHorseId] = useState('');
  const [message, setMessage] = useState('');

  // El FormSheet ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!visible) return;
    setHorseId(''); setMessage('');
  }, [visible]);

  const alreadyRequested = (hId: string) =>
    establishment && requests?.some((r) => r.horse_id === hId && r.establishment_id === establishment.id && r.status === 'pending');

  const available = (horses ?? []).filter((h) => h.establishment_id !== establishment?.id);

  const handleSubmit = async () => {
    if (!horseId || !establishment) return;
    await create.mutateAsync({
      horse_id: horseId,
      establishment_id: establishment.id,
      message: message.trim() || undefined,
    });
    haptic.success();
    toast.success(`Solicitud enviada a ${establishment.name}`);
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Pedir lugar"
      footer={
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, { flex: 1 }, (!horseId || !available.length || create.isPending) && { opacity: 0.5 }]}
          disabled={!horseId || !available.length || create.isPending}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {create.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.btnPrimaryText}>Enviar el pedido</Text>
          }
        </TouchableOpacity>
      }
    >
      <>
        {establishment && (
          <Text style={s.modalDesc}>
            Le pedís lugar a{' '}
            <Text style={{ fontWeight: weight.bold }}>{establishment.name}</Text>{' '}
            para uno de tus caballos.
          </Text>
        )}

        <Text style={s.fieldLabel}>Caballo</Text>
        {!available.length ? (
          <Text style={s.emptyText}>No tenés caballos disponibles para alojar en esta caballeriza.</Text>
        ) : (
          <View>
            {available.map((h, i) => {
              const pending = alreadyRequested(h.id);
              const active = horseId === h.id;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[s.horseItem, i > 0 && s.horseItemBorde, pending && { opacity: 0.5 }]}
                  onPress={() => { if (!pending) { haptic.selection(); setHorseId(h.id); } }}
                  activeOpacity={0.6}
                  disabled={!!pending}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={h.name}
                >
                  <Text style={s.horseItemText}>
                    {h.name}{pending ? ' (pendiente)' : ''}
                  </Text>
                  {active && <Check size={19} color={c.brand} strokeWidth={2.4} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: space[2] + 2, marginTop: space[3] }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Mensaje (opcional): presentate brevemente..."
          placeholderTextColor={c.textFaint}
          multiline
        />
      </>
    </FormSheet>
  );
}

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requesting, setRequesting] = useState<DirectorioItem | null>(null);
  const { data, isLoading, isError, refetch, isRefetching } = useDirectorio(debouncedSearch);
  const { data: myRequests } = useBoardingRequests();
  const { data: horses } = useHorses();

  const isPropietario = user?.role === 'propietario';

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const pendingForEstab = (estabId: string) =>
    myRequests?.some((r) => r.establishment_id === estabId && r.status === 'pending');

  // "La tuya": la caballeriza donde ya están tus caballos. Sale de los caballos
  // propios, no de un campo del directorio (el backend no manda esa relación).
  const { miEstab, otras, misCaballos } = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const h of horses ?? []) {
      if (h.establishment_id) conteo.set(h.establishment_id, (conteo.get(h.establishment_id) ?? 0) + 1);
    }
    const lista = data ?? [];
    const mia = lista.find((e) => conteo.has(e.id)) ?? null;
    return {
      miEstab: mia,
      otras: mia ? lista.filter((e) => e.id !== mia.id) : lista,
      misCaballos: mia ? (conteo.get(mia.id) ?? 0) : 0,
    };
  }, [data, horses]);

  const pendientes = myRequests?.filter((r) => r.status === 'pending') ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={s.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
      >
        <ScreenHeader scrollable title="Caballerizas" showBack backTo={Routes.mas} />

        <View style={s.cuerpo}>
          {/* Buscador: campo blanco apoyado, sin borde. */}
          <View style={s.buscador}>
            <Search size={18} color={c.textFaint} strokeWidth={1.9} />
            <TextInput
              style={s.buscadorInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="Buscar por nombre"
              placeholderTextColor={c.textFaint}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearch(''); setDebouncedSearch(''); haptic.selection(); }}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                hitSlop={8}
              >
                <XCircle size={17} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {isPropietario && pendientes.length > 0 && (
            <Text style={s.avisoPendientes}>
              {pendientes.length === 1 ? 'Tenés un pedido esperando respuesta' : `Tenés ${pendientes.length} pedidos esperando respuesta`}
            </Text>
          )}

          {isError && !data ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            // Misma silueta: tarjeta de la tuya + filas con cajita y botón.
            <View style={{ marginTop: space[5] }}>
              <Skeleton width="100%" height={132} borderRadius={radius.card} />
              <View style={{ height: space[7] }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={[s.fila, i < 3 && s.filaDivisor]}>
                  <Skeleton width={44} height={44} borderRadius={radius.thumb} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="55%" height={15} />
                    <Skeleton width="35%" height={12} />
                  </View>
                  <Skeleton width={92} height={36} borderRadius={radius.full} />
                </View>
              ))}
            </View>
          ) : !data?.length ? (
            <EmptyState
              icon="business-outline"
              title={search ? 'Sin resultados' : 'Sin caballerizas'}
              message={search ? `No encontramos nada para "${search}".` : 'Todavía no hay caballerizas registradas.'}
            />
          ) : (
            <>
              {/* La tuya: única tarjeta de la pantalla, con el dato que importa. */}
              {miEstab && (
                <Animated.View entering={entradaFila(0)} style={s.tarjeta}>
                  <View style={s.tarjetaFila}>
                    <View style={[s.cajita, s.cajitaDestacada]}>
                      <Building2 size={22} color={c.info} strokeWidth={1.9} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.tarjetaTituloFila}>
                        <Text style={s.tarjetaTitulo} numberOfLines={1}>{miEstab.name}</Text>
                        <View style={s.chipTuya}>
                          <Text style={s.chipTuyaText}>La tuya</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={s.tarjetaDatos}>
                    <Text style={s.dato}>
                      <Text style={s.datoNumero}>{misCaballos}</Text>
                      <Text style={s.datoRotulo}>{misCaballos === 1 ? ' caballo tuyo' : ' caballos tuyos'}</Text>
                    </Text>
                    <View style={s.datoSeparador} />
                    <Text style={s.dato}>
                      <Text style={s.datoNumero}>{miEstab.horse_count}</Text>
                      <Text style={s.datoRotulo}> en total</Text>
                    </Text>
                  </View>
                </Animated.View>
              )}

              {otras.length > 0 && (
                <>
                  <Text style={s.grupo}>{miEstab ? 'Otras caballerizas' : 'Caballerizas'}</Text>
                  {otras.map((item, i) => {
                    const hasPending = pendingForEstab(item.id);
                    return (
                      <Animated.View key={item.id} entering={entradaFila(i + 1)} style={[s.fila, i < otras.length - 1 && s.filaDivisor]}>
                        <View style={s.cajita}>
                          <Building2 size={20} color={c.textMuted} strokeWidth={1.9} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.filaTitulo} numberOfLines={1}>{item.name}</Text>
                          <Text style={s.filaMeta} numberOfLines={1}>
                            {item.horse_count === 0
                              ? 'Sin caballos alojados'
                              : `${item.horse_count} caballo${item.horse_count !== 1 ? 's' : ''} en pensión`}
                          </Text>
                        </View>
                        {isPropietario && (
                          hasPending ? (
                            <Text style={s.filaPendiente}>Pedido enviado</Text>
                          ) : (
                            <PressableScale
                              style={s.pedirBtn}
                              onPress={() => { haptic.medium(); setRequesting(item); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Pedir lugar en ${item.name}`}
                            >
                              <Text style={s.pedirBtnText}>Pedir lugar</Text>
                            </PressableScale>
                          )
                        )}
                      </Animated.View>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Atajo al código de invitación: es la otra forma de entrar. */}
          <PressableScale
            style={s.tarjetaCodigo}
            onPress={() => { haptic.light(); router.push(Routes.unirme as never); }}
            accessibilityRole="button"
            accessibilityLabel="Unirme con un código de invitación"
          >
            <View style={[s.cajita, { backgroundColor: c.brandSoft }]}>
              <Plus size={20} color={c.brand} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.codigoTitulo}>¿Te invitaron con un código?</Text>
              <Text style={s.codigoMeta}>Sumate directo a esa caballeriza</Text>
            </View>
            <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
          </PressableScale>
        </View>
      </ScrollView>

      <RequestModal visible={!!requesting} establishment={requesting} onClose={() => setRequesting(null)} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  contenido: { paddingBottom: 120 },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: space[2] + 2,
    height: touch.field - 8, paddingHorizontal: space[4],
    backgroundColor: c.surface, borderRadius: radius.thumb, ...(c.isDark ? {} : shadow.sm),
  },
  buscadorInput: { flex: 1, fontSize: text.base, color: c.text, height: '100%' },
  avisoPendientes: { fontSize: text.sm, color: c.goldText, marginTop: space[3] },

  tarjeta: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4], marginTop: space[5], ...(c.isDark ? {} : shadow.md) },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tarjetaTituloFila: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tarjetaTitulo: { flexShrink: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  chipTuya: { borderRadius: radius.full, paddingHorizontal: space[2], paddingVertical: 2, backgroundColor: c.brandSoft },
  chipTuyaText: { fontSize: text.xs, fontWeight: weight.bold, color: c.brand },
  tarjetaDatos: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[4] },
  dato: { fontSize: text.sm },
  datoNumero: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  datoRotulo: { fontSize: text.sm, color: c.textFaint },
  datoSeparador: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: c.border },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[6], marginBottom: space[1] },

  cajita: { width: 44, height: 44, borderRadius: radius.thumb, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cajitaDestacada: { width: 48, height: 48, backgroundColor: c.infoSoft },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaTitulo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  filaPendiente: { fontSize: text.sm, color: c.textFaint },
  // Pastilla neutra: el verde se reserva para el CTA de la hoja.
  pedirBtn: { height: 36, paddingHorizontal: space[3] + 2, borderRadius: radius.full, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  pedirBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  tarjetaCodigo: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.card, padding: space[4],
    marginTop: space[6], ...(c.isDark ? {} : shadow.sm),
  },
  codigoTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  codigoMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  // Hoja de pedido (FormSheet)
  modalDesc: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  emptyText: { fontSize: text.sm, color: c.textFaint },
  horseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], minHeight: touch.min + 6, paddingHorizontal: space[1] },
  horseItemBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  horseItemText: { flex: 1, fontSize: text.md, color: c.text, letterSpacing: -0.2 },
  input: { borderRadius: radius.field, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: radius.button, height: touch.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});
