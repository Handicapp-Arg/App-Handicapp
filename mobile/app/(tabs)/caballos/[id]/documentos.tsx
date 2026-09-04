import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, ActionSheetIOS, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Trash2 } from 'lucide-react-native';

import { useHorse, useHorseDocuments, useUploadDocument, useDeleteDocument } from '../../../../hooks/use-horses';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, touch } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormSheet } from '../../../../components/FormSheet';
import { Spinner } from '../../../../components/Spinner';

export default function DocumentosScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const { data: documents } = useHorseDocuments(id);
  const uploadDoc = useUploadDocument(id);
  const deleteDoc = useDeleteDocument(id);

  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    if (!showUploadDoc) return;
    setDocName('');
  }, [showUploadDoc]);

  const handleDeleteDoc = (docId: string, name: string) => {
    Alert.alert('Eliminar documento', `¿Eliminás "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteDoc.mutate(docId) },
    ]);
  };

  const handlePickDocument = () => {
    const options = ['Imagen de galería', 'Documento (PDF, Word...)', 'Cancelar'];
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
        { text: 'Documento (PDF, Word...)', onPress: () => pick(1) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  if (isLoading || !horse) return <Spinner />;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Documentos" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>Documentos</Text>
            {can('horses', 'update') && (
              <TouchableOpacity onPress={() => { haptic.light(); setShowUploadDoc(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Subir</Text>
              </TouchableOpacity>
            )}
          </View>
          {!documents?.length ? (
            <Text style={s.emptyText}>Sin documentos adjuntos</Text>
          ) : (
            <View>
              {documents.map((doc) => (
                <View key={doc.id} style={s.personRow}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} onPress={() => { haptic.light(); Linking.openURL(doc.url); }} activeOpacity={0.7}>
                    <View style={s.docIcon}><FileText size={18} color={colors.red500} strokeWidth={2} /></View>
                    <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                  </TouchableOpacity>
                  {can('horses', 'update') && (
                    <TouchableOpacity
                      onPress={() => handleDeleteDoc(doc.id, doc.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar documento ${doc.name}`}
                    >
                      <Trash2 size={20} color={c.textFaint} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Hoja subir documento ─── */}
      <FormSheet
        visible={showUploadDoc}
        onClose={() => setShowUploadDoc(false)}
        title="Subir documento"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowUploadDoc(false)} accessibilityRole="button" accessibilityLabel="Cancelar subida de documento">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, uploadDoc.isPending && { opacity: 0.5 }]}
              disabled={uploadDoc.isPending}
              onPress={handlePickDocument}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar archivo para subir"
            >
              {uploadDoc.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.btnPrimaryText}>Seleccionar</Text>}
            </TouchableOpacity>
          </>
        }
      >
        <TextInput
          style={s.input}
          value={docName}
          onChangeText={setDocName}
          placeholder="Nombre del documento, ej: Pedigree, Certificado..."
          placeholderTextColor={c.textFaint}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
        <Text style={{ fontSize: 11, color: c.textFaint }}>Seleccioná una imagen de tu galería para adjuntarla.</Text>
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  emptyText: { fontSize: text.sm, color: c.textFaint },

  personRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  docName: { flex: 1, fontSize: text.base, fontWeight: '500', color: c.text },

  smallBtn: { minHeight: touch.min, justifyContent: 'center', borderRadius: 999, paddingHorizontal: space[4], backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: text.sm, fontWeight: '600', color: c.text },

  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: text.base, fontWeight: '600', color: c.textMuted },
});
