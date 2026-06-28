import { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme, type ThemeColors, type ThemePreference } from '../lib/theme';

/**
 * Piezas compartidas por las pantallas de auth (login + registro) para que
 * tengan el mismo diseño: globos de luz de marca + selector de tema.
 */

/** Fondo: 3 globos de luz de marca — más presentes en claro, tenues en oscuro. */
export function AuthBackground({ c }: { c: ThemeColors }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="ag1" cx="50%" cy="18%" rx="62%" ry="46%">
          <Stop offset="0" stopColor={c.brand} stopOpacity={c.isDark ? 0.14 : 0.2} />
          <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="ag2" cx="24%" cy="94%" rx="54%" ry="38%">
          <Stop offset="0" stopColor="#d9a94e" stopOpacity={c.isDark ? 0.08 : 0.14} />
          <Stop offset="1" stopColor="#d9a94e" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="ag3" cx="84%" cy="34%" rx="44%" ry="32%">
          <Stop offset="0" stopColor={c.brand} stopOpacity={c.isDark ? 0.07 : 0.12} />
          <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#ag1)" />
      <Rect width="100%" height="100%" fill="url(#ag2)" />
      <Rect width="100%" height="100%" fill="url(#ag3)" />
    </Svg>
  );
}

const THEME_OPTS: { value: ThemePreference; Icon: typeof Sun }[] = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'auto', Icon: Smartphone },
];

/** Selector de tema flotante (arriba a la derecha, respeta el safe-area). */
export function AuthThemeSwitch() {
  const { c, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.row, { top: insets.top + 8 }]}>
      <View style={s.switch}>
        {THEME_OPTS.map(({ value, Icon }) => {
          const active = preference === value;
          return (
            <TouchableOpacity
              key={value}
              style={[s.btn, active && s.btnActive]}
              onPress={() => setPreference(value)}
              activeOpacity={0.8}
            >
              <Icon size={15} color={active ? c.text : c.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: { position: 'absolute', right: 16, zIndex: 10, flexDirection: 'row' },
  switch: {
    flexDirection: 'row', gap: 2, padding: 3,
    backgroundColor: c.surfaceAlt, borderRadius: 999,
    borderWidth: 1, borderColor: c.border,
  },
  btn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  btnActive: { backgroundColor: c.surface },
});
