import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../lib/colors';

interface Props {
  label: string;
  value: string;          // YYYY-MM-DD o ''
  onChange: (date: string) => void;
  placeholder?: string;
  maxDate?: Date;
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

export function DatePicker({ label, value, onChange, placeholder = 'Seleccionar fecha', maxDate }: Props) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  const displayText = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : placeholder;

  const handleChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      setTempDate(selected);
      if (Platform.OS === 'android') onChange(toISO(selected));
    }
  };

  const handleIOSConfirm = () => {
    onChange(toISO(tempDate));
    setShow(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => { setTempDate(toDate(value)); setShow(true); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, !value && styles.placeholder]}>{displayText}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {/* Android: inline */}
      {show && Platform.OS === 'android' && (
        <RNDateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maxDate}
          locale="es-AR"
        />
      )}

      {/* iOS: modal con confirmación */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.iosTitle}>{label}</Text>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.iosConfirmText}>Listo</Text>
                </TouchableOpacity>
              </View>
              <RNDateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maxDate}
                locale="es-AR"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  btn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.gray50,
  },
  btnText: { fontSize: 14, color: colors.gray900 },
  placeholder: { color: colors.gray400 },
  icon: { fontSize: 16 },
  iosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosSheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  iosTitle: { fontSize: 15, fontWeight: '600', color: colors.gray900 },
  iosCancelText: { fontSize: 15, color: colors.gray500 },
  iosConfirmText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  iosPicker: { height: 200 },
});
