import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useHorse } from '../../../../hooks/use-horses';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES, type ActivityPhoto } from '../../../../hooks/use-activity-photos';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, hora } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, touch, radius, weight, shadow, photoScrim } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { AppImage } from '../../../../components/AppImage';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';

/* ─── El álbum es una lista virtualizada ───
   Antes la grilla vivía dentro de un ScrollView y se montaban TODAS las fotos
   de una tanda juntas: por foto un Animated.View con entrada, un
   PressableScale, un AppImage remoto y un LinearGradient. Con 50 fotos eso es
   brutal, y la paginación de a 12 era un parche.

   Ahora la grilla es una FlatList: mantiene el mismo diseño (dos columnas
   agrupadas por día) aplanando el contenido en filas — o un rótulo de día, o
   una fila de hasta dos fotos — y así la virtualización solo monta lo que se
   ve. El `Ver más` deja de hacer falta: la lista pagina sola al scrollear. */
type ItemAlbum =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'fila'; key: string; fotos: ActivityPhoto[]; ultimaDelDia: boolean };

/** Cuántas fotos entran por fila de la grilla (dos columnas al 48%). */
const POR_FILA = 2;

export default function FotosScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: activityPhotos } = useActivityPhotos(id);
  const uploadActivityPhoto = useUploadActivityPhoto(id);
  const [activityType, setActivityType] = useState('all');

  const fotosFiltradas = useMemo(
    () => (activityPhotos ?? []).filter((p) => activityType === 'all' || p.activity_type === activityType),
    [activityPhotos, activityType],
  );

  /** Las fotos se agrupan por día ("Hoy", "Ayer", "vie 5 sep"): así se lee un
   *  diario. El grupo se aplana en rótulo + filas de a dos para que la lista
   *  pueda virtualizar sin perder el agrupado ni el ancho de columna. */
  const items = useMemo(() => {
    const out: ItemAlbum[] = [];
    let labelActual: string | null = null;
    let fila: ActivityPhoto[] = [];

    const cerrarFila = () => {
      if (!fila.length) return;
      out.push({ tipo: 'fila', key: `f-${fila[0].id}`, fotos: fila, ultimaDelDia: false });
      fila = [];
    };

    fotosFiltradas.forEach((p) => {
      const label = fechaHumana(p.taken_at) || 'Sin fecha';
      if (label !== labelActual) {
        cerrarFila();
        labelActual = label;
        out.push({ tipo: 'dia', key: `d-${label}-${p.id}`, label });
      }
      fila.push(p);
      if (fila.length === POR_FILA) cerrarFila();
    });
    cerrarFila();
    // La última fila de cada día no lleva margen abajo: ese aire ya lo pone el
    // rótulo del día siguiente, igual que cuando la grilla era un solo wrap.
    out.forEach((it, i) => {
      if (it.tipo === 'fila') it.ultimaDelDia = out[i + 1]?.tipo !== 'fila';
    });
    return out;
  }, [fotosFiltradas]);

  const sacarFoto = async () => {
    haptic.light();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    try {
      await uploadActivityPhoto.mutateAsync({
        uri: result.assets[0].uri,
        activity_type: activityType === 'all' ? 'otro' : activityType,
      });
      haptic.success();
      toast.success('Foto agregada');
    } catch {
      haptic.error();
      toast.error('No se pudo subir la foto. Probá de nuevo.');
    }
  };

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Fotos" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta real: chips arriba y la grilla de dos columnas con el mismo radio.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Fotos" />
        <View style={s.chipsRow}>
          {[62, 96, 84].map((w, i) => <Skeleton key={i} width={w} height={36} borderRadius={radius.full} />)}
        </View>
        <View style={[s.grilla, { marginTop: space[6] }]}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} width="48%" height={168} borderRadius={radius.card} />)}
        </View>
      </View>
    );
  }

  const totalFotos = activityPhotos?.length ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Fotos"
        subtitle={`${horse.name}${totalFotos > 0 ? ` · ${totalFotos} con sello` : ''}`}
      />

      {/* ─── Filtros por actividad ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {[{ v: 'all', label: 'Todas' }, ...Object.entries(ACTIVITY_TYPES).map(([v, m]) => ({ v, label: m.label }))].map((f) => {
          const activo = activityType === f.v;
          return (
            <PressableScale
              key={f.v}
              style={[s.chip, activo ? s.chipActivo : s.chipInactivo]}
              onPress={() => { haptic.selection(); setActivityType(f.v); }}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`Filtrar por ${f.label}`}
            >
              <Text style={[s.chipText, activo ? s.chipTextActivo : s.chipTextInactivo]}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(it) => it.key}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[20], paddingTop: space[5] }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={7}
        renderItem={({ item }) => {
          if (item.tipo === 'dia') return <Text style={s.diaLabel}>{item.label}</Text>;
          return (
            // Sin animación de entrada por foto: la lista recicla celdas al
            // scrollear y el `entering` se volvería a disparar sobre vistas
            // reusadas, justo mientras el dedo arrastra.
            <View style={[s.grilla, !item.ultimaDelDia && s.grillaFila]}>
              {item.fotos.map((p) => {
                const autor = p.photographer?.name;
                const horaFoto = hora(p.taken_at);
                return (
                  <View key={p.id} style={s.celda}>
                    <PressableScale
                      scaleTo={0.97}
                      style={s.foto}
                      onPress={() => { haptic.light(); Linking.openURL(p.url); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver foto${autor ? ` de ${autor}` : ''}`}
                    >
                      <AppImage source={{ uri: p.url }} style={s.fotoImg} />
                      {(autor || horaFoto) && (
                        // El sello va sobre un degradado, no sobre una barra
                        // opaca: se lee sin tapar la parte de abajo de la foto.
                        <LinearGradient
                          colors={[...photoScrim]}
                          style={s.sello}
                        >
                          {!!autor && <Text style={s.selloAutor} numberOfLines={1}>{autor}</Text>}
                          {!!horaFoto && <Text style={s.selloHora}>{horaFoto}</Text>}
                        </LinearGradient>
                      )}
                    </PressableScale>
                  </View>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space[4] }}>
            <EmptyState
              icon="paw-outline"
              title={activityType === 'all' ? 'Sin fotos verificadas' : 'Nada en este filtro'}
              message="Las fotos tomadas desde la app guardan quién la sacó y cuándo."
            />
          </View>
        }
        ListFooterComponent={
          items.length ? (
            <View style={s.nota}>
              <ShieldCheck size={15} color={c.textFaint} strokeWidth={1.9} />
              <Text style={s.notaText}>Cada foto guarda quién la sacó y cuándo</Text>
            </View>
          ) : null
        }
      />

      {/* ─── CTA fijo ─── */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', c.bg]}
        style={[s.velo, { height: insets.bottom + space[20] }]}
      />
      <View style={[s.ctaWrap, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={s.cta}
          disabled={uploadActivityPhoto.isPending}
          onPress={sacarFoto}
          accessibilityRole="button"
          accessibilityLabel="Sacar una foto con sello"
        >
          <Camera size={19} color={c.bg} strokeWidth={1.9} />
          <Text style={s.ctaText}>{uploadActivityPhoto.isPending ? 'Subiendo…' : 'Sacar una foto'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* Chips */
  chipsRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[1] },
  chip: { height: 36, paddingHorizontal: space[4] - 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chipActivo: { backgroundColor: c.text },
  chipInactivo: { backgroundColor: c.surfaceAlt },
  chipText: { fontSize: text.sm },
  chipTextActivo: { color: c.bg, fontWeight: weight.semibold },
  chipTextInactivo: { color: c.textMuted, fontWeight: weight.medium },

  /* Grilla por día */
  diaLabel: {
    fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint,
    paddingHorizontal: space[4], marginBottom: space[3], marginTop: space[3],
  },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], paddingHorizontal: space[4] },
  // Cada fila de la grilla es ahora un item de la lista: el aire vertical que
  // antes daba el `gap` del wrap lo pone este margen, para que el espaciado
  // entre filas quede exactamente igual que antes.
  grillaFila: { marginBottom: space[3] },
  celda: { width: '48%' },
  foto: { borderRadius: radius.card, overflow: 'hidden', height: 168, backgroundColor: c.surfaceAlt },
  fotoImg: { width: '100%', height: '100%' },
  sello: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space[7], paddingHorizontal: space[3], paddingBottom: space[2] + 2 },
  selloAutor: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.white },
  selloHora: { fontSize: text.xs - 1, color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },

  nota: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], marginTop: space[5], paddingHorizontal: space[4] },
  notaText: { fontSize: text.sm - 1, color: c.textFaint },

  /* CTA */
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaWrap: { position: 'absolute', left: space[4], right: space[4], bottom: 0 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] + 1,
    height: touch.button, borderRadius: radius.button, backgroundColor: c.text,
    ...(c.isDark ? {} : shadow.lg),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg },
});
