import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Props {
  monthCursor: Date;                 // cualquier fecha dentro del mes a mostrar
  onMonthChange: (d: Date) => void;
  selectedDay: string | null;        // YYYY-MM-DD
  onSelectDay: (day: string) => void;
  markedDays: Set<string>;           // días con turnos
}

/** Calendario mensual: navegación por mes, puntito en días con turnos, día seleccionado resaltado. */
export function MonthCalendar({ monthCursor, onMonthChange, selectedDay, onSelectDay, markedDays }: Props) {
  const today = ymd(new Date());

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [monthCursor]);

  const prevMonth = () => onMonthChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
  const nextMonth = () => onMonthChange(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1));

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} hitSlop={10} style={s.navBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color={colors.gray600} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[monthCursor.getMonth()]} {monthCursor.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={10} style={s.navBtn} activeOpacity={0.7}>
          <ChevronRight size={20} color={colors.gray600} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => <Text key={i} style={s.weekDay}>{w}</Text>)}
      </View>

      <View style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const key = ymd(d);
          const isSelected = key === selectedDay;
          const isToday = key === today;
          const hasMark = markedDays.has(key);
          return (
            <TouchableOpacity key={i} style={s.cell} onPress={() => onSelectDay(key)} activeOpacity={0.7}>
              <View style={[s.dayCircle, isSelected && s.daySelected]}>
                <Text style={[
                  s.dayText,
                  isToday && !isSelected && s.dayTextToday,
                  isSelected && s.dayTextSelected,
                ]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={[s.dot, hasMark && s.dotOn, isSelected && hasMark && s.dotOnSelected]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: space[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[3] },
  navBtn: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  monthLabel: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: space[1] },
  weekDay: { flex: 1, textAlign: 'center', fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray400 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: space[1] },
  dayCircle: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.gray900 },
  dayText: { fontSize: text.sm, color: colors.gray800, fontWeight: weight.medium },
  dayTextToday: { color: colors.brand, fontWeight: weight.bold },
  dayTextSelected: { color: colors.white, fontWeight: weight.bold },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.brand },
  dotOnSelected: { backgroundColor: colors.gray900 },
});
