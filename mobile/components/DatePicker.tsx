import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../lib/colors';

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
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.btn} onPress={handleOpen} activeOpacity={0.7}>
          <Text style={[styles.btnText, !value && styles.placeholder]}>{displayText}</Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>

        {show && (
          <View style={styles.androidInline}>
            <RNDateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(_, selected) => { if (selected) setTempDate(selected); }}
              maximumDate={maxDate}
              minimumDate={minDate}
              style={styles.androidPicker}
            />
            <View style={styles.androidActions}>
              <TouchableOpacity style={styles.androidCancel} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.androidConfirm} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ─── iOS: sheet modal ─────────────────────────────────────────────────────────
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.btn} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={[styles.btnText, !value && styles.placeholder]}>{displayText}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{label}</Text>
              <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.confirmText}>Listo</Text>
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
              textColor={colors.gray900}
              style={styles.picker}
            />
          </View>
        </View>
      </Modal>
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

  // Android inline
  androidInline: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 12,
    backgroundColor: colors.white, overflow: 'hidden', marginTop: 4,
  },
  androidPicker: { height: 180 },
  androidActions: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  androidCancel: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderRightWidth: 1, borderRightColor: colors.gray100,
  },
  androidConfirm: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },

  // iOS modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.gray900 },
  cancelText: { fontSize: 15, color: colors.gray500 },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  picker: { height: 216 },
});
