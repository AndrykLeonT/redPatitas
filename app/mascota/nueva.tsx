import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { push, ref } from "firebase/database";
import { useState } from "react";
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
import { db } from "../../config/firebase";
import { Mascota } from "../../models/firebaseModels";

const CLOUD_NAME = "dwlbornu8";
const UPLOAD_PRESET = "uploadRedPatitas";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const MAX_FOTOS = 5;

export default function NuevaMascota() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipoAnimal, setTipoAnimal] = useState("");
  const [raza, setRaza] = useState("");
  const [sexo, setSexo] = useState<"macho" | "hembra">("macho");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [esterilizado, setEsterilizado] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [comportamiento, setComportamiento] = useState("");
  const [rasgosParticulares, setRasgosParticulares] = useState("");
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");

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

  const guardar = async () => {
    if (!nombre.trim() || !tipoAnimal.trim() || !raza.trim() || !edad || !peso) {
      Alert.alert("Error", "Nombre, tipo, raza, edad y peso son obligatorios.");
      return;
    }
    const edadNum = parseInt(edad);
    const pesoNum = parseFloat(peso);
    if (isNaN(edadNum) || edadNum < 0) {
      Alert.alert("Error", "La edad debe ser un número válido.");
      return;
    }
    if (isNaN(pesoNum) || pesoNum <= 0) {
      Alert.alert("Error", "El peso debe ser un número mayor a 0.");
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

      setLoadingStatus("Guardando mascota...");
      const nueva: Mascota = {
        idUsuario: userId,
        nombre: nombre.trim(),
        tipoAnimal: tipoAnimal.trim(),
        raza: raza.trim(),
        sexo,
        edad: edadNum,
        peso: pesoNum,
        esterilizado,
        fechaNacimiento: fechaNacimiento.trim(),
        fechaRegistro: new Date().toISOString(),
        comportamiento: comportamiento.trim(),
        rasgosParticulares: rasgosParticulares.trim(),
        enfermedades: {},
        vacunas: {},
        fotos: fotosRecord,
      };
      await push(ref(db, "mascotas"), nueva);
      Alert.alert("¡Listo!", "Mascota registrada correctamente.", [
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
          title: "Nueva Mascota",
          headerShown: true,
          headerTintColor: "#FF8C42",
          headerStyle: { backgroundColor: "#FFF" },
          headerTitleStyle: { color: "#2B2D42", fontWeight: "bold" },
        }}
      />

      {/* Información básica */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información básica</Text>

        <Text style={styles.label}>Nombre *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="paw-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. Firulais" value={nombre} onChangeText={setNombre} />
        </View>

        <Text style={styles.label}>Tipo de animal *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="help-circle-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Perro, Gato, Conejo..." value={tipoAnimal} onChangeText={setTipoAnimal} />
        </View>

        <Text style={styles.label}>Raza *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="bookmark-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. Labrador, Mestizo..." value={raza} onChangeText={setRaza} />
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

        <Text style={styles.label}>Edad (años) *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="time-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. 3" value={edad} onChangeText={setEdad} keyboardType="numeric" />
        </View>

        <Text style={styles.label}>Peso (kg) *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="barbell-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Ej. 12.5" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
        </View>

        <Text style={styles.label}>Fecha de nacimiento (AAAA-MM-DD)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color="#4F6D7A" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ej. 2020-05-15"
            value={fechaNacimiento}
            onChangeText={setFechaNacimiento}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Esterilizado</Text>
          <Switch
            value={esterilizado}
            onValueChange={setEsterilizado}
            trackColor={{ false: "#D1D5DB", true: "#FF8C42" }}
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

      <Pressable style={[styles.btnGuardar, isLoading && { opacity: 0.7 }]} onPress={guardar} disabled={isLoading}>
        {isLoading ? (
          <View style={{ alignItems: "center", gap: 6 }}>
            <ActivityIndicator color="#FFF" />
            {loadingStatus ? <Text style={styles.loadingStatusText}>{loadingStatus}</Text> : null}
          </View>
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
            <Text style={styles.btnGuardarText}>Registrar Mascota</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
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
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#FF8C42", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#4F6D7A", marginBottom: 6, marginTop: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 44, color: "#2B2D42", fontSize: 14 },
  selectorRow: { flexDirection: "row", gap: 10 },
  selectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFF9F5",
  },
  selectorBtnActivo: { borderColor: "#FF8C42", backgroundColor: "#FFE8D6" },
  selectorText: { color: "#4F6D7A", fontSize: 14, fontWeight: "500" },
  selectorTextActivo: { color: "#FF8C42", fontWeight: "bold" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  textArea: {
    backgroundColor: "#FFF9F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    fontSize: 14,
    color: "#2B2D42",
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
    borderColor: "#FF8C42",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF9F5",
  },
  addFotoText: { fontSize: 11, color: "#FF8C42", marginTop: 2 },
  btnGuardar: {
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
  btnGuardarText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  loadingStatusText: { color: "#FFF", fontSize: 12 },
});
