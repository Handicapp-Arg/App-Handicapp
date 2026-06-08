import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../lib/colors';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { haptic } from '../lib/haptics';
import { useHorseRecordTree, type HorseRecord, type HorseRecordNode } from '../hooks/use-horse-records';
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

function RecordCard({ record, onPress }: { record: HorseRecord; onPress: () => void }) {
  const st = record.ownership_status ?? 'unverified';
  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.8}>
      <View style={c.cardHeader}>
        <Text style={c.cardName} numberOfLines={1}>{record.name}</Text>
        <View style={[c.badge, { backgroundColor: STATUS_BG[st] }]}>
          <View style={[c.badgeDot, { backgroundColor: STATUS_COLOR[st] }]} />
          <Text style={[c.badgeText, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
        </View>
      </View>
      <View style={c.cardMeta}>
        {record.birth_year != null && <Text style={c.metaItem}>{record.birth_year}</Text>}
        {record.sex && <Text style={c.metaItem}>{SEX_LABEL[record.sex]}</Text>}
        {record.country_code && <Text style={c.metaItem}>{record.country_code}</Text>}
        {record.color && <Text style={c.metaItem} numberOfLines={1}>{record.color}</Text>}
      </View>
      {(record.sire_name || record.dam_name) && (
        <Text style={c.cardPedigree} numberOfLines={1}>
          {record.sire_name ? `♂ ${record.sire_name}` : ''}
          {record.sire_name && record.dam_name ? '   ' : ''}
          {record.dam_name ? `♀ ${record.dam_name}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Pedigree tree ────────────────────────────────────────────────────────────

function TreeNode({ node, level = 0 }: { node: HorseRecordNode | null; level?: number }) {
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
              <TreeNode node={node.sire} level={level + 1} />
            </View>
          )}
          {node.dam && (
            <View>
              <Text style={tr.parentLabel}>Madre</Text>
              <TreeNode node={node.dam} level={level + 1} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

type DetailTab = 'info' | 'pedigree' | 'progeny';

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('info');
  const { data: detail, isLoading } = useHorseDetail(id);
  const { data: tree, isLoading: treeLoading } = useHorseRecordTree(tab === 'pedigree' ? id : null, 3);
  const { data: progeny, isLoading: progenyLoading } = useHorseProgeny(tab === 'progeny' ? id : null);

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'pedigree', label: 'Pedigree' },
    { key: 'progeny', label: 'Descendencia' },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={d.root}>
        <View style={d.header}>
          <View style={{ flex: 1 }}>
            {isLoading
              ? <ActivityIndicator color={colors.primary} />
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
            <Ionicons name="close" size={22} color={colors.gray500} />
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
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={colors.primary} />
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
                      <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                      <Text style={d.ownerText}>Propietario: {detail.verified_owner.name}</Text>
                    </View>
                  )}
                  {!detail.verified_owner && (
                    <View style={d.claimBanner}>
                      <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
                      <Text style={d.claimText}>Sin propietario verificado. Podés reclamarlo desde la web.</Text>
                    </View>
                  )}
                </View>
              ) : null
          )}

          {tab === 'pedigree' && (
            treeLoading
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={colors.primary} />
              : tree
                ? (
                  <View>
                    <Text style={d.sectionTitle}>Árbol genealógico</Text>
                    <TreeNode node={tree} level={0} />
                  </View>
                )
                : <Text style={d.empty}>Sin datos de pedigree</Text>
          )}

          {tab === 'progeny' && (
            progenyLoading
              ? <ActivityIndicator style={{ marginTop: space[8] }} color={colors.primary} />
              : progeny && progeny.length > 0
                ? (
                  <View>
                    <Text style={d.sectionTitle}>{progeny.length} descendiente{progeny.length !== 1 ? 's' : ''}</Text>
                    {progeny.map(p => (
                      <View key={p.id} style={d.progenyRow}>
                        <Text style={d.progenyName}>{p.name}</Text>
                        {p.birth_year != null && <Text style={d.progenyYear}>{p.birth_year}</Text>}
                      </View>
                    ))}
                  </View>
                )
                : <Text style={d.empty}>Sin descendencia registrada</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Padrón</Text>
          <Text style={s.subtitle}>Registro oficial de caballos</Text>
        </View>
        {isFetching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.gray400} style={{ marginRight: space[2] }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor={colors.gray400}
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
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Cargando padrón...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RecordCard record={item} onPress={() => handleSelect(item.id)} />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="search-outline" size={40} color={colors.gray300} />
              <Text style={s.emptyTitle}>Sin resultados</Text>
              {query ? <Text style={s.emptySubtitle}>No encontramos "{query}"</Text> : null}
            </View>
          }
        />
      )}

      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  backBtn: { padding: space[1], marginRight: space[2] },
  title: { fontSize: text.xl, fontWeight: weight.bold, color: colors.gray900 },
  subtitle: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  searchWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    paddingTop: space[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    paddingHorizontal: space[3],
    height: 44,
  },
  searchInput: { flex: 1, fontSize: text.sm, color: colors.gray900 },
  totalText: { fontSize: text.xs, color: colors.gray400, marginTop: space[2], paddingLeft: space[1] },
  list: { padding: space[4], paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[8], marginTop: space[10] },
  loadingText: { fontSize: text.sm, color: colors.gray400, marginTop: space[3] },
  emptyTitle: { fontSize: text.base, fontWeight: weight.semibold, color: colors.gray500, marginTop: space[3] },
  emptySubtitle: { fontSize: text.sm, color: colors.gray400, marginTop: space[1] },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: space[4],
    marginBottom: space[3],
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space[2] },
  cardName: { flex: 1, fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
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
    color: colors.gray500,
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: space[1],
    marginBottom: space[1],
  },
  cardPedigree: { fontSize: text.xs, color: colors.gray400, fontStyle: 'italic' },
});

const tr = StyleSheet.create({
  node: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: space[1],
  },
  nodeRoot: { borderColor: colors.primary + '60', backgroundColor: '#f0f7ff' },
  nodeEmpty: { borderStyle: 'dashed', borderColor: colors.gray200 },
  nodeName: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  nodeNameRoot: { fontSize: text.base, fontWeight: weight.bold, color: colors.primary },
  nodeMeta: { fontSize: text.xs, color: colors.gray400 },
  emptyText: { fontSize: text.sm, color: colors.gray300, textAlign: 'center' },
  children: {
    marginLeft: space[3],
    borderLeftWidth: 2,
    borderLeftColor: colors.gray200,
    paddingLeft: space[3],
    marginBottom: space[2],
  },
  parentLabel: {
    fontSize: text.xs,
    fontWeight: weight.semibold,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: space[2],
  },
});

const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: space[5],
    paddingBottom: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  name: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.gray900 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space[1] },
  meta: {
    fontSize: text.xs,
    color: colors.gray500,
    backgroundColor: colors.gray100,
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
    borderBottomColor: colors.gray200,
    paddingHorizontal: space[4],
  },
  tab: { paddingVertical: space[3], paddingHorizontal: space[4], marginBottom: -1 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray500 },
  tabTextActive: { color: colors.primary, fontWeight: weight.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: space[4] },
  sectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    color: colors.gray400,
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
    borderBottomColor: colors.gray100,
  },
  infoLabel: { fontSize: text.sm, color: colors.gray500, fontWeight: weight.medium, flex: 1 },
  infoValue: { fontSize: text.sm, color: colors.gray900, fontWeight: weight.semibold, flex: 2, textAlign: 'right' },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
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
    borderBottomColor: colors.gray100,
  },
  progenyName: { fontSize: text.sm, color: colors.gray900, fontWeight: weight.medium },
  progenyYear: { fontSize: text.xs, color: colors.gray400 },
  empty: { textAlign: 'center', color: colors.gray400, fontSize: text.sm, marginTop: space[8] },
});
