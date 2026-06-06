import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList, Platform,
} from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorseRecordsSearch, useHorseRecordTree, HorseRecordNode, HorseRecord } from '../hooks/use-horse-records';
import { colors } from '../lib/colors';

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_W   = 148;
const NODE_H   = 72;
const COL_GAP  = 36;
const ROW_SLOT = NODE_H + 12;

// ─── Build layout ─────────────────────────────────────────────────────────────
interface PlacedNode {
  node: HorseRecordNode;
  gen: number;
  index: number;
  x: number;
  y: number;
}
interface Edge {
  x1: number; y1: number;
  x2: number; y2: number;
  isSire: boolean;
}

function buildLayout(root: HorseRecordNode, maxGen: number) {
  const leafCount  = Math.pow(2, maxGen);
  const totalH     = leafCount * ROW_SLOT;
  const totalW     = (maxGen + 1) * (NODE_W + COL_GAP) + 16;
  const nodes: PlacedNode[] = [];
  const edges: Edge[] = [];

  function slotY(gen: number, index: number) {
    const slots  = Math.pow(2, gen);
    const slotH  = totalH / slots;
    return slotH * index + (slotH - NODE_H) / 2;
  }

  function visit(
    node: HorseRecordNode | null,
    gen: number,
    index: number,
    pX: number | null,
    pY: number | null,
    isSire: boolean,
  ) {
    if (gen > maxGen) return;
    const x = gen * (NODE_W + COL_GAP);
    const y = slotY(gen, index);
    if (node) {
      nodes.push({ node, gen, index, x, y });
      if (pX !== null && pY !== null) {
        edges.push({ x1: pX + NODE_W, y1: pY + NODE_H / 2, x2: x, y2: y + NODE_H / 2, isSire });
      }
      if (gen < maxGen) {
        visit(node.sire, gen + 1, index * 2,     x, y, true);
        visit(node.dam,  gen + 1, index * 2 + 1, x, y, false);
      }
    }
  }

  visit(root, 0, 0, null, null, true);
  return { nodes, edges, totalW, totalH };
}

// ─── Ownership colors ─────────────────────────────────────────────────────────
function ownerStyle(status: string) {
  switch (status) {
    case 'verified':     return { border: '#34d399', bg: '#f0fdf4', badge: '✓ Verificado', badgeColor: '#059669' };
    case 'pending_claim':return { border: '#fbbf24', bg: '#fffbeb', badge: '⏳ Pendiente',  badgeColor: '#d97706' };
    case 'disputed':     return { border: '#f87171', bg: '#fef2f2', badge: '⚠ Disputado',  badgeColor: '#dc2626' };
    default:             return { border: '#e2e8f0', bg: '#ffffff', badge: null, badgeColor: '#94a3b8' };
  }
}

// ─── Node card ────────────────────────────────────────────────────────────────
function NodeCard({
  placed,
  isSubject,
  onPress,
}: {
  placed: PlacedNode;
  isSubject: boolean;
  onPress: (id: string) => void;
}) {
  const { node } = placed;
  const own = ownerStyle(node.ownership_status);
  const sexIcon = node.sex === 'macho' ? '♂' : node.sex === 'hembra' ? '♀' : node.sex === 'castrado' ? '⚥' : '';
  const subtitle = [node.birth_year, node.country_code, sexIcon].filter(Boolean).join(' · ');

  if (isSubject) {
    return (
      <View
        style={[styles.node, styles.nodeSubject, { left: placed.x, top: placed.y }]}
      >
        <Text style={styles.subjectLabel}>Sujeto</Text>
        <Text style={styles.subjectName} numberOfLines={2}>{node.name}</Text>
        {!!subtitle && <Text style={styles.subjectSub}>{subtitle}</Text>}
        {node.ownership_status === 'verified' && (
          <Text style={styles.subjectVerified}>✓ Con dueño</Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={node.id ? 0.7 : 1}
      onPress={() => node.id && onPress(node.id)}
      style={[
        styles.node,
        { left: placed.x, top: placed.y, borderColor: own.border, backgroundColor: own.bg },
        !node.id && styles.nodeEmpty,
      ]}
    >
      <Text style={styles.nodeName} numberOfLines={2}>
        {node.name || <Text style={styles.nodeNoData}>Sin datos</Text>}
      </Text>
      {!!subtitle && <Text style={styles.nodeSub}>{subtitle}</Text>}
      {own.badge ? (
        <Text style={[styles.nodeBadge, { color: own.badgeColor }]}>{own.badge}</Text>
      ) : node.id ? (
        <Text style={styles.nodeNoBadge}>Sin dueño registrado</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── SVG edges ────────────────────────────────────────────────────────────────
function EdgeSvg({ edges, totalW, totalH }: { edges: Edge[]; totalW: number; totalH: number }) {
  return (
    <Svg width={totalW} height={totalH} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <LinearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.15" />
        </LinearGradient>
        <LinearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#f43f5e" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#f43f5e" stopOpacity="0.15" />
        </LinearGradient>
      </Defs>
      {edges.map((e, i) => {
        const mx = (e.x1 + e.x2) / 2;
        const d = `M ${e.x1} ${e.y1} C ${mx} ${e.y1} ${mx} ${e.y2} ${e.x2} ${e.y2}`;
        return (
          <Path
            key={i}
            d={d}
            stroke={e.isSire ? 'url(#sg)' : 'url(#dg)'}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

// ─── Generation headers ───────────────────────────────────────────────────────
const GEN_LABELS = ['Caballo', 'Padres', 'Abuelos', 'Bisabuelos', 'Tatarabuelos'];

function GenHeaders({ maxGen }: { maxGen: number }) {
  return (
    <View style={styles.genRow}>
      {Array.from({ length: maxGen + 1 }).map((_, g) => (
        <View key={g} style={[styles.genHeader, { width: NODE_W }]}>
          <Text style={[styles.genLabel, g === 0 && styles.genLabelSubject]}>
            {GEN_LABELS[g] ?? `Gen ${g}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Search dropdown ──────────────────────────────────────────────────────────
function SearchBar({ onSelect }: { onSelect: (r: HorseRecord) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useHorseRecordsSearch(q, q.length > 1);

  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={t => { setQ(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar caballo…"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          autoCorrect={false}
        />
        {isFetching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {open && !!data?.items?.length && (
        <View style={styles.dropdown}>
          <FlatList
            data={data.items}
            keyExtractor={i => i.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { onSelect(item); setQ(item.name); setOpen(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownName}>{item.name}</Text>
                  <Text style={styles.dropdownSub}>
                    {[item.birth_year, item.breed, item.country_code].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {item.ownership_status === 'verified' && (
                  <Ionicons name="shield-checkmark" size={16} color="#34d399" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

// ─── Depth toggle ────────────────────────────────────────────────────────────
function DepthToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.depthRow}>
      {[3, 4, 5].map(d => (
        <TouchableOpacity
          key={d}
          style={[styles.depthBtn, value === d && styles.depthBtnActive]}
          onPress={() => onChange(d)}
        >
          <Text style={[styles.depthLabel, value === d && styles.depthLabelActive]}>
            {d} gen
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendLine, { backgroundColor: '#3b82f6' }]} />
        <Text style={styles.legendText}>Paterna</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendLine, { backgroundColor: '#f43f5e' }]} />
        <Text style={styles.legendText}>Materna</Text>
      </View>
      <View style={styles.legendItem}>
        <Ionicons name="shield-checkmark" size={12} color="#34d399" />
        <Text style={styles.legendText}>Dueño verificado</Text>
      </View>
      <View style={styles.legendItem}>
        <Ionicons name="time" size={12} color="#fbbf24" />
        <Text style={styles.legendText}>Pendiente</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ArbolScreen() {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maxGen, setMaxGen] = useState(4);
  const [history, setHistory] = useState<{ id: string; name: string }[]>([]);

  const { data: tree, isLoading } = useHorseRecordTree(selectedId, maxGen);

  const handleSelect = useCallback((r: HorseRecord) => {
    setSelectedId(r.id);
    setHistory([{ id: r.id, name: r.name }]);
  }, []);

  const handleNodePress = useCallback((id: string) => {
    function findName(n: HorseRecordNode | null): string | null {
      if (!n) return null;
      if (n.id === id) return n.name;
      return findName(n.sire) ?? findName(n.dam);
    }
    const name = (tree ? findName(tree) : null) ?? id;
    setSelectedId(id);
    setHistory(h => [...h, { id, name }]);
  }, [tree]);

  const handleBack = useCallback(() => {
    setHistory(h => {
      const next = h.slice(0, -1);
      setSelectedId(next[next.length - 1]?.id ?? null);
      return next;
    });
  }, []);

  const layout = tree ? buildLayout(tree, maxGen) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="git-branch" size={18} color={colors.primary} />
            <Text style={styles.title}>Árbol Genealógico</Text>
          </View>
          <DepthToggle value={maxGen} onChange={setMaxGen} />
        </View>
        <SearchBar onSelect={handleSelect} />

        {/* Breadcrumb */}
        {history.length > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="chevron-back" size={14} color="#64748b" />
            <Text style={styles.backText}>
              Volver a <Text style={{ fontWeight: '700' }}>{history[history.length - 2]?.name}</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tree canvas */}
      {!selectedId && (
        <View style={styles.empty}>
          <Ionicons name="git-branch-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Seleccioná un caballo</Text>
          <Text style={styles.emptyText}>
            Buscá cualquier caballo arriba y su árbol genealógico aparecerá acá.
            Tocá un nodo para navegar por el árbol.
          </Text>
        </View>
      )}

      {selectedId && isLoading && (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando árbol…</Text>
        </View>
      )}

      {layout && !isLoading && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
            nestedScrollEnabled
          >
            <View>
              <GenHeaders maxGen={maxGen} />
              <View style={{ width: layout.totalW, height: layout.totalH, position: 'relative' }}>
                <EdgeSvg edges={layout.edges} totalW={layout.totalW} totalH={layout.totalH} />
                {layout.nodes.map((placed, i) => (
                  <NodeCard
                    key={`${placed.gen}-${placed.index}`}
                    placed={placed}
                    isSubject={placed.gen === 0}
                    onPress={handleNodePress}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Legend */}
      <View style={[styles.legendBar, { paddingBottom: insets.bottom + 8 }]}>
        <Legend />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  searchWrap: {
    position: 'relative',
    zIndex: 100,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    maxHeight: 220,
    zIndex: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 8,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  depthRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  depthBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  depthBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  depthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  depthLabelActive: {
    color: '#1e293b',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
  },
  backText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Gen headers
  genRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: COL_GAP,
  },
  genHeader: {
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  genLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#94a3b8',
  },
  genLabelSubject: {
    color: colors.primary,
  },
  // Nodes
  node: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  nodeSubject: {
    backgroundColor: '#0f1f3d',
    borderColor: '#1e3a6e',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  nodeEmpty: {
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  nodeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 16,
  },
  nodeNoData: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontWeight: '400',
    fontSize: 11,
  },
  nodeSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  nodeBadge: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  nodeNoBadge: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 4,
  },
  subjectLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#60a5fa',
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 17,
  },
  subjectSub: {
    fontSize: 10,
    color: '#93c5fd',
    marginTop: 2,
  },
  subjectVerified: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34d399',
    marginTop: 3,
  },
  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 19,
  },
  // Legend
  legendBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
});
