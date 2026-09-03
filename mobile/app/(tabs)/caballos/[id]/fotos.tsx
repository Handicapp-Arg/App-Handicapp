import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useHorse } from '../../../../hooks/use-horses';
import { useActivityPhotos, useUploadActivityPhoto, ACTIVITY_TYPES } from '../../../../hooks/use-activity-photos';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { fechaHoraHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Spinner } from '../../../../components/Spinner';
import { AppImage } from '../../../../components/AppImage';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function FotosScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const { data: activityPhotos } = useActivityPhotos(id);
  const uploadActivityPhoto = useUploadActivityPhoto(id);
  const [activityType, setActivityType] = useState('all');

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Fotos" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Fotos verificadas</Text>
            <TouchableOpacity
              style={s.captureBtn}
              activeOpacity={0.85}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { toast.error('Necesitamos acceso a la cámara.'); return; }
                const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
                if (!result.canceled && result.assets[0]) {
                  await uploadActivityPhoto.mutateAsync({ uri: result.assets[0].uri, activity_type: activityType === 'all' ? 'otro' : activityType });
                  haptic.success();
                  toast.success('Foto agregada');
                }
              }}
            >
              <Camera size={15} color={c.surface} strokeWidth={2.2} />
              <Text style={s.captureBtnText}>Capturar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.activityTypeRow}
            contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingRight: 8 }}
          >
            <TouchableOpacity
              style={[s.activityChip, activityType === 'all' && { backgroundColor: c.brandSoft }]}
              onPress={() => { haptic.selection(); setActivityType('all'); }}
            >
              <Text style={[s.activityChipText, activityType === 'all' && { color: c.brand }]}>Todas</Text>
            </TouchableOpacity>
            {Object.entries(ACTIVITY_TYPES).map(([v, m]) => (
              <TouchableOpacity key={v} style={[s.activityChip, activityType === v && { backgroundColor: c.isDark ? m.color + '26' : m.bg }]} onPress={() => { haptic.selection(); setActivityType(v); }}>
                <Text style={[s.activityChipText, activityType === v && { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!activityPhotos?.length ? (
            <Text style={s.emptyText}>Las fotos tomadas incluyen sello de fecha y autor verificado.</Text>
          ) : (
            <View style={s.photosGrid}>
              {activityPhotos.filter((p) => activityType === 'all' || p.activity_type === activityType).map((p, index) => {
                const meta = ACTIVITY_TYPES[p.activity_type] ?? ACTIVITY_TYPES.otro;
                const stamp = p.taken_at ? fechaHoraHumana(p.taken_at) : '';
                return (
                  <AnimatedTouchable
                    key={p.id}
                    style={s.photoWrap}
                    onPress={() => { haptic.light(); Linking.openURL(p.url); }}
                    activeOpacity={0.85}
                    entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 45)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver foto${p.photographer?.name ? ` de ${p.photographer.name}` : ''}`}
                  >
                    <AppImage source={{ uri: p.url }} style={s.photoThumb} />
                    <View style={[s.photoBadge, { backgroundColor: c.isDark ? meta.color + '26' : meta.bg }]}>
                      <Text style={[s.photoBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {(p.photographer?.name || stamp) && (
                      <View style={s.photoStamp}>
                        {!!p.photographer?.name && (
                          <Text style={s.photoStampAuthor} numberOfLines={1}>{p.photographer.name}</Text>
                        )}
                        {!!stamp && <Text style={s.photoStampTime} numberOfLines={1}>{stamp}</Text>}
                      </View>
                    )}
                  </AnimatedTouchable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, color: c.textFaint },

  activityTypeRow: { marginBottom: 10, flexGrow: 0 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.text },
  captureBtnText: { fontSize: 12, fontWeight: '700', color: c.surface },
  activityChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceAlt },
  activityChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoWrap: { width: '31%', aspectRatio: 1, position: 'relative' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10 },
  photoBadge: { position: 'absolute', top: 3, left: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  photoBadgeText: { fontSize: 8, fontWeight: '700' },
  photoStamp: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 4, paddingVertical: 3 },
  photoStampAuthor: { fontSize: 8, fontWeight: '700', color: '#fff' },
  photoStampTime: { fontSize: 8, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
});
