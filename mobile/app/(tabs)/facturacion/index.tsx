import { useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, Check, AlertCircle, type LucideIcon } from 'lucide-react-native';
import { useBills, STATUS_META, monthLabel, type Bill } from '../../../hooks/use-billing';
import { formatMoney } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { haptic } from '../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';

/**
 * Cada estado tiene su cajita de ícono: el color dice de un vistazo si la
 * factura está esperando algo tuyo, ya está cerrada o la observaste. Sale todo
 * del theme (STATUS_META trae hex fijos que no son dark-safe).
 */
const ESTADO = {
  borrador:  { Icon: FileText as LucideIcon,    fondo: (c: ThemeColors) => c.surfaceAlt, tinta: (c: ThemeColors) => c.textMuted },
  enviada:   { Icon: FileText as LucideIcon,    fondo: (c: ThemeColors) => c.goldSoft,   tinta: (c: ThemeColors) => c.goldText },
  aprobada:  { Icon: Check as LucideIcon,       fondo: (c: ThemeColors) => c.successSoft, tinta: (c: ThemeColors) => c.success },
  disputada: { Icon: AlertCircle as LucideIcon, fondo: (c: ThemeColors) => c.dangerSoft, tinta: (c: ThemeColors) => c.danger },
} as const;

type EstadoBill = keyof typeof ESTADO;
const estadoDe = (b: Bill): EstadoBill => (ESTADO[b.status as EstadoBill] ? (b.status as EstadoBill) : 'borrador');

function FilaFactura({ bill, index, ultima, c, s }: {
  bill: Bill; index: number; ultima: boolean; c: ThemeColors; s: Styles;
}) {
  const router = useRouter();
  const est = ESTADO[estadoDe(bill)];
  const { Icon } = est;
  const aprobada = bill.status === 'aprobada';

  return (
    <Animated.View entering={entradaFila(index)}>
      <PressableScale
        style={[s.fila, !ultima && s.filaDivisor]}
        onPress={() => { haptic.selection(); router.push(Routes.factura(bill.id) as never); }}
        accessibilityRole="button"
        accessibilityLabel={`Factura de ${bill.horse?.name ?? 'caballo'}, ${monthLabel(bill.month, bill.year)}`}
      >
        <View style={[s.cajita, { backgroundColor: est.fondo(c) }]}>
          <Icon size={20} color={est.tinta(c)} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.filaTitulo} numberOfLines={1}>{bill.horse?.name ?? 'Factura'}</Text>
          <Text style={s.filaMeta} numberOfLines={1}>{monthLabel(bill.month, bill.year)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {/* La aprobada apaga el monto: ya no pide nada, es historial. */}
          <Text style={[s.filaMonto, aprobada && { color: c.textMuted }]}>{formatMoney(bill.total, bill.currency)}</Text>
          {!aprobada && (
            <Text style={[s.filaEstado, { color: est.tinta(c) }]}>{STATUS_META[bill.status]?.label ?? ''}</Text>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export default function FacturacionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: bills, isLoading, isError, refetch, isRefetching } = useBills();

  const isEst = user?.role === 'establecimiento';

  // Sin aprobar = todo lo que todavía espera una decisión (borrador, enviada,
  // observada). Aprobadas = historial. El backend no manda vencimiento ni
  // emisor, así que la fila no los muestra.
  const { pendientes, aprobadas, totalPendiente } = useMemo(() => {
    const pend = (bills ?? []).filter((b) => b.status !== 'aprobada');
    const apro = (bills ?? []).filter((b) => b.status === 'aprobada');
    return {
      pendientes: pend,
      aprobadas: apro,
      totalPendiente: pend.reduce((acc, b) => acc + (b.total ?? 0), 0),
    };
  }, [bills]);

  const headerRight = isEst
    ? <HeaderButton label="Nueva" onPress={() => { haptic.light(); router.push(Routes.facturacionNueva as never); }} />
    : undefined;

  const header = <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />;

  const refresco = (
    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={s.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={refresco}
      >
        {header}

        {isLoading ? (
          // El esqueleto copia la silueta real: hero + dos filas con cajita.
          <View style={s.cuerpo}>
            <Skeleton width="100%" height={132} borderRadius={radius.card} />
            <View style={{ height: space[6] }} />
            <Skeleton width={96} height={14} />
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={[s.fila, i < 4 && s.filaDivisor]}>
                <Skeleton width={42} height={42} borderRadius={radius.thumb} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="35%" height={12} />
                </View>
                <Skeleton width={78} height={18} />
              </View>
            ))}
          </View>
        ) : isError && !bills?.length ? (
          <ErrorState onRetry={refetch} />
        ) : !bills?.length ? (
          <EmptyState
            icon="receipt-outline"
            title={isEst ? 'Sin facturas creadas' : 'Sin facturas recibidas'}
            message={isEst ? 'Creá facturas de pensión para enviar a los propietarios.' : 'Las facturas del establecimiento aparecerán acá para que puedas aprobarlas.'}
            tint={c.brand}
            actionLabel={isEst ? 'Nueva factura' : undefined}
            onAction={isEst ? () => { haptic.light(); router.push(Routes.facturacionNueva as never); } : undefined}
          />
        ) : (
          <View style={s.cuerpo}>
            {/* Hero invertido: un solo dato: cuánto falta resolver. */}
            {pendientes.length > 0 && (
              <View style={s.hero}>
                <Text style={s.heroRotulo}>{isEst ? 'Falta que te aprueben' : 'Te queda por aprobar'}</Text>
                <Text style={s.heroMonto}>{formatMoney(totalPendiente, pendientes[0]?.currency)}</Text>
                <Text style={s.heroPie}>
                  {pendientes.length === 1 ? 'Una factura sin aprobar' : `${pendientes.length} facturas sin aprobar`}
                </Text>
              </View>
            )}

            {pendientes.length > 0 && (
              <>
                <Text style={[s.grupo, pendientes.length > 0 && { marginTop: space[6] }]}>Sin aprobar</Text>
                {pendientes.map((b, i) => (
                  <FilaFactura key={b.id} bill={b} index={i} ultima={i === pendientes.length - 1} c={c} s={s} />
                ))}
              </>
            )}

            {aprobadas.length > 0 && (
              <>
                <Text style={[s.grupo, { marginTop: space[7] }]}>Ya aprobadas</Text>
                {aprobadas.map((b, i) => (
                  <FilaFactura key={b.id} bill={b} index={pendientes.length + i} ultima={i === aprobadas.length - 1} c={c} s={s} />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  contenido: { paddingBottom: 120 },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  // Superficie invertida (`c.text` de fondo, `c.bg` de tinta): funciona igual
  // en claro y en oscuro sin escribir un hex.
  hero: { backgroundColor: c.text, borderRadius: radius.card, padding: space[5], ...(c.isDark ? {} : shadow.md) },
  heroRotulo: { fontSize: text.sm, color: c.textFaint },
  heroMonto: { fontSize: text.display, fontWeight: weight.bold, color: c.bg, letterSpacing: -1.2, marginTop: space[1], fontVariant: ['tabular-nums'] },
  heroPie: { fontSize: text.sm, color: c.textFaint, marginTop: space[2] },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginBottom: space[1] },

  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  cajita: { width: 42, height: 42, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  filaTitulo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  filaMonto: { fontSize: text.md, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  filaEstado: { fontSize: text.xs, fontWeight: weight.semibold, marginTop: 2 },
});
