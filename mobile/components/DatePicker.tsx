import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '../lib/theme';

interface Props {
  label: string;
  value: string;          // YYYY-MM-DD or ''
  onChange: (date: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
}

function toDate(s: string): Date {
  return s ? new Date(s + 'T12:00:00') : new Date();
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePicker({ label, value, onChange, placeholder = 'Seleccionar fecha', maxDate, minDate }: Props) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const displayText = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder;

  const handleOpen = () => {
    setTempDate(toDate(value));
    setShow(true);
  };

  const handleConfirm = () => {
    onChange(toISO(tempDate));
    setShow(false);
  };

  const handleCancel = () => setShow(false);

  // ─── Android: inline spinner (works inside any Modal) ────────────────────────
  if (Platform.OS === 'android') {
    return (
      <View style={s.wrap}>
        <Text style={s.label}>{label}</Text>
        <TouchableOpacity style={s.btn} onPress={handleOpen} activeOpacity={0.7}>
          <Text style={[s.btnText, !value && s.placeholder]}>{displayText}</Text>
          <Calendar size={17} color={c.textFaint} strokeWidth={2} />
        </TouchableOpacity>

        {show && (
          <View style={s.androidInline}>
            <RNDateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(_, selected) => { if (selected) setTempDate(selected); }}
              maximumDate={maxDate}
              minimumDate={minDate}
              style={s.androidPicker}
            />
            <View style={s.androidActions}>
              <TouchableOpacity style={s.androidCancel} onPress={handleCancel}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.androidConfirm} onPress={handleConfirm}>
                <Text style={s.confirmText}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ─── iOS: sheet modal ─────────────────────────────────────────────────────────
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.btn} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={[s.btnText, !value && s.placeholder]}>{displayText}</Text>
        <Calendar size={17} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.header}>
              <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={s.title}>{label}</Text>
              <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.confirmText}>Listo</Text>
              </TouchableOpacity>
            </View>
            <RNDateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(_, selected) => { if (selected) setTempDate(selected); }}
              maximumDate={maxDate}
              minimumDate={minDate}
              locale="es-AR"
              textColor={c.text}
              style={s.picker}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  btn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: c.surfaceAlt,
  },
  btnText: { fontSize: 14, color: c.text },
  placeholder: { color: c.textFaint },
  icon: { fontSize: 16 },

  // Android inline
  androidInline: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    backgroundColor: c.surface, overflow: 'hidden', marginTop: 4,
  },
  androidPicker: { height: 180 },
  androidActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border,
  },
  androidCancel: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRightWidth: 1, borderRightColor: c.border,
  },
  androidConfirm: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },

  // iOS modal
  overlay: {
    flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  title: { fontSize: 15, fontWeight: '600', color: c.text },
  cancelText: { fontSize: 15, color: c.textMuted },
  confirmText: { fontSize: 15, fontWeight: '700', color: c.brand },
  picker: { height: 216 },
});
