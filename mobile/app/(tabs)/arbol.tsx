import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Search, ShieldCheck, Clock, GitBranch, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorseRecordsSearch, useHorseRecordTree, HorseRecordNode, HorseRecord } from '../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { HorseHeadOutline } from '../../components/icons/equine';
import { Routes } from '../../lib/routes';

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
function ownerStyle(status: string, c: ThemeColors) {
  switch (status) {
    case 'verified':     return { border: '#34d399', bg: c.isDark ? 'rgba(52,211,153,0.14)' : '#f0fdf4', badge: '✓ Verificado', badgeColor: c.isDark ? '#34d399' : '#059669' };
    case 'pending_claim':return { border: '#fbbf24', bg: c.isDark ? 'rgba(251,191,36,0.14)' : '#fffbeb', badge: '⏳ Pendiente',  badgeColor: c.isDark ? '#fbbf24' : '#d97706' };
    case 'disputed':     return { border: '#f87171', bg: c.isDark ? 'rgba(248,113,113,0.14)' : '#fef2f2', badge: '⚠ Disputado',  badgeColor: c.isDark ? '#f87171' : '#dc2626' };
    default:             return { border: c.borderStrong, bg: c.surface, badge: null, badgeColor: c.textFaint };
  }
}

// ─── Node card ────────────────────────────────────────────────────────────────
function NodeCard({
  placed,
  isSubject,
  onPress,
  s,
  c,
}: {
  placed: PlacedNode;
  isSubject: boolean;
  onPress: (id: string) => void;
  s: Styles;
  c: ThemeColors;
}) {
  const { node } = placed;
  const own = ownerStyle(node.ownership_status, c);
  const sexIcon = node.sex === 'macho' ? '♂' : node.sex === 'hembra' ? '♀' : node.sex === 'castrado' ? '⚥' : '';
  const subtitle = [node.birth_year, node.country_code, sexIcon].filter(Boolean).join(' · ');

  if (isSubject) {
    return (
      <View
        style={[s.node, s.nodeSubject, { left: placed.x, top: placed.y }]}
      >
        <View style={s.subjectLabelRow}>
          <HorseHeadOutline size={11} color="#f3e3cc" strokeWidth={30} />
          <Text style={s.subjectLabel}>Sujeto</Text>
        </View>
        <Text style={s.subjectName} numberOfLines={2}>{node.name}</Text>
        {!!subtitle && <Text style={s.subjectSub}>{subtitle}</Text>}
        {node.ownership_status === 'verified' && (
          <Text style={s.subjectVerified}>✓ Con dueño</Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={node.id ? 0.7 : 1}
      onPress={() => node.id && onPress(node.id)}
      style={[
        s.node,
        { left: placed.x, top: placed.y, borderColor: own.border, backgroundColor: own.bg },
      ]}
    >
      <Text style={s.nodeName} numberOfLines={2}>{node.name}</Text>
      {!!subtitle && <Text style={s.nodeSub}>{subtitle}</Text>}
      {own.badge ? (
        <Text style={[s.nodeBadge, { color: own.badgeColor }]}>{own.badge}</Text>
      ) : node.id ? (
        <Text style={s.nodeNoBadge}>Sin dueño registrado</Text>
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
          <Stop offset="0" stopColor="#9d6c35" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#9d6c35" stopOpacity="0.15" />
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

function GenHeaders({ maxGen, s }: { maxGen: number; s: Styles }) {
  return (
    <View style={s.genRow}>
      {Array.from({ length: maxGen + 1 }).map((_, g) => (
        <View key={g} style={[s.genHeader, { width: NODE_W }]}>
          <Text style={[s.genLabel, g === 0 && s.genLabelSubject]}>
            {GEN_LABELS[g] ?? `Gen ${g}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Search dropdown ──────────────────────────────────────────────────────────
function SearchBar({ onSelect, s, c }: { onSelect: (r: HorseRecord) => void; s: Styles; c: ThemeColors }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useHorseRecordsSearch(q, q.length > 1);

  return (
    <View style={s.searchWrap}>
      <View style={s.searchBox}>
        <Search size={16} color={c.textFaint} strokeWidth={2} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={q}
          onChangeText={t => { setQ(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar caballo…"
          placeholderTextColor={c.textFaint}
          returnKeyType="search"
          autoCorrect={false}
        />
        {isFetching && <ActivityIndicator size="small" color={c.brand} />}
      </View>

      {open && !!data?.items?.length && (
        <View style={s.dropdown}>
          <FlatList
            data={data.items}
            keyExtractor={i => i.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.dropdownItem}
                onPress={() => { onSelect(item); setQ(item.name); setOpen(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.dropdownName}>{item.name}</Text>
                  <Text style={s.dropdownSub}>
                    {[item.birth_year, item.breed, item.country_code].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {item.ownership_status === 'verified' && (
                  <ShieldCheck size={16} color="#34d399" strokeWidth={2} />
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
function DepthToggle({ value, onChange, s }: { value: number; onChange: (v: number) => void; s: Styles }) {
  return (
    <View style={s.depthRow}>
      {[3, 4, 5].map(d => (
        <TouchableOpacity
          key={d}
          style={[s.depthBtn, value === d && s.depthBtnActive]}
          onPress={() => onChange(d)}
        >
          <Text style={[s.depthLabel, value === d && s.depthLabelActive]}>
            {d} gen
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ s }: { s: Styles }) {
  return (
    <View style={s.legend}>
      <View style={s.legendItem}>
        <View style={[s.legendLine, { backgroundColor: '#9d6c35' }]} />
        <Text style={s.legendText}>Paterna</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.legendLine, { backgroundColor: '#f43f5e' }]} />
        <Text style={s.legendText}>Materna</Text>
      </View>
      <View style={s.legendItem}>
        <ShieldCheck size={12} color="#34d399" strokeWidth={2} />
        <Text style={s.legendText}>Dueño verificado</Text>
      </View>
      <View style={s.legendItem}>
        <Clock size={12} color="#fbbf24" strokeWidth={2} />
        <Text style={s.legendText}>Pendiente</Text>
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
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

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
    <View style={s.screen}>
      {/* Header */}
      <ScreenHeader
        title="Árbol genealógico"
        showBack
        backTo={Routes.mas}
      />

      {/* Controls */}
      <View style={s.controls}>
        <SearchBar onSelect={handleSelect} s={s} c={c} />

        {/* Selector de generaciones (sólo con árbol cargado) */}
        {selectedId && (
          <View style={s.depthRowWrap}>
            <Text style={s.depthRowLabel}>Generaciones</Text>
            <DepthToggle value={maxGen} onChange={setMaxGen} s={s} />
          </View>
        )}

        {/* Breadcrumb */}
        {history.length > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={handleBack}>
            <ChevronLeft size={14} color={c.textMuted} strokeWidth={2} />
            <Text style={s.backText}>
              Volver a <Text style={{ fontWeight: '700' }}>{history[history.length - 2]?.name}</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tree canvas */}
      {!selectedId && (
        <View style={s.empty}>
          <GitBranch size={48} color={c.textFaint} strokeWidth={2} />
          <Text style={s.emptyTitle}>Seleccioná un caballo</Text>
          <Text style={s.emptyText}>
            Buscá cualquier caballo arriba y su árbol genealógico aparecerá acá.
            Tocá un nodo para navegar por el árbol.
          </Text>
        </View>
      )}

      {selectedId && isLoading && (
        <View style={s.empty}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[s.emptyText, { marginTop: 12 }]}>Cargando árbol…</Text>
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
              <GenHeaders maxGen={maxGen} s={s} />
              <View style={{ width: layout.totalW, height: layout.totalH, position: 'relative' }}>
                <EdgeSvg edges={layout.edges} totalW={layout.totalW} totalH={layout.totalH} />
                {layout.nodes.map((placed) => (
                  <NodeCard
                    key={`${placed.gen}-${placed.index}`}
                    placed={placed}
                    isSubject={placed.gen === 0}
                    onPress={handleNodePress}
                    s={s}
                    c={c}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Legend (deja espacio para la tab bar inferior) */}
      <View style={[s.legendBar, { paddingBottom: insets.bottom + 64 }]}>
        <Text style={s.legendTitle}>Referencias</Text>
        <Legend s={s} />
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
    zIndex: 10,
  },
  searchWrap: {
    position: 'relative',
    zIndex: 100,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    shadowColor: '#000',
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
    borderBottomColor: c.border,
    gap: 8,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  dropdownSub: {
    fontSize: 11,
    color: c.textFaint,
    marginTop: 1,
  },
  depthRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  depthRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textFaint,
  },
  depthRow: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: 9,
    padding: 3,
  },
  depthBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
  },
  depthBtnActive: {
    backgroundColor: c.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  depthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textFaint,
  },
  depthLabelActive: {
    color: c.text,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -2,
  },
  backText: {
    fontSize: 12,
    color: c.textMuted,
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
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
  },
  genLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: c.textFaint,
  },
  genLabelSubject: {
    color: c.brand,
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
    backgroundColor: c.surface,
    borderColor: c.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  nodeSubject: {
    backgroundColor: '#9d6c35',
    borderColor: '#7f5628',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  nodeName: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
    lineHeight: 16,
  },
  nodeSub: {
    fontSize: 10,
    color: c.textFaint,
    marginTop: 2,
  },
  nodeBadge: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  nodeNoBadge: {
    fontSize: 9,
    color: c.textFaint,
    marginTop: 4,
  },
  subjectLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  subjectLabel: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#f3e3cc',
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 17,
  },
  subjectSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
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
    color: c.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: c.textFaint,
    textAlign: 'center',
    lineHeight: 19,
  },
  // Legend
  legendBar: {
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: c.textFaint,
    textAlign: 'center',
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 18,
    rowGap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
  },
});
