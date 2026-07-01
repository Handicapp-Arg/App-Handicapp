import { Text, View, StyleSheet } from 'react-native';
import { BadgeCheck, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

/**
 * Badges de verificación de HandicApp.
 *
 * - VetVerifiedBadge: check azul estilo redes sociales, va junto al nombre de
 *   un veterinario cuya matrícula fue aprobada. Usar SIEMPRE junto con el
 *   helper `isVetVerified(user)` para decidir si renderizarlo.
 * - HorseVerifiedBadge: badge verde (padrón), se dispara cuando el caballo
 *   tiene `horse_record_id`. Con o sin texto "Verificado en padrón".
 *
 * Ambos son theme-aware (light/dark).
 */

// Azul "verificado" estilo redes (blue-700). El check queda legible sobre
// fondos claros y oscuros, por eso no cambia con el tema.
const VET_BLUE = '#1d4ed8';
const VET_BLUE_DARK = '#60a5fa';

// Verde padrón (emerald-600), consistente con el dot de la lista de caballos.
const HORSE_GREEN = '#059669';
const HORSE_GREEN_DARK = '#34d399';

export type BadgeSize = 'sm' | 'md';

/** Veterinario con matrícula aprobada. */
export function isVetVerified(
  user?: { role?: string; vet_license_status?: string | null } | null,
): boolean {
  return user?.role === 'veterinario' && user?.vet_license_status === 'approved';
}

/**
 * Check azul de veterinario verificado. Pensado para ir inline junto al nombre.
 * No aplica lógica de rol: renderizá sólo si `isVetVerified(user)` es true.
 */
export function VetVerifiedBadge({ size = 'sm' }: { size?: BadgeSize }) {
  const { c } = useTheme();
  const iconSize = size === 'md' ? 18 : 14;
  const color = c.isDark ? VET_BLUE_DARK : VET_BLUE;
  return (
    <View style={styles.inlineIcon} accessibilityLabel="Veterinario verificado">
      <BadgeCheck size={iconSize} color={color} strokeWidth={2.2} />
    </View>
  );
}

/**
 * Badge verde de caballo verificado en el padrón. Disparado por `horse_record_id`.
 * - `label` (default true): muestra "Verificado en padrón" en una píldora.
 * - `label=false`: sólo el ícono (útil para dots/overlays compactos).
 */
export function HorseVerifiedBadge({
  label = true,
  size = 'sm',
}: {
  label?: boolean;
  size?: BadgeSize;
}) {
  const { c } = useTheme();
  const green = c.isDark ? HORSE_GREEN_DARK : HORSE_GREEN;
  const iconSize = size === 'md' ? 13 : 11;

  if (!label) {
    return (
      <View
        style={styles.inlineIcon}
        accessibilityLabel="Caballo verificado en padrón"
      >
        <ShieldCheck size={iconSize} color={green} strokeWidth={2} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: c.isDark ? green + '26' : '#ecfdf5',
          borderColor: c.isDark ? green + '40' : '#a7f3d0',
        },
      ]}
      accessibilityLabel="Caballo verificado en padrón"
    >
      <ShieldCheck size={iconSize} color={green} strokeWidth={2} />
      <Text style={[styles.pillText, { color: green }]}>Verificado en padrón</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineIcon: { alignSelf: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '600' },
});
