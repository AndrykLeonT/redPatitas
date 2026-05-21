import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useTheme } from "../context/ThemeContext";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const now = new Date();
  if (!match) {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function SimpleDatePicker({
  label,
  value,
  onChange,
  placeholder = "Seleccionar fecha",
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [visible, setVisible] = useState(false);
  const initial = useMemo(() => parseDate(value), [value]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const clampDay = (nextYear: number, nextMonth: number, nextDay = day) =>
    Math.min(nextDay, daysInMonth(nextYear, nextMonth));

  const updateYear = (delta: number) => {
    const next = year + delta;
    setYear(next);
    setDay(clampDay(next, month));
  };

  const updateMonth = (delta: number) => {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear--;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(clampDay(nextYear, nextMonth));
  };

  const updateDay = (delta: number) => {
    const max = daysInMonth(year, month);
    setDay(Math.min(Math.max(day + delta, 1), max));
  };

  const confirmar = () => {
    onChange(`${year}-${pad(month)}-${pad(day)}`);
    setVisible(false);
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setVisible(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{label}</Text>

            <View style={styles.row}>
              <Stepper label="Año" value={year} onMinus={() => updateYear(-1)} onPlus={() => updateYear(1)} />
              <Stepper label="Mes" value={month} onMinus={() => updateMonth(-1)} onPlus={() => updateMonth(1)} />
              <Stepper label="Día" value={day} onMinus={() => updateDay(-1)} onPlus={() => updateDay(1)} />
            </View>

            <Text style={styles.preview}>{year}-{pad(month)}-{pad(day)}</Text>

            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.okBtn} onPress={confirmar}>
                <Text style={styles.okText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable style={styles.stepBtn} onPress={onPlus}>
        <Ionicons name="chevron-up" size={20} color={colors.accent} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={onMinus}>
        <Ionicons name="chevron-down" size={20} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
    field: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    fieldText: { color: colors.text, fontSize: 14 },
    placeholder: { color: colors.textSecondary },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 },
    sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 18 },
    title: { color: colors.text, fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    stepper: { flex: 1, alignItems: "center", gap: 8 },
    stepLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
    stepBtn: { padding: 8 },
    stepValue: { color: colors.text, fontSize: 20, fontWeight: "bold" },
    preview: { textAlign: "center", color: colors.accent, fontWeight: "bold", marginTop: 16 },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    cancelBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    okBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: colors.accent },
    cancelText: { color: colors.textSecondary, fontWeight: "bold" },
    okText: { color: colors.textInverse, fontWeight: "bold" },
  });
