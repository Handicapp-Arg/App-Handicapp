import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, CheckCircle2, Info, ChevronLeft, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../lib/colors';
import { Routes } from '../lib/routes';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { haptic } from '../lib/haptics';
import { useHorseRecordTree, type HorseRecord, type HorseRecordNode } from '../hooks/use-horse-records';
import { ListRowSkeleton } from '../components/Skeleton';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HorseDetail extends HorseRecord {
  registration_number: string | null;
  birth_date: string | null;
}

interface SearchResult { items: HorseRecord[]; total: number }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSearch(name: string) {
  return useQuery<SearchResult>({
    queryKey: ['horse-records', 'search', name],
    queryFn: () => api.get('/horse-records/search', { params: { name: name || undefined, limit: 20 } }).then(r => r.data),
    staleTime: 30_000,
  });
}

function useHorseDetail(id: string | null) {
  return useQuery<HorseDetail>({
    queryKey: ['horse-records', id],
    queryFn: () => api.get(`/horse-records/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });
}

function useHorseProgeny(id: string | null) {
  return useQuery<HorseRecord[]>({
    queryKey: ['horse-records', id, 'progeny'],
    queryFn: () => api.get(`/horse-records/${id}/progeny`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

const STATUS_COLOR: Record<string, string> = {
  verified: '#15803d',
  pending_claim: '#d97706',
  disputed: '#b91c1c',
  unverified: colors.gray400,
};
const STATUS_BG: Record<string, string> = {
  verified: '#f0fdf4',
  pending_claim: '#fffbeb',
  disputed: '#fef2f2',
  unverified: colors.gray100,
};
const STATUS_LABEL: Record<string, string> = {
  verified: 'Verificado',
  pending_claim: 'Solicitud pendiente',
  disputed: 'En disputa',
  unverified: 'Sin propietario',
};

// ─── Search result card ───────────────────────────────────────────────────────

function RecordCard({ record, onPress, cs }: { record: HorseRecord; onPress: () => void; cs: CardStyles }) {
  const st = record.ownership_status ?? 'unverified';
  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.8}>
      <View style={cs.cardHeader}>
        <Text style={cs.cardName} numberOfLines={1}>{record.name}</Text>
        <View style={[cs.badge, { backgroundColor: STATUS_BG[st] }]}>
          <View style={[cs.badgeDot, { backgroundColor: STATUS_COLOR[st] }]} />
          <Text style={[cs.badgeText, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
        </View>
      </View>
      <View style={cs.cardMeta}>
        {record.birth_year != null && <Text style={cs.metaItem}>{record.birth_year}</Text>}
        {record.sex && <Text style={cs.metaItem}>{SEX_LABEL[record.sex]}</Text>}
        {record.country_code && <Text style={cs.metaItem}>{record.country_code}</Text>}
        {record.color && <Text style={cs.metaItem} numberOfLines={1}>{record.color}</Text>}
      </View>
      {(record.sire_name || record.dam_name) && (
        <Text style={cs.cardPedigree} numberOfLines={1}>
          {record.sire_name ? `♂ ${record.sire_name}` : ''}
          {record.sire_name && record.dam_name ? '   ' : ''}
          {record.dam_name ? `♀ ${record.dam_name}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Pedigree tree ────────────────────────────────────────────────────────────

function TreeNode({ node, level = 0, tr }: { node: HorseRecordNode | null; level?: number; tr: TreeStyles }) {
  if (!node) {
    return (
      <View style={[tr.node, tr.nodeEmpty, { marginLeft: level * 16 }]}>
        <Text style={tr.emptyText}>–</Text>
      </View>
    );
  }
  return (
    <View style={{ marginLeft: level * 16 }}>
      <View style={[tr.node, level === 0 && tr.nodeRoot]}>
        <Text style={[tr.nodeName, level === 0 && tr.nodeNameRoot]} numberOfLines={1}>{node.name}</Text>
        {node.birth_year != null && <Text style={tr.nodeMeta}>{node.birth_year}</Text>}
      </View>
      {(node.sire || node.dam) && (
        <View style={tr.children}>
          {node.sire && (
            <View>
              <Text style={tr.parentLabel}>Padre</Text>
              <TreeNode node={node.sire} level={level + 1} tr={tr} />
            </View>
          )}
          {node.dam && (
            <View>
              <Text style={tr.parentLabel}>Madre</Text>
              <TreeNode node={node.dam} level={level + 1} tr={tr} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

type DetailTab = 'info' | 'pedigree' | 'progeny';

function DetailModal({ id, onClose, c, d, tr }: { id: string; onClose: () => void; c: ThemeColors; d: DetailStyles; tr: TreeStyles }) {
  const [tab, setTab] = useState<DetailTab>('info');
  const { data: detail, isLoading } = useHorseDetail(id);
  const { data: tree, isLoading: treeLoading } = useHorseRecordTree(tab === 'pedigree' ? id : null, 3);
  const { data: progeny, isLoading: progenyLoading } = useHorseProgeny(tab === 'progeny' ? id : null);

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'pedigree', label: 'Pedigrí' },
    { key: 'progeny', label: 'Progenie' },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={d.root}>
        <View style={d.header}>
          <View style={{ flex: 1 }}>
            {isLoading
              ? <ActivityIndicator color={c.brand} />
              : <Text style={d.name} numberOfLines={2}>{detail?.name ?? '...'}</Text>
            }
            {detail && (
              <View style={d.metaRow}>
                {detail.birth_year != null && <Text style={d.meta}>{detail.birth_year}</Text>}
                {detail.sex && <Text style={d.meta}>{SEX_LABEL[detail.sex]}</Text>}
                {detail.country_code && <Text style={d.meta}>{detail.country_code}</Text>}
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={d.closeBtn} hitSlop={8}>
            <X size={22} color={c.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={d.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[d.tab, tab === t.key && d.tabActive]}
              onPress={() => { haptic.light(); setTab(t.key); }}
            >
              <Text style={[d.tabText, tab === t.key && d.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={d.scroll} contentContainerStyle={d.scrollContent}>

          {tab === 'info' && (
            isLoading
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={c.brand} />
              : detail ? (
                <View style={{ gap: 0 }}>
                  {([
                    ['Nombre', detail.name],
                    ['Nacimiento', detail.birth_year?.toString()],
                    ['Sexo', detail.sex ? SEX_LABEL[detail.sex] : null],
                    ['Color / Pelo', detail.color],
                    ['País', detail.country_code],
                    ['Raza', detail.breed],
                    ['Nro. registro', detail.registration_number],
                    ['Padre', detail.sire_name],
                    ['Madre', detail.dam_name],
                  ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                    <View key={label} style={d.infoRow}>
                      <Text style={d.infoLabel}>{label}</Text>
                      <Text style={d.infoValue}>{value}</Text>
                    </View>
                  ))}

                  {detail.verified_owner && (
                    <View style={d.ownerRow}>
                      <CheckCircle2 size={16} color="#15803d" strokeWidth={2} />
                      <Text style={d.ownerText}>Propietario: {detail.verified_owner.name}</Text>
                    </View>
                  )}
                  {!detail.verified_owner && (
                    <View style={d.claimBanner}>
                      <Info size={18} color="#0369a1" strokeWidth={2} />
                      <Text style={d.claimText}>Sin propietario verificado. Podés reclamarlo desde la web.</Text>
                    </View>
                  )}
                </View>
              ) : null
          )}

          {tab === 'pedigree' && (
            treeLoading
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={c.brand} />
              : tree
                ? (
                  <View>
                    <Text style={d.sectionTitle}>Árbol genealógico</Text>
                    <TreeNode node={tree} level={0} tr={tr} />
                  </View>
                )
                : <Text style={d.empty}>Sin datos de pedigrí</Text>
          )}

          {tab === 'progeny' && (
            progenyLoading
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={c.brand} />
              : progeny && progeny.length > 0
                ? (
                  <View>
                    <Text style={d.sectionTitle}>{progeny.length} descendiente{progeny.length !== 1 ? 's' : ''}</Text>
                    {progeny.map((p, index) => (
                      <Animated.View key={p.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                        <View style={d.progenyRow}>
                          <Text style={d.progenyName}>{p.name}</Text>
                          {p.birth_year != null && <Text style={d.progenyYear}>{p.birth_year}</Text>}
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                )
                : <Text style={d.empty}>Sin progenie registrada</Text>
          )}

        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PadronScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const cardS = useMemo(() => makeCardStyles(c), [c]);
  const treeS = useMemo(() => makeTreeStyles(c), [c]);
  const detailS = useMemo(() => makeDetailStyles(c), [c]);

  const { data, isLoading, isFetching } = useSearch(query);

  const handleSelect = useCallback((id: string) => {
    haptic.light();
    setSelectedId(id);
  }, []);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.navigate(Routes.mas as never)} style={s.backBtn} hitSlop={8}>
          <ChevronLeft size={24} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Padrón</Text>
          <Text style={s.subtitle}>Registro oficial de caballos</Text>
        </View>
        {isFetching && <ActivityIndicator size="small" color={c.brand} />}
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Search size={18} color={c.textFaint} strokeWidth={2} style={{ marginRight: space[2] }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor={c.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        {total > 0 && (
          <Text style={s.totalText}>
            {query ? `${total} resultado${total !== 1 ? 's' : ''}` : `${total} caballos en total`}
          </Text>
        )}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={{ padding: space[4], gap: space[2] }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
              <RecordCard record={item} onPress={() => handleSelect(item.id)} cs={cardS} />
            </Animated.View>
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Search size={40} color={c.textFaint} strokeWidth={2} />
              <Text style={s.emptyTitle}>Sin resultados</Text>
              {query ? <Text style={s.emptySubtitle}>No encontramos "{query}"</Text> : null}
            </View>
          }
        />
      )}

      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} c={c} d={detailS} tr={treeS} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: { padding: space[1], marginRight: space[2] },
  title: { fontSize: text.xl, fontWeight: weight.bold, color: c.text },
  subtitle: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  searchWrap: {
    backgroundColor: c.surface,
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    paddingTop: space[2],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: space[3],
    height: 44,
  },
  searchInput: { flex: 1, fontSize: text.sm, color: c.text },
  totalText: { fontSize: text.xs, color: c.textFaint, marginTop: space[2], paddingLeft: space[1] },
  list: { padding: space[4], paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[8], marginTop: space[10] },
  loadingText: { fontSize: text.sm, color: c.textFaint, marginTop: space[3] },
  emptyTitle: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted, marginTop: space[3] },
  emptySubtitle: { fontSize: text.sm, color: c.textFaint, marginTop: space[1] },
});

type CardStyles = ReturnType<typeof makeCardStyles>;

const makeCardStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    padding: space[4],
    marginBottom: space[3],
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space[2] },
  cardName: { flex: 1, fontSize: text.base, fontWeight: weight.bold, color: c.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    marginLeft: space[2],
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  badgeText: { fontSize: 10, fontWeight: weight.semibold },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space[1] },
  metaItem: {
    fontSize: text.xs,
    color: c.textMuted,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: space[1],
    marginBottom: space[1],
  },
  cardPedigree: { fontSize: text.xs, color: c.textFaint, fontStyle: 'italic' },
});

type TreeStyles = ReturnType<typeof makeTreeStyles>;

const makeTreeStyles = (c: ThemeColors) => StyleSheet.create({
  node: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: space[1],
  },
  nodeRoot: { borderColor: c.brand + '60', backgroundColor: c.brandSoft },
  nodeEmpty: { borderStyle: 'dashed', borderColor: c.borderStrong },
  nodeName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  nodeNameRoot: { fontSize: text.base, fontWeight: weight.bold, color: c.brand },
  nodeMeta: { fontSize: text.xs, color: c.textFaint },
  emptyText: { fontSize: text.sm, color: c.textFaint, textAlign: 'center' },
  children: {
    marginLeft: space[3],
    borderLeftWidth: 2,
    borderLeftColor: c.borderStrong,
    paddingLeft: space[3],
    marginBottom: space[2],
  },
  parentLabel: {
    fontSize: text.xs,
    fontWeight: weight.semibold,
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: space[2],
  },
});

type DetailStyles = ReturnType<typeof makeDetailStyles>;

const makeDetailStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: space[5],
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  name: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space[1] },
  meta: {
    fontSize: text.xs,
    color: c.textMuted,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: space[1],
    marginTop: space[1],
  },
  closeBtn: { padding: space[1], marginLeft: space[3] },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.borderStrong,
    paddingHorizontal: space[4],
  },
  tab: { paddingVertical: space[3], paddingHorizontal: space[4], marginBottom: -1 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: c.brand },
  tabText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  tabTextActive: { color: c.brand, fontWeight: weight.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: space[4] },
  sectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  infoLabel: { fontSize: text.sm, color: c.textMuted, fontWeight: weight.medium, flex: 1 },
  infoValue: { fontSize: text.sm, color: c.text, fontWeight: weight.semibold, flex: 2, textAlign: 'right' },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: space[2],
  },
  ownerText: { fontSize: text.sm, color: '#15803d', fontWeight: weight.medium, marginLeft: space[2] },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: space[3],
    marginTop: space[4],
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  claimText: { flex: 1, fontSize: text.xs, color: '#0369a1', lineHeight: 18, marginLeft: space[2] },
  progenyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  progenyName: { fontSize: text.sm, color: c.text, fontWeight: weight.medium },
  progenyYear: { fontSize: text.xs, color: c.textFaint },
  empty: { textAlign: 'center', color: c.textFaint, fontSize: text.sm, marginTop: space[8] },
});
