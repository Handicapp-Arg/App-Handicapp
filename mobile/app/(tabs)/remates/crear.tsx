import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Tag, Gavel, Calendar, ChevronRight, Clock, AlertCircle } from 'lucide-react-native';
import { HorseIcon } from '../../../components/icons/equine';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { BottomSheet } from '../../../components/BottomSheet';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useHorses } from '../../../hooks/use-horses';
import { useCreateAuction } from '../../../hooks/use-auctions';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import type { Horse } from '../../../../packages/shared/src';

type AuctionType = 'venta_directa' | 'remate';
type Currency = 'ARS' | 'USD';

function HorseSelector({ horses, selected, onSelect, s }: {
  horses: Horse[];
  selected: string;
  onSelect: (id: string, name: string) => void;
  s: Styles;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horseChipRow}>
      {horses.map((h) => {
        const active = selected === h.id;
        return (
          <TouchableOpacity
            key={h.id}
            style={[s.horseChip, active && s.horseChipActive]}
            onPress={() => { haptic.selection(); onSelect(h.id, h.name); }}
            activeOpacity={0.75}
          >
            {active && <Check size={13} color={colors.white} strokeWidth={2.5} />}
            <Text style={[s.horseChipText, active && s.horseChipTextActive]}>{h.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function TypeOption({ type, selected, onSelect, isLast, c, s }: {
  type: AuctionType;
  selected: AuctionType;
  onSelect: (t: AuctionType) => void;
  isLast: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  const isSelected = type === selected;
  const config = type === 'venta_directa'
    ? { Icon: Tag, title: 'Venta directa', desc: 'Precio fijo, trato directo con el comprador', color: c.brand, soft: c.brandSoft }
    : { Icon: Gavel, title: 'Remate', desc: 'Subasta por tiempo limitado, mayor al mejor postor', color: c.info, soft: c.infoSoft };

  return (
    <TouchableOpacity
      style={[s.typeOption, !isLast && s.typeOptionDivider]}
      onPress={() => { haptic.selection(); onSelect(type); }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Tipo de publicación: ${config.title}`}
    >
      <View style={[s.typeIcon, { backgroundColor: config.soft }]}>
        <config.Icon size={24} color={config.color} strokeWidth={2} />
      </View>
      <View style={s.typeBody}>
        <Text style={[s.typeTitle, isSelected && { color: config.color }]}>{config.title}</Text>
        <Text style={s.typeDesc}>{config.desc}</Text>
      </View>
      <View style={[s.typeRadio, isSelected && { backgroundColor: config.color, borderColor: config.color }]}>
        {isSelected && <View style={s.typeRadioInner} />}
      </View>
    </TouchableOpacity>
  );
}

export default function CrearRemateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { horse: preselectedHorseId } = useLocalSearchParams<{ horse?: string }>();
  const { data: horses } = useHorses();
  const createAuction = useCreateAuction();

  const [horseId, setHorseId] = useState(preselectedHorseId ?? '');
  const [horseName, setHorseName] = useState('');
  const [type, setType] = useState<AuctionType>('venta_directa');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [location, setLocation] = useState('');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endHour, setEndHour] = useState(20); // default 20:00
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [hasHealthCert, setHasHealthCert] = useState(false);
  const [hasOwnershipDocs, setHasOwnershipDocs] = useState(false);
  const [error, setError] = useState('');

  const handleHorseSelect = (id: string, name: string) => {
    setHorseId(id);
    setHorseName(name);
    if (!title) setTitle(`${name} en venta`);
  };

  const handleSubmit = async () => {
    setError('');
    if (!horseId) { setError('Seleccioná un caballo'); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Ingresá un precio válido');
      return;
    }
    if (type === 'remate' && !endDate) {
      setError('Elegí la fecha de cierre del remate');
      return;
    }

    const buildAuctionEnd = () => {
      if (!endDate) return undefined;
      const d = new Date(endDate);
      d.setHours(endHour, 0, 0, 0);
      return d.toISOString();
    };

    const payload: Parameters<typeof createAuction.mutateAsync>[0] = {
      horse_id: horseId,
      type,
      title: title || `${horseName} en venta`,
      currency,
      location: location || undefined,
      has_health_cert: hasHealthCert,
      has_ownership_docs: hasOwnershipDocs,
      ...(type === 'venta_directa'
        ? { asking_price: Number(price) }
        : {
            starting_bid: Number(price),
            bid_increment: Math.max(100, Math.round(Number(price) * 0.02)),
            auction_end: buildAuctionEnd(),
          }
      ),
    };

    try {
      const auction = await createAuction.mutateAsync(payload);
      haptic.success();
      router.replace(`/(tabs)/remates/${auction.id}` as never);
    } catch {
      setError('No se pudo crear el borrador. Verificá los datos e intentá de nuevo.');
    }
  };

  // Pre-fill horse name when coming from horse detail
  useEffect(() => {
    if (preselectedHorseId && horses) {
      const h = horses.find((x) => x.id === preselectedHorseId);
      if (h && !horseName) {
        setHorseName(h.name);
        if (!title) setTitle(`${h.name} en venta`);
      }
    }
  }, [preselectedHorseId, horses]);

  const myHorses = horses ?? [];

  return (
    <View style={s.root}>
      <ScreenHeader title="Nueva publicación" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
        >
          {/* Caballo y tipo de venta */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>¿Cuál caballo querés vender?</Text>
            {myHorses.length === 0 ? (
              <View style={s.emptyHorses}>
                <HorseIcon size={32} color={c.textFaint} />
                <Text style={s.emptyHorsesText}>No tenés caballos registrados</Text>
              </View>
            ) : (
              <HorseSelector
                horses={myHorses}
                selected={horseId}
                onSelect={handleHorseSelect}
                s={s}
              />
            )}
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Tipo de publicación</Text>
            <TypeOption type="venta_directa" selected={type} onSelect={setType} isLast={false} c={c} s={s} />
            <TypeOption type="remate" selected={type} onSelect={setType} isLast c={c} s={s} />
          </View>

          {/* Precio y cierre */}
          <View style={[s.section, s.groupStart]}>
            <Text style={s.sectionLabel}>
              {type === 'venta_directa' ? 'Precio de venta' : 'Precio base de la subasta'}
            </Text>
            <View style={s.priceRow}>
              {/* Moneda */}
              <View style={s.currencyToggle}>
                {(['USD', 'ARS'] as Currency[]).map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    style={[s.currencyBtn, currency === cur && s.currencyBtnActive]}
                    onPress={() => { haptic.selection(); setCurrency(cur); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.currencyBtnText, currency === cur && s.currencyBtnTextActive]}>{cur}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Monto */}
              <TextInput
                style={s.priceInput}
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={c.textFaint}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Fecha y hora de cierre (solo remate) */}
          {type === 'remate' && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>¿Cuándo cierra el remate?</Text>

              {/* Botón que abre el calendario */}
              <TouchableOpacity
                style={[s.dateTrigger, endDate && s.dateTriggerFilled]}
                onPress={() => { haptic.light(); setTempDate(endDate ?? new Date()); setShowDatePicker(true); }}
                activeOpacity={0.8}
              >
                <View style={s.dateTriggerIcon}>
                  <Calendar size={22} color={endDate ? c.brand : c.textFaint} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.dateTriggerLabel, !endDate && { color: c.textFaint }]}>
                    {endDate
                      ? endDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                      : 'Elegí una fecha'}
                  </Text>
                  {endDate && (
                    <Text style={s.dateTriggerSub}>Tocá para cambiar</Text>
                  )}
                </View>
                <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>

              {/* Android: picker inline */}
              {showDatePicker && Platform.OS === 'android' && (
                <RNDateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(_, selected) => {
                    setShowDatePicker(false);
                    if (selected) { setEndDate(selected); haptic.selection(); }
                  }}
                />
              )}

              {/* iOS: hoja con spinner */}
              {Platform.OS === 'ios' && (
                <BottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)}>
                  <View style={s.pickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar selección de fecha"
                    >
                      <Text style={s.pickerCancel}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={s.pickerTitle}>Fecha de cierre</Text>
                    <TouchableOpacity
                      onPress={() => { setEndDate(tempDate); setShowDatePicker(false); haptic.selection(); }}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar fecha de cierre"
                    >
                      <Text style={s.pickerConfirm}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <RNDateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(_, selected) => { if (selected) setTempDate(selected); }}
                    locale="es-AR"
                    style={{ height: 200 }}
                  />
                </BottomSheet>
              )}

              {/* Horario de cierre — chips predefinidos */}
              {endDate && (
                <View style={s.timeSection}>
                  <Text style={s.timeSectionLabel}>Hora de cierre</Text>
                  <View style={s.timeChips}>
                    {[10, 14, 18, 20, 22].map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[s.timeChip, endHour === h && s.timeChipActive]}
                        onPress={() => { haptic.selection(); setEndHour(h); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.timeChipText, endHour === h && s.timeChipTextActive]}>
                          {`${String(h).padStart(2, '0')}:00`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Resumen fecha+hora: texto plano, sin caja */}
                  <View style={s.dateTimeSummary}>
                    <Clock size={14} color={c.brand} strokeWidth={2} />
                    <Text style={s.dateTimeSummaryText}>
                      Cierra el {endDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} a las {String(endHour).padStart(2, '0')}:00 hs
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Publicación */}
          {/* Título y ubicación: sin rótulo, el placeholder describe el campo */}
          <View style={[s.section, s.groupStart]}>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder={horseName ? `${horseName} en venta` : 'Título del anuncio, ej: Cuarteron Polo 10 años'}
              placeholderTextColor={c.textFaint}
              autoCapitalize="sentences"
              accessibilityLabel="Título del anuncio"
            />
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Ubicación (opcional), ej: Buenos Aires, Argentina"
              placeholderTextColor={c.textFaint}
              accessibilityLabel="Ubicación"
            />
          </View>

          {/* Documentación: filas de lista, sin caja por ítem */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Documentación disponible</Text>
            <TouchableOpacity
              style={[s.checkRow, s.checkRowDivider]}
              onPress={() => { haptic.selection(); setHasHealthCert(!hasHealthCert); }}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasHealthCert }}
              accessibilityLabel="Certificado sanitario SENASA"
            >
              <View style={[s.checkbox, hasHealthCert && s.checkboxActive]}>
                {hasHealthCert && <Check size={14} color={colors.white} strokeWidth={2} />}
              </View>
              <Text style={s.checkLabel}>Certificado sanitario SENASA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.checkRow}
              onPress={() => { haptic.selection(); setHasOwnershipDocs(!hasOwnershipDocs); }}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasOwnershipDocs }}
              accessibilityLabel="Documentos de propiedad"
            >
              <View style={[s.checkbox, hasOwnershipDocs && s.checkboxActive]}>
                {hasOwnershipDocs && <Check size={14} color={colors.white} strokeWidth={2} />}
              </View>
              <Text style={s.checkLabel}>Documentos de propiedad</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <AlertCircle size={16} color={c.danger} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: space[4] }} />
        </ScrollView>

        {/* Footer con botón */}
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <TouchableOpacity
            style={[s.publishBtn, (!horseId || createAuction.isPending) && s.publishBtnDisabled]}
            onPress={handleSubmit}
            disabled={!horseId || createAuction.isPending}
            activeOpacity={0.85}
          >
            {createAuction.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Check size={20} color={colors.white} strokeWidth={2} />
                <Text style={s.publishBtnText}>Crear borrador</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={s.draftNote}>
            Se guarda como borrador. Después lo revisás y lo publicás para que aparezca en el mercado.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  scroll: { flex: 1 },
  content: { padding: space[4], gap: space[5] },

  section: { gap: space[3] },
  // Separación extra al arrancar un grupo temático nuevo (caballo+tipo / precio+fecha / datos finales).
  groupStart: { marginTop: space[3] },
  sectionLabel: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },

  /* Horse selector: fila horizontal de chips (patrón facturacion/nueva) */
  horseChipRow: { flexDirection: 'row', gap: space[2] },
  horseChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2] + 2,
    backgroundColor: c.surfaceAlt,
  },
  horseChipActive: { backgroundColor: c.brand },
  horseChipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  horseChipTextActive: { color: colors.white },
  emptyHorses: { alignItems: 'center', padding: space[8], gap: space[3] },
  emptyHorsesText: { fontSize: text.sm, color: c.textFaint },

  /* Type options: filas planas, separadas con hairline (patrón Más) */
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3],
  },
  typeOptionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  typeIcon: { width: 48, height: 48, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  typeBody: { flex: 1 },
  typeTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  typeDesc: { fontSize: text.xs, color: c.textMuted, marginTop: 2, lineHeight: 16 },
  typeRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderStrong, justifyContent: 'center', alignItems: 'center' },
  typeRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },

  /* Price */
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  currencyToggle: {
    flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
  },
  currencyBtn: { paddingHorizontal: space[4], paddingVertical: space[3] },
  currencyBtnActive: { backgroundColor: c.brand },
  currencyBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },
  currencyBtnTextActive: { color: colors.white },
  priceInput: {
    flex: 1, fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text,
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb', borderRadius: radius.xl,
    paddingHorizontal: space[4], paddingVertical: space[3],
    textAlign: 'right', fontVariant: ['tabular-nums'],
  },

  row: { flexDirection: 'row', gap: space[3] },
  input: {
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb', borderRadius: radius.lg,
    paddingHorizontal: space[4], paddingVertical: space[3] + 2,
    fontSize: text.base, color: c.text,
  },

  /* Date picker */
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.xl,
    padding: space[4],
  },
  dateTriggerFilled: { backgroundColor: c.brandSoft },
  dateTriggerIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  dateTriggerLabel: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  dateTriggerSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[5], paddingVertical: space[4],
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  pickerTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  pickerCancel: { fontSize: text.base, color: c.textMuted },
  pickerConfirm: { fontSize: text.base, fontWeight: weight.bold, color: c.brand },

  /* Time chips */
  timeSection: { gap: space[2], marginTop: space[1] },
  timeSectionLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  timeChip: {
    paddingHorizontal: space[4], paddingVertical: space[2] + 2,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
  },
  timeChipActive: { backgroundColor: c.brand },
  timeChipText: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },
  timeChipTextActive: { color: colors.white },

  dateTimeSummary: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    marginTop: space[1],
  },
  dateTimeSummaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },

  /* Checks: filas planas, separadas con hairline */
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3],
  },
  checkRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: c.borderStrong,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: c.success, borderColor: c.success },
  checkLabel: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted, flex: 1 },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.dangerSoft, borderRadius: radius.lg,
    padding: space[3], borderWidth: 1, borderColor: c.danger,
  },
  errorText: { fontSize: text.sm, color: c.danger, flex: 1 },

  /* Footer */
  footer: {
    backgroundColor: c.surface,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    ...(c.isDark ? {} : shadow.sm),
  },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2], backgroundColor: c.brand,
    borderRadius: radius.xl, paddingVertical: space[4],
    ...shadow.sm,
  },
  publishBtnDisabled: { backgroundColor: c.borderStrong },
  publishBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
  draftNote: { fontSize: text.xs, color: c.textFaint, textAlign: 'center', marginTop: space[2], lineHeight: 16 },
});
