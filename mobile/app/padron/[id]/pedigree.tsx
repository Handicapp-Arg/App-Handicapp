import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useHorseRecordDetail, useHorseRecordTree, type HorseRecordNode } from '../../../hooks/use-horse-records';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, radius } from '../../../styles/tokens';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Spinner } from '../../../components/Spinner';
import { ErrorState } from '../../../components/ErrorState';

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

export default function PadronPedigreeScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const tr = useMemo(() => makeTreeStyles(c), [c]);

  const { data: detail } = useHorseRecordDetail(id);
  const { data: tree, isLoading, isError, refetch } = useHorseRecordTree(id, 3);

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Pedigrí" subtitle={detail?.name} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {tree ? (
            <TreeNode node={tree} level={0} tr={tr} />
          ) : (
            <Text style={s.empty}>Sin datos de pedigrí</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scrollContent: { paddingHorizontal: space[4], paddingBottom: space[10], paddingTop: space[2] },
  empty: { textAlign: 'center', color: c.textFaint, fontSize: text.sm, marginTop: space[8] },
});

type TreeStyles = ReturnType<typeof makeTreeStyles>;

const makeTreeStyles = (c: ThemeColors) => StyleSheet.create({
  node: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: space[1],
  },
  nodeRoot: { backgroundColor: c.brandSoft },
  nodeEmpty: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
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
