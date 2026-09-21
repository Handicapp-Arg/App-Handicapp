import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator,
  Alert, Platform, ActionSheetIOS, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useHorse, useHorseDocuments, useUploadDocument, useDeleteDocument, type HorseDocument } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, touch, radius, weight, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { FormSheet } from '../../../../components/FormSheet';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';

export default function DocumentosScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: documents } = useHorseDocuments(id);
  const uploadDoc = useUploadDocument(id);
  const deleteDoc = useDeleteDocument(id);

  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    if (!showUploadDoc) return;
    setDocName('');
  }, [showUploadDoc]);

  /**
   * El backend solo distingue PDF de imagen, así que esas son las dos secciones
   * reales. No inventamos "Oficiales / Estudios": una categoría que el servidor
   * no manda sería una etiqueta mentirosa.
   */
  const grupos = useMemo(() => {
    const docs = documents ?? [];
    return [
      { key: 'pdf', titulo: 'Archivos', items: docs.filter((d) => d.file_type === 'pdf') },
      { key: 'image', titulo: 'Imágenes', items: docs.filter((d) => d.file_type !== 'pdf') },
    ].filter((g) => g.items.length > 0);
  }, [documents]);

  const handleDeleteDoc = (docId: string, name: string) => {
    Alert.alert('Eliminar documento', `¿Eliminás "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteDoc.mutate(docId) },
    ]);
  };

  const handlePickDocument = () => {
    const options = ['Imagen de galería', 'Documento (PDF, Word…)', 'Cancelar'];
    const pick = async (choice: number) => {
      if (choice === 0) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { toast.error('Necesitamos acceso a tu galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
        if (!result.canceled && result.assets[0]) {
          const name = docName.trim() || 'Documento';
          await uploadDoc.mutateAsync({ uri: result.assets[0].uri, name });
          setShowUploadDoc(false); setDocName(''); haptic.success(); toast.success('Documento subido');
        }
      } else if (choice === 1) {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const name = docName.trim() || asset.name || 'Documento';
          await uploadDoc.mutateAsync({ uri: asset.uri, name });
          setShowUploadDoc(false); setDocName(''); haptic.success(); toast.success('Documento subido');
        }
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, pick);
    } else {
      Alert.alert('Subir documento', '¿Qué tipo de archivo querés subir?', [
        { text: 'Imagen de galería', onPress: () => pick(0) },
        { text: 'Documento (PDF, Word…)', onPress: () => pick(1) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Documentos" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta real: rótulo de sección y filas con su cajita de ícono.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Documentos" />
        <View style={{ paddingHorizontal: space[4], paddingTop: space[5], gap: space[5] }}>
          <Skeleton width={110} height={16} />
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] + 2 }}>
              <Skeleton width={42} height={42} borderRadius={radius.thumb} />
              <View style={{ flex: 1, gap: space[2] }}>
                <Skeleton width="65%" height={17} />
                <Skeleton width="35%" height={13} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const puedeEditar = can('horses', 'update');
  const total = documents?.length ?? 0;

  const renderFila = (doc: HorseDocument, i: number, ultimo: boolean) => {
    const esPdf = doc.file_type === 'pdf';
    const Icono = esPdf ? FileText : ImageIcon;
    return (
      <Animated.View key={doc.id} entering={entradaFila(i)}>
        <PressableScale
          scaleTo={0.98}
          style={[s.fila, !ultimo && s.filaBorde]}
          onPress={() => { haptic.light(); Linking.openURL(doc.url); }}
          onLongPress={puedeEditar ? () => { haptic.medium(); handleDeleteDoc(doc.id, doc.name); } : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${doc.name}`}
        >
          <View style={[s.filaIcono, { backgroundColor: esPdf ? c.brandSoft : c.infoSoft }]}>
            <Icono size={20} color={esPdf ? c.brand : c.info} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.filaNombre} numberOfLines={1}>{doc.name}</Text>
            <Text style={s.filaSub}>
              {esPdf ? 'PDF' : 'Imagen'}{doc.created_at ? ` · ${fechaHumana(doc.created_at)}` : ''}
            </Text>
          </View>
          {puedeEditar && (
            <PressableScale
              onPress={() => { haptic.light(); handleDeleteDoc(doc.id, doc.name); }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar documento ${doc.name}`}
            >
              <Trash2 size={19} color={c.textFaint} strokeWidth={2} />
            </PressableScale>
          )}
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Documentos"
        subtitle={`${horse.name}${total > 0 ? ` · ${total} archivo${total === 1 ? '' : 's'}` : ''}`}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[20] }}
        showsVerticalScrollIndicator={false}
      >
        {!documents?.length ? (
          <View style={{ paddingHorizontal: space[4], paddingTop: space[5] }}>
            <EmptyState
              icon="document-text-outline"
              title="Sin documentos adjuntos"
              message="Subí certificados, estudios y papeles del caballo para tenerlos siempre a mano."
            />
          </View>
        ) : (
          grupos.map((g) => (
            <View key={g.key}>
              <Text style={s.rotulo}>{g.titulo}</Text>
              <View style={s.lista}>
                {g.items.map((doc, i) => renderFila(doc, i, i === g.items.length - 1))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── CTA fijo ─── */}
      {puedeEditar && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', c.bg]}
            style={[s.velo, { height: insets.bottom + space[20] }]}
          />
          <View style={[s.ctaWrap, { paddingBottom: insets.bottom + space[4] }]}>
            <PressableScale
              style={s.cta}
              onPress={() => { haptic.light(); setShowUploadDoc(true); }}
              accessibilityRole="button"
              accessibilityLabel="Subir un documento"
            >
              <Upload size={19} color={colors.white} strokeWidth={2.2} />
              <Text style={s.ctaText}>Subir un documento</Text>
            </PressableScale>
          </View>
        </>
      )}

      {/* ─── Hoja subir documento (un solo campo: va como hoja, no como pantalla) ─── */}
      <FormSheet
        visible={showUploadDoc}
        onClose={() => setShowUploadDoc(false)}
        title="Subir documento"
        footer={
          <PressableScale
            style={[s.btnPrimary, { flex: 1 }, uploadDoc.isPending && { opacity: 0.5 }]}
            disabled={uploadDoc.isPending}
            onPress={handlePickDocument}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar archivo para subir"
          >
            {uploadDoc.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.btnPrimaryText}>Seleccionar</Text>}
          </PressableScale>
        }
      >
        <TextInput
          style={s.input}
          value={docName}
          onChangeText={setDocName}
          placeholder="Nombre, ej: Certificado de inscripción"
          placeholderTextColor={c.textFaint}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
        <Text style={s.ayuda}>Podés elegir una imagen de la galería o un archivo del teléfono.</Text>
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, paddingHorizontal: space[4], marginTop: space[6], marginBottom: space[1] },

  /* Filas planas sobre el lienzo */
  lista: { paddingHorizontal: space[4] },
  fila: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, paddingVertical: space[3] + 2 },
  filaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  filaIcono: { width: 42, height: 42, borderRadius: radius.thumb - 1, alignItems: 'center', justifyContent: 'center' },
  filaNombre: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  filaSub: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  /* CTA */
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaWrap: { position: 'absolute', left: space[4], right: space[4], bottom: 0 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] + 1,
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },

  /* Hoja */
  input: {
    height: touch.field, borderRadius: radius.field, paddingHorizontal: space[4],
    fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt,
  },
  ayuda: { fontSize: text.sm - 1, color: c.textFaint },
  btnPrimary: { height: touch.button, borderRadius: radius.button, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
