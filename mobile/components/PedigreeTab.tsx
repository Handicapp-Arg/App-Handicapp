import { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  ChevronLeft, Plus, Pencil, ShieldCheck, Info, File, Mars, Venus,
  Network, CheckCircle2, AlertTriangle, XCircle, Circle,
} from 'lucide-react-native';
import { FormSheet } from './FormSheet';
import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';
import { useToast } from './Toast';
import { colors } from '../lib/colors';
import { haptic } from '../lib/haptics';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch, shadow } from '../styles/tokens';
import { duration, easing } from '../styles/motion';
import {
  usePedigree, usePedigreeValidations, useUpsertPedigree,
  useValidatePedigree, useSearchHorsesForPedigree, type CreatePedigreeDto,
} from '../hooks/use-pedigree';
import type { PedigreeValidation } from '../../packages/shared/src';

/** Alto del árbol. Fijo porque los conectores se dibujan en porcentaje: si la
 *  columna creciera con el contenido, las curvas dejarían de tocar las tarjetas. */
const ALTO = 448;
/** Ancho de las dos columnas de conectores entre generaciones. */
const CONECTOR = 22;

interface NodeData {
  name: string;
  reg?: string | null;
  status?: string | null;
}

const statusColor = (st: string, c: ThemeColors): string => (({
  verified:   c.success,
  partial:    c.warning,
  disputed:   c.danger,
  unverified: c.textFaint,
  pending:    c.info,
} as Record<string, string>)[st] ?? c.textFaint);

const statusBg = (st: string, c: ThemeColors): string => (({
  verified:   c.successSoft,
  partial:    c.warningSoft,
  disputed:   c.dangerSoft,
  unverified: c.surfaceAlt,
  pending:    c.infoSoft,
} as Record<string, string>)[st] ?? c.surfaceAlt);

/**
 * Una llave que se abre: sube a la tarjeta de arriba y baja a la de abajo.
 * Es un borde en L con esquina redondeada, no una línea recta, porque el trazo
 * curvo es lo que lee como "árbol" y no como tabla.
 */
function Llave({ c }: { c: ThemeColors }) {
  return (
    <View style={{ width: CONECTOR, justifyContent: 'center' }}>
      <View style={{ height: '50%', borderRightWidth: 2, borderTopWidth: 2, borderColor: c.borderStrong, borderTopRightRadius: radius.md, marginRight: 10 }} />
      <View style={{ height: '50%', borderRightWidth: 2, borderBottomWidth: 2, borderColor: c.borderStrong, borderBottomRightRadius: radius.md, marginRight: 10 }} />
    </View>
  );
}

/** Las cuatro llaves de padres a abuelos, más finas porque están un paso atrás. */
function LlavesAbuelos({ c }: { c: ThemeColors }) {
  const base = { borderRightWidth: 2, borderColor: c.border, marginRight: 10 } as const;
  return (
    <View style={{ width: CONECTOR, justifyContent: 'space-around' }}>
      <View style={[base, { height: '22%', borderTopWidth: 2, borderTopRightRadius: radius.md }]} />
      <View style={[base, { height: '22%', borderBottomWidth: 2, borderBottomRightRadius: radius.md, marginBottom: space[4] }]} />
      <View style={[base, { height: '22%', borderTopWidth: 2, borderTopRightRadius: radius.md, marginTop: space[4] }]} />
      <View style={[base, { height: '22%', borderBottomWidth: 2, borderBottomRightRadius: radius.md }]} />
    </View>
  );
}

/** Tarjeta de un padre: el rol lo dice la etiqueta y lo confirma la barra lateral.
 *  El punto de estado solo aparece cuando hay algo que decir (validado, disputado...). */
function Progenitor({ rol, nodo, acento, c, n }: {
  rol: string; nodo: NodeData | null; acento: string; c: ThemeColors; n: TreeStyles;
}) {
  const st = nodo?.status ?? 'unverified';
  return (
    <View style={[n.padre, { borderLeftColor: acento }]}>
      {nodo?.status && nodo.status !== 'unverified' && (
        <View style={[n.punto, { backgroundColor: statusColor(st, c) }]} />
      )}
      <Text style={n.rol}>{rol}</Text>
      <Text style={n.padreNombre} numberOfLines={2}>{nodo?.name ?? 'Sin dato'}</Text>
      {nodo?.reg ? <Text style={n.meta} numberOfLines={1}>#{nodo.reg}</Text> : null}
    </View>
  );
}

/** Tarjeta de abuelo. Si no hay dato la tarjeta igual ocupa su lugar: el hueco
 *  también es información (dice hasta dónde llega lo cargado). */
function Abuelo({ nombre, n }: { nombre: string | null; n: TreeStyles }) {
  if (!nombre) {
    return (
      <View style={[n.abuelo, n.abueloVacio]}>
        <Text style={n.abueloVacioTexto}>Sin dato</Text>
      </View>
    );
  }
  return (
    <View style={n.abuelo}>
      <Text style={n.abueloNombre} numberOfLines={2}>{nombre}</Text>
    </View>
  );
}

function PedigreeTree({ horseName, pedigree }: {
  horseName: string;
  pedigree: {
    sire_name?: string | null;
    dam_name?: string | null;
    sire_registration_number?: string | null;
    dam_registration_number?: string | null;
    paternal_grandsire_name?: string | null;
    paternal_granddam_name?: string | null;
    maternal_grandsire_name?: string | null;
    maternal_granddam_name?: string | null;
    sire?: { name: string; pedigree_status?: string } | null;
    dam?: { name: string; pedigree_status?: string } | null;
    pedigree_status?: string | null;
  };
}) {
  const { c } = useTheme();
  const n = useMemo(() => makeN(c), [c]);
  const { width } = useWindowDimensions();

  // Tres columnas iguales dentro del margen de pantalla, descontando las dos
  // columnas de conectores. Se calcula con el ancho real y no con un número
  // fijo para que un teléfono chico o una tablet no rompan la grilla.
  const ancho = Math.max(72, (width - space[4] * 2 - CONECTOR * 2) / 3);

  const sireName = pedigree.sire?.name ?? pedigree.sire_name;
  const damName  = pedigree.dam?.name  ?? pedigree.dam_name;

  const sire: NodeData | null = sireName ? {
    name: sireName,
    reg: pedigree.sire_registration_number,
    status: pedigree.sire?.pedigree_status ?? 'unverified',
  } : null;

  const dam: NodeData | null = damName ? {
    name: damName,
    reg: pedigree.dam_registration_number,
    status: pedigree.dam?.pedigree_status ?? 'unverified',
  } : null;

  return (
    <View style={[n.arbol, { height: ALTO }]}>
      <View style={{ width: ancho, justifyContent: 'center' }}>
        <View style={n.raiz}>
          <Text style={n.raizRol}>El caballo</Text>
          <Text style={n.raizNombre} numberOfLines={2}>{horseName}</Text>
        </View>
      </View>

      <Llave c={c} />

      <View style={{ width: ancho, justifyContent: 'space-around' }}>
        <Progenitor rol="Padre" nodo={sire} acento={c.info} c={c} n={n} />
        <Progenitor rol="Madre" nodo={dam} acento={c.dam} c={c} n={n} />
      </View>

      <LlavesAbuelos c={c} />

      <View style={{ width: ancho, justifyContent: 'space-between' }}>
        <Abuelo nombre={pedigree.paternal_grandsire_name ?? null} n={n} />
        <Abuelo nombre={pedigree.paternal_granddam_name ?? null} n={n} />
        <Abuelo nombre={pedigree.maternal_grandsire_name ?? null} n={n} />
        <Abuelo nombre={pedigree.maternal_granddam_name ?? null} n={n} />
      </View>
    </View>
  );
}

/** Esqueleto con la silueta del árbol: tres columnas, 1 + 2 + 4 tarjetas. */
export function PedigreeTreeSkeleton() {
  const { width } = useWindowDimensions();
  const ancho = Math.max(72, (width - space[4] * 2 - CONECTOR * 2) / 3);
  return (
    <View style={{ flexDirection: 'row', height: ALTO, paddingHorizontal: space[4], paddingTop: space[2] }}>
      <View style={{ width: ancho, justifyContent: 'center' }}>
        <Skeleton height={86} borderRadius={radius.button} />
      </View>
      <View style={{ width: CONECTOR }} />
      <View style={{ width: ancho, justifyContent: 'space-around' }}>
        <Skeleton height={92} borderRadius={radius.field} />
        <Skeleton height={92} borderRadius={radius.field} />
      </View>
      <View style={{ width: CONECTOR }} />
      <View style={{ width: ancho, justifyContent: 'space-between' }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} borderRadius={radius.thumb} />)}
      </View>
    </View>
  );
}

type TreeStyles = ReturnType<typeof makeN>;

const makeN = (c: ThemeColors) => StyleSheet.create({
  arbol: { flexDirection: 'row', paddingHorizontal: space[4], paddingTop: space[2] },

  // El caballo va en la superficie invertida: es el único nodo que no se compara
  // con otro, así que se distingue por contraste y no por color.
  raiz: { backgroundColor: c.text, borderRadius: radius.button, paddingVertical: space[4], paddingHorizontal: space[3] },
  raizRol: { fontSize: text.xs - 1, color: c.textMuted },
  raizNombre: { fontSize: text.base, fontWeight: weight.semibold, color: c.bg, marginTop: 3 },

  padre: {
    backgroundColor: c.surface,
    borderRadius: radius.field,
    padding: space[3],
    borderLeftWidth: 3,
    ...(c.isDark ? {} : shadow.sm),
  },
  punto: { position: 'absolute', top: space[2], right: space[2], width: 7, height: 7, borderRadius: 4 },
  rol: { fontSize: text.xs - 1, color: c.textFaint },
  padreNombre: { fontSize: text.sm + 1, fontWeight: weight.semibold, color: c.text, marginTop: 2 },
  meta: { fontSize: text.xs - 1, color: c.textFaint, marginTop: 2 },

  abuelo: {
    backgroundColor: c.surface,
    borderRadius: radius.thumb,
    padding: space[2] + 2,
    ...(c.isDark ? {} : shadow.sm),
  },
  abueloVacio: { backgroundColor: c.surfaceAlt, shadowOpacity: 0, elevation: 0 },
  abueloNombre: { fontSize: text.xs + 1, fontWeight: weight.semibold, color: c.text },
  abueloVacioTexto: { fontSize: text.xs + 1, fontWeight: weight.medium, color: c.textFaint },
});

// ──────────────────────────────────────────────
// Buscar caballo
// ──────────────────────────────────────────────

const HorseSearchField = forwardRef<TextInput, {
  label: string; value: string;
  onChange: (v: string) => void;
  onSelect: (id: string, name: string) => void;
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
}>(function HorseSearchField({ label, value, onChange, onSelect, returnKeyType, onSubmitEditing }, ref) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const { data: results = [] } = useSearchHorsesForPedigree(value);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        ref={ref}
        style={s.input}
        value={value}
        onChangeText={(v) => { onChange(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar en HandicApp..."
        placeholderTextColor={c.textFaint}
        autoCapitalize="words"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {open && results.length > 0 && (
        <View style={s.dropdown}>
          {results.slice(0, 5).map((r) => (
            <PressableScale
              key={r.id}
              style={s.dropdownItem}
              onPress={() => { haptic.selection(); onSelect(r.id, r.name); onChange(r.name); setOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={`Elegir ${r.name}`}
            >
              <Text style={s.dropdownName}>{r.name}</Text>
              {r.registration_number && (
                <Text style={s.dropdownReg}>#{r.registration_number}</Text>
              )}
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
});

// ──────────────────────────────────────────────
// Formulario edición
// ──────────────────────────────────────────────

function PedigreeFormModal({ horseId, onClose }: { horseId: string; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();
  const { data: existing } = usePedigree(horseId);
  const upsert = useUpsertPedigree(horseId);
  const validate = useValidatePedigree(horseId);
  const [validationResult, setValidationResult] = useState<{ status: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refSireReg = useRef<TextInput>(null);
  const refDamName = useRef<TextInput>(null);
  const refDamReg = useRef<TextInput>(null);
  const refPatSire = useRef<TextInput>(null);
  const refPatDam = useRef<TextInput>(null);
  const refMatSire = useRef<TextInput>(null);
  const refMatDam = useRef<TextInput>(null);

  const [form, setForm] = useState<CreatePedigreeDto>({
    sire_id: undefined, sire_name: '', sire_registration_number: '',
    dam_id: undefined, dam_name: '', dam_registration_number: '',
    paternal_grandsire_name: '', paternal_granddam_name: '',
    maternal_grandsire_name: '', maternal_granddam_name: '',
  });

  // Populate form once existing data resolves (handles re-open after query settles)
  useEffect(() => {
    if (existing && !initialized) {
      setForm({
        sire_id: existing.sire_id ?? undefined,
        sire_name: existing.sire_name ?? existing.sire?.name ?? '',
        sire_registration_number: existing.sire_registration_number ?? '',
        dam_id: existing.dam_id ?? undefined,
        dam_name: existing.dam_name ?? existing.dam?.name ?? '',
        dam_registration_number: existing.dam_registration_number ?? '',
        paternal_grandsire_name: existing.paternal_grandsire_name ?? '',
        paternal_granddam_name: existing.paternal_granddam_name ?? '',
        maternal_grandsire_name: existing.maternal_grandsire_name ?? '',
        maternal_granddam_name: existing.maternal_granddam_name ?? '',
      });
      setInitialized(true);
    }
  }, [existing, initialized]);

  const isPending = upsert.isPending || validate.isPending;

  const handleSave = async (andValidate: boolean) => {
    const dto: CreatePedigreeDto = {
      sire_id: form.sire_id || undefined,
      sire_name: form.sire_name || undefined,
      sire_registration_number: form.sire_registration_number || undefined,
      dam_id: form.dam_id || undefined,
      dam_name: form.dam_name || undefined,
      dam_registration_number: form.dam_registration_number || undefined,
      paternal_grandsire_name: form.paternal_grandsire_name || undefined,
      paternal_granddam_name: form.paternal_granddam_name || undefined,
      maternal_grandsire_name: form.maternal_grandsire_name || undefined,
      maternal_granddam_name: form.maternal_granddam_name || undefined,
    };
    try {
      await upsert.mutateAsync(dto);
      if (andValidate) {
        const result = await validate.mutateAsync();
        setValidationResult(result);
      } else {
        haptic.success();
        toast.success('Pedigrí guardado');
        onClose();
      }
    } catch {
      haptic.error();
      toast.error('No se pudo guardar el pedigrí. Probá de nuevo.');
    }
  };

  const resultMap: Record<string, { Icon: typeof CheckCircle2; title: string; msg: string; color: string }> = {
    verified: { Icon: CheckCircle2,  title: 'Pedigrí verificado',   msg: 'Los datos coinciden con registros oficiales.', color: c.success },
    partial:  { Icon: AlertTriangle, title: 'Validación parcial',   msg: 'Algunos datos coinciden. Revisá y corregí para mejorar el resultado.', color: c.warning },
    failed:   { Icon: XCircle,       title: 'Sin coincidencias',    msg: 'No se encontró en ningún registro oficial. Verificá la ortografía del nombre.', color: c.danger },
    disputed: { Icon: AlertTriangle, title: 'Datos inconsistentes', msg: 'Distintas fuentes muestran información contradictoria.', color: c.danger },
  };
  const resultCfg = validationResult
    ? (resultMap[validationResult.status] ?? { Icon: Info, title: validationResult.status, msg: '', color: c.textMuted })
    : null;
  const ResultIcon = resultCfg?.Icon;

  const closeResult = () => { setValidationResult(null); onClose(); };

  return (
    <>
      <View style={[s.formScreen, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <ChevronLeft size={24} color={c.text} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Editar pedigrí</Text>
            <View style={s.backBtn} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {/* Padre */}
            <View style={s.fieldset}>
              <View style={s.fieldsetHeader}>
                <Mars size={14} color={c.info} strokeWidth={2} />
                <Text style={[s.fieldsetTitle, { color: c.info }]}>PADRE</Text>
              </View>
              <HorseSearchField
                label="Nombre del padre"
                value={form.sire_name ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, sire_name: v, sire_id: undefined }))}
                onSelect={(id, name) => setForm((f) => ({ ...f, sire_id: id, sire_name: name }))}
                returnKeyType="next"
                onSubmitEditing={() => refSireReg.current?.focus()}
              />
              <Text style={s.fieldLabel}>N° de registro (opcional)</Text>
              <TextInput ref={refSireReg} style={s.input} value={form.sire_registration_number ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, sire_registration_number: v }))}
                placeholder="SBA #12345" placeholderTextColor={c.textFaint}
                returnKeyType="next" onSubmitEditing={() => refDamName.current?.focus()} />
            </View>

            {/* Madre */}
            <View style={s.fieldset}>
              <View style={s.fieldsetHeader}>
                <Venus size={14} color={c.dam} strokeWidth={2} />
                <Text style={[s.fieldsetTitle, { color: c.dam }]}>MADRE</Text>
              </View>
              <HorseSearchField
                ref={refDamName}
                label="Nombre de la madre"
                value={form.dam_name ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, dam_name: v, dam_id: undefined }))}
                onSelect={(id, name) => setForm((f) => ({ ...f, dam_id: id, dam_name: name }))}
                returnKeyType="next"
                onSubmitEditing={() => refDamReg.current?.focus()}
              />
              <Text style={s.fieldLabel}>N° de registro (opcional)</Text>
              <TextInput ref={refDamReg} style={s.input} value={form.dam_registration_number ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, dam_registration_number: v }))}
                placeholder="SBA #67890" placeholderTextColor={c.textFaint}
                returnKeyType="next" onSubmitEditing={() => refPatSire.current?.focus()} />
            </View>

            {/* Abuelos */}
            <View style={s.fieldset}>
              <Text style={s.fieldsetTitle}>ABUELOS (opcional)</Text>
              <View style={s.grandRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.grandLabel}>Abuelo paterno</Text>
                  <TextInput ref={refPatSire} style={s.inputSm} value={form.paternal_grandsire_name ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, paternal_grandsire_name: v }))}
                    placeholder="Nombre" placeholderTextColor={c.textFaint} autoCapitalize="words"
                    returnKeyType="next" onSubmitEditing={() => refPatDam.current?.focus()} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.grandLabel}>Abuela paterna</Text>
                  <TextInput ref={refPatDam} style={s.inputSm} value={form.paternal_granddam_name ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, paternal_granddam_name: v }))}
                    placeholder="Nombre" placeholderTextColor={c.textFaint} autoCapitalize="words"
                    returnKeyType="next" onSubmitEditing={() => refMatSire.current?.focus()} />
                </View>
              </View>
              <View style={s.grandRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.grandLabel}>Abuelo materno</Text>
                  <TextInput ref={refMatSire} style={s.inputSm} value={form.maternal_grandsire_name ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, maternal_grandsire_name: v }))}
                    placeholder="Nombre" placeholderTextColor={c.textFaint} autoCapitalize="words"
                    returnKeyType="next" onSubmitEditing={() => refMatDam.current?.focus()} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.grandLabel}>Abuela materna</Text>
                  <TextInput ref={refMatDam} style={s.inputSm} value={form.maternal_granddam_name ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, maternal_granddam_name: v }))}
                    placeholder="Nombre" placeholderTextColor={c.textFaint} autoCapitalize="words"
                    returnKeyType="done" />
                </View>
              </View>
            </View>

            {(upsert.isError || validate.isError) && (
              <Text style={s.errorText}>Error al guardar. Intentá de nuevo.</Text>
            )}

            <View style={s.hintRow}>
              <Info size={13} color={c.textFaint} strokeWidth={2} style={{ marginTop: 2 }} />
              <Text style={s.hint}>
                "Guardar y validar" consulta Stud Book Argentino, SRA y PedigreeQuery para verificar los datos automáticamente.
              </Text>
            </View>
          </ScrollView>

          <View style={[s.modalFooter, { paddingBottom: insets.bottom + space[3] }]}>
            <PressableScale style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => { haptic.light(); onClose(); }}>
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </PressableScale>
            <PressableScale style={[s.btn, s.btnOutline, { flex: 1 }]}
              onPress={() => { haptic.light(); handleSave(false); }} disabled={isPending}>
              {upsert.isPending && !validate.isPending
                ? <ActivityIndicator color={c.brand} size="small" />
                : <Text style={s.btnOutlineText}>Guardar</Text>}
            </PressableScale>
            <PressableScale style={[s.btn, s.btnPrimary, { flex: 1.4 }]}
              onPress={() => { haptic.light(); handleSave(true); }} disabled={isPending}>
              {validate.isPending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <>
                    <ShieldCheck size={16} color={colors.white} strokeWidth={2} />
                    <Text style={s.btnPrimaryText}>Validar</Text>
                  </>}
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* ─── Resultado de la validación ─── */}
      <FormSheet visible={!!validationResult} onClose={closeResult} title={resultCfg?.title ?? 'Validación'}>
        <View style={{ alignItems: 'center', paddingVertical: space[4] }}>
          {ResultIcon && resultCfg && (
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: resultCfg.color + (c.isDark ? '24' : '18'), justifyContent: 'center', alignItems: 'center', marginBottom: space[4] }}>
              <ResultIcon size={44} color={resultCfg.color} strokeWidth={2} />
            </View>
          )}
          {resultCfg?.msg ? <Text style={{ fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>{resultCfg.msg}</Text> : null}
          <PressableScale style={[s.btn, s.btnPrimary, { marginTop: space[6], width: '100%' }]} onPress={() => { haptic.light(); closeResult(); }}>
            <Text style={s.btnPrimaryText}>Cerrar</Text>
          </PressableScale>
        </View>
      </FormSheet>
    </>
  );
}

// ──────────────────────────────────────────────
// Panel de validación
// ──────────────────────────────────────────────

function ValidationBanner({ validations }: { validations: PedigreeValidation[] }) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  if (!validations.length) return null;

  const bySource: Record<string, PedigreeValidation> = {};
  for (const v of validations) {
    if (!bySource[v.source]) bySource[v.source] = v;
  }
  const latest = Object.values(bySource);

  const anyVerified = latest.some((v) => v.status === 'validated');
  const anyPartial  = latest.some((v) => v.status === 'partial');
  const anyDisputed = latest.some((v) => v.status === 'disputed');
  const allFailed   = latest.every((v) => v.status === 'failed');

  let title: string, msg: string, bg: string, color: string;
  let Icon: typeof CheckCircle2;

  if (anyVerified) {
    title = 'Pedigrí verificado'; bg = statusBg('verified', c); color = statusColor('verified', c); Icon = CheckCircle2;
    msg = 'Los datos coinciden con registros oficiales.';
  } else if (anyPartial) {
    title = 'Validación parcial'; bg = statusBg('partial', c); color = statusColor('partial', c); Icon = AlertTriangle;
    msg = 'Algunos datos coinciden. Editá y re-validá para mejorar.';
  } else if (anyDisputed) {
    title = 'Datos inconsistentes'; bg = statusBg('disputed', c); color = statusColor('disputed', c); Icon = XCircle;
    msg = 'Fuentes contradictorias. Requiere revisión manual.';
  } else if (allFailed) {
    title = 'No encontrado'; bg = statusBg('unverified', c); color = c.textMuted; Icon = Circle;
    msg = 'Sin coincidencias en los registros. Verificá nombres y números.';
  } else {
    return null;
  }

  return (
    <View style={[s.banner, { backgroundColor: bg, borderColor: color + '30' }]}>
      <View style={s.bannerTitleRow}>
        <Icon size={16} color={color} strokeWidth={2.25} />
        <Text style={[s.bannerTitle, { color }]}>{title}</Text>
      </View>
      <Text style={s.bannerMsg}>{msg}</Text>
      {latest.length > 0 && (
        <View style={s.sourceRow}>
          {latest.map((v) => {
            const sourceLabels: Record<string, string> = { studbook_ar: 'Stud Book', sra: 'SRA', pedigreequery: 'PedigreeQuery', manual_admin: 'Admin' };
            const stKey = ({ validated: 'verified', partial: 'partial', disputed: 'disputed', failed: 'unverified', pending: 'pending' } as Record<string, string>)[v.status] ?? 'unverified';
            const stColor = statusColor(stKey, c);
            return (
              <View key={v.source} style={[s.sourceChip, { backgroundColor: stColor + '18', borderColor: stColor + '40' }]}>
                <Text style={[s.sourceChipText, { color: stColor }]}>{sourceLabels[v.source] ?? v.source}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────
// Tab principal
// ──────────────────────────────────────────────

export function PedigreeTab({ horseId, horseName, canEdit }: {
  horseId: string;
  horseName?: string;
  canEdit: boolean;
}) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [showForm, setShowForm] = useState(false);
  const { data: pedigree, isLoading } = usePedigree(horseId);
  const { data: validations = [] } = usePedigreeValidations(horseId);
  const validate = useValidatePedigree(horseId);

  // Nunca un spinner centrado: el esqueleto tiene la misma silueta que el árbol
  // (cabecera + tres columnas) para que al cargar nada salte de lugar.
  if (isLoading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Skeleton width={150} height={18} />
        </View>
        <PedigreeTreeSkeleton />
      </View>
    );
  }

  if (!pedigree) {
    return (
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Network size={30} color={c.textMuted} strokeWidth={1.75} />
        </View>
        <Text style={s.emptyTitle}>Sin pedigrí registrado</Text>
        <Text style={s.emptyMsg}>
          Registrá el padre y la madre para construir el árbol genealógico y verificarlo automáticamente contra registros oficiales.
        </Text>
        {canEdit && (
          <PressableScale
            style={[s.btn, s.btnPrimary, s.btnAncho]}
            onPress={() => { haptic.light(); setShowForm(true); }}
            accessibilityRole="button"
            accessibilityLabel="Agregar pedigrí"
          >
            <Plus size={18} color={colors.white} strokeWidth={2} />
            <Text style={s.btnPrimaryText}>Agregar pedigrí</Text>
          </PressableScale>
        )}
        {showForm && <PedigreeFormModal horseId={horseId} onClose={() => setShowForm(false)} />}
      </View>
    );
  }

  const hasSire = !!(pedigree.sire?.name ?? pedigree.sire_name);
  const hasDam  = !!(pedigree.dam?.name  ?? pedigree.dam_name);
  const hasData = hasSire || hasDam;

  return (
    <>
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header acciones */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Árbol genealógico</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canEdit && (
            <PressableScale
              style={s.actionBtn}
              onPress={() => { haptic.light(); setShowForm(true); }}
              accessibilityRole="button"
              accessibilityLabel="Editar pedigrí"
            >
              <Pencil size={15} color={c.text} strokeWidth={2} />
              <Text style={s.actionBtnText}>Editar</Text>
            </PressableScale>
          )}
          {canEdit && hasData && (
            <PressableScale
              style={[s.actionBtn, s.actionBtnPrimary, validate.isPending && s.actionBtnApagado]}
              onPress={() => { haptic.light(); validate.mutate(); }}
              disabled={validate.isPending}
              accessibilityRole="button"
              accessibilityLabel="Verificar pedigrí contra registros oficiales"
              accessibilityState={{ disabled: validate.isPending, busy: validate.isPending }}
            >
              {validate.isPending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <>
                    <ShieldCheck size={15} color={colors.white} strokeWidth={2} />
                    <Text style={[s.actionBtnText, { color: colors.white }]}>Verificar</Text>
                  </>
              }
            </PressableScale>
          )}
        </View>
      </View>

      {/* Banner de resultado de validación */}
      <View style={{ paddingHorizontal: space[4] }}>
        <ValidationBanner validations={validations} />
      </View>

      {/* Sin validar aún */}
      {validations.length === 0 && hasData && (
        <View style={s.noValidation}>
          <Info size={16} color={c.textFaint} strokeWidth={2} />
          <Text style={s.noValidationText}>
            Datos guardados. Tocá <Text style={{ fontWeight: '700' }}>Verificar</Text> para contrastar con los registros oficiales.
          </Text>
        </View>
      )}

      {/* Árbol visual — siempre visible si hay datos */}
      {hasData ? (
        // El árbol entra entero y no fila por fila: es UNA figura, y escalonarla
        // por partes la haría ver como una lista que se arma sola.
        <Animated.View entering={FadeIn.duration(duration.enter).easing(easing.outQuart.factory())}>
          <PedigreeTree
            horseName={horseName ?? 'Caballo'}
            pedigree={pedigree as any}
          />
          <View style={s.pie}>
            <ShieldCheck size={15} color={c.textFaint} strokeWidth={1.9} />
            <Text style={s.pieTexto}>Padre, madre y abuelos cargados en la ficha</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={s.noData}>
          <Text style={s.noDataText}>No se han cargado datos del padre ni de la madre.</Text>
          {canEdit && (
            <PressableScale
              style={[s.actionBtn, s.actionBtnSuelto]}
              onPress={() => { haptic.light(); setShowForm(true); }}
              accessibilityRole="button"
              accessibilityLabel="Agregar pedigrí"
            >
              <Plus size={15} color={c.text} strokeWidth={2} />
              <Text style={s.actionBtnText}>Agregar</Text>
            </PressableScale>
          )}
        </View>
      )}

      {/* Documentos */}
      {(pedigree.documents?.length ?? 0) > 0 && (
        <View style={s.docsCard}>
          <Text style={s.docsTitle}>Documentos adjuntos</Text>
          {pedigree.documents!.map((doc) => (
            <View key={doc.id} style={s.docRow}>
              <File size={14} color={c.textMuted} strokeWidth={2} />
              <Text style={s.docName} numberOfLines={1}>{doc.file_name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: space[8] }} />
    </ScrollView>
    {showForm && <PedigreeFormModal horseId={horseId} onClose={() => setShowForm(false)} />}
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  empty: { flex: 1, padding: space[8], alignItems: 'center', gap: space[3], justifyContent: 'center' },
  emptyIcon: {
    width: 76, height: 76, borderRadius: radius.card, backgroundColor: c.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: space[1],
  },
  emptyTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, textAlign: 'center' },
  emptyMsg: { fontSize: text.base, color: c.textMuted, textAlign: 'center', lineHeight: 22 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4], paddingVertical: space[3],
  },
  headerTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3 },

  // Acción secundaria neutra: el verde queda para "Verificar", que es LA acción.
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] + 2,
    paddingHorizontal: space[4], minHeight: touch.min,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
  },
  actionBtnPrimary: { backgroundColor: c.brand },
  actionBtnApagado: { opacity: 0.55 },
  actionBtnSuelto: { marginTop: space[2] },
  actionBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  banner: {
    borderRadius: radius.field, borderWidth: 1, padding: space[4], gap: space[2] - 2, marginBottom: space[2],
  },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] - 1 },
  bannerTitle: { fontSize: text.base, fontWeight: weight.bold },
  bannerMsg: { fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  sourceRow: { flexDirection: 'row', gap: space[2] - 2, flexWrap: 'wrap', marginTop: space[1] },
  sourceChip: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  sourceChipText: { fontSize: text.xs - 1, fontWeight: weight.bold },

  noValidation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[2],
    backgroundColor: c.surfaceAlt, borderRadius: radius.field, marginHorizontal: space[4],
    padding: space[3], marginBottom: space[1],
  },
  noValidationText: { fontSize: text.sm, color: c.textMuted, flex: 1, lineHeight: 20 },

  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], marginTop: space[5] },
  pieTexto: { fontSize: text.sm, color: c.textFaint },

  noData: {
    margin: space[4], padding: space[4], backgroundColor: c.surfaceAlt,
    borderRadius: radius.card, alignItems: 'center', gap: space[2] - 2,
  },
  noDataText: { fontSize: text.base, color: c.textMuted, textAlign: 'center' },

  docsCard: {
    margin: space[4], backgroundColor: c.surface, borderRadius: radius.card, padding: space[4], gap: space[2],
    ...(c.isDark ? {} : shadow.md),
  },
  docsTitle: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  docName: { fontSize: text.sm, color: c.textMuted, flex: 1 },

  // Formulario a pantalla completa (reemplaza el Modal a mano)
  formScreen: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: c.bg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: space[4], gap: space[2],
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, textAlign: 'center' },
  modalBody: { padding: space[5], gap: 4, paddingBottom: space[10] },
  modalFooter: {
    flexDirection: 'row', gap: space[2], padding: space[4],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },

  fieldset: { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[4] - 2, gap: 4, marginBottom: space[3] },
  fieldsetHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: space[2] },
  fieldsetTitle: { fontSize: text.xs, fontWeight: weight.extrabold, color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted, marginBottom: 4, marginTop: space[2] },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2, minHeight: touch.min,
    fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt,
  },
  grandRow: { flexDirection: 'row', gap: space[2] + 2, marginBottom: space[2] + 2 },
  grandLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted, marginBottom: 4 },
  inputSm: {
    borderRadius: radius.sm,
    paddingHorizontal: space[2] + 2, paddingVertical: space[2], minHeight: touch.min,
    fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt,
  },
  dropdown: {
    backgroundColor: c.surface, borderRadius: radius.md,
    overflow: 'hidden', marginTop: 4,
    ...(c.isDark ? {} : shadow.md),
  },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: space[3], minHeight: touch.min, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  dropdownName: { fontSize: text.base, color: c.text, fontWeight: weight.medium },
  dropdownReg: { fontSize: text.sm, color: c.textFaint },
  errorText: { fontSize: text.sm, color: c.danger, marginTop: space[2] },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] - 2, marginTop: space[3] },
  hint: { flex: 1, fontSize: text.sm, color: c.textFaint, lineHeight: 18 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, minHeight: touch.button, gap: space[2] - 2 },
  btnAncho: { alignSelf: 'stretch', marginTop: space[2] },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },
  btnOutline: { backgroundColor: c.brandSoft },
  btnOutlineText: { fontSize: text.base, fontWeight: weight.semibold, color: c.brand },
});
