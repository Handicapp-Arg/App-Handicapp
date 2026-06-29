import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Check, Tag, Trophy, Calendar, ChevronRight, Clock, AlertCircle, Megaphone } from 'lucide-react-native';
import { HorseIcon } from '../../../components/icons/equine';
import { ScreenHeader } from '../../../components/ScreenHeader';
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
    <View style={s.horseGrid}>
      {horses.map((h) => (
        <TouchableOpacity
          key={h.id}
          style={[s.horseOption, selected === h.id && s.horseOptionActive]}
          onPress={() => { haptic.selection(); onSelect(h.id, h.name); }}
          activeOpacity={0.75}
        >
          <View style={[s.horseOptionAvatar, selected === h.id && s.horseOptionAvatarActive]}>
            <Text style={[s.horseOptionAvatarText, selected === h.id && { color: colors.white }]}>
              {h.name[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={[s.horseOptionName, selected === h.id && s.horseOptionNameActive]} numberOfLines={2}>
            {h.name}
          </Text>
          {selected === h.id && (
            <View style={s.horseCheckMark}>
              <Check size={12} color={colors.white} strokeWidth={2} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TypeOption({ type, selected, onSelect, c, s }: {
  type: AuctionType;
  selected: AuctionType;
  onSelect: (t: AuctionType) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const isSelected = type === selected;
  const config = type === 'venta_directa'
    ? { Icon: Tag, title: 'Venta directa', desc: 'Precio fijo, trato directo con el comprador', color: c.brand }
    : { Icon: Trophy, title: 'Remate', desc: 'Subasta por tiempo limitado, mayor al mejor postor', color: '#d9a94e' };

  return (
    <TouchableOpacity
      style={[s.typeOption, isSelected && { borderColor: config.color, backgroundColor: isSelected ? `${config.color}0d` : c.surface }]}
      onPress={() => { haptic.selection(); onSelect(type); }}
      activeOpacity={0.8}
    >
      <View style={[s.typeIcon, { backgroundColor: `${config.color}18` }]}>
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
      setError('No se pudo publicar. Verificá los datos e intentá de nuevo.');
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
      <ScreenHeader title="Publicar caballo" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Paso 1: Elegir caballo */}
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

          {/* Paso 2: Tipo de venta */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Tipo de publicación</Text>
            <TypeOption type="venta_directa" selected={type} onSelect={setType} c={c} s={s} />
            <TypeOption type="remate" selected={type} onSelect={setType} c={c} s={s} />
          </View>

          {/* Paso 3: Precio */}
          <View style={s.section}>
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
                keyboardType="numeric"
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

              {/* iOS: modal con spinner */}
              {Platform.OS === 'ios' && (
                <Modal visible={showDatePicker} transparent animationType="fade" statusBarTranslucent>
                  <View style={s.pickerOverlay}>
                    <Animated.View style={s.pickerSheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
                      <View style={s.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={s.pickerCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={s.pickerTitle}>Fecha de cierre</Text>
                        <TouchableOpacity onPress={() => { setEndDate(tempDate); setShowDatePicker(false); haptic.selection(); }}>
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
                    </Animated.View>
                  </View>
                </Modal>
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
                  {/* Resumen fecha+hora */}
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

          {/* Título */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Título del anuncio</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder={horseName ? `${horseName} en venta` : 'Ej: Cuarteron Polo 10 años'}
              placeholderTextColor={c.textFaint}
              autoCapitalize="sentences"
            />
          </View>

          {/* Ubicación */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Ubicación (opcional)</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Ej: Buenos Aires, Argentina"
              placeholderTextColor={c.textFaint}
            />
          </View>

          {/* Documentación */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Documentación disponible</Text>
            <TouchableOpacity
              style={[s.checkRow, hasHealthCert && s.checkRowActive]}
              onPress={() => { haptic.selection(); setHasHealthCert(!hasHealthCert); }}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, hasHealthCert && s.checkboxActive]}>
                {hasHealthCert && <Check size={14} color={colors.white} strokeWidth={2} />}
              </View>
              <Text style={s.checkLabel}>Certificado sanitario SENASA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.checkRow, hasOwnershipDocs && s.checkRowActive]}
              onPress={() => { haptic.selection(); setHasOwnershipDocs(!hasOwnershipDocs); }}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, hasOwnershipDocs && s.checkboxActive]}>
                {hasOwnershipDocs && <Check size={14} color={colors.white} strokeWidth={2} />}
              </View>
              <Text style={s.checkLabel}>Documentos de propiedad</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <AlertCircle size={16} color={colors.red500} strokeWidth={2} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: space[4] }} />
        </ScrollView>

        {/* Footer con botón */}
        <View style={[s.footer, { paddingBottom: insets.bottom + space[3] }]}>
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
                <Megaphone size={20} color={colors.white} strokeWidth={2} />
                <Text style={s.publishBtnText}>Publicar caballo</Text>
              </>
            )}
          </TouchableOpacity>
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
  sectionLabel: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },

  /* Horse selector */
  horseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  horseOption: {
    width: '30%',
    alignItems: 'center',
    padding: space[3],
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: c.borderStrong,
    gap: space[2],
    position: 'relative',
    ...shadow.sm,
  },
  horseOptionActive: { borderColor: c.brand, backgroundColor: c.brandSoft },
  horseOptionAvatar: {
    width: 52, height: 52, borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  horseOptionAvatarActive: { backgroundColor: c.brand },
  horseOptionAvatarText: { fontSize: text.xl, fontWeight: weight.bold, color: c.brand },
  horseOptionName: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted, textAlign: 'center' },
  horseOptionNameActive: { color: c.brand },
  horseCheckMark: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center',
  },
  emptyHorses: { alignItems: 'center', padding: space[8], gap: space[3] },
  emptyHorsesText: { fontSize: text.sm, color: c.textFaint },

  /* Type options */
  typeOption: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 2, borderColor: c.borderStrong,
    padding: space[4],
    ...shadow.sm,
  },
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
    borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surfaceAlt,
  },
  currencyBtn: { paddingHorizontal: space[4], paddingVertical: space[3] },
  currencyBtnActive: { backgroundColor: c.brand },
  currencyBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },
  currencyBtnTextActive: { color: colors.white },
  priceInput: {
    flex: 1, fontSize: 28, fontWeight: weight.extrabold, color: c.text,
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[4], paddingVertical: space[3],
    textAlign: 'right',
    ...shadow.sm,
  },

  row: { flexDirection: 'row', gap: space[3] },
  input: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[4], paddingVertical: space[3] + 2,
    fontSize: text.base, color: c.text,
    ...shadow.sm,
  },

  /* Date picker */
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 2, borderColor: c.borderStrong,
    padding: space[4],
    ...shadow.sm,
  },
  dateTriggerFilled: { borderColor: c.brand, backgroundColor: c.brandSoft },
  dateTriggerIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  dateTriggerLabel: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  dateTriggerSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  pickerOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
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
    borderRadius: radius.full, borderWidth: 1.5, borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  timeChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  timeChipText: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },
  timeChipTextActive: { color: colors.white },

  dateTimeSummary: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.brandSoft, borderRadius: radius.lg, padding: space[3],
  },
  dateTimeSummaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },

  /* Checks */
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4],
  },
  checkRowActive: { borderColor: c.isDark ? 'rgba(16,185,129,0.4)' : '#10b981', backgroundColor: c.isDark ? 'rgba(16,185,129,0.14)' : '#f0fdf4' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: c.borderStrong,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkLabel: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted, flex: 1 },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : colors.red50, borderRadius: radius.lg,
    padding: space[3], borderWidth: 1, borderColor: c.isDark ? 'rgba(239,68,68,0.3)' : '#fca5a5',
  },
  errorText: { fontSize: text.sm, color: c.isDark ? '#fca5a5' : colors.red500, flex: 1 },

  /* Footer */
  footer: {
    backgroundColor: c.surface,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: c.border,
    ...shadow.sm,
  },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2], backgroundColor: c.brand,
    borderRadius: radius.xl, paddingVertical: space[4],
    ...shadow.sm,
  },
  publishBtnDisabled: { backgroundColor: c.borderStrong },
  publishBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
});
