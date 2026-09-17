import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';

import { useHorse, useUpdateHorse } from '../../../../hooks/use-horses';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { useToast } from '../../../../components/Toast';
import { Spinner } from '../../../../components/Spinner';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
import { useCommonStyles } from '../../../../styles/common';

export default function EditarCaballoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const { data: horse, isLoading } = useHorse(id);
  const updateHorse = useUpdateHorse();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [error, setError] = useState('');
  const [precargado, setPrecargado] = useState(false);
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  // Precargar los datos del caballo una sola vez, cuando llegan.
  useEffect(() => {
    if (!horse || precargado) return;
    setName(horse.name);
    setBirthDate(horse.birth_date ?? '');
    setMicrochip(horse.microchip ?? '');
    setPrecargado(true);
  }, [horse, precargado]);

  const isDirty = !!horse && precargado && (
    name !== horse.name ||
    birthDate !== (horse.birth_date ?? '') ||
    microchip !== (horse.microchip ?? '')
  );
  const canSubmit = !!name.trim() && isDirty && !updateHorse.isPending;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardado.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que editaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSave = async () => {
    if (!horse) return;
    if (!name.trim()) { setError('El nombre es obligatorio'); haptic.error(); return; }
    setError('');
    try {
      await updateHorse.mutateAsync({ id: horse.id, name: name.trim(), birth_date: birthDate || null, microchip: microchip || null });
      haptic.success();
      toast.success('Cambios guardados');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudieron guardar los cambios. Intentá de nuevo.');
    }
  };

  if (isLoading || !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Editar caballo" />
        <Spinner />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Editar caballo" subtitle={horse.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TextInput
          style={inputStyle.base}
          value={name}
          onChangeText={setName}
          placeholder="Nombre del caballo"
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
        />
        <DatePicker label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} maxDate={new Date()} />
        <TextInput
          style={inputStyle.base}
          value={microchip}
          onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
          placeholder="Microchip (15 dígitos)"
          placeholderTextColor={c.textFaint}
          keyboardType="numeric"
          returnKeyType="done"
        />
        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el cuero vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar cambios del caballo"
        >
          {updateHorse.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: colors.red500 },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
