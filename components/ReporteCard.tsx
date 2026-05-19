import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import { ReporteGenerado } from "../database/reportesLocal";

type Props = {
  reporte: ReporteGenerado;
  onVer: () => void;
  onCompartir: () => void;
  onEditar: () => void;
  onEliminar: () => void;
};

// Formatea fechas del indice local para mostrarlas en la tarjeta.
function formatearFecha(value: string) {
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;
  return fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Tarjeta reutilizable para listar reportes TXT y exponer sus acciones principales.
export default function ReporteCard({
  reporte,
  onVer,
  onCompartir,
  onEditar,
  onEliminar,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="document-text-outline" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{reporte.titulo}</Text>
          <Text style={styles.meta}>
            {reporte.tipo} · {formatearFecha(reporte.fechaCreacion)}
          </Text>
        </View>
      </View>

      <Text style={styles.fileName} numberOfLines={1}>{reporte.fileName}</Text>
      {reporte.descripcion ? (
        <Text style={styles.description} numberOfLines={2}>{reporte.descripcion}</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onVer}>
          <Ionicons name="eye-outline" size={16} color={colors.accent} />
          <Text style={styles.actionText}>Ver</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onCompartir}>
          <Ionicons name="share-social-outline" size={16} color={colors.accent} />
          <Text style={styles.actionText}>Compartir</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onEditar}>
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text style={styles.actionText}>Editar</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onEliminar}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
    },
    header: { flexDirection: "row", gap: 10, alignItems: "center" },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    title: { fontSize: 15, fontWeight: "bold", color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    fileName: { fontSize: 12, color: colors.textSecondary, marginTop: 10 },
    description: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: 9,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dangerBtn: { borderColor: colors.danger },
    actionText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  });
