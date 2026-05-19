import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

type Props = {
  visible: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export default function SyncChangesModal({
  visible,
  pendingCount,
  isSyncing,
  onDismiss,
  onConfirm,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Conexión recuperada</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Tienes {pendingCount === 1 ? "1 cambio local pendiente" : `${pendingCount} cambios locales pendientes`}.
            ¿Deseas subirlos a internet?
          </Text>

          {isSyncing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sincronizando…</Text>
            </View>
          ) : (
            <View style={styles.botones}>
              <Pressable
                style={[styles.btnSecundario, { borderColor: colors.border }]}
                onPress={onDismiss}
              >
                <Text style={[styles.btnSecundarioText, { color: colors.textSecondary }]}>Ahora no</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimario, { backgroundColor: colors.accent }]}
                onPress={onConfirm}
              >
                <Text style={[styles.btnPrimarioText, { color: colors.textInverse }]}>Subir cambios</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 6,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  body: { fontSize: 14, textAlign: "center", marginBottom: 18, lineHeight: 20 },
  botones: { flexDirection: "row", gap: 10, width: "100%" },
  btnSecundario: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  btnSecundarioText: { fontWeight: "bold", fontSize: 14 },
  btnPrimario: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimarioText: { fontWeight: "bold", fontSize: 14 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13 },
});
