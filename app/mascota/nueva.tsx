import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { push, ref } from "firebase/database";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [isLoading, setIsLoading] = useState(false);

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
      };
      await push(ref(db, "mascotas"), nueva);
      Alert.alert("¡Listo!", "Mascota registrada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar la mascota.");
    } finally {
      setIsLoading(false);
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

      <Pressable style={[styles.btnGuardar, isLoading && { opacity: 0.7 }]} onPress={guardar} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
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
});
