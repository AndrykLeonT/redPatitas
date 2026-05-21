import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { auditoriaService } from "../../services/auditoriaService";
import { useTheme } from "../../context/ThemeContext";
import { guardarReporteTxt, compartirReporteTxt, crearNombreArchivo } from "../../utils/reportFiles";

type BitacoraEntry = {
  id: string;
  fecha: string;
  almacenamiento: string;
  operacion: string;
  resumen: string;
  usuario: string;
  raw: string;
};

function personalizarResumen(almacenamiento: string, operacion: string, original: string): string {
  const t = original.toLowerCase();
  
  if (almacenamiento === "AsyncStorage") {
    if (t.includes("isdarkmode")) {
      return operacion === "CONSULTA" 
        ? "Verificación de la preferencia del modo oscuro/claro."
        : "Se modificó la preferencia del modo oscuro/claro.";
    }
    if (t.includes("userrole") || t.includes("userid") || t.includes("username") || t.includes("useremail")) {
      return operacion === "CONSULTA"
        ? "Consulta local para saber si un usuario está logueado y obtener su rol."
        : "Registro/cierre de la sesión activa del usuario local.";
    }
    if (t.includes("todas las claves") || t.includes("clear")) {
      return "Limpieza completa de la memoria del dispositivo.";
    }
  }

  if (almacenamiento === "SQLite") {
    if (t.includes("cambios_pendientes")) return "Interacción con la cola interna de tareas offline.";
    if (t.includes("mascotas_local")) return "Acceso a la caché local de mascotas (sin red).";
    if (t.includes("publicaciones_local")) return "Acceso a la caché local del feed de publicaciones.";
    if (t.includes("adopciones_local")) return "Acceso a la caché local de adopciones.";
    if (t.includes("estadisticas_local")) return "Actualización de las estadísticas locales.";
    if (t.includes("schema")) return "Modificación de la estructura de la base de datos interna.";
  }

  if (almacenamiento === "Firebase") {
    if (t.includes("usuarios")) return "Consulta o modificación de perfil de usuario en la nube.";
    if (t.includes("mascotas")) return "Interacción con el repositorio global de mascotas en tiempo real.";
    if (t.includes("publicaciones")) return "Sincronización o acceso al feed global de la comunidad.";
    if (t.includes("adopciones")) return "Transacción relacionada con los registros de adopciones.";
  }

  // Fallback si no hay match
  return original;
}

export default function ResumenBitacoraScreen() {
  const { colors, isDarkMode } = useTheme();
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarResumen = async () => {
    setLoading(true);
    try {
      const contenido = await auditoriaService.leerBitacora();
      if (contenido) {
        const lineas = contenido.split("\n").filter((l) => l.trim() !== "");
        const parsed: BitacoraEntry[] = lineas.map((linea) => {
          const match = linea.match(/^\[(.*?)\]\s+\|\s+\[(.*?)\]\s+\|\s+\[(.*?)\]\s+\|\s+\[(.*?)\]\s+\|\s+\[(.*?)\](.*)$/);
          if (match) {
            return {
              id: match[1],
              fecha: new Date(match[2]).toLocaleString(),
              almacenamiento: match[3],
              operacion: match[4],
              resumen: personalizarResumen(match[3], match[4], match[5]),
              usuario: match[6].trim(),
              raw: linea,
            };
          }
          return {
            id: "?",
            fecha: "Desconocida",
            almacenamiento: "Desconocido",
            operacion: "DESCONOCIDA",
            resumen: linea,
            usuario: "",
            raw: linea,
          };
        });
        setEntries(parsed.reverse()); // Show newest first
      } else {
        setEntries([]);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo leer la bitácora.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarResumen();
    }, [])
  );

  const exportarReporte = async () => {
    try {
      setLoading(true);
      const contenido = await auditoriaService.leerBitacora();
      if (!contenido) {
        Alert.alert("Aviso", "No hay registros para exportar.");
        setLoading(false);
        return;
      }
      
      const fileName = crearNombreArchivo("bitacora_accesos", "export");
      const fileUri = await guardarReporteTxt(fileName, contenido);
      await compartirReporteTxt(fileUri);
    } catch (e: any) {
      Alert.alert("Error al exportar", e.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const getOperationColor = (op: string) => {
    switch (op) {
      case "INSERCION": return "#28a745";
      case "MODIFICACION": return "#ffc107";
      case "ELIMINACION": return "#dc3545";
      case "CONSULTA": return "#007bff";
      default: return colors.textSecondary;
    }
  };

  const getStorageIcon = (storage: string) => {
    switch (storage) {
      case "Firebase": return "cloud-done-outline";
      case "SQLite": return "server-outline";
      case "AsyncStorage": return "save-outline";
      case "Archivos": return "document-outline";
      default: return "help-circle-outline";
    }
  };

  const renderItem = ({ item }: { item: BitacoraEntry }) => {
    if (item.id === "?") {
      return (
        <View style={[styles.card, { backgroundColor: isDarkMode ? colors.surface : "#FFF", borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>{item.raw}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.card, { backgroundColor: isDarkMode ? colors.surface : "#FFF", borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <Ionicons name={getStorageIcon(item.almacenamiento) as any} size={18} color={colors.textSecondary} />
            <Text style={[styles.almacenamiento, { color: colors.textSecondary }]}>{item.almacenamiento}</Text>
          </View>
          <Text style={[styles.operacion, { color: getOperationColor(item.operacion) }]}>
            {item.operacion}
          </Text>
        </View>
        
        <Text style={[styles.resumen, { color: colors.text }]}>{item.resumen}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={[styles.fecha, { color: colors.textSecondary }]}>#{item.id} • {item.fecha}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topActions}>
        <Text style={[styles.title, { color: colors.text }]}>
          Resumen de Transacciones
        </Text>
        <TouchableOpacity onPress={cargarResumen} style={styles.iconBtn}>
          <Ionicons name="refresh" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="documents-outline" size={60} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aún no hay transacciones registradas en la bitácora.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.id + "_" + index}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.accent }]} 
        onPress={exportarReporte}
      >
        <Ionicons name="download-outline" size={24} color="#FFF" />
        <Text style={styles.fabText}>Exportar TXT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  iconBtn: { padding: 8 },
  loader: { flex: 1, justifyContent: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { marginTop: 12, fontSize: 16, textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  almacenamiento: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  operacion: { fontSize: 12, fontWeight: "bold", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.05)", overflow: "hidden" },
  resumen: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(150,150,150,0.2)", paddingTop: 10 },
  fecha: { fontSize: 12 },
  usuario: { fontSize: 12, fontWeight: "500" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});
