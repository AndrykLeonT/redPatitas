import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { get, ref, set } from "firebase/database";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../config/firebase";
import { useShake } from "../hooks/useShake";
import { Usuario } from "../models/firebaseModels";
import { AVATARES } from "../utils/avatars";

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rol, setRol] = useState<"Dueño" | "Refugio">("Dueño");
  const [fotoPerfil, setFotoPerfil] = useState("perro_perfil.jpg");
  const [isLoading, setIsLoading] = useState(false);

  useShake(() => {
    setNombre("");
    setUsername("");
    setEmail("");
    setTelefono("");
    setFechaNacimiento("");
    setPassword("");
    setConfirmPassword("");
    setRol("Dueño");
    setFotoPerfil("perro_perfil.jpg");
  });

  const registrarUsuario = async () => {
    if (!nombre || !username || !email || !password || !telefono || !fechaNacimiento) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    // Validar formato de fecha AAAA-MM-DD
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaNacimiento.trim())) {
      Alert.alert("Error", "La fecha de nacimiento debe tener el formato AAAA-MM-DD.");
      return;
    }

    setIsLoading(true);
    try {
      const emailNormalizado = email.trim().toLowerCase();
      const usernameNormalizado = username.trim().toLowerCase();

      const snapshot = await get(ref(db, "usuarios"));
      if (snapshot.exists()) {
        const usuarios = snapshot.val();
        const existeDuplicado = Object.values(usuarios).some((user: any) => {
          return (
            user?.correo?.toLowerCase() === emailNormalizado ||
            user?.nombreUsuario?.toLowerCase() === usernameNormalizado
          );
        });

        if (existeDuplicado) {
          Alert.alert("Error", "El correo o nombre de usuario ya está registrado.");
          return;
        }
      }

      const uid =
        "USR-" + Date.now().toString() + Math.random().toString(36).substring(2, 9);

      const nuevoUsuario: Usuario = {
        idAuth: uid,
        nombreCompleto: nombre,
        nombreUsuario: username,
        celular: telefono,
        correo: emailNormalizado,
        contraseña: password,
        fotoPerfil,
        rol,
        fechaNacimiento: fechaNacimiento.trim(),
        fechaRegistro: new Date().toISOString(),
        metricas: {
          numMascotas: 0,
          numPublicaciones: 0,
        },
      };
      await set(ref(db, "usuarios/" + uid), nuevoUsuario);

      await AsyncStorage.multiSet([
        ["userRole", rol],
        ["userName", nombre],
        ["userAvatar", fotoPerfil],
        ["userEmail", emailNormalizado],
        ["userId", uid],
      ]);

      router.replace("/(drawer)/(tabs)");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error al registrar", e.message ?? "Ocurrió un problema, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/background_Registro.jpg")}
      style={styles.background}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Pressable onPress={() => router.back()} style={styles.btnAtras}>
            <Ionicons name="arrow-back" size={24} color="#FF8C42" />
          </Pressable>

          <Text style={styles.title}>Únete a la Manada</Text>
          <Text style={styles.subtitle}>Crea tu cuenta en RedPatitas</Text>

          <Text style={styles.labelRol}>Elige tu foto de perfil</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.avatarScroll}
          >
            {Object.keys(AVATARES)
              .filter((k) => k !== "default")
              .map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setFotoPerfil(key)}
                  style={[
                    styles.avatarContainer,
                    fotoPerfil === key && styles.avatarSelected,
                  ]}
                >
                  <Image
                    source={(AVATARES as any)[key]}
                    style={styles.avatarImg}
                  />
                </Pressable>
              ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Nombre completo"
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="at-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Nombre de usuario"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Correo electrónico"
              style={styles.input}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Número de celular"
              style={styles.input}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Fecha de nacimiento (AAAA-MM-DD)"
              style={styles.input}
              value={fechaNacimiento}
              onChangeText={setFechaNacimiento}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <Text style={styles.labelRol}>¿Cómo usarás la app?</Text>
          <View style={styles.rolContainer}>
            {["Dueño", "Refugio"].map((opcion) => (
              <Pressable
                key={opcion}
                style={[styles.btnRol, rol === opcion && styles.btnRolActivo]}
                onPress={() => setRol(opcion as any)}
              >
                <Text
                  style={[
                    styles.textoRol,
                    rol === opcion && styles.textoRolActivo,
                  ]}
                >
                  {opcion}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Contraseña (mínimo 6 caracteres)"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#78716C" style={styles.icon} />
            <TextInput
              placeholder="Confirmar Contraseña"
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <Pressable
            style={[styles.btnRegistrar, isLoading && { opacity: 0.7 }]}
            onPress={registrarUsuario}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={"#FFF"} />
            ) : (
              <Text style={styles.btnText}>CREAR CUENTA</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 25,
    elevation: 5,
  },
  btnAtras: { marginBottom: 10, alignSelf: "flex-start" },
  title: { fontSize: 26, fontWeight: "bold", color: "#FF8C42", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#4F6D7A", marginBottom: 10 },
  avatarScroll: { flexDirection: "row", marginBottom: 20 },
  avatarContainer: {
    marginRight: 10,
    borderWidth: 3,
    borderColor: "transparent",
    borderRadius: 35,
    overflow: "hidden",
  },
  avatarSelected: { borderColor: "#FF8C42" },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: "#444" },
  labelRol: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F6D7A",
    marginBottom: 10,
    marginTop: 5,
  },
  rolContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  btnRol: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 3,
    backgroundColor: "#F6F6F6",
  },
  btnRolActivo: { borderColor: "#FF8C42", backgroundColor: "#FFE8D6" },
  textoRol: { color: "#4F6D7A", fontSize: 13, fontWeight: "500" },
  textoRolActivo: { color: "#FF8C42", fontWeight: "bold" },
  btnRegistrar: {
    backgroundColor: "#FF8C42",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
