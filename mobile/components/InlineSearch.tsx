import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Calendar, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { HorseIcon } from './icons/equine';
import { useSearch } from '../hooks/use-search';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';
import { Routes, nav } from '../lib/routes';

function ResultRow({ icon: Icon, title, subtitle, onPress, c, s }: {
  icon: LucideIcon | typeof HorseIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowIcon}>
        <Icon size={18} color={c.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={14} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

/** Buscador que se despliega como overlay animado (no cambia de pantalla). */
export function InlineSearch({ topInset, onClose }: { topInset: number; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data, isFetching } = useSearch(query);
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const hasResults = !!data && (data.horses.length + data.events.length + data.medical.length) > 0;
  const showEmpty = query.trim().length >= 2 && !isFetching && !hasResults;

  const go = (fn: () => void) => { fn(); onClose(); };

  return (
    <Animated.View
      style={[s.overlay, { paddingTop: topInset }]}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
    >
      <Animated.View style={s.header} entering={FadeInDown.duration(240)}>
        <View style={s.searchBar}>
          <Search size={18} color={c.textFaint} strokeWidth={2} />
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar caballos, eventos, historial…"
            placeholderTextColor={c.textFaint}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {isFetching && <ActivityIndicator size="small" color={c.textFaint} />}
        </View>
        <TouchableOpacity onPress={onClose} style={s.cancelBtn} activeOpacity={0.8}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!query.trim() && (
          <View style={s.hint}>
            <Search size={36} color={c.borderStrong} strokeWidth={2} />
            <Text style={s.hintText}>Escribí para buscar en toda la app</Text>
          </View>
        )}

        {showEmpty && (
          <View style={s.hint}>
            <Text style={s.hintText}>Sin resultados para “{query}”</Text>
          </View>
        )}

        {data?.horses && data.horses.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>Caballos</Text>
            {data.horses.map((h, index) => (
              <Animated.View key={h.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                <ResultRow
                  icon={HorseIcon}
                  title={h.name}
                  subtitle={[h.breed, h.activity].filter(Boolean).join(' · ') || undefined}
                  onPress={() => go(() => nav.push(router, Routes.caballo(h.id)))}
                  c={c}
                  s={s}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {data?.events && data.events.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>Eventos</Text>
            {data.events.map((e, index) => (
              <Animated.View key={e.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                <ResultRow
                  icon={Calendar}
                  title={e.description}
                  subtitle={[e.type, e.date ? new Date(e.date).toLocaleDateString('es-AR') : undefined].filter(Boolean).join(' · ')}
                  onPress={() => go(() => nav.push(router, Routes.tabsEventos))}
                  c={c}
                  s={s}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {data?.medical && data.medical.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>Historial médico</Text>
            {data.medical.map((m, index) => (
              <Animated.View key={m.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                <ResultRow
                  icon={Stethoscope}
                  title={m.name}
                  subtitle={m.type}
                  onPress={() => go(() => nav.push(router, Routes.tabsCaballos))}
                  c={c}
                  s={s}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg, zIndex: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3], gap: space[3], borderBottomWidth: 1, borderBottomColor: c.border },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: c.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: space[3], height: 40 },
  input: { flex: 1, fontSize: text.sm, color: c.text, height: 40 },
  cancelBtn: { paddingVertical: space[2] },
  cancelText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },
  results: { padding: space[4], gap: space[4], paddingBottom: space[10] },
  sectionLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: c.border },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  rowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  hint: { alignItems: 'center', paddingVertical: space[10], gap: space[3] },
  hintText: { fontSize: text.sm, color: c.textFaint, textAlign: 'center' },
});
