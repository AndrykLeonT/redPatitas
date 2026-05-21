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
import { registrarCambioPendiente } from "../../database/cambiosPendientes";
import { insertarReporteGenerado, TipoReporte } from "../../database/reportesLocal";
import { recalcularYGuardarEstadisticas } from "../../database/estadisticasLocal";
import { esIdLocal } from "../../database/localDb";
import { obtenerMascotaLocal } from "../../database/mascotasLocal";
import {
  eliminarPublicacionLocalFisico,
  guardarPublicacionLocal,
  marcarPublicacionEliminadaLocal,
  obtenerPublicacionLocal,
} from "../../database/publicacionesLocal";
import { obtenerUsuarioLocal } from "../../database/usuariosLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Mascota, Publicacion } from "../../models/firebaseModels";
import {
  actualizarPublicacionEnFirebase,
  eliminarPublicacionEnFirebase,
} from "../../services/firebasePersonalService";
import { cacheMascotaDesdeFirebase, cachePublicacionDesdeFirebase } from "../../services/syncService";
import { formatearEdad } from "../../utils/dateUtils";
import { obtenerTituloPublicacion } from "../../utils/publicacionText";
import { compartirReporteTxt, crearNombreArchivo, guardarReporteTxt } from "../../utils/reportFiles";
import { generarReportePublicacion } from "../../utils/reportTemplates";

const { width, height } = Dimensions.get("window");

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreación",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

// Detalle de publicacion: lectura hibrida, resolucion, eliminacion y exportacion TXT.
export default function PublicacionDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [pendienteSync, setPendienteSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fotoViewer, setFotoViewer] = useState<{ fotos: string[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("userId").then(setUserId);
  }, []);

  useEffect(() => {
    if (!id) return;

    const cachearMascotaSiEsPersonal = (
      idMascota: string,
      data: Mascota,
      currentUserId: string | null,
    ) => {
      if (!currentUserId || data.idUsuario !== currentUserId) return;
      try {
        cacheMascotaDesdeFirebase(idMascota, data);
      } catch (error) {
        console.warn("No se pudo cachear mascota personal", error);
      }
    };

    const cachearPublicacionSiEsPersonal = (
      idPublicacion: string,
      data: Publicacion,
      currentUserId: string | null,
    ) => {
      if (!currentUserId || data.idUsuario !== currentUserId) return;
      try {
        cachePublicacionDesdeFirebase(idPublicacion, data);
      } catch (error) {
        console.warn("No se pudo cachear publicación personal", error);
      }
    };

    const cargarMascotaVinculada = async (idMascota: string, currentUserId: string | null) => {
      // La mascota vinculada se cachea solo si pertenece al usuario actual.
      if (!idMascota) {
        setMascota(null);
        return;
      }

      const local = obtenerMascotaLocal(idMascota);
      if (isConnected === false || esIdLocal(idMascota)) {
        setMascota(local ?? null);
        return;
      }

      try {
        const mascSnap = await get(ref(db, `mascotas/${idMascota}`));
        if (mascSnap.exists()) {
          const m = mascSnap.val() as Mascota;
          setMascota(m);
          cachearMascotaSiEsPersonal(idMascota, m, currentUserId);
        } else {
          setMascota(local ?? null);
        }
      } catch {
        setMascota(local ?? null);
      }
    };

    const cargarDesdeLocal = async (): Promise<boolean> => {
      // Fallback para publicaciones locales pendientes o cuando no hay conectividad.
      const local = obtenerPublicacionLocal(id);
      if (local && !local.eliminadoLocal) {
        const { id: _, pendienteSync: ps, creadoLocal, eliminadoLocal, ...data } = local;
        setPublicacion(data as Publicacion);
        setPendienteSync(Boolean(ps || creadoLocal));
        await cargarMascotaVinculada(data.idMascota ?? "", data.idUsuario);
        return true;
      }
      return false;
    };

    (async () => {
      setError(false);
      setIsLoading(true);
      const currentUserId = await AsyncStorage.getItem("userId");
      setUserId(currentUserId);

      if (esIdLocal(id)) {
        if (!(await cargarDesdeLocal())) setError(true);
        setIsLoading(false);
        return;
      }

      if (isConnected === false) {
        if (!(await cargarDesdeLocal())) setError(true);
        setIsLoading(false);
        return;
      }

      try {
        const pubSnap = await get(ref(db, `publicaciones/${id}`));
        if (!pubSnap.exists()) {
          if (!(await cargarDesdeLocal())) setError(true);
          return;
        }

        const pub = pubSnap.val() as Publicacion;
        setPublicacion(pub);
        setPendienteSync(false);
        cachearPublicacionSiEsPersonal(id, pub, currentUserId);

        await cargarMascotaVinculada(pub.idMascota ?? "", currentUserId);
      } catch {
        if (!(await cargarDesdeLocal())) setError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isConnected]);

  const resolverPublicacion = () => {
    // Alterna el estado de resolucion de cualquier publicacion propia.
    if (!publicacion || !userId || userId !== publicacion.idUsuario) {
      Alert.alert("Sin permisos", "Solo quien creo la publicacion puede modificarla.");
      return;
    }

    const estaResuelta = publicacion.estado === "resuelto";
    const nuevoEstado = estaResuelta ? "activo" : "resuelto";
    const fechaResolucion = estaResuelta ? undefined : new Date().toISOString();

    Alert.alert(
      estaResuelta ? "Marcar como sin resolver" : "Marcar como resuelta",
      estaResuelta
        ? "¿Confirmas que esta publicación volverá a aparecer como sin resolver?"
        : "¿Confirmas que esta publicación ya fue resuelta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setResolving(true);
            try {
              const actualizada: Publicacion = {
                ...publicacion,
                estado: nuevoEstado,
                fechaResolucion: fechaResolucion ?? null,
              };

              if (isConnected === false) {
                guardarPublicacionLocal(id, actualizada, {
                  pendienteSync: true,
                  creadoLocal: esIdLocal(id),
                });
                registrarCambioPendiente(userId!, "publicacion", id, "actualizar", actualizada);
                recalcularYGuardarEstadisticas(actualizada.idUsuario);
                setPendienteSync(true);
              } else {
                await actualizarPublicacionEnFirebase(id, {
                  estado: nuevoEstado,
                  fechaResolucion: fechaResolucion ?? null,
                });
                guardarPublicacionLocal(id, actualizada);
              }
              setPublicacion(actualizada);
            } catch {
              Alert.alert("Error", "No se pudo actualizar la publicación.");
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  const eliminar = () => {
    if (!publicacion || !userId || userId !== publicacion.idUsuario) {
      Alert.alert("Sin permisos", "Solo quien creo la publicacion puede eliminarla.");
      return;
    }

    Alert.alert(
      "Eliminar publicación",
      "¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (isConnected === false) {
                marcarPublicacionEliminadaLocal(id);
                registrarCambioPendiente(userId!, "publicacion", id, "eliminar", {});
                if (publicacion?.idUsuario) recalcularYGuardarEstadisticas(publicacion.idUsuario);
              } else {
                await eliminarPublicacionEnFirebase(id);
                eliminarPublicacionLocalFisico(id);
                if (publicacion?.idUsuario) recalcularYGuardarEstadisticas(publicacion.idUsuario);
              }
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo eliminar la publicación.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const tipoReporteDesdePublicacion = (pub: Publicacion): TipoReporte => {
    if (pub.tipo === "perdidos") return "reporte_perdido";
    if (pub.tipo === "recreacion") return "recreacion";
    if (pub.tipo === "reporte") return "publicacion";
    return "general";
  };

  const exportarReporte = async () => {
    // Crea un reporte local con la publicacion y, si existe, su mascota asociada.
    if (!publicacion) return;
    try {
      const usuario = userId === publicacion.idUsuario && userId
        ? obtenerUsuarioLocal(userId)
        : null;
      const contenido = generarReportePublicacion({
        id,
        publicacion,
        mascota,
        usuario,
      });
      const tituloBase = obtenerTituloPublicacion(publicacion);
      const fileName = crearNombreArchivo("publicacion", tituloBase);
      const fileUri = await guardarReporteTxt(fileName, contenido);
      insertarReporteGenerado({
        userId: userId ?? null,
        titulo: `Reporte de publicacion: ${tituloBase}`,
        tipo: tipoReporteDesdePublicacion(publicacion),
        entidadOrigen: esOwner ? "publicacion" : "global",
        entidadId: id,
        fileName,
        fileUri,
        fechaCreacion: new Date().toISOString(),
        descripcion: publicacion.descripcion,
      });
      Alert.alert(
        "Reporte generado",
        "El archivo TXT se guardó en Reportes generados.",
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

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Cargando…", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !publicacion) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Publicación", headerShown: true, headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.surface } }} />
        <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
        <Text style={styles.errorText}>No se encontró la publicación.</Text>
      </View>
    );
  }

  const esOwner = userId === publicacion.idUsuario;
  const fotos = publicacion.fotos ? Object.values(publicacion.fotos) : [];
  const tipo = publicacion.tipo ?? "reporte";
  const color = TIPO_COLOR[tipo] ?? "#6B7280";
  const label = TIPO_LABEL[tipo] ?? tipo;
  const tituloPublicacion = obtenerTituloPublicacion(publicacion);
  const publicacionResuelta = publicacion.estado === "resuelto";

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: tituloPublicacion,
          headerShown: true,
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "bold" },
          ...(esOwner && {
            headerRight: () => (
              <View style={styles.headerActions}>
                <Pressable onPress={() => router.push(`/publicacion/nueva?id=${id}` as any)} disabled={deleting}>
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

      {isConnected === false && <OfflineBanner />}

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

      {/* Galería de fotos */}
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
        <View style={styles.fotoPlaceholder}>
          <Ionicons name="image-outline" size={56} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Sin fotos</Text>
        </View>
      )}

      {/* Tipo */}
      <View style={styles.headerInfo}>
        <Text style={styles.tituloPublicacion}>{tituloPublicacion}</Text>
        <View style={[styles.tag, { backgroundColor: color }]}>
          <Text style={styles.tagText}>{label}</Text>
        </View>
        {pendienteSync && <PendingSyncBadge />}
        <Text style={styles.estado}>
          Estado: {publicacionResuelta ? "Resuelto" : "Sin resolver"}
        </Text>
        <Text style={styles.fecha}>
          {new Date(publicacion.fechaRegistro).toLocaleDateString("es-MX", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </Text>
      </View>

      {/* Mascota vinculada */}
      {mascota ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mascota</Text>
          <View style={styles.mascotaRow}>
            <Ionicons name="paw" size={28} color={colors.accent} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.mascotaNombre}>{mascota.nombre}</Text>
              <Text style={styles.mascotaSub}>
                {mascota.tipoAnimal} · {mascota.raza} · {mascota.sexo}
              </Text>
              <Text style={styles.mascotaSub}>
                {formatearEdad(mascota.fechaNacimiento)} · {mascota.peso} kg
              </Text>
            </View>
          </View>
          {mascota.rasgosParticulares ? (
            <Text style={styles.rasgos}>{mascota.rasgosParticulares}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Descripción */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descripción</Text>
        <Text style={styles.descripcion}>
          {publicacion.descripcion || "Sin descripción."}
        </Text>
      </View>

      {/* Ubicación */}
      {publicacion.ubicacion?.latitude && publicacion.ubicacion?.longitude ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicación aproximada</Text>
          <View style={styles.ubicacionRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.ubicacionText}>
              {publicacion.ubicacion.latitude.toFixed(5)}, {publicacion.ubicacion.longitude.toFixed(5)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Resolver o reabrir: solo creador */}
      {esOwner && (
        <Pressable
          style={[
            styles.btnResolver,
            publicacionResuelta && styles.btnReabrir,
            resolving && { opacity: 0.6 },
          ]}
          onPress={resolverPublicacion}
          disabled={resolving}
        >
          <Ionicons
            name={publicacionResuelta ? "refresh-circle-outline" : "checkmark-circle-outline"}
            size={18}
            color={publicacionResuelta ? colors.accent : "#10B981"}
          />
          <Text
            style={[
              styles.btnResolverText,
              publicacionResuelta && styles.btnReabrirText,
            ]}
          >
            {publicacionResuelta ? "Marcar como sin resolver" : "Marcar como resuelta"}
          </Text>
        </Pressable>
      )}

      <Pressable
        style={styles.btnExportar}
        onPress={exportarReporte}
        disabled={deleting || resolving}
      >
        <Ionicons name="document-text-outline" size={18} color={colors.accent} />
        <Text style={styles.btnExportarText}>Exportar reporte</Text>
      </Pressable>

      {/* Eliminar (solo dueño) */}
      {esOwner && (
        <Pressable
          style={[styles.btnEliminar, deleting && { opacity: 0.6 }]}
          onPress={eliminar}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.btnEliminarText}>Eliminar publicación</Text>
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
    foto: { width, height: 280, resizeMode: "cover" },
    fotoPlaceholder: {
      width: "100%", height: 200,
      backgroundColor: colors.surfaceAlt,
      justifyContent: "center", alignItems: "center",
    },
    headerInfo: {
      backgroundColor: colors.surface,
      padding: 16,
      marginBottom: 12,
      elevation: 2,
      gap: 6,
    },
    tag: {
      alignSelf: "flex-start",
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 14,
    },
    tagText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
    tituloPublicacion: { fontSize: 24, fontWeight: "bold", color: colors.text },
    estado: { fontSize: 14, color: colors.textSecondary },
    fecha: { fontSize: 13, color: colors.textSecondary },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 14, marginRight: 12 },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: "bold", color: colors.accent, marginBottom: 10 },
    mascotaRow: { flexDirection: "row", alignItems: "flex-start" },
    mascotaNombre: { fontSize: 18, fontWeight: "bold", color: colors.text },
    mascotaSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    rasgos: { fontSize: 13, color: colors.textSecondary, marginTop: 10, fontStyle: "italic" },
    descripcion: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    ubicacionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    ubicacionText: { fontSize: 14, color: colors.textSecondary },
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
    btnResolver: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#10B981",
      backgroundColor: colors.surface,
    },
    btnResolverText: { color: "#10B981", fontWeight: "bold", fontSize: 15 },
    btnReabrir: { borderColor: colors.accent },
    btnReabrirText: { color: colors.accent },
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
  });
