import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ReporteCard from "../../components/ReporteCard";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import {
  actualizarMetadataReporte,
  eliminarRegistroReporte,
  obtenerReportesGenerados,
  ReporteGenerado,
} from "../../database/reportesLocal";
import {
  actualizarReporteTxt,
  compartirReporteTxt,
  eliminarReporteTxt,
  leerReporteTxt,
} from "../../utils/reportFiles";

// Pantalla local de reportes TXT: lista, busca, abre, edita, comparte y elimina archivos.
export default function ReportesGenerados() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [reportes, setReportes] = useState<ReporteGenerado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalReporte, setModalReporte] = useState<ReporteGenerado | null>(null);
  const [contenido, setContenido] = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      setReportes(obtenerReportesGenerados(userId));
    } catch (error) {
      console.error("Error cargando reportes", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const reportesFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return reportes;
    return reportes.filter((reporte) =>
      [reporte.titulo, reporte.tipo, reporte.fileName, reporte.descripcion ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [busqueda, reportes]);

  const abrirReporte = async (reporte: ReporteGenerado, modoEdicion = false) => {
    try {
      const texto = await leerReporteTxt(reporte.fileUri);
      setContenido(texto);
      setEditando(modoEdicion);
      setModalReporte(reporte);
    } catch {
      Alert.alert("Error", "No se pudo leer el archivo del reporte.");
    }
  };

  const compartir = async (reporte: ReporteGenerado) => {
    try {
      await compartirReporteTxt(reporte.fileUri);
    } catch (error: any) {
      Alert.alert("No disponible", error?.message ?? "No se pudo compartir el reporte.");
    }
  };

  const confirmarEliminar = (reporte: ReporteGenerado) => {
    Alert.alert(
      "Eliminar reporte",
      "Se eliminara el archivo TXT local. Los datos originales no se modificaran.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await eliminarReporteTxt(reporte.fileUri);
              eliminarRegistroReporte(reporte.id);
              if (modalReporte?.id === reporte.id) setModalReporte(null);
              cargar();
            } catch {
              Alert.alert("Error", "No se pudo eliminar el reporte.");
            }
          },
        },
      ],
    );
  };

  const guardarEdicion = async () => {
    // La edicion solo cambia el TXT local; no modifica mascotas, publicaciones ni Firebase.
    if (!modalReporte) return;
    setGuardando(true);
    try {
      const ahora = new Date().toISOString();
      await actualizarReporteTxt(modalReporte.fileUri, contenido);
      actualizarMetadataReporte(modalReporte.id, { fechaModificacion: ahora });
      setModalReporte({ ...modalReporte, fechaModificacion: ahora });
      setEditando(false);
      cargar();
      Alert.alert("Guardado", "El reporte fue actualizado correctamente.");
    } catch {
      Alert.alert("Error", "No se pudo guardar el reporte.");
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar reporte..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={reportesFiltrados}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={reportesFiltrados.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => (
          <ReporteCard
            reporte={item}
            onVer={() => abrirReporte(item)}
            onCompartir={() => compartir(item)}
            onEditar={() => abrirReporte(item, true)}
            onEliminar={() => confirmarEliminar(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={58} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sin reportes generados</Text>
            <Text style={styles.emptyText}>
              Exporta una mascota o publicacion para verla aqui.
            </Text>
          </View>
        }
      />

      <Modal
        visible={!!modalReporte}
        animationType="slide"
        onRequestClose={() => setModalReporte(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.iconButton} onPress={() => setModalReporte(null)}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {modalReporte?.titulo ?? "Reporte"}
            </Text>
            <Pressable
              style={styles.iconButton}
              onPress={() => setEditando((prev) => !prev)}
            >
              <Ionicons
                name={editando ? "document-text-outline" : "create-outline"}
                size={22}
                color={colors.accent}
              />
            </Pressable>
          </View>

          {editando ? (
            <TextInput
              style={styles.editor}
              value={contenido}
              onChangeText={setContenido}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          ) : (
            <ScrollView style={styles.viewer} contentContainerStyle={styles.viewerContent}>
              <Text style={styles.reportText}>{contenido}</Text>
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            {editando ? (
              <Pressable
                style={[styles.primaryBtn, guardando && { opacity: 0.6 }]}
                onPress={guardarEdicion}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={colors.textInverse} />
                    <Text style={styles.primaryBtnText}>Guardar cambios</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => modalReporte && compartir(modalReporte)}
                >
                  <Ionicons name="share-social-outline" size={18} color={colors.accent} />
                  <Text style={styles.secondaryBtnText}>Compartir</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => setEditando(true)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.accent} />
                  <Text style={styles.secondaryBtnText}>Editar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      margin: 16,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, height: 44, color: colors.text, fontSize: 14 },
    list: { paddingHorizontal: 16, paddingBottom: 24 },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
    emptyContainer: { alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: colors.text, marginTop: 14 },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
    modalBg: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingTop: 42,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    modalTitle: { flex: 1, fontSize: 16, fontWeight: "bold", color: colors.text, textAlign: "center" },
    viewer: { flex: 1 },
    viewerContent: { padding: 16 },
    reportText: { color: colors.text, fontSize: 14, lineHeight: 22 },
    editor: {
      flex: 1,
      margin: 16,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      paddingVertical: 13,
      borderRadius: 12,
    },
    primaryBtnText: { color: colors.textInverse, fontWeight: "bold" },
    secondaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    secondaryBtnText: { color: colors.accent, fontWeight: "bold" },
  });
