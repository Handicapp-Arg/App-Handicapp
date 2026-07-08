/**
 * RoleBadge unificado — chip de rol consistente (color + ícono) en toda la app.
 *
 * Cubre roles de cuenta (propietario, establecimiento, veterinario, admin) y
 * roles operativos de organización (encargado, jinete, peón). Acepta también los
 * alias del back de organización (owner_role, vet, staff, owner).
 *
 * Theme-aware: chip neutro (superficie sutil + texto/ícono atenuado) que funciona
 * en claro y oscuro. El rol se distingue por su ícono, no por un color de relleno.
 */
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Crown, Building2, Stethoscope, ShieldCheck, ClipboardList, Wrench,
  User as UserIcon, type LucideIcon,
} from 'lucide-react-native';
import { HorseIcon } from './icons/equine';
import { useTheme } from '../lib/theme';

type RoleMeta = { label: string; Icon: LucideIcon | typeof HorseIcon };

const ROLE_META: Record<string, RoleMeta> = {
  propietario:     { label: 'Propietario',    Icon: Crown },
  establecimiento: { label: 'Establecimiento', Icon: Building2 },
  veterinario:     { label: 'Veterinario',    Icon: Stethoscope },
  admin:           { label: 'Administrador',  Icon: ShieldCheck },
  encargado:       { label: 'Encargado',      Icon: ClipboardList },
  jinete:          { label: 'Jinete',         Icon: HorseIcon },
  peon:            { label: 'Peón',           Icon: Wrench },
};

/** Normaliza alias del back (org roles) a las claves canónicas. */
const ROLE_ALIASES: Record<string, string> = {
  owner_role: 'propietario',
  owner: 'propietario',
  vet: 'veterinario',
  staff: 'encargado',
  'peón': 'peon',
};

function resolveRole(role: string): RoleMeta {
  const key = role?.toLowerCase?.() ?? '';
  const canonical = ROLE_ALIASES[key] ?? key;
  return (
    ROLE_META[canonical] ?? {
      label: role || 'Rol',
      Icon: UserIcon,
    }
  );
}

export type RoleBadgeProps = {
  role: string;
  /** Muestra solo el ícono en un círculo (para espacios reducidos). */
  iconOnly?: boolean;
  /** Tamaño compacto. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export function RoleBadge({ role, iconOnly = false, size = 'md', style }: RoleBadgeProps) {
  const { c } = useTheme();
  const { label, Icon } = resolveRole(role);
  const iconSize = size === 'sm' ? 11 : 13;

  if (iconOnly) {
    return (
      <View
        style={[
          styles.iconOnly,
          {
            backgroundColor: c.surfaceAlt,
            borderColor: c.border,
            width: iconSize + 14,
            height: iconSize + 14,
          },
          style,
        ]}
      >
        <Icon size={iconSize} color={c.textMuted} strokeWidth={2.2} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: c.surfaceAlt, borderColor: c.border },
        style,
      ]}
    >
      <Icon size={iconSize} color={c.textMuted} strokeWidth={2.2} />
      <Text
        style={[styles.text, size === 'sm' && styles.textSm, { color: c.text }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2, gap: 3 },
  iconOnly: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 11, fontWeight: '700' },
  textSm: { fontSize: 10 },
});

export default RoleBadge;
