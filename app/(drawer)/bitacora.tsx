import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { auditoriaService } from "../../services/auditoriaService";
import { useTheme } from "../../context/ThemeContext";

export default function BitacoraScreen() {
  const { colors, isDarkMode } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarBitacora = async () => {
    setLoading(true);
    try {
      const contenido = await auditoriaService.leerBitacora();
      if (contenido) {
        const lineas = contenido.split("\n").filter((l) => l.trim() !== "");
        setLogs(lineas);
      } else {
        setLogs([]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo leer la bitácora.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarBitacora();
    }, [])
  );

  const confirmarReinicio = () => {
    Alert.alert(
      "Peligro",
      "¿Estás seguro de que deseas reiniciar la bitácora? Esto eliminará de forma irreversible el historial de auditoría.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: async () => {
            await auditoriaService.reiniciarBitacora();
            setLogs([]);
            Alert.alert("Éxito", "La bitácora ha sido reiniciada a 1.");
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: string }) => (
    <Text style={[styles.logText, { color: isDarkMode ? "#00FF41" : "#003300" }]}>
      {item}
    </Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#0D0D0D" : "#F4F4F4" }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: isDarkMode ? "#fff" : "#000" }]}>
          Terminal de Auditoría
        </Text>
        <TouchableOpacity onPress={cargarBitacora} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color={isDarkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <View style={[styles.terminalContainer, { backgroundColor: isDarkMode ? "#000" : "#EAEAEA", borderColor: colors.border }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#00FF41" style={styles.loader} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay registros de auditoría aún.
            </Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            initialNumToRender={50}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.dangerBtn, { backgroundColor: "#FF3B30" }]}
        onPress={confirmarReinicio}
      >
        <Ionicons name="warning" size={20} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.dangerBtnText}>Reiniciar Bitácora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  refreshBtn: {
    padding: 8,
  },
  terminalContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
  },
  listContent: {
    padding: 12,
  },
  logText: {
    fontFamily: "monospace",
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  dangerBtn: {
    flexDirection: "row",
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dangerBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
