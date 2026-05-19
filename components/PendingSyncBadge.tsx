import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

type Props = {
  texto?: string;
};

// Etiqueta visual para entidades locales que aun no han llegado a Firebase.
export default function PendingSyncBadge({ texto = "Pendiente de sincronizar" }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      <Ionicons name="cloud-upload-outline" size={11} color={colors.accent} />
      <Text style={[styles.texto, { color: colors.accent }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  texto: { fontSize: 10, fontWeight: "600" },
});
