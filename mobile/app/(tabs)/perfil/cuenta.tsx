import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { User, ChevronRight, Lock, Check, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { AVATAR_PALETTE } from '../../../lib/avatar-color';
import { Avatar } from '../../../components/Avatar';
import { PressableScale } from '../../../components/PressableScale';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { useCommonStyles } from '../../../styles/common';
import { entradaFila } from '../../../styles/motion';
import { space, text, weight, radius, touch } from '../../../styles/tokens';
import { useToast } from '../../../components/Toast';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Routes, nav } from '../../../lib/routes';

/* Editar datos y cambiar contraseña son pantallas empujadas
   (./editar.tsx y ./contrasena.tsx, patrón Ajustes de iOS): los formularios
   con tipeo se rompían con el teclado dentro de las hojas. */

/* ─── Color de avatar ─── */

/**
 * La maqueta pone acá un botón "Cambiar la foto". No hay subida de foto de
 * perfil en el back (`updateProfile` acepta name/email/phone/avatar_color/
 * whatsapp_opt_in), así que lo que se elige es el COLOR, que sí existe.
 */
function AvatarColorSection({ user, c, s }: {
  user: { name: string; avatar_color?: string | null };
  c: ThemeColors; s: Styles;
}) {
  const { updateProfile } = useAuth();
  const { typography } = useCommonStyles();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const current = user.avatar_color ?? null;

  const choose = async (id: string | null) => {
    if (id === current || saving) return;
    haptic.selection();
    setSaving(id ?? 'auto');
    try {
      await updateProfile({ avatar_color: id });
      toast.success('Color actualizado');
    } catch {
      toast.error('No se pudo guardar el color. Intentá de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={s.section}>
      <Text style={[typography.sectionEyebrow, s.sectionTitle]}>Cómo te ven</Text>
      <View style={s.colorPreviewRow}>
        <Avatar name={user.name} avatarColor={current} size={74} />
        <Text style={s.colorHint}>
          Elegí el color con el que aparecés en la app. Así te ven los demás.
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.colorScroll}
      >
        <TouchableOpacity
          onPress={() => choose(null)}
          activeOpacity={0.8}
          style={[s.colorDotWrap, current === null && s.colorDotWrapActive]}
          accessibilityRole="button"
          accessibilityLabel={current === null ? 'Color automático, seleccionado' : 'Elegir color automático'}
        >
          <View style={[s.colorDot, s.colorDotAuto]}>
            {saving === 'auto'
              ? <ActivityIndicator size="small" color={c.textMuted} />
              : <Text style={s.colorDotAutoText}>Auto</Text>}
          </View>
        </TouchableOpacity>
        {AVATAR_PALETTE.map((p) => {
          const active = current === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => choose(p.id)}
              activeOpacity={0.8}
              style={[s.colorDotWrap, active && s.colorDotWrapActive]}
              accessibilityRole="button"
              accessibilityLabel={active ? `Color ${p.id}, seleccionado` : `Elegir color ${p.id}`}
            >
              <View style={[s.colorDot, { backgroundColor: p.to }]}>
                {saving === p.id
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : active ? <Check size={16} color={colors.white} strokeWidth={3} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ─── Main ─── */

export default function CuentaScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const { typography } = useCommonStyles();
  const router = useRouter();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!user) return null;

  const filas: { key: string; Icon: LucideIcon; label: string; valor?: string; onPress: () => void }[] = [
    {
      key: 'editar', Icon: User, label: 'Nombre y correo',
      valor: user.name,
      onPress: () => { haptic.selection(); nav.push(router, Routes.perfilEditar); },
    },
    {
      key: 'contrasena', Icon: Lock, label: 'Contraseña',
      onPress: () => { haptic.selection(); nav.push(router, Routes.perfilContrasena); },
    },
  ];

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Mis datos" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          <Text style={[typography.sectionEyebrow, s.sectionTitle]}>Quién sos</Text>
          {filas.map((f, i) => (
            <Animated.View key={f.key} entering={entradaFila(i)}>
              <PressableScale
                style={[s.row, i < filas.length - 1 && s.rowBorde]}
                onPress={f.onPress}
                accessibilityRole="button"
                accessibilityLabel={f.label}
              >
                <View style={s.rowIconWrap}>
                  <f.Icon size={21} color={c.text} strokeWidth={1.9} />
                </View>
                <Text style={s.rowLabel} numberOfLines={1}>{f.label}</Text>
                {f.valor ? <Text style={s.rowValor} numberOfLines={1}>{f.valor}</Text> : null}
                <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={entradaFila(filas.length)}>
          <AvatarColorSection user={user} c={c} s={s} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { paddingHorizontal: space[5], marginTop: space[6] },
  sectionTitle: { marginBottom: space[1] },

  row: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: touch.field, gap: space[3] + 2,
  },
  rowBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowIconWrap: { width: 24, alignItems: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowValor: { fontSize: text.base, color: c.textFaint, maxWidth: 150 },

  colorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[2] },
  colorHint: { flex: 1, fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  colorScroll: { gap: space[2] + 2, paddingVertical: space[1], paddingRight: space[2] },
  colorDotWrap: {
    width: 46, height: 46, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    marginTop: space[4],
  },
  colorDotWrapActive: { borderColor: c.brand },
  colorDot: {
    width: 36, height: 36, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  colorDotAuto: { backgroundColor: c.surfaceAlt },
  colorDotAutoText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },
});
