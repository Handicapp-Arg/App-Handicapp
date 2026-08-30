import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../components/ScreenHeader';
import { Routes } from '../lib/routes';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListRowSkeleton } from '../components/Skeleton';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';
import { useAuth } from '../lib/auth';
import { formatMoney } from '../lib/currency';
import { haptic } from '../lib/haptics';
import {
  useSuperAdminMetrics, useSuperAdminOrgs, useSetOrgStatus,
  type SuperAdminOrg, type OrgPlan,
} from '../hooks/use-superadmin';

const formatARS = (n: number) => formatMoney(n);

// Nombres comerciales canónicos (paridad con PLAN_LABELS de use-organizations).
const PLAN_LABEL: Record<OrgPlan, string> = {
  free:       'Gratis',
  basic:      'Stable Basic',
  pro:        'Stable Pro',
  enterprise: 'Enterprise',
};

// Colores por plan/estado -> semánticos del theme (dark-safe), igual que en contratos.tsx.
const makePlanMeta = (c: ThemeColors): Record<OrgPlan, { bg: string; text: string }> => ({
  free:       { bg: c.surfaceAlt, text: c.textMuted },
  basic:      { bg: c.infoSoft,   text: c.info },
  pro:        { bg: c.warningSoft, text: c.warning },
  enterprise: { bg: c.successSoft, text: c.success },
});

const makeStatusMeta = (c: ThemeColors): Record<SuperAdminOrg['status'], { bg: string; text: string; label: string }> => ({
  active:    { bg: c.successSoft, text: c.success, label: 'Activa' },
  suspended: { bg: c.dangerSoft,  text: c.danger,  label: 'Suspendida' },
  trial:     { bg: c.warningSoft, text: c.warning, label: 'Trial' },
});

function MetricBox({ label, value, sub, tone = 'navy', c, s }: { label: string; value: string; sub?: string; tone?: 'navy' | 'gold' | 'gray'; c: ThemeColors; s: Styles }) {
  const bg = tone === 'navy' ? c.brand : tone === 'gold' ? c.warningSoft : c.surface;
  const fg = tone === 'navy' ? colors.white : tone === 'gold' ? c.warning : c.text;
  const labelColor = tone === 'navy' ? 'rgba(255,255,255,0.6)' : tone === 'gold' ? c.warning : c.textFaint;
  return (
    <View style={[s.metric, { backgroundColor: bg }]}>
      <Text style={[s.metricLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[s.metricValue, { color: fg }]} numberOfLines={1}>{value}</Text>
      {sub && <Text style={[s.metricSub, { color: labelColor }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

function OrgRow({ org, onToggle, pending, s, c }: { org: SuperAdminOrg; onToggle: () => void; pending: boolean; s: Styles; c: ThemeColors }) {
  const planMeta = makePlanMeta(c)[org.plan];
  const statusMeta = makeStatusMeta(c)[org.status];
  const expired = org.plan_expires_at && new Date(org.plan_expires_at) < new Date();

  return (
    <View style={s.orgRow}>
      <View style={s.orgHead}>
        <Text style={s.orgName} numberOfLines={1}>{org.name}</Text>
        <View style={[s.pill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[s.pillText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
        </View>
      </View>
      {org.owner && (
        <Text style={s.orgOwner} numberOfLines={1}>{org.owner.email}</Text>
      )}
      <View style={s.orgMeta}>
        <View style={[s.pill, { backgroundColor: planMeta.bg }]}>
          <Text style={[s.pillText, { color: planMeta.text }]}>{PLAN_LABEL[org.plan]}</Text>
        </View>
        <Text style={s.orgCount}>{org.horse_count} caballos · {org.member_count} miembros</Text>
      </View>
      <View style={s.orgFooter}>
        <Text style={s.orgRevenue}>
          {org.monthly_revenue_ars > 0 ? `${formatARS(org.monthly_revenue_ars)}/mes` : '—'}
          {expired && <Text style={[s.expiredText, { color: c.danger }]}>  · vencido</Text>}
        </Text>
        <TouchableOpacity
          onPress={() => { haptic.medium(); onToggle(); }}
          disabled={pending}
          style={[s.toggleBtn, pending && s.disabled]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={org.status === 'active' ? `Suspender ${org.name}` : `Reactivar ${org.name}`}
        >
          <Text style={s.toggleText}>
            {org.status === 'active' ? 'Suspender' : 'Reactivar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SuperAdminScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: metrics } = useSuperAdminMetrics(user?.role === 'admin');
  const { data: orgs, isLoading, isError, refetch, isRefetching } = useSuperAdminOrgs({ search }, user?.role === 'admin');
  const setStatus = useSetOrgStatus();

  if (user?.role !== 'admin') {
    return (
      <View style={s.container}>
        <ScreenHeader title="Superadmin" showBack backTo={Routes.mas} />
        <EmptyState
          icon="lock-closed-outline"
          title="Acceso restringido"
          message="Solo el administrador de HandicApp puede ver esta pantalla."
          tint={c.danger}
        />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title="Superadmin" subtitle="Control de plataforma" showBack backTo={Routes.mas} />

      <FlatList
        data={orgs ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space[3], marginBottom: space[3] }}>
            {metrics && (
              <View style={s.metricsGrid}>
                <MetricBox
                  label="MRR ACTIVO"
                  value={formatARS(metrics.mrr_ars)}
                  sub={`ARR ${formatARS(metrics.arr_ars)}`}
                  tone="navy"
                  c={c}
                  s={s}
                />
                <MetricBox
                  label="ORGS"
                  value={String(metrics.total_organizations)}
                  sub={`${metrics.active_organizations} activas`}
                  tone="gray"
                  c={c}
                  s={s}
                />
                <MetricBox
                  label="CABALLOS"
                  value={String(metrics.total_horses)}
                  sub={`prom ${metrics.avg_horses_per_org}/org`}
                  tone="gray"
                  c={c}
                  s={s}
                />
                <MetricBox
                  label="PLANES"
                  value={`${metrics.by_plan.pro ?? 0} ${PLAN_LABEL.pro}`}
                  sub={`${metrics.by_plan.basic ?? 0} ${PLAN_LABEL.basic} · ${metrics.by_plan.free ?? 0} ${PLAN_LABEL.free}`}
                  tone="gold"
                  c={c}
                  s={s}
                />
              </View>
            )}
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar organización o email…"
              placeholderTextColor={c.textFaint}
              style={s.search}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
            <OrgRow
              org={item}
              pending={setStatus.isPending}
              s={s}
              c={c}
              onToggle={() => {
                const next = item.status === 'active' ? 'suspended' : 'active';
                Alert.alert(
                  next === 'suspended' ? 'Suspender organización' : 'Reactivar organización',
                  `${next === 'suspended' ? 'Suspender' : 'Reactivar'} "${item.name}"?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Confirmar', onPress: () => setStatus.mutate({ id: item.id, status: next }) },
                  ],
                );
              }}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: space[3] }}>
              {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
            </View>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <EmptyState icon="business-outline" title={search ? 'Sin resultados' : 'Aún no hay orgs'} message={search ? 'Probá con otro término.' : undefined} />
          )
        }
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { padding: space[8], alignItems: 'center' },
  list: { padding: space[3], gap: space[3], paddingBottom: space[8] },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  metric: {
    flexBasis: '48.5%',
    flexGrow: 1,
    borderRadius: radius.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: c.border,
  },
  metricLabel: { fontSize: text.xs, fontWeight: weight.bold, letterSpacing: 0.4 },
  metricValue: { fontSize: text.xl, fontWeight: weight.extrabold, marginTop: 4 },
  metricSub: { fontSize: text.xs, marginTop: 2 },
  search: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: text.sm,
    color: c.text,
  },
  orgRow: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: space[4],
    borderWidth: 1,
    borderColor: c.border,
    gap: space[2],
  },
  orgHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orgName: { flex: 1, fontSize: text.md, fontWeight: weight.bold, color: c.text, marginRight: space[2] },
  orgOwner: { fontSize: text.xs, color: c.textFaint },
  orgMeta: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  orgCount: { fontSize: text.xs, color: c.textMuted },
  orgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[1],
  },
  orgRevenue: { fontSize: text.sm, color: c.text, fontWeight: weight.semibold },
  expiredText: { fontWeight: weight.bold },
  pill: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: text.xs, fontWeight: weight.bold },
  toggleBtn: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: space[3],
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  toggleText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  disabled: { opacity: 0.5 },
});
