/**
 * RoleBadge unificado — chip de rol consistente (color + ícono) en toda la app.
 *
 * Cubre roles de cuenta (propietario, establecimiento, veterinario, admin) y
 * roles operativos de organización (encargado, jinete, peón). Acepta también los
 * alias del back de organización (owner_role, vet, staff, owner).
 *
 * Theme-aware: fondo tintado con baja opacidad (funciona en claro y oscuro) y
 * texto/ícono en el color del rol.
 */
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  Crown, Building2, Stethoscope, ShieldCheck, ClipboardList, Wrench,
  User as UserIcon, type LucideIcon,
} from 'lucide-react-native';
import { HorseIcon } from './icons/equine';

type RoleMeta = { label: string; color: string; Icon: LucideIcon | typeof HorseIcon };

const ROLE_META: Record<string, RoleMeta> = {
  propietario:     { label: 'Propietario',    color: '#9d6c35', Icon: Crown },
  establecimiento: { label: 'Establecimiento', color: '#2563eb', Icon: Building2 },
  veterinario:     { label: 'Veterinario',    color: '#dc2626', Icon: Stethoscope },
  admin:           { label: 'Administrador',  color: '#7c3aed', Icon: ShieldCheck },
  encargado:       { label: 'Encargado',      color: '#0f766e', Icon: ClipboardList },
  jinete:          { label: 'Jinete',         color: '#b45309', Icon: HorseIcon },
  peon:            { label: 'Peón',           color: '#475569', Icon: Wrench },
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
      color: '#6b7280',
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
  const { label, color, Icon } = resolveRole(role);
  const iconSize = size === 'sm' ? 11 : 13;

  if (iconOnly) {
    return (
      <View
        style={[
          styles.iconOnly,
          { backgroundColor: color + '22', width: iconSize + 14, height: iconSize + 14 },
          style,
        ]}
      >
        <Icon size={iconSize} color={color} strokeWidth={2.2} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: color + '1f' },
        style,
      ]}
    >
      <Icon size={iconSize} color={color} strokeWidth={2.2} />
      <Text
        style={[styles.text, size === 'sm' && styles.textSm, { color }]}
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
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2, gap: 3 },
  iconOnly: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 11, fontWeight: '700' },
  textSm: { fontSize: 10 },
});

export default RoleBadge;
