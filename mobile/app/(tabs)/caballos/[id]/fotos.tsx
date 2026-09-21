import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ShieldCheck } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useHorse } from '../../../../hooks/use-horses';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES, type ActivityPhoto } from '../../../../hooks/use-activity-photos';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana, hora } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, touch, radius, weight, shadow, photoScrim } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { AppImage } from '../../../../components/AppImage';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';

/** Cuántas fotos se muestran por tanda. */
const PAGINA = 12;

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
  // La grilla vive dentro de un ScrollView, así que no se puede virtualizar:
  // se muestra de a tandas para no montar cientos de fotos remotas de una.
  const [visibles, setVisibles] = useState(PAGINA);

  const fotosFiltradas = useMemo(
    () => (activityPhotos ?? []).filter((p) => activityType === 'all' || p.activity_type === activityType),
    [activityPhotos, activityType],
  );
  const fotosVisibles = fotosFiltradas.slice(0, visibles);
  const hayMas = fotosFiltradas.length > fotosVisibles.length;

  /** Las fotos se agrupan por día ("Hoy", "Ayer", "vie 5 sep"): así se lee un diario. */
  const grupos = useMemo(() => {
    const out: { label: string; fotos: ActivityPhoto[] }[] = [];
    fotosVisibles.forEach((p) => {
      const label = fechaHumana(p.taken_at) || 'Sin fecha';
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.label === label) ultimo.fotos.push(p);
      else out.push({ label, fotos: [p] });
    });
    return out;
  }, [fotosVisibles]);

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
              onPress={() => { haptic.selection(); setActivityType(f.v); setVisibles(PAGINA); }}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`Filtrar por ${f.label}`}
            >
              <Text style={[s.chipText, activo ? s.chipTextActivo : s.chipTextInactivo]}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[20], paddingTop: space[5] }}
        showsVerticalScrollIndicator={false}
      >
        {!fotosVisibles.length ? (
          <View style={{ paddingHorizontal: space[4] }}>
            <EmptyState
              icon="paw-outline"
              title={activityType === 'all' ? 'Sin fotos verificadas' : 'Nada en este filtro'}
              message="Las fotos tomadas desde la app guardan quién la sacó y cuándo."
            />
          </View>
        ) : (
          <>
            {grupos.map((g, gi) => (
              <View key={`${g.label}-${gi}`}>
                <Text style={s.diaLabel}>{g.label}</Text>
                <View style={s.grilla}>
                  {g.fotos.map((p, i) => {
                    const autor = p.photographer?.name;
                    const horaFoto = hora(p.taken_at);
                    return (
                      <Animated.View key={p.id} entering={entradaFila(i)} style={s.celda}>
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
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            ))}

            {hayMas && (
              <PressableScale
                style={s.verMas}
                onPress={() => { haptic.light(); setVisibles((v) => v + PAGINA); }}
                accessibilityRole="button"
                accessibilityLabel="Ver más fotos"
              >
                <Text style={s.verMasText}>Ver más fotos</Text>
              </PressableScale>
            )}

            <View style={s.nota}>
              <ShieldCheck size={15} color={c.textFaint} strokeWidth={1.9} />
              <Text style={s.notaText}>Cada foto guarda quién la sacó y cuándo</Text>
            </View>
          </>
        )}
      </ScrollView>

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
  celda: { width: '48%' },
  foto: { borderRadius: radius.card, overflow: 'hidden', height: 168, backgroundColor: c.surfaceAlt },
  fotoImg: { width: '100%', height: '100%' },
  sello: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space[7], paddingHorizontal: space[3], paddingBottom: space[2] + 2 },
  selloAutor: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.white },
  selloHora: { fontSize: text.xs - 1, color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] },

  verMas: {
    marginHorizontal: space[4], marginTop: space[5], height: touch.min,
    borderRadius: radius.full, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  verMasText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

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
