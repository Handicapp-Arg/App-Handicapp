import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileSignature, Check, ChevronRight, X } from 'lucide-react-native';
import { useContracts, type Contract } from '../../../hooks/use-contracts';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { haptic } from '../../../lib/haptics';
import { fechaHumana } from '../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';

/**
 * Qué le falta al contrato, contado desde el lado de quien mira. Es la única
 * lógica de esta pantalla: el resto es presentación.
 */
function estadoDeFirma(ct: Contract, esPropietario: boolean) {
  const firmoProp = !!ct.signed_at;
  const firmoEstab = !!ct.establishment_signed_at;
  const meFalta = esPropietario ? !firmoProp : !firmoEstab;
  const laOtraFirmo = esPropietario ? firmoEstab : firmoProp;
  return { firmoProp, firmoEstab, meFalta, laOtraFirmo };
}

/** Tarjeta de los que esperan una firma: es contenido autónomo, lleva superficie. */
function TarjetaPendiente({ ct, index, esPropietario, onPress, c, s }: {
  ct: Contract; index: number; esPropietario: boolean; onPress: () => void; c: ThemeColors; s: Styles;
}) {
  const { meFalta, laOtraFirmo } = estadoDeFirma(ct, esPropietario);
  const contraparte = esPropietario ? ct.establishment?.name : ct.owner?.name;

  return (
    <Animated.View entering={entradaFila(index)}>
      <PressableScale
        style={s.tarjeta}
        onPress={() => { haptic.selection(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`Ver contrato ${ct.title}`}
      >
        <View style={s.tarjetaFila}>
          <View style={[s.cajita, { backgroundColor: c.goldSoft }]}>
            <FileSignature size={21} color={c.goldText} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.tarjetaTitulo} numberOfLines={1}>{ct.title}</Text>
            {!!contraparte && <Text style={s.tarjetaMeta} numberOfLines={1}>{contraparte}</Text>}
          </View>
        </View>

        <View style={s.tarjetaPie}>
          <View style={s.pieIzq}>
            {laOtraFirmo && <Check size={17} color={c.brand} strokeWidth={2.3} />}
            <Text style={s.pieTexto} numberOfLines={1}>
              {laOtraFirmo
                ? (esPropietario ? 'Firmó la caballeriza' : 'Firmó el propietario')
                : `Sin firmar · ${fechaHumana(ct.created_at)}`}
            </Text>
          </View>
          <View style={[s.chip, { backgroundColor: meFalta ? c.goldSoft : c.brandSoft }]}>
            <Text style={[s.chipText, { color: meFalta ? c.goldText : c.brand }]}>
              {meFalta ? 'Falta tu firma' : 'Ya firmaste'}
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Fila plana del historial: el contrato cerrado ya no pide nada. */
function FilaHistorial({ ct, index, esPropietario, ultima, onPress, c, s }: {
  ct: Contract; index: number; esPropietario: boolean; ultima: boolean; onPress: () => void; c: ThemeColors; s: Styles;
}) {
  const firmado = ct.status === 'signed';
  const contraparte = esPropietario ? ct.establishment?.name : ct.owner?.name;
  const detalle = firmado
    ? `Firmado ${fechaHumana(ct.signed_at ?? ct.establishment_signed_at ?? ct.created_at)}`
    : ct.rejection_reason
      ? `Rechazado · ${ct.rejection_reason}`
      : 'Rechazado';

  return (
    <Animated.View entering={entradaFila(index)}>
      <PressableScale
        style={[s.fila, !ultima && s.filaDivisor]}
        onPress={() => { haptic.selection(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`Ver contrato ${ct.title}`}
      >
        <View style={[s.cajita, { backgroundColor: firmado ? c.successSoft : c.surfaceAlt }]}>
          {firmado
            ? <Check size={20} color={c.success} strokeWidth={2.3} />
            : <X size={20} color={c.textFaint} strokeWidth={2} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.filaTitulo, !firmado && { color: c.textMuted }]} numberOfLines={1}>{ct.title}</Text>
          <Text style={s.filaMeta} numberOfLines={1}>
            {contraparte ? `${contraparte} · ` : ''}{detalle}
          </Text>
        </View>
        <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
      </PressableScale>
    </Animated.View>
  );
}

export default function ContratosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: contracts, isLoading, isError, refetch, isRefetching } = useContracts();

  const isEstab = user?.role === 'establecimiento' || user?.role === 'admin';
  const esPropietario = !isEstab;

  const pendientes = contracts?.filter((ct) => ct.status === 'pending') ?? [];
  const historial = contracts?.filter((ct) => ct.status !== 'pending') ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
      >
        <ScreenHeader
          scrollable
          title="Contratos"
          showBack
          backTo={Routes.mas}
          right={isEstab ? (
            <HeaderButton label="Nuevo" onPress={() => { haptic.medium(); router.push(Routes.contratoNuevo as never); }} />
          ) : undefined}
        />

        <View style={s.cuerpo}>
          {isLoading ? (
            // Misma silueta: rótulo, una tarjeta y tres filas con cajita.
            <>
              <Skeleton width={120} height={14} />
              <View style={{ height: space[3] }} />
              <Skeleton width="100%" height={132} borderRadius={radius.card} />
              <View style={{ height: space[7] }} />
              <Skeleton width={90} height={14} />
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={[s.fila, i < 2 && s.filaDivisor]}>
                  <Skeleton width={42} height={42} borderRadius={radius.thumb} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="60%" height={15} />
                    <Skeleton width="40%" height={12} />
                  </View>
                </View>
              ))}
            </>
          ) : isError && !contracts?.length ? (
            <ErrorState onRetry={refetch} />
          ) : !contracts?.length ? (
            <EmptyState
              icon="document-text-outline"
              title="Sin contratos"
              message={isEstab ? 'Creá un contrato digital para que el propietario lo firme desde la app.' : 'No tenés contratos pendientes por el momento.'}
            />
          ) : (
            <>
              {pendientes.length > 0 && (
                <>
                  <Text style={s.grupo}>Te esperan a vos</Text>
                  <View style={{ gap: space[3] }}>
                    {pendientes.map((ct, i) => (
                      <TarjetaPendiente
                        key={ct.id} ct={ct} index={i} esPropietario={esPropietario}
                        onPress={() => router.push(Routes.contrato(ct.id) as never)}
                        c={c} s={s}
                      />
                    ))}
                  </View>
                </>
              )}

              {historial.length > 0 && (
                <>
                  <Text style={[s.grupo, pendientes.length > 0 && { marginTop: space[7] }]}>
                    {historial.some((ct) => ct.status === 'signed') ? 'Firmados' : 'Cerrados'}
                  </Text>
                  {historial.map((ct, i) => (
                    <FilaHistorial
                      key={ct.id} ct={ct} index={pendientes.length + i} esPropietario={esPropietario}
                      ultima={i === historial.length - 1}
                      onPress={() => router.push(Routes.contrato(ct.id) as never)}
                      c={c} s={s}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  contenido: { paddingBottom: 120 },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginBottom: space[3] },

  tarjeta: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4] + 2, ...(c.isDark ? {} : shadow.md) },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tarjetaTitulo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  tarjetaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  tarjetaPie: { flexDirection: 'row', alignItems: 'center', gap: space[2] + 2, marginTop: space[3] + 2 },
  pieIzq: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pieTexto: { flex: 1, fontSize: text.sm, color: c.textMuted },
  chip: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] + 2 },
  chipText: { fontSize: text.xs, fontWeight: weight.semibold },

  cajita: { width: 42, height: 42, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaTitulo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
});
