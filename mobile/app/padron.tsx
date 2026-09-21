import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Globe, ChevronRight, XCircle, GitBranch } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Routes, nav } from '../lib/routes';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../styles/tokens';
import { entradaFila } from '../styles/motion';
import { haptic } from '../lib/haptics';
import { useSearchLiveStudbook, type HorseRecord } from '../hooks/use-horse-records';
import { Skeleton } from '../components/Skeleton';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult { items: HorseRecord[]; total: number }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSearch(name: string) {
  return useQuery<SearchResult>({
    queryKey: ['horse-records', 'search', name],
    queryFn: () => api.get('/horse-records/search', { params: { name: name || undefined, limit: 20 } }).then(r => r.data),
    staleTime: 30_000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEX_LABEL: Record<string, string> = { macho: 'macho', hembra: 'hembra', castrado: 'castrado' };

const STATUS_LABEL: Record<string, string> = {
  verified: 'Verificado',
  pending_claim: 'Pendiente',
  disputed: 'En disputa',
  unverified: '',
};

function statusStyle(st: string, c: ThemeColors): { color: string; bg: string } {
  switch (st) {
    case 'verified':      return { color: c.success, bg: c.successSoft };
    case 'pending_claim': return { color: c.goldText, bg: c.goldSoft };
    case 'disputed':      return { color: c.danger, bg: c.dangerSoft };
    default:              return { color: c.textFaint, bg: c.surfaceAlt };
  }
}

/**
 * Fila del padrón: nombre + la ficha mínima (año · sexo · país) en una sola
 * línea de metadatos. Antes cada dato iba en su propia pastilla gris y la fila
 * parecía una nube de etiquetas.
 */
function FilaRegistro({ record, index, ultima, onPress, c, s }: {
  record: HorseRecord; index: number; ultima: boolean; onPress: () => void; c: ThemeColors; s: Styles;
}) {
  const st = record.ownership_status ?? 'unverified';
  const ss = statusStyle(st, c);
  const verificado = st === 'verified';
  const meta = [
    record.birth_year != null ? String(record.birth_year) : null,
    record.sex ? SEX_LABEL[record.sex] ?? record.sex : null,
    record.country_code,
    record.color,
  ].filter(Boolean).join(' · ');

  return (
    <Animated.View entering={entradaFila(index)}>
      <PressableScale
        style={[s.fila, !ultima && s.filaDivisor]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${record.name} en el padrón`}
      >
        <View style={[s.cajita, { backgroundColor: verificado ? c.successSoft : c.surfaceAlt }]}>
          <GitBranch size={20} color={verificado ? c.success : c.textFaint} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.filaTituloFila}>
            <Text style={s.filaTitulo} numberOfLines={1}>{record.name}</Text>
            {!!STATUS_LABEL[st] && (
              <View style={[s.chip, { backgroundColor: ss.bg }]}>
                <Text style={[s.chipText, { color: ss.color }]}>{STATUS_LABEL[st]}</Text>
              </View>
            )}
          </View>
          {!!meta && <Text style={s.filaMeta} numberOfLines={1}>{meta}</Text>}
          {(record.sire_name || record.dam_name) && (
            <Text style={s.filaPedigri} numberOfLines={1}>
              {record.sire_name ? `♂ ${record.sire_name}` : ''}
              {record.sire_name && record.dam_name ? '   ' : ''}
              {record.dam_name ? `♀ ${record.dam_name}` : ''}
            </Text>
          )}
        </View>
        <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />
      </PressableScale>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PadronScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading, isError, isFetching, refetch, isRefetching } = useSearch(query);

  // Búsqueda en vivo en el Stud Book Argentino (complemento explícito)
  const liveSearch = useSearchLiveStudbook();

  const handleSelect = useCallback((id: string) => {
    haptic.light();
    nav.push(router, `/padron/${id}`);
  }, [router]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const term = query.trim();
  const liveActive = !!term && liveSearch.variables === term;
  const liveItems = liveActive && liveSearch.data ? liveSearch.data.items : [];
  const liveSearched = liveActive && liveSearch.isSuccess;
  // Ofrecemos la búsqueda oficial cuando lo local trae 0 o muy pocos resultados
  const offerLiveSearch = !!term && !isLoading && total <= 2 && !liveSearched;

  const runLiveSearch = useCallback(() => {
    if (!term) return;
    haptic.light();
    liveSearch.mutate(term);
  }, [term, liveSearch]);

  const header = (
    <>
      <ScreenHeader
        scrollable
        showBack
        backTo={Routes.mas}
        title="Padrón"
        right={isFetching ? <ActivityIndicator size="small" color={c.brand} /> : undefined}
      />
      <View style={s.cuerpo}>
        {/* Buscador: campo blanco apoyado, sin borde. */}
        <View style={s.buscador}>
          <Search size={18} color={c.textFaint} strokeWidth={1.9} />
          <TextInput
            style={s.buscadorInput}
            placeholder="Buscar por nombre"
            placeholderTextColor={c.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { haptic.selection(); setQuery(''); }}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
            >
              <XCircle size={17} color={c.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.hint}>Buscamos en el registro oficial argentino</Text>

        {total > 0 && (
          <Text style={s.grupo}>
            {query ? `${total} resultado${total !== 1 ? 's' : ''}` : `${total} caballos en total`}
          </Text>
        )}
      </View>
    </>
  );

  // Pie: la consulta al Stud Book en vivo, presentada como la salida a
  // "no lo encontré" en vez de un botón suelto en medio de la lista.
  const pie = (
    <View style={s.cuerpo}>
      {liveSearched && (
        liveItems.length > 0 ? (
          <>
            <Text style={s.grupo}>{liveItems.length} en el Stud Book Argentino</Text>
            {liveItems.map((record, index) => (
              <FilaRegistro
                key={record.id} record={record} index={index}
                ultima={index === liveItems.length - 1}
                onPress={() => handleSelect(record.id)} c={c} s={s}
              />
            ))}
          </>
        ) : (
          <Text style={s.liveEmpty}>No aparece en el Stud Book Argentino.</Text>
        )
      )}

      {liveSearch.isError && (
        <Text style={s.liveError}>No pudimos consultar el Stud Book Argentino. Reintentá en un momento.</Text>
      )}

      {(offerLiveSearch || liveSearch.isPending) && (
        <PressableScale
          style={s.tarjetaAyuda}
          onPress={runLiveSearch}
          disabled={liveSearch.isPending}
          accessibilityRole="button"
          accessibilityLabel="Buscar en el Stud Book Argentino"
        >
          <View style={[s.cajita, { backgroundColor: c.goldSoft }]}>
            {liveSearch.isPending
              ? <ActivityIndicator size="small" color={c.goldText} />
              : <Globe size={20} color={c.goldText} strokeWidth={1.9} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ayudaTitulo}>{liveSearch.isPending ? 'Buscando en el registro' : '¿No lo encontrás?'}</Text>
            <Text style={s.ayudaMeta}>
              {liveSearch.isPending
                ? 'Puede tardar unos segundos'
                : 'Lo buscamos en el Stud Book Argentino'}
            </Text>
          </View>
          {!liveSearch.isPending && <ChevronRight size={17} color={c.textFaint} strokeWidth={2.2} />}
        </PressableScale>
      )}
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isLoading && items.length === 0 ? (
        <View>
          {header}
          {/* Misma silueta que la fila real: cajita + nombre + metadatos. */}
          <View style={s.cuerpo}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[s.fila, i < 5 && s.filaDivisor]}>
                <Skeleton width={44} height={44} borderRadius={radius.thumb} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="50%" height={15} />
                  <Skeleton width="35%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : isError && items.length === 0 ? (
        <View>{header}<ErrorState onRetry={() => refetch()} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <View style={s.cuerpo}>
              <FilaRegistro
                record={item} index={index} ultima={index === items.length - 1}
                onPress={() => handleSelect(item.id)} c={c} s={s}
              />
            </View>
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
          }
          ListFooterComponent={pie}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Sin resultados"
              message={query ? 'No está en el padrón local.' : undefined}
            />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 120 },
  cuerpo: { paddingHorizontal: space[4] },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: space[2] + 2,
    height: touch.field - 8, paddingHorizontal: space[4],
    backgroundColor: c.surface, borderRadius: radius.thumb,
    marginTop: space[2], ...(c.isDark ? {} : shadow.sm),
  },
  buscadorInput: { flex: 1, fontSize: text.base, color: c.text, height: '100%' },
  hint: { fontSize: text.sm, color: c.textFaint, marginTop: space[2] + 2 },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[5], marginBottom: space[1] },

  cajita: { width: 44, height: 44, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaTituloFila: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  filaTitulo: { flexShrink: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 3 },
  filaPedigri: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  chip: { borderRadius: radius.full, paddingHorizontal: space[2], paddingVertical: 2 },
  chipText: { fontSize: text.xs, fontWeight: weight.bold },

  tarjetaAyuda: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.card, padding: space[4],
    marginTop: space[6], ...(c.isDark ? {} : shadow.sm),
  },
  ayudaTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  ayudaMeta: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },
  liveEmpty: { fontSize: text.base, color: c.textFaint, textAlign: 'center', marginTop: space[5] },
  liveError: { fontSize: text.sm, color: c.danger, textAlign: 'center', marginTop: space[3] },
});
