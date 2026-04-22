import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { get, push, ref } from "firebase/database";
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
import { db } from "../../config/firebase";
import { Mascota, Publicacion } from "../../models/firebaseModels";

type MascotaOpt = { id: string; nombre: string };

const CLOUD_NAME = "dwlbornu8";
const UPLOAD_PRESET = "uploadRedPatitas";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const MAX_FOTOS = 5;

const TIPOS = [
  { key: "reporte" as const, label: "Reporte", color: "#EF4444" },
  { key: "perdidos" as const, label: "Perdidos", color: "#F59E0B" },
  { key: "recreacion" as const, label: "Recreación", color: "#10B981" },
];

const FALLBACK_REGION = {
  latitude: 24.1426,
  longitude: -110.3128,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function NuevaPublicacion() {
  const router = useRouter();

  const [tipo, setTipo] = useState<"reporte" | "perdidos" | "recreacion">("reporte");
  const [descripcion, setDescripcion] = useState("");
  const [idMascota, setIdMascota] = useState<string | null>(null);
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  const [ubicacion, setUbicacion] = useState<{ latitude: number; longitude: number } | null>(null);

  const [mascotas, setMascotas] = useState<MascotaOpt[]>([]);
  const [mapRegion, setMapRegion] = useState(FALLBACK_REGION);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [loadingMascotas, setLoadingMascotas] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const snap = await get(ref(db, "mascotas"));
          const opts: MascotaOpt[] = [];
          if (snap.exists()) {
            snap.forEach((child) => {
              const m = child.val() as Mascota;
              if (m.idUsuario === userId) opts.push({ id: child.key!, nombre: m.nombre });
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
  }, []);

  const usarUbicacionActual = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu ubicación.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUbicacion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      Alert.alert("Error", "No se pudo obtener tu ubicación.");
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
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
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

  const uploadImage = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", { uri, type: "image/jpeg", name: "photo.jpg" } as any);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message ?? "Error al subir imagen");
    return data.secure_url;
  };

  const publicar = async () => {
    if (!descripcion.trim()) {
      Alert.alert("Error", "La descripción es obligatoria.");
      return;
    }
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) { Alert.alert("Error", "No hay sesión activa."); return; }

      const fotosRecord: Record<string, string> = {};
      for (let i = 0; i < fotosLocales.length; i++) {
        setLoadingStatus(`Subiendo foto ${i + 1} de ${fotosLocales.length}...`);
        const url = await uploadImage(fotosLocales[i]);
        fotosRecord[`foto_${Date.now()}_${i}`] = url;
      }

      setLoadingStatus("Guardando publicación...");
      const nueva: Publicacion = {
        idUsuario: userId,
        idMascota: idMascota ?? "",
        tipo,
        descripcion: descripcion.trim(),
        fechaRegistro: new Date().toISOString(),
        likes: 0,
        fotos: fotosRecord,
        estado: "activo",
        ...(ubicacion ? { ubicacion } : {}),
      };
      await push(ref(db, "publicaciones"), nueva);
      Alert.alert("¡Publicado!", "Tu publicación fue creada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo crear la publicación.");
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
            title: "Nueva Publicación",
            headerShown: true,
            headerTintColor: "#FF8C42",
            headerStyle: { backgroundColor: "#FFF" },
            headerTitleStyle: { color: "#2B2D42", fontWeight: "bold" },
          }}
        />

        {/* Tipo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de publicación</Text>
          <View style={styles.tipoRow}>
            {TIPOS.map(({ key, label, color }) => (
              <Pressable
                key={key}
                style={[styles.tipoBtn, tipo === key && { backgroundColor: color, borderColor: color }]}
                onPress={() => setTipo(key)}
              >
                <Text style={[styles.tipoBtnText, tipo === key && { color: "#FFF" }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descripción *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe la situación: dónde fue visto, cuándo, características..."
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
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </Pressable>
              </View>
            ))}
            {fotosLocales.length < MAX_FOTOS && (
              <Pressable style={styles.addFotoBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color="#FF8C42" />
                <Text style={styles.addFotoText}>Agregar</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Mascota vinculada */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mascota vinculada</Text>
          {loadingMascotas ? (
            <ActivityIndicator color="#FF8C42" />
          ) : mascotas.length === 0 ? (
            <Text style={styles.textoVacio}>No tienes mascotas registradas.</Text>
          ) : (
            <>
              <Pressable
                style={[styles.mascotaOpt, idMascota === null && styles.mascotaOptActivo]}
                onPress={() => setIdMascota(null)}
              >
                <Ionicons name="close-circle-outline" size={16} color={idMascota === null ? "#FF8C42" : "#9CA3AF"} />
                <Text style={[styles.mascotaOptText, idMascota === null && styles.mascotaOptTextActivo]}>Sin vincular</Text>
              </Pressable>
              {mascotas.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.mascotaOpt, idMascota === m.id && styles.mascotaOptActivo]}
                  onPress={() => setIdMascota(m.id)}
                >
                  <Ionicons name="paw" size={16} color={idMascota === m.id ? "#FF8C42" : "#9CA3AF"} />
                  <Text style={[styles.mascotaOptText, idMascota === m.id && styles.mascotaOptTextActivo]}>{m.nombre}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>

        {/* Ubicación */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicación</Text>
          <View style={styles.ubicacionBtns}>
            <Pressable style={styles.ubicacionBtn} onPress={usarUbicacionActual}>
              <Ionicons name="locate-outline" size={18} color="#FF8C42" />
              <Text style={styles.ubicacionBtnText}>Ubicación actual</Text>
            </Pressable>
            <Pressable style={styles.ubicacionBtn} onPress={abrirMapaPicker}>
              <Ionicons name="map-outline" size={18} color="#FF8C42" />
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
                <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.textoVacio, { marginTop: 8 }]}>Sin ubicación seleccionada.</Text>
          )}
        </View>

        <Pressable style={[styles.btnPublicar, isLoading && { opacity: 0.7 }]} onPress={publicar} disabled={isLoading}>
          {isLoading ? (
            <View style={{ alignItems: "center", gap: 6 }}>
              <ActivityIndicator color="#FFF" />
              {loadingStatus ? <Text style={styles.loadingStatusText}>{loadingStatus}</Text> : null}
            </View>
          ) : (
            <>
              <Ionicons name="megaphone-outline" size={20} color="#FFF" />
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
                pinColor="#FF8C42"
              />
            )}
          </MapView>
          <View style={styles.mapControls}>
            <Text style={styles.mapHint}>
              {tempMarker
                ? "Arrastra el marcador para ajustar"
                : "Toca el mapa para seleccionar una ubicación"}
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
                <Text style={styles.mapBtnConfirmarText}>Confirmar ubicación</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#FF8C42", marginBottom: 12 },
  tipoRow: { flexDirection: "row", gap: 8 },
  tipoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFF9F5",
  },
  tipoBtnText: { fontSize: 13, fontWeight: "600", color: "#4F6D7A" },
  textArea: {
    backgroundColor: "#FFF9F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 14,
    color: "#2B2D42",
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
    borderColor: "#FF8C42",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF9F5",
  },
  addFotoText: { fontSize: 11, color: "#FF8C42", marginTop: 2 },
  mascotaOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
    backgroundColor: "#FFF9F5",
  },
  mascotaOptActivo: { borderColor: "#FF8C42", backgroundColor: "#FFE8D6" },
  mascotaOptText: { fontSize: 14, color: "#4F6D7A" },
  mascotaOptTextActivo: { color: "#FF8C42", fontWeight: "bold" },
  textoVacio: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
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
    borderColor: "#FF8C42",
    backgroundColor: "#FFF9F5",
  },
  ubicacionBtnText: { fontSize: 13, fontWeight: "600", color: "#FF8C42" },
  ubicacionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 10,
  },
  ubicacionText: { flex: 1, fontSize: 13, color: "#4F6D7A" },
  btnPublicar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF8C42",
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  btnPublicarText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  loadingStatusText: { color: "#FFF", fontSize: 12, marginTop: 4 },
  mapControls: {
    backgroundColor: "#FFF",
    padding: 16,
    paddingBottom: 28,
    elevation: 8,
  },
  mapHint: { fontSize: 14, color: "#4F6D7A", textAlign: "center", marginBottom: 14 },
  mapBtns: { flexDirection: "row", gap: 12 },
  mapBtnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  mapBtnCancelarText: { color: "#4F6D7A", fontWeight: "bold" },
  mapBtnConfirmar: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FF8C42",
    alignItems: "center",
  },
  mapBtnConfirmarText: { color: "#FFF", fontWeight: "bold" },
});
