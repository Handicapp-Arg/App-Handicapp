import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useCreateAppointment, APPOINTMENT_TYPES } from '../../../hooks/use-agenda';
import { useHorses } from '../../../hooks/use-horses';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ActionSheet } from '../../../components/ActionSheet';
import { FilaSelector } from '../../../components/FilaSelector';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { hora } from '../../../lib/fechas';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';

export default function NuevoTurnoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses } = useHorses();
  const create = useCreateAppointment();
  const toast = useToast();

  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [type, setType] = useState('veterinario');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [timeDate, setTimeDate] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState('');
  const [selector, setSelector] = useState<'caballo' | 'tipo' | null>(null);

  const timeStr = hora(timeDate.toISOString());
  const horseSel = horses?.find((h) => h.id === horseId);

  useEffect(() => {
    if (!horseId && horses?.[0]?.id) setHorseId(horses[0].id);
  }, [horses]);

  const isDirty = !!title.trim() || !!date;
  const canSubmit = !!horseId && !!title.trim() && !!date && !create.isPending;

  // Tras guardar con exito el back es programatico: el guardia no debe frenarlo.
  const guardadoRef = useRef(false);

  // Confirmar descarte solo si el formulario está sucio.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardadoRef.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar el turno?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!horseId || !title.trim() || !date) { setError('Completá todos los campos'); haptic.error(); return; }
    setError('');
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(timeDate.getHours(), timeDate.getMinutes());
    try {
      await create.mutateAsync({ horse_id: horseId, type, title, scheduled_at: dt.toISOString() });
      haptic.success();
      guardadoRef.current = true;
      toast.success('Turno agendado');
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo agendar el turno. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo turno" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Título primero, con placeholder en vez de label */}
        <TextInput
          style={inputStyle.base}
          value={title}
          onChangeText={setTitle}
          placeholder="¿Qué turno es? Ej: Control anual"
          placeholderTextColor={c.textFaint}
        />

        {/* Filas de selección, patrón Ajustes de iOS */}
        <View>
          <FilaSelector
            primera
            label="Caballo"
            valor={horseSel?.name}
            onPress={() => setSelector('caballo')}
          />
          <FilaSelector
            label="Tipo"
            valor={APPOINTMENT_TYPES[type]?.label}
            onPress={() => setSelector('tipo')}
          />
        </View>

        <DatePicker label="Fecha" value={date} onChange={setDate} />

        {/* Hora */}
        <Pressable
          onPress={() => { haptic.selection(); setShowTimePicker(true); }}
          style={[inputStyle.base, s.horaRow]}
        >
          <Text style={{ fontSize: text.base, color: c.text }}>{timeStr}</Text>
          <Clock size={18} color={c.textFaint} strokeWidth={1.8} />
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            value={timeDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selected) setTimeDate(selected);
            }}
          />
        )}

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {create.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Crear turno</Text>
          }
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={selector === 'caballo'}
        onClose={() => setSelector(null)}
        title="Caballo"
        acciones={(horses ?? []).map((h) => ({ label: h.name, onPress: () => setHorseId(h.id) }))}
      />
      <ActionSheet
        visible={selector === 'tipo'}
        onClose={() => setSelector(null)}
        title="Tipo de turno"
        acciones={Object.entries(APPOINTMENT_TYPES).map(([v, m]) => ({ label: m.label, onPress: () => setType(v) }))}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  horaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: text.sm, color: c.danger },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});
