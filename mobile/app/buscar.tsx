import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearch } from '../hooks/use-search';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={s.sectionLabel}>{label}</Text>
  );
}

function ResultRow({
  icon, title, subtitle, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.gray300} />
    </TouchableOpacity>
  );
}

export default function BuscarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const { data, isFetching } = useSearch(query);

  const hasResults = data && (data.horses.length + data.events.length + data.medical.length) > 0;
  const showEmpty = query.trim().length >= 2 && !isFetching && !hasResults;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header con buscador */}
      <View style={s.header}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.gray400} />
          <TextInput
            ref={inputRef}
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar caballos, eventos, historial..."
            placeholderTextColor={colors.gray400}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {isFetching && <ActivityIndicator size="small" color={colors.gray400} />}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn} activeOpacity={0.8}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!query.trim() && (
          <View style={s.hint}>
            <Ionicons name="search-outline" size={36} color={colors.gray200} />
            <Text style={s.hintText}>Escribí para buscar en toda la app</Text>
          </View>
        )}

        {showEmpty && (
          <View style={s.hint}>
            <Text style={s.hintText}>Sin resultados para "{query}"</Text>
          </View>
        )}

        {data?.horses && data.horses.length > 0 && (
          <View>
            <SectionHeader label="Caballos" />
            {data.horses.map((h) => (
              <ResultRow
                key={h.id}
                icon="paw-outline"
                title={h.name}
                subtitle={[h.breed, h.activity].filter(Boolean).join(' · ') || undefined}
                onPress={() => { router.push(`/(tabs)/caballos/${h.id}` as any); }}
              />
            ))}
          </View>
        )}

        {data?.events && data.events.length > 0 && (
          <View>
            <SectionHeader label="Eventos" />
            {data.events.map((e) => (
              <ResultRow
                key={e.id}
                icon="calendar-outline"
                title={e.description}
                subtitle={[e.type, e.date ? new Date(e.date).toLocaleDateString('es-AR') : undefined].filter(Boolean).join(' · ')}
                onPress={() => { router.push('/(tabs)/eventos' as any); }}
              />
            ))}
          </View>
        )}

        {data?.medical && data.medical.length > 0 && (
          <View>
            <SectionHeader label="Historial médico" />
            {data.medical.map((m) => (
              <ResultRow
                key={m.id}
                icon="medkit-outline"
                title={m.name}
                subtitle={m.type}
                onPress={() => { router.push('/(tabs)/caballos' as any); }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3], gap: space[3], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: colors.gray100, borderRadius: radius.lg, paddingHorizontal: space[3], height: 40 },
  input: { flex: 1, fontSize: text.sm, color: colors.gray900, height: 40 },
  cancelBtn: { paddingVertical: space[2] },
  cancelText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },
  results: { padding: space[4], gap: space[4], paddingBottom: space[10] },
  sectionLabel: { fontSize: text.xs, fontWeight: weight.bold, color: colors.gray400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  rowSub: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  hint: { alignItems: 'center', paddingVertical: space[10], gap: space[3] },
  hintText: { fontSize: text.sm, color: colors.gray400, textAlign: 'center' },
});
