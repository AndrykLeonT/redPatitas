import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import OfflineBanner from "../../components/OfflineBanner";
import PendingSyncBadge from "../../components/PendingSyncBadge";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { guardarAdopcionLocal } from "../../database/adopcionesLocal";
import { registrarCambioPendiente } from "../../database/cambiosPendientes";
import { insertarReporteGenerado } from "../../database/reportesLocal";
import { recalcularYGuardarEstadisticas } from "../../database/estadisticasLocal";
import { esIdLocal, nuevoIdLocal } from "../../database/localDb";
import {
  eliminarMascotaLocalFisico,
  marcarMascotaEliminadaLocal,
  obtenerMascotaLocal,
} from "../../database/mascotasLocal";
import { obtenerUsuarioLocal } from "../../database/usuariosLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Adopcion, Mascota } from "../../models/firebaseModels";
import {
  crearAdopcionEnFirebase,
  eliminarMascotaEnFirebase,
} from "../../services/firebasePersonalService";
import { cacheMascotaDesdeFirebase } from "../../services/syncService";
import { formatearEdad } from "../../utils/dateUtils";
import { crearNombreArchivo, guardarReporteTxt, compartirReporteTxt } from "../../utils/reportFiles";
import { generarReporteMascota } from "../../utils/reportTemplates";

const { width, height } = Dimensions.get("window");

function Fila({
  label,
  valor,
  styles,
}: {
  label: string;
  valor: string | number | boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  const texto =
    typeof valor === "boolean" ? (valor ? "SÃ­" : "No") : String(valor ?? "-");
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{texto || "-"}</Text>
    </View>
  );
}

// Detalle de mascota: carga hibrida Firebase/SQLite, baja/adopcion y exportacion TXT.
export default function MascotaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [pendienteSync, setPendienteSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fotoViewer, setFotoViewer] = useState<{ fotos: string[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("userId").then(setUserId);
  }, []);

  useEffect(() => {
    if (!id) return;

    const cargarDesdeLocal = (): boolean => {
      // Los IDs locales y el modo sin internet se resuelven directamente desde SQLite.
      const local = obtenerMascotaLocal(id);
      if (local) {
        const { id: _, pendienteSync: ps, creadoLocal, eliminadoLocal, ...data } = local;
        setMascota(data as Mascota);
        setPendienteSync(Boolean(ps || creadoLocal));
        return true;
      }
      return false;
    };

    (async () => {
      // Si es un ID local (creado offline), no existe en Firebase: ir directo a local.
      if (esIdLocal(id)) {
        if (!cargarDesdeLocal()) setError(true);
        setIsLoading(false);
        return;
      }

      // Sin conexiÃ³n: SQLite directo
      if (isConnected === false) {
        if (!cargarDesdeLocal()) setError(true);
        setIsLoading(false);
        return;
      }

      // Con conexiÃ³n: Firebase primero, fallback a SQLite
      try {
        const snap = await get(ref(db, `mascotas/${id}`));
        if (snap.exists()) {
          const m = snap.val() as Mascota;
          setMascota(m);
          setPendienteSync(false);
          cacheMascotaDesdeFirebase(id, m);
        } else if (!cargarDesdeLocal()) {
          setError(true);
        }
      } catch {
        if (!cargarDesdeLocal()) setError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isConnected]);

  const eliminar = () => setShowBajaModal(true);

  const exportarReporte = async () => {
    // Genera un TXT independiente; el archivo no participa en la sincronizacion offline.
    if (!mascota) return;
    try {
      const usuario = userId === mascota.idUsuario && userId
        ? obtenerUsuarioLocal(userId)
        : null;
      const contenido = generarReporteMascota({ id, mascota, usuario });
      const fileName = crearNombreArchivo("mascota", mascota.nombre);
      const fileUri = await guardarReporteTxt(fileName, contenido);
      insertarReporteGenerado({
        userId: userId ?? null,
        titulo: `Reporte de mascota: ${mascota.nombre}`,
        tipo: "mascota",
        entidadOrigen: "mascota",
        entidadId: id,
        fileName,
        fileUri,
        fechaCreacion: new Date().toISOString(),
        descripcion: `${mascota.tipoAnimal} - ${mascota.raza}`,
      });
      Alert.alert(
        "Reporte generado",
        "El archivo TXT se guardÃ³ en Reportes generados.",
        [
          { text: "OK" },
          {
            text: "Compartir",
            onPress: () => compartirReporteTxt(fileUri).catch((error: any) => {
              Alert.alert("No disponible", error?.message ?? "No se pudo compartir el reporte.");
            }),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo generar el reporte.");
    }
  };

  const handleBaja = async (tipo: "adoptado_app" | "adoptado_externo" | "eliminar") => {
    // Una baja por adopcion registra historial antes de ocultar o eliminar la mascota.
    setShowBajaModal(false);
    const offline = isConnected === false;

    if (tipo === "eliminar") {
      Alert.alert(
        "Eliminar registro",
        `Â¿Confirmas eliminar el registro de ${mascota?.nombre}? Esta acciÃ³n no se puede deshacer.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              setDeleting(true);
              try {
                if (offline) {
                  // Soft delete + cambio pendiente. Si era ID local, tambiÃ©n lo
                  // tachamos: el sync lo borrarÃ¡ fÃ­sicamente sin tocar Firebase.
                  marcarMascotaEliminadaLocal(id);
                  registrarCambioPendiente(userId!, "mascota", id, "eliminar", {});
                  if (mascota?.idUsuario) recalcularYGuardarEstadisticas(mascota.idUsuario);
                } else {
                  await eliminarMascotaEnFirebase(id);
                  eliminarMascotaLocalFisico(id);
                  if (mascota?.idUsuario) recalcularYGuardarEstadisticas(mascota.idUsuario);
                }
                router.back();
              } catch {
                Alert.alert("Error", "No se pudo eliminar la mascota.");
                setDeleting(false);
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      tipo === "adoptado_app" ? "AdopciÃ³n por la app" : "AdopciÃ³n externa",
      `Â¿Confirmas que ${mascota?.nombre} fue adoptado?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            if (!mascota) return;
            setDeleting(true);
            try {
              const adopcionPayload: Adopcion = {
                idMascota: id,
                idUsuario: mascota.idUsuario,
                tipoAnimal: mascota.tipoAnimal,
                nombreMascota: mascota.nombre,
                via: tipo === "adoptado_app" ? "app" : "externo",
                fechaAdopcion: new Date().toISOString(),
              };

              if (offline) {
                // 1. Crear adopciÃ³n local con ID temporal
                const idAdopcionLocal = nuevoIdLocal();
                guardarAdopcionLocal(idAdopcionLocal, adopcionPayload, {
                  pendienteSync: true,
                  creadoLocal: true,
                });
                registrarCambioPendiente(
                  userId!,
                  "adopcion",
                  idAdopcionLocal,
                  "crear",
                  adopcionPayload,
                );
                // 2. Soft delete de la mascota
                marcarMascotaEliminadaLocal(id);
                registrarCambioPendiente(userId!, "mascota", id, "eliminar", {});
              } else {
                const idAdopcionReal = await crearAdopcionEnFirebase(adopcionPayload);
                guardarAdopcionLocal(idAdopcionReal, adopcionPayload);
                await eliminarMascotaEnFirebase(id);
                eliminarMascotaLocalFisico(id);
              }
              recalcularYGuardarEstadisticas(mascota.idUsuario);
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo registrar la adopciÃ³n.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Cargandoâ€¦", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !mascota) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Mascota", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
        <Text style={styles.errorText}>No se encontrÃ³ la mascota.</Text>
      </View>
    );
  }

  const esOwner = userId === mascota.idUsuario;
  const enfermedades = mascota.enfermedades ? Object.values(mascota.enfermedades) : [];
  const vacunas = mascota.vacunas ? Object.values(mascota.vacunas) : [];
  const fotos = mascota.fotos ? Object.values(mascota.fotos) : [];
  const edadTexto = formatearEdad(mascota.fechaNacimiento);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: mascota.nombre,
          headerShown: true,
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "bold" },
          ...(esOwner && {
            headerRight: () => (
              <View style={styles.headerActions}>
                <Pressable onPress={() => router.push(`/mascota/nueva?id=${id}` as any)} disabled={deleting}>
                  <Ionicons name="create-outline" size={22} color={colors.accent} />
                </Pressable>
                <Pressable onPress={eliminar} disabled={deleting}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ),
          }),
        }}
      />

      {/* Visor de foto en pantalla completa */}
      <Modal
        visible={!!fotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoViewer(null)}
      >
        <View style={styles.viewerBg}>
          <Pressable style={styles.viewerClose} onPress={() => setFotoViewer(null)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </Pressable>
          {fotoViewer && (
            <>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.viewerContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: fotoViewer.fotos[fotoViewer.index] }}
                  style={styles.viewerImg}
                  resizeMode="contain"
                />
              </ScrollView>
              {fotoViewer.fotos.length > 1 && (
                <View style={styles.viewerNav}>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) => f && f.index > 0 ? { ...f, index: f.index - 1 } : f)
                    }
                  >
                    <Ionicons
                      name="chevron-back"
                      size={36}
                      color={fotoViewer.index > 0 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                  <Text style={styles.viewerCounter}>
                    {fotoViewer.index + 1} / {fotoViewer.fotos.length}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) =>
                        f && f.index < f.fotos.length - 1 ? { ...f, index: f.index + 1 } : f
                      )
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={36}
                      color={fotoViewer.index < fotoViewer.fotos.length - 1 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Modal de baja */}
      <Modal
        visible={showBajaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBajaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBajaModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Â¿QuÃ© pasÃ³ con {mascota?.nombre}?</Text>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("adoptado_app")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="phone-portrait-outline" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Adoptado por la app</Text>
                <Text style={styles.modalOptionDesc}>La adopciÃ³n fue gestionada por RedPatitas</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("adoptado_externo")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="home-outline" size={24} color="#4F6D7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Adoptado externamente</Text>
                <Text style={styles.modalOptionDesc}>La familia llegÃ³ directo al refugio</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalOption} onPress={() => handleBaja("eliminar")}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalOptionTitle, { color: "#EF4444" }]}>Eliminar registro</Text>
                <Text style={styles.modalOptionDesc}>Error, duplicado u otra razÃ³n</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.modalCancel} onPress={() => setShowBajaModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {isConnected === false && <OfflineBanner />}

      {/* GalerÃ­a de fotos o banner con Ã­cono */}
      {fotos.length > 0 ? (
        <FlatList
          data={fotos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setFotoViewer({ fotos, index })}>
              <Image source={{ uri: item }} style={styles.foto} />
            </Pressable>
          )}
          scrollEnabled={fotos.length > 1}
        />
      ) : (
        <View style={styles.iconBanner}>
          <Ionicons name="paw" size={64} color={colors.accent} />
        </View>
      )}

      {/* Nombre y especie */}
      <View style={styles.nameBanner}>
        <Text style={styles.nombreGrande}>{mascota.nombre}</Text>
        <Text style={styles.subtitulo}>{mascota.tipoAnimal} Â· {mascota.raza}</Text>
        {pendienteSync && <View style={{ marginTop: 6 }}><PendingSyncBadge /></View>}
      </View>

      {/* Datos generales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>InformaciÃ³n general</Text>
        <Fila styles={styles} label="Sexo" valor={mascota.sexo} />
        <Fila styles={styles} label="Edad" valor={edadTexto} />
        <Fila styles={styles} label="Peso" valor={`${mascota.peso} kg`} />
        <Fila styles={styles} label="Esterilizado" valor={mascota.esterilizado} />
        {mascota.fechaNacimiento ? (
          <Fila styles={styles} label="Fecha de nacimiento" valor={mascota.fechaNacimiento} />
        ) : null}
      </View>

      {/* Comportamiento */}
      {mascota.comportamiento ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comportamiento</Text>
          <Text style={styles.texto}>{mascota.comportamiento}</Text>
        </View>
      ) : null}

      {/* Rasgos particulares */}
      {mascota.rasgosParticulares ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rasgos particulares</Text>
          <Text style={styles.texto}>{mascota.rasgosParticulares}</Text>
        </View>
      ) : null}

      {/* Vacunas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vacunas</Text>
        {vacunas.length > 0 ? (
          vacunas.map((v, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.chipText}>{v}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin vacunas registradas.</Text>
        )}
      </View>

      {/* Enfermedades */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enfermedades / Condiciones</Text>
        {enfermedades.length > 0 ? (
          enfermedades.map((e, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="medkit-outline" size={16} color="#F59E0B" />
              <Text style={styles.chipText}>{e}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin condiciones registradas.</Text>
        )}
      </View>

      {/* Eliminar (solo dueÃ±o) */}
      {esOwner && (
        <Pressable
          style={styles.btnExportar}
          onPress={exportarReporte}
          disabled={deleting}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.accent} />
          <Text style={styles.btnExportarText}>Exportar reporte</Text>
        </Pressable>
      )}

      {esOwner && (
        <Pressable
          style={[styles.btnEliminar, deleting && { opacity: 0.6 }]}
          onPress={eliminar}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.btnEliminarText}>Eliminar mascota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 30 },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    errorText: { color: colors.danger, fontSize: 16, marginTop: 12 },
    foto: { width, height: 260, resizeMode: "cover" },
    iconBanner: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      height: 140,
      elevation: 2,
    },
    nameBanner: {
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingVertical: 16,
      paddingBottom: 20,
      marginBottom: 12,
      elevation: 2,
    },
    nombreGrande: { fontSize: 26, fontWeight: "bold", color: colors.text },
    subtitulo: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: "bold", color: colors.accent, marginBottom: 10 },
    fila: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filaLabel: { fontSize: 14, color: colors.textSecondary },
    filaValor: { fontSize: 14, fontWeight: "600", color: colors.text },
    texto: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    textoVacio: { fontSize: 14, color: colors.textSecondary, fontStyle: "italic" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 14, marginRight: 12 },
    chipRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    chipText: { fontSize: 14, color: colors.textSecondary },
    btnEliminar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.danger,
      backgroundColor: colors.surface,
    },
    btnEliminarText: { color: colors.danger, fontWeight: "bold", fontSize: 15 },
    btnExportar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    btnExportarText: { color: colors.accent, fontWeight: "bold", fontSize: 15 },
    viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
    viewerClose: { position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 },
    viewerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
    viewerImg: { width, height: height * 0.75 },
    viewerNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 16,
    },
    viewerCounter: { color: "#FFF", fontSize: 16 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    modalOptionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOptionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    modalOptionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalCancel: {
      marginTop: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalCancelText: { fontSize: 15, fontWeight: "bold", color: colors.accent },
  });
