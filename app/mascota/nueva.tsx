import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "../../utils/asyncStorageWrapper";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { get, ref } from "../../utils/firebaseWrapper";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import SimpleDatePicker from "../../components/SimpleDatePicker";
import OfflineBanner from "../../components/OfflineBanner";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { registrarCambioPendiente } from "../../database/cambiosPendientes";
import { recalcularYGuardarEstadisticas } from "../../database/estadisticasLocal";
import { nuevoIdLocal } from "../../database/localDb";
import { guardarMascotaLocal, obtenerMascotaLocal } from "../../database/mascotasLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useShake } from "../../hooks/useShake";
import { Mascota } from "../../models/firebaseModels";
import { subirImagen } from "../../services/cloudinaryService";
import { actualizarMascotaEnFirebase, crearMascotaEnFirebase } from "../../services/firebasePersonalService";

const MAX_FOTOS = 5;

const resolverFoto = async (uri: string) => (
  uri.startsWith("http://") || uri.startsWith("https://") ? uri : subirImagen(uri)
);

// Formulario para crear mascota; en offline guarda SQLite y encola sincronizacion.
export default function NuevaMascota() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();

  const [nombre, setNombre] = useState("");
  const [tipoAnimal, setTipoAnimal] = useState("");
  const [raza, setRaza] = useState("");
  const [sexo, setSexo] = useState<"macho" | "hembra">("macho");
  const [peso, setPeso] = useState("");
  const [esterilizado, setEsterilizado] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [comportamiento, setComportamiento] = useState("");
  const [rasgosParticulares, setRasgosParticulares] = useState("");
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  const [fechaRegistroOriginal, setFechaRegistroOriginal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const isEditing = Boolean(id);

  useShake(() => {
    setNombre("");
    setTipoAnimal("");
    setRaza("");
    setPeso("");
    setFechaNacimiento("");
    setComportamiento("");
    setRasgosParticulares("");
  });

  useEffect(() => {
    if (!id) return;
    const cargarDatos = (data: Mascota) => {
      setNombre(data.nombre ?? "");
      setTipoAnimal(data.tipoAnimal ?? "");
      setRaza(data.raza ?? "");
      setSexo(data.sexo ?? "macho");
      setPeso(data.peso ? String(data.peso) : "");
      setEsterilizado(Boolean(data.esterilizado));
      setFechaNacimiento(data.fechaNacimiento ?? "");
      setFechaRegistroOriginal(data.fechaRegistro ?? "");
      setComportamiento(data.comportamiento ?? "");
      setRasgosParticulares(data.rasgosParticulares ?? "");
      setFotosLocales(Object.values(data.fotos ?? {}));
    };

    const local = obtenerMascotaLocal(id);
    if (local) cargarDatos(local);
    if (isConnected === false) return;
    get(ref(db, `mascotas/${id}`))
      .then((snap) => { if (snap.exists()) cargarDatos(snap.val() as Mascota); })
      .catch(() => {});
  }, [id, isConnected]);

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

  const guardar = async () => {
    // Bifurca el guardado segun conectividad: Firebase+SQLite u operacion local pendiente.
    if (!nombre.trim() || !tipoAnimal.trim() || !raza.trim() || !peso) {
      Alert.alert("Error", "Nombre, tipo, raza, fecha de nacimiento y peso son obligatorios.");
      return;
    }
    const pesoNum = parseFloat(peso);
    if (isNaN(pesoNum) || pesoNum <= 0) {
      Alert.alert("Error", "El peso debe ser un numero mayor a 0.");
      return;
    }
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) { Alert.alert("Error", "No hay sesion activa."); return; }

      // â”€â”€ Offline: guardar en SQLite con URIs locales, registrar cambio pendiente â”€â”€
      if (isConnected === false) {
        // Las fotos quedan como URIs locales (file://...) â€” subirFotosLocales
        // las convertira a URLs de Cloudinary al sincronizar.
        const fotosLocalesRecord: Record<string, string> = {};
        for (let i = 0; i < fotosLocales.length; i++) {
          fotosLocalesRecord[`foto_${Date.now()}_${i}`] = fotosLocales[i];
        }

        const nueva: Mascota = {
          idUsuario: userId,
          nombre: nombre.trim(),
          tipoAnimal: tipoAnimal.trim(),
          raza: raza.trim(),
          sexo,
          peso: pesoNum,
          esterilizado,
          fechaNacimiento: fechaNacimiento.trim(),
          fechaRegistro: fechaRegistroOriginal || new Date().toISOString(),
          comportamiento: comportamiento.trim(),
          rasgosParticulares: rasgosParticulares.trim(),
          enfermedades: {},
          vacunas: {},
          fotos: fotosLocalesRecord,
        };
        const idLocal = id ?? nuevoIdLocal();
        guardarMascotaLocal(idLocal, nueva, {
          pendienteSync: true,
          creadoLocal: !isEditing || idLocal.startsWith("local_"),
        });
        registrarCambioPendiente(userId, "mascota", idLocal, isEditing ? "actualizar" : "crear", nueva);
        recalcularYGuardarEstadisticas(userId);
        Alert.alert(
          "Mascota guardada localmente",
          "Se sincronizara cuando vuelva la conexion.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }

      // â”€â”€ Online: subir fotos a Cloudinary, push a Firebase, cachear en SQLite â”€â”€
      const fotosRecord: Record<string, string> = {};
      for (let i = 0; i < fotosLocales.length; i++) {
        setLoadingStatus(`Subiendo foto ${i + 1} de ${fotosLocales.length}...`);
        const url = await resolverFoto(fotosLocales[i]);
        fotosRecord[`foto_${Date.now()}_${i}`] = url;
      }

      setLoadingStatus("Guardando mascota...");
      const nueva: Mascota = {
        idUsuario: userId,
        nombre: nombre.trim(),
        tipoAnimal: tipoAnimal.trim(),
        raza: raza.trim(),
        sexo,
        peso: pesoNum,
        esterilizado,
        fechaNacimiento: fechaNacimiento.trim(),
        fechaRegistro: fechaRegistroOriginal || new Date().toISOString(),
        comportamiento: comportamiento.trim(),
        rasgosParticulares: rasgosParticulares.trim(),
        enfermedades: {},
        vacunas: {},
        fotos: fotosRecord,
      };
      const idFirebase = isEditing && id ? id : await crearMascotaEnFirebase(nueva);
      if (isEditing && id) await actualizarMascotaEnFirebase(id, nueva);
      guardarMascotaLocal(idFirebase, nueva);
      recalcularYGuardarEstadisticas(userId);
      Alert.alert("¡Listo!", isEditing ? "Mascota actualizada correctamente." : "Mascota registrada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar la mascota.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: isEditing ? "Editar Mascota" : "Nueva Mascota",
          headerShown: true,
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: "bold" },
        }}
      />

      {isConnected === false && <OfflineBanner />}

      {/* Informacion basica */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informacion basica</Text>

        <Text style={styles.label}>Nombre *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="paw-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. Firulais" placeholderTextColor={colors.textSecondary} value={nombre} onChangeText={setNombre} />
        </View>

        <Text style={styles.label}>Tipo de animal *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Perro, Gato, Conejo..." placeholderTextColor={colors.textSecondary} value={tipoAnimal} onChangeText={setTipoAnimal} />
        </View>

        <Text style={styles.label}>Raza *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. Labrador, Mestizo..." placeholderTextColor={colors.textSecondary} value={raza} onChangeText={setRaza} />
        </View>

        <Text style={styles.label}>Sexo</Text>
        <View style={styles.selectorRow}>
          {(["macho", "hembra"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.selectorBtn, sexo === s && styles.selectorBtnActivo]}
              onPress={() => setSexo(s)}
            >
              <Text style={[styles.selectorText, sexo === s && styles.selectorTextActivo]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Peso (kg) *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="barbell-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. 12.5" placeholderTextColor={colors.textSecondary} value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
        </View>

        <SimpleDatePicker
          label="Fecha de nacimiento"
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Esterilizado</Text>
          <Switch
            value={esterilizado}
            onValueChange={setEsterilizado}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFF"
          />
        </View>
      </View>

      {/* Detalles adicionales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles adicionales</Text>

        <Text style={styles.label}>Comportamiento</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe el comportamiento de tu mascota..."
          placeholderTextColor={colors.textSecondary}
          value={comportamiento}
          onChangeText={setComportamiento}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Rasgos particulares</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Manchas, cicatrices, collar, microchip..."
          placeholderTextColor={colors.textSecondary}
          value={rasgosParticulares}
          onChangeText={setRasgosParticulares}
          multiline
          numberOfLines={3}
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

      <Pressable style={[styles.btnGuardar, isLoading && { opacity: 0.7 }]} onPress={guardar} disabled={isLoading}>
        {isLoading ? (
          <View style={{ alignItems: "center", gap: 6 }}>
            <ActivityIndicator color={colors.textInverse} />
            {loadingStatus ? <Text style={styles.loadingStatusText}>{loadingStatus}</Text> : null}
          </View>
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textInverse} />
            <Text style={styles.btnGuardarText}>Registrar Mascota</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
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
    cardTitle: { fontSize: 15, fontWeight: "bold", color: colors.accent, marginBottom: 8 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, height: 44, color: colors.text, fontSize: 14 },
    selectorRow: { flexDirection: "row", gap: 10 },
    selectorBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.background,
    },
    selectorBtnActivo: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    selectorText: { color: colors.textSecondary, fontSize: 14, fontWeight: "500" },
    selectorTextActivo: { color: colors.accent, fontWeight: "bold" },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    textArea: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      fontSize: 14,
      color: colors.text,
      minHeight: 80,
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
    btnGuardar: {
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
    btnGuardarText: { color: colors.textInverse, fontWeight: "bold", fontSize: 16 },
    loadingStatusText: { color: colors.textInverse, fontSize: 12 },
  });
