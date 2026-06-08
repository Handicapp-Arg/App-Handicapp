import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';
import {
  usePedigree, usePedigreeValidations, useUpsertPedigree,
  useValidatePedigree, useSearchHorsesForPedigree, type CreatePedigreeDto,
} from '../hooks/use-pedigree';
import type { PedigreeValidation } from '../../packages/shared/src';

const SCREEN_W = Dimensions.get('window').width;

// ──────────────────────────────────────────────
// Visual pedigree tree
// ──────────────────────────────────────────────

interface NodeData {
  name: string;
  reg?: string | null;
  status?: string | null;
  inSystem?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  verified: '#15803d',
  partial:  '#c2410c',
  disputed: '#b91c1c',
  unverified: colors.gray400,
  pending:  '#d97706',
};

const STATUS_BG: Record<string, string> = {
  verified: '#f0fdf4',
  partial:  '#fff7ed',
  disputed: '#fef2f2',
  unverified: colors.gray50,
  pending:  '#fffbeb',
};

function PedigreeNode({ data, width, dim }: { data: NodeData | null; width: number; dim?: boolean }) {
  if (!data) {
    return (
      <View style={[n.node, n.nodeEmpty, { width }]}>
        <Text style={n.emptyText}>–</Text>
      </View>
    );
  }

  const st = data.status ?? 'unverified';
  const col = STATUS_COLOR[st] ?? colors.gray400;
  const bg  = STATUS_BG[st] ?? colors.gray50;

  return (
    <View style={[n.node, { width, backgroundColor: bg, borderColor: dim ? colors.gray200 : col + '50', opacity: dim ? 0.7 : 1 }]}>
      {data.status && data.status !== 'unverified' && (
        <View style={[n.statusDot, { backgroundColor: col }]} />
      )}
      <Text style={[n.name, { color: dim ? colors.gray500 : colors.gray900 }]} numberOfLines={2}>{data.name}</Text>
      {data.reg ? <Text style={n.reg} numberOfLines={1}>#{data.reg}</Text> : null}
    </View>
  );
}

function ConnectorLine({ vertical = false }: { vertical?: boolean }) {
  if (vertical) return <View style={n.vLine} />;
  return <View style={n.hLine} />;
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
  const sireName = pedigree.sire?.name ?? pedigree.sire_name;
  const damName  = pedigree.dam?.name  ?? pedigree.dam_name;

  const sire: NodeData | null = sireName ? {
    name: sireName,
    reg: pedigree.sire_registration_number,
    status: pedigree.sire?.pedigree_status ?? 'unverified',
    inSystem: !!pedigree.sire,
  } : null;

  const dam: NodeData | null = damName ? {
    name: damName,
    reg: pedigree.dam_registration_number,
    status: pedigree.dam?.pedigree_status ?? 'unverified',
    inSystem: !!pedigree.dam,
  } : null;

  const patGrandsire: NodeData | null = pedigree.paternal_grandsire_name
    ? { name: pedigree.paternal_grandsire_name } : null;
  const patGranddam: NodeData | null = pedigree.paternal_granddam_name
    ? { name: pedigree.paternal_granddam_name } : null;
  const matGrandsire: NodeData | null = pedigree.maternal_grandsire_name
    ? { name: pedigree.maternal_grandsire_name } : null;
  const matGranddam: NodeData | null = pedigree.maternal_granddam_name
    ? { name: pedigree.maternal_granddam_name } : null;

  const hasGrandparents = patGrandsire || patGranddam || matGrandsire || matGranddam;

  // Node widths
  const w1 = Math.min(SCREEN_W - 48, 280); // caballo
  const w2 = (w1 - 12) / 2;               // padres
  const w3 = (w2 - 8) / 2;                // abuelos

  return (
    <View style={n.tree}>
      {/* Gen 1 — Caballo */}
      <View style={n.gen}>
        <View style={[n.node, n.nodeHorse, { width: w1 }]}>
          <View style={n.horseIconWrap}>
            <Text style={n.horseIcon}>🐴</Text>
          </View>
          <Text style={n.horseName}>{horseName}</Text>
          <Text style={n.horseLabel}>CABALLO</Text>
        </View>
      </View>

      {(sire || dam) && (
        <>
          {/* Conector gen 1 → 2 */}
          <View style={[n.gen, { gap: 0 }]}>
            <View style={{ width: w2, alignItems: 'center' }}>
              {sire && <ConnectorLine vertical />}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ width: w2, alignItems: 'center' }}>
              {dam && <ConnectorLine vertical />}
            </View>
          </View>

          {/* Gen 2 — Padres */}
          <View style={[n.gen, { gap: 12 }]}>
            <View style={{ width: w2 }}>
              <View style={n.parentLabel}>
                <Ionicons name="male-outline" size={11} color="#0369a1" />
                <Text style={[n.parentLabelText, { color: '#0369a1' }]}>PADRE</Text>
              </View>
              <PedigreeNode data={sire} width={w2} />
            </View>
            <View style={{ width: w2 }}>
              <View style={n.parentLabel}>
                <Ionicons name="female-outline" size={11} color="#be185d" />
                <Text style={[n.parentLabelText, { color: '#be185d' }]}>MADRE</Text>
              </View>
              <PedigreeNode data={dam} width={w2} />
            </View>
          </View>

          {/* Gen 3 — Abuelos */}
          {hasGrandparents && (
            <>
              {/* Conectores */}
              <View style={[n.gen, { gap: 0 }]}>
                {[patGrandsire, patGranddam, matGrandsire, matGranddam].map((g, i) => (
                  <View key={i} style={{ width: w3, alignItems: 'center' }}>
                    {g && <ConnectorLine vertical />}
                  </View>
                ))}
              </View>

              {/* Fila abuelos */}
              <View style={[n.gen, { gap: 6 }]}>
                <View style={{ width: w3 * 2 + 6 }}>
                  <Text style={n.grandLabel}>Paternos</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={n.grandRole}>Abuelo</Text>
                      <PedigreeNode data={patGrandsire} width={w3} dim />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={n.grandRole}>Abuela</Text>
                      <PedigreeNode data={patGranddam} width={w3} dim />
                    </View>
                  </View>
                </View>
                <View style={{ width: 6 }} />
                <View style={{ width: w3 * 2 + 6 }}>
                  <Text style={n.grandLabel}>Maternos</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={n.grandRole}>Abuelo</Text>
                      <PedigreeNode data={matGrandsire} width={w3} dim />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={n.grandRole}>Abuela</Text>
                      <PedigreeNode data={matGranddam} width={w3} dim />
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const n = StyleSheet.create({
  tree: { padding: 16, gap: 4 },
  gen: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' },
  vLine: { width: 2, height: 16, backgroundColor: colors.gray200, marginVertical: 0 },
  hLine: { height: 2, flex: 1, backgroundColor: colors.gray200 },

  node: {
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.gray200,
    padding: 10, gap: 3, position: 'relative', overflow: 'hidden',
  },
  nodeEmpty: { backgroundColor: colors.gray50, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  emptyText: { color: colors.gray300, fontSize: 18 },
  statusDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
  name: { fontSize: 12, fontWeight: '700', color: colors.gray900, lineHeight: 16 },
  reg: { fontSize: 10, color: colors.gray400 },

  nodeHorse: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    alignItems: 'center', gap: 4, paddingVertical: 14,
  },
  horseIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  horseIcon: { fontSize: 22 },
  horseName: { fontSize: 15, fontWeight: '800', color: colors.white, textAlign: 'center' },
  horseLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' },

  parentLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  parentLabelText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

  grandLabel: { fontSize: 9, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  grandRole: { fontSize: 9, color: colors.gray400, textAlign: 'center', marginBottom: 3 },
});

// ──────────────────────────────────────────────
// Buscar caballo
// ──────────────────────────────────────────────

function HorseSearchField({ label, value, onChange, onSelect }: {
  label: string; value: string;
  onChange: (v: string) => void;
  onSelect: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: results = [] } = useSearchHorsesForPedigree(value);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={(v) => { onChange(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar en HandicApp..."
        placeholderTextColor={colors.gray400}
        autoCapitalize="words"
      />
      {open && results.length > 0 && (
        <View style={s.dropdown}>
          {results.slice(0, 5).map((r) => (
            <TouchableOpacity
              key={r.id}
              style={s.dropdownItem}
              onPress={() => { onSelect(r.id, r.name); onChange(r.name); setOpen(false); }}
            >
              <Text style={s.dropdownName}>{r.name}</Text>
              {r.registration_number && (
                <Text style={s.dropdownReg}>#{r.registration_number}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────
// Formulario edición
// ──────────────────────────────────────────────

function PedigreeFormModal({ horseId, onClose }: { horseId: string; onClose: () => void }) {
  const { data: existing } = usePedigree(horseId);
  const upsert = useUpsertPedigree(horseId);
  const validate = useValidatePedigree(horseId);
  const [validationResult, setValidationResult] = useState<{ status: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

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
    await upsert.mutateAsync(dto);
    if (andValidate) {
      const result = await validate.mutateAsync();
      setValidationResult(result);
    } else {
      onClose();
    }
  };

  if (validationResult) {
    const map: Record<string, { icon: string; title: string; msg: string; color: string }> = {
      verified: { icon: '✅', title: 'Pedigrí verificado', msg: 'Los datos coinciden con registros oficiales.', color: '#15803d' },
      partial:  { icon: '⚠️', title: 'Validación parcial',  msg: 'Algunos datos coinciden. Revisá y corregí para mejorar el resultado.', color: '#c2410c' },
      failed:   { icon: '❌', title: 'Sin coincidencias',   msg: 'No se encontró en ningún registro oficial. Verificá la ortografía del nombre.', color: colors.red500 },
      disputed: { icon: '⚠️', title: 'Datos inconsistentes', msg: 'Distintas fuentes muestran información contradictoria.', color: '#b91c1c' },
    };
    const cfg = map[validationResult.status] ?? { icon: 'ℹ️', title: validationResult.status, msg: '', color: colors.gray500 };
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48 }}>{cfg.icon}</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: cfg.color, marginTop: 16, textAlign: 'center' }}>{cfg.title}</Text>
          {cfg.msg ? <Text style={{ fontSize: 14, color: colors.gray600, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>{cfg.msg}</Text> : null}
          <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 32, width: '100%' }]} onPress={onClose}>
            <Text style={s.btnPrimaryText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Editar pedigrí</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
          {/* Padre */}
          <View style={s.fieldset}>
            <View style={s.fieldsetHeader}>
              <Ionicons name="male-outline" size={14} color="#0369a1" />
              <Text style={[s.fieldsetTitle, { color: '#0369a1' }]}>PADRE</Text>
            </View>
            <HorseSearchField
              label="Nombre del padre"
              value={form.sire_name ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, sire_name: v, sire_id: undefined }))}
              onSelect={(id, name) => setForm((f) => ({ ...f, sire_id: id, sire_name: name }))}
            />
            <Text style={s.fieldLabel}>N° de registro (opcional)</Text>
            <TextInput style={s.input} value={form.sire_registration_number ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, sire_registration_number: v }))}
              placeholder="SBA #12345" placeholderTextColor={colors.gray400} />
          </View>

          {/* Madre */}
          <View style={s.fieldset}>
            <View style={s.fieldsetHeader}>
              <Ionicons name="female-outline" size={14} color="#be185d" />
              <Text style={[s.fieldsetTitle, { color: '#be185d' }]}>MADRE</Text>
            </View>
            <HorseSearchField
              label="Nombre de la madre"
              value={form.dam_name ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, dam_name: v, dam_id: undefined }))}
              onSelect={(id, name) => setForm((f) => ({ ...f, dam_id: id, dam_name: name }))}
            />
            <Text style={s.fieldLabel}>N° de registro (opcional)</Text>
            <TextInput style={s.input} value={form.dam_registration_number ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, dam_registration_number: v }))}
              placeholder="SBA #67890" placeholderTextColor={colors.gray400} />
          </View>

          {/* Abuelos */}
          <View style={s.fieldset}>
            <Text style={s.fieldsetTitle}>ABUELOS (opcional)</Text>
            <View style={s.grandRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.grandLabel}>Abuelo paterno</Text>
                <TextInput style={s.inputSm} value={form.paternal_grandsire_name ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, paternal_grandsire_name: v }))}
                  placeholder="Nombre" placeholderTextColor={colors.gray400} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.grandLabel}>Abuela paterna</Text>
                <TextInput style={s.inputSm} value={form.paternal_granddam_name ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, paternal_granddam_name: v }))}
                  placeholder="Nombre" placeholderTextColor={colors.gray400} autoCapitalize="words" />
              </View>
            </View>
            <View style={s.grandRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.grandLabel}>Abuelo materno</Text>
                <TextInput style={s.inputSm} value={form.maternal_grandsire_name ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, maternal_grandsire_name: v }))}
                  placeholder="Nombre" placeholderTextColor={colors.gray400} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.grandLabel}>Abuela materna</Text>
                <TextInput style={s.inputSm} value={form.maternal_granddam_name ?? ''}
                  onChangeText={(v) => setForm((f) => ({ ...f, maternal_granddam_name: v }))}
                  placeholder="Nombre" placeholderTextColor={colors.gray400} autoCapitalize="words" />
              </View>
            </View>
          </View>

          {(upsert.isError || validate.isError) && (
            <Text style={s.errorText}>Error al guardar. Intentá de nuevo.</Text>
          )}

          <Text style={s.hint}>
            💡 "Guardar y validar" consulta Stud Book Argentino, SRA y PedigreeQuery para verificar los datos automáticamente.
          </Text>
        </ScrollView>

        <View style={s.modalFooter}>
          <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={onClose}>
            <Text style={s.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnOutline, { flex: 1 }]}
            onPress={() => handleSave(false)} disabled={isPending}>
            {upsert.isPending && !validate.isPending
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={s.btnOutlineText}>Guardar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1.4 }]}
            onPress={() => handleSave(true)} disabled={isPending}>
            {validate.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.btnPrimaryText}>Validar ✓</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Panel de validación
// ──────────────────────────────────────────────

function ValidationBanner({ validations }: { validations: PedigreeValidation[] }) {
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

  let title: string, msg: string, bg: string, color: string, icon: string;

  if (anyVerified) {
    title = '✓ Pedigrí verificado'; bg = '#f0fdf4'; color = '#15803d'; icon = '✓';
    msg = 'Los datos coinciden con registros oficiales.';
  } else if (anyPartial) {
    title = '⚠ Validación parcial'; bg = '#fff7ed'; color = '#c2410c'; icon = '⚠';
    msg = 'Algunos datos coinciden. Editá y re-validá para mejorar.';
  } else if (anyDisputed) {
    title = '✕ Datos inconsistentes'; bg = '#fef2f2'; color = '#b91c1c'; icon = '✕';
    msg = 'Fuentes contradictorias. Requiere revisión manual.';
  } else if (allFailed) {
    title = '○ No encontrado'; bg = colors.gray50; color = colors.gray500; icon = '○';
    msg = 'Sin coincidencias en los registros. Verificá nombres y números.';
  } else {
    return null;
  }

  return (
    <View style={[s.banner, { backgroundColor: bg, borderColor: color + '30' }]}>
      <Text style={[s.bannerTitle, { color }]}>{title}</Text>
      <Text style={s.bannerMsg}>{msg}</Text>
      {latest.length > 0 && (
        <View style={s.sourceRow}>
          {latest.map((v) => {
            const sourceLabels: Record<string, string> = { studbook_ar: 'Stud Book', sra: 'SRA', pedigreequery: 'PedigreeQuery', manual_admin: 'Admin' };
            const stColor = ({ validated: '#15803d', partial: '#c2410c', disputed: '#b91c1c', failed: colors.gray400, pending: '#d97706' } as Record<string, string>)[v.status] ?? colors.gray400;
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
  const [showForm, setShowForm] = useState(false);
  const { data: pedigree, isLoading } = usePedigree(horseId);
  const { data: validations = [] } = usePedigreeValidations(horseId);
  const validate = useValidatePedigree(horseId);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.loadingText}>Cargando pedigrí...</Text>
      </View>
    );
  }

  if (!pedigree) {
    return (
      <View style={s.empty}>
        <Text style={{ fontSize: 52 }}>🧬</Text>
        <Text style={s.emptyTitle}>Sin pedigrí registrado</Text>
        <Text style={s.emptyMsg}>
          Registrá el padre y la madre para construir el árbol genealógico y verificarlo automáticamente contra registros oficiales.
        </Text>
        {canEdit && (
          <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 8 }]} onPress={() => setShowForm(true)}>
            <Ionicons name="add-outline" size={18} color={colors.white} />
            <Text style={s.btnPrimaryText}>Agregar pedigrí</Text>
          </TouchableOpacity>
        )}
        {showForm && <PedigreeFormModal horseId={horseId} onClose={() => setShowForm(false)} />}
      </View>
    );
  }

  const hasSire = !!(pedigree.sire?.name ?? pedigree.sire_name);
  const hasDam  = !!(pedigree.dam?.name  ?? pedigree.dam_name);
  const hasData = hasSire || hasDam;

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header acciones */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Árbol genealógico</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canEdit && (
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="create-outline" size={15} color={colors.primary} />
              <Text style={s.actionBtnText}>Editar</Text>
            </TouchableOpacity>
          )}
          {canEdit && hasData && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnPrimary, validate.isPending && { opacity: 0.6 }]}
              onPress={() => validate.mutate()}
              disabled={validate.isPending}
            >
              {validate.isPending
                ? <ActivityIndicator size="small" color={colors.white} />
                : <>
                    <Ionicons name="shield-checkmark-outline" size={15} color={colors.white} />
                    <Text style={[s.actionBtnText, { color: colors.white }]}>Verificar</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Banner de resultado de validación */}
      <View style={{ paddingHorizontal: 16 }}>
        <ValidationBanner validations={validations} />
      </View>

      {/* Sin validar aún */}
      {validations.length === 0 && hasData && (
        <View style={s.noValidation}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gray400} />
          <Text style={s.noValidationText}>
            Datos guardados. Tocá <Text style={{ fontWeight: '700' }}>Verificar</Text> para contrastar con los registros oficiales.
          </Text>
        </View>
      )}

      {/* Árbol visual — siempre visible si hay datos */}
      {hasData ? (
        <View style={s.treeCard}>
          <PedigreeTree
            horseName={horseName ?? 'Caballo'}
            pedigree={pedigree as any}
          />
        </View>
      ) : (
        <View style={s.noData}>
          <Text style={s.noDataText}>No se han cargado datos del padre ni de la madre.</Text>
          {canEdit && (
            <TouchableOpacity style={[s.actionBtn, { marginTop: 8 }]} onPress={() => setShowForm(true)}>
              <Text style={s.actionBtnText}>+ Agregar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Documentos */}
      {(pedigree.documents?.length ?? 0) > 0 && (
        <View style={s.docsCard}>
          <Text style={s.docsTitle}>Documentos adjuntos</Text>
          {pedigree.documents!.map((doc) => (
            <View key={doc.id} style={s.docRow}>
              <Ionicons name="document-outline" size={14} color={colors.gray500} />
              <Text style={s.docName} numberOfLines={1}>{doc.file_name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
      {showForm && <PedigreeFormModal horseId={horseId} onClose={() => setShowForm(false)} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadingText: { fontSize: 13, color: colors.gray400 },

  empty: { flex: 1, padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900, textAlign: 'center' },
  emptyMsg: { fontSize: 13, color: colors.gray500, textAlign: 'center', lineHeight: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  banner: {
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 6, marginBottom: 8,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerMsg: { fontSize: 12, color: colors.gray600, lineHeight: 18 },
  sourceRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  sourceChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  sourceChipText: { fontSize: 10, fontWeight: '700' },

  noValidation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.gray100, borderRadius: 10, marginHorizontal: 16,
    padding: 12, marginBottom: 4,
  },
  noValidationText: { fontSize: 12, color: colors.gray500, flex: 1, lineHeight: 18 },

  treeCard: {
    backgroundColor: colors.white, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.gray100,
    overflow: 'hidden',
  },

  noData: { margin: 16, padding: 16, backgroundColor: colors.gray100, borderRadius: 12, alignItems: 'center', gap: 6 },
  noDataText: { fontSize: 13, color: colors.gray500, textAlign: 'center' },

  docsCard: { margin: 16, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.gray100, gap: 8 },
  docsTitle: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docName: { fontSize: 13, color: colors.gray600, flex: 1 },

  // Modal
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalBody: { padding: 20, gap: 4, paddingBottom: 40 },
  modalFooter: {
    flexDirection: 'row', gap: 8, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.gray100,
  },

  fieldset: { backgroundColor: colors.gray50, borderRadius: 12, padding: 14, gap: 4, marginBottom: 12 },
  fieldsetHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  fieldsetTitle: { fontSize: 11, fontWeight: '800', color: colors.gray500, letterSpacing: 0.8, textTransform: 'uppercase' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.gray900, backgroundColor: colors.white,
  },
  grandRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  grandLabel: { fontSize: 11, fontWeight: '600', color: colors.gray500, marginBottom: 4 },
  inputSm: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: colors.gray900, backgroundColor: colors.white,
  },
  dropdown: {
    backgroundColor: colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: colors.gray200, overflow: 'hidden', marginTop: 4,
  },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  dropdownName: { fontSize: 14, color: colors.gray900, fontWeight: '500' },
  dropdownReg: { fontSize: 12, color: colors.gray400 },
  errorText: { fontSize: 13, color: colors.red500, marginTop: 8 },
  hint: { fontSize: 12, color: colors.gray400, marginTop: 12, lineHeight: 18 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, gap: 6 },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: colors.gray100 },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary },
  btnOutlineText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
