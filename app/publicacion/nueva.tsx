import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "../../utils/asyncStorageWrapper";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { get, ref } from "../../utils/firebaseWrapper";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import OfflineBanner from "../../components/OfflineBanner";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { registrarCambioPendiente } from "../../database/cambiosPendientes";
import { recalcularYGuardarEstadisticas } from "../../database/estadisticasLocal";
import { nuevoIdLocal } from "../../database/localDb";
import { listarMascotasPorUsuario } from "../../database/mascotasLocal";
import { guardarPublicacionLocal, obtenerPublicacionLocal } from "../../database/publicacionesLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useShake } from "../../hooks/useShake";
import { Mascota, Publicacion } from "../../models/firebaseModels";
import { subirImagen } from "../../services/cloudinaryService";
import { actualizarPublicacionEnFirebase, crearPublicacionEnFirebase } from "../../services/firebasePersonalService";
import { cacheMascotaDesdeFirebase } from "../../services/syncService";

type MascotaOpt = { id: string; nombre: string };

const MAX_FOTOS = 5;

const resolverFoto = async (uri: string) => (
  uri.startsWith("http://") || uri.startsWith("https://") ? uri : subirImagen(uri)
);

const TIPOS = [
  { key: "reporte" as const, label: "Reporte", color: "#EF4444" },
  { key: "perdidos" as const, label: "Perdidos", color: "#F59E0B" },
  { key: "recreacion" as const, label: "Recreacion", color: "#10B981" },
];

const FALLBACK_REGION = {
  latitude: 24.1426,
  longitude: -110.3128,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Formulario de publicacion con fotos, ubicacion opcional y soporte offline.
export default function NuevaPublicacion() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();

  const [tipo, setTipo] = useState<"reporte" | "perdidos" | "recreacion">("reporte");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [idMascota, setIdMascota] = useState<string | null>(null);
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fechaRegistroOriginal, setFechaRegistroOriginal] = useState("");

  const [mascotas, setMascotas] = useState<MascotaOpt[]>([]);
  const [mapRegion, setMapRegion] = useState(FALLBACK_REGION);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [loadingMascotas, setLoadingMascotas] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const isEditing = Boolean(id);

  useShake(() => {
    setTitulo("");
    setDescripcion("");
  });

  useEffect(() => {
    if (!id) return;
    const cargarDatos = (data: Publicacion) => {
      setTipo(data.tipo ?? "reporte");
      setTitulo(data.titulo ?? "");
      setDescripcion(data.descripcion ?? "");
      setIdMascota(data.idMascota ?? null);
      setFotosLocales(Object.values(data.fotos ?? {}));
      setUbicacion(data.ubicacion ?? null);
      setFechaRegistroOriginal(data.fechaRegistro ?? "");
    };
    const local = obtenerPublicacionLocal(id);
    if (local) cargarDatos(local);
    if (isConnected === false) return;
    get(ref(db, `publicaciones/${id}`))
      .then((snap) => { if (snap.exists()) cargarDatos(snap.val() as Publicacion); })
      .catch(() => {});
  }, [id, isConnected]);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          if (isConnected === false) {
            const locales = listarMascotasPorUsuario(userId);
            setMascotas(locales.map((m) => ({ id: m.id, nombre: m.nombre })));
            return;
          }

          const snap = await get(ref(db, "mascotas"));
          const opts: MascotaOpt[] = [];
          if (snap.exists()) {
            snap.forEach((child) => {
              const m = child.val() as Mascota;
              if (m.idUsuario === userId) {
                const idMascotaFirebase = child.key!;
                opts.push({ id: idMascotaFirebase, nombre: m.nombre });
                cacheMascotaDesdeFirebase(idMascotaFirebase, m);
              }
            });
          }
          setMascotas(opts);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMascotas(false);
      }
    })();

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setMapRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch { /* keep fallback */ }
    })();
  }, [isConnected]);

  const usarUbicacionActual = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu ubicacion.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUbicacion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      Alert.alert("Error", "No se pudo obtener tu ubicacion.");
    }
  };

  const abrirMapaPicker = () => {
    setTempMarker(ubicacion ?? null);
    setShowMapPicker(true);
  };

  const confirmarUbicacion = () => {
    if (tempMarker) setUbicacion(tempMarker);
    setShowMapPicker(false);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galeria.");
      return;
    }
    const remaining = MAX_FOTOS - fotosLocales.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setFotosLocales((prev) => [...prev, ...newUris].slice(0, MAX_FOTOS));
    }
  };

  const removeImage = (index: number) => {
    setFotosLocales((prev) => prev.filter((_, i) => i !== index));
  };

  const publicar = async () => {
    // Offline conserva fotos como URI local; la sincronizacion las sube luego a Cloudinary.
    if (!titulo.trim()) {
      Alert.alert("Error", "El titulo de la publicacion es obligatorio.");
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert("Error", "La descripcion es obligatoria.");
      return;
    }
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) { Alert.alert("Error", "No hay sesion activa."); return; }

      if (isConnected === false) {
        const fotosRecord: Record<string, string> = {};
        for (let i = 0; i < fotosLocales.length; i++) {
          fotosRecord[`foto_${Date.now()}_${i}`] = fotosLocales[i];
        }

        const nueva: Publicacion = {
          idUsuario: userId,
          ...(idMascota ? { idMascota } : {}),
          tipo,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          fechaRegistro: fechaRegistroOriginal || new Date().toISOString(),
          likes: 0,
          fotos: fotosRecord,
          estado: "activo",
          ...(ubicacion ? { ubicacion } : {}),
        };
        const idLocal = id ?? nuevoIdLocal();
        guardarPublicacionLocal(idLocal, nueva, {
          pendienteSync: true,
          creadoLocal: !isEditing || idLocal.startsWith("local_"),
        });
        registrarCambioPendiente(userId, "publicacion", idLocal, isEditing ? "actualizar" : "crear", nueva);
        recalcularYGuardarEstadisticas(userId);
        Alert.alert(
          "Publicacion guardada localmente",
          "Se sincronizara cuando vuelva la conexion.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }

      const fotosRecord: Record<string, string> = {};
      for (let i = 0; i < fotosLocales.length; i++) {
        setLoadingStatus(`Subiendo foto ${i + 1} de ${fotosLocales.length}...`);
        const url = await resolverFoto(fotosLocales[i]);
        fotosRecord[`foto_${Date.now()}_${i}`] = url;
      }

      setLoadingStatus("Guardando publicacion...");
      const nueva: Publicacion = {
        idUsuario: userId,
        ...(idMascota ? { idMascota } : {}),
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fechaRegistro: fechaRegistroOriginal || new Date().toISOString(),
        likes: 0,
        fotos: fotosRecord,
        estado: "activo",
        ...(ubicacion ? { ubicacion } : {}),
      };
      const idFirebase = isEditing && id ? id : await crearPublicacionEnFirebase(nueva);
      if (isEditing && id) await actualizarPublicacionEnFirebase(id, nueva);
      guardarPublicacionLocal(idFirebase, nueva);
      recalcularYGuardarEstadisticas(userId);
      Alert.alert("¡Publicado!", isEditing ? "Tu publicacion fue actualizada correctamente." : "Tu publicacion fue creada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo crear la publicacion.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  return (
    <>
      <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
        <Stack.Screen
          options={{
            title: isEditing ? "Editar Publicacion" : "Nueva Publicacion",
            headerShown: true,
            headerTintColor: colors.accent,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: { color: colors.text, fontWeight: "bold" },
          }}
        />

        {isConnected === false && <OfflineBanner />}

        {/* Tipo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de publicacion</Text>
          <View style={styles.tipoRow}>
            {TIPOS.map(({ key, label, color }) => (
              <Pressable
                key={key}
                style={[styles.tipoBtn, tipo === key && { backgroundColor: color, borderColor: color }]}
                onPress={() => setTipo(key)}
              >
                <Text style={[styles.tipoBtnText, tipo === key && { color: colors.textInverse }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Titulo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Titulo de publicacion *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Perrito visto cerca del parque"
            placeholderTextColor={colors.textSecondary}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={80}
          />
        </View>

        {/* Descripcion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descripcion *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe la situacion: donde fue visto, cuando, caracteristicas..."
            placeholderTextColor={colors.textSecondary}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Fotos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos ({fotosLocales.length}/{MAX_FOTOS})</Text>
          <View style={styles.fotosGrid}>
            {fotosLocales.map((uri, index) => (
              <View key={index} style={styles.fotoThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <Pressable style={styles.removeBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            {fotosLocales.length < MAX_FOTOS && (
              <Pressable style={styles.addFotoBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color={colors.accent} />
                <Text style={styles.addFotoText}>Agregar</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Mascota vinculada */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mascota vinculada</Text>
          {loadingMascotas ? (
            <ActivityIndicator color={colors.accent} />
          ) : mascotas.length === 0 ? (
            <Text style={styles.textoVacio}>No tienes mascotas registradas.</Text>
          ) : (
            <>
              <Pressable
                style={[styles.mascotaOpt, idMascota === null && styles.mascotaOptActivo]}
                onPress={() => setIdMascota(null)}
              >
                <Ionicons name="close-circle-outline" size={16} color={idMascota === null ? colors.accent : colors.textSecondary} />
                <Text style={[styles.mascotaOptText, idMascota === null && styles.mascotaOptTextActivo]}>Sin vincular</Text>
              </Pressable>
              {mascotas.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.mascotaOpt, idMascota === m.id && styles.mascotaOptActivo]}
                  onPress={() => setIdMascota(m.id)}
                >
                  <Ionicons name="paw" size={16} color={idMascota === m.id ? colors.accent : colors.textSecondary} />
                  <Text style={[styles.mascotaOptText, idMascota === m.id && styles.mascotaOptTextActivo]}>{m.nombre}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>

        {/* Ubicacion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicacion</Text>
          <View style={styles.ubicacionBtns}>
            <Pressable style={styles.ubicacionBtn} onPress={usarUbicacionActual}>
              <Ionicons name="locate-outline" size={18} color={colors.accent} />
              <Text style={styles.ubicacionBtnText}>Ubicacion actual</Text>
            </Pressable>
            <Pressable style={styles.ubicacionBtn} onPress={abrirMapaPicker}>
              <Ionicons name="map-outline" size={18} color={colors.accent} />
              <Text style={styles.ubicacionBtnText}>Elegir en mapa</Text>
            </Pressable>
          </View>
          {ubicacion ? (
            <View style={styles.ubicacionInfo}>
              <Ionicons name="location" size={16} color="#10B981" />
              <Text style={styles.ubicacionText}>
                {ubicacion.latitude.toFixed(5)}, {ubicacion.longitude.toFixed(5)}
              </Text>
              <Pressable onPress={() => setUbicacion(null)}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.textoVacio, { marginTop: 8 }]}>Sin ubicacion seleccionada.</Text>
          )}
        </View>

        <Pressable style={[styles.btnPublicar, isLoading && { opacity: 0.7 }]} onPress={publicar} disabled={isLoading}>
          {isLoading ? (
            <View style={{ alignItems: "center", gap: 6 }}>
              <ActivityIndicator color={colors.textInverse} />
              {loadingStatus ? <Text style={styles.loadingStatusText}>{loadingStatus}</Text> : null}
            </View>
          ) : (
            <>
              <Ionicons name="megaphone-outline" size={20} color={colors.textInverse} />
              <Text style={styles.btnPublicarText}>Publicar</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Modal selector de mapa */}
      <Modal visible={showMapPicker} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onPress={(e) => setTempMarker(e.nativeEvent.coordinate)}
            showsUserLocation
          >
            {tempMarker && (
              <Marker
                coordinate={tempMarker}
                draggable
                onDragEnd={(e) => setTempMarker(e.nativeEvent.coordinate)}
                pinColor={colors.accent}
              />
            )}
          </MapView>
          <View style={styles.mapControls}>
            <Text style={styles.mapHint}>
              {tempMarker
                ? "Arrastra el marcador para ajustar"
                : "Toca el mapa para seleccionar una ubicacion"}
            </Text>
            <View style={styles.mapBtns}>
              <Pressable style={styles.mapBtnCancelar} onPress={() => setShowMapPicker(false)}>
                <Text style={styles.mapBtnCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.mapBtnConfirmar, !tempMarker && { opacity: 0.5 }]}
                onPress={confirmarUbicacion}
                disabled={!tempMarker}
              >
                <Text style={styles.mapBtnConfirmarText}>Confirmar ubicacion</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 40 },
    card: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
    },
    cardTitle: { fontSize: 15, fontWeight: "bold", color: colors.accent, marginBottom: 12 },
    tipoRow: { flexDirection: "row", gap: 8 },
    tipoBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.background,
    },
    tipoBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    textArea: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 100,
    },
    fotosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    fotoThumb: { position: "relative" },
    thumbImg: { width: 80, height: 80, borderRadius: 10 },
    removeBtn: { position: "absolute", top: -8, right: -8 },
    addFotoBtn: {
      width: 80,
      height: 80,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    addFotoText: { fontSize: 11, color: colors.accent, marginTop: 2 },
    mascotaOpt: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    mascotaOptActivo: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    mascotaOptText: { fontSize: 14, color: colors.textSecondary },
    mascotaOptTextActivo: { color: colors.accent, fontWeight: "bold" },
    textoVacio: { fontSize: 13, color: colors.textSecondary, fontStyle: "italic" },
    ubicacionBtns: { flexDirection: "row", gap: 10, marginBottom: 12 },
    ubicacionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: colors.background,
    },
    ubicacionBtnText: { fontSize: 13, fontWeight: "600", color: colors.accent },
    ubicacionInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.accentSoft,
      padding: 10,
      borderRadius: 10,
    },
    ubicacionText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    btnPublicar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      marginHorizontal: 16,
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 14,
      elevation: 3,
    },
    btnPublicarText: { color: colors.textInverse, fontWeight: "bold", fontSize: 16 },
    loadingStatusText: { color: colors.textInverse, fontSize: 12, marginTop: 4 },
    mapControls: {
      backgroundColor: colors.surface,
      padding: 16,
      paddingBottom: 28,
      elevation: 8,
    },
    mapHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 14 },
    mapBtns: { flexDirection: "row", gap: 12 },
    mapBtnCancelar: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
    },
    mapBtnCancelarText: { color: colors.textSecondary, fontWeight: "bold" },
    mapBtnConfirmar: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    mapBtnConfirmarText: { color: colors.textInverse, fontWeight: "bold" },
  });
