import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../config/firebase";
import { useShake } from "../hooks/useShake";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Comprueba si hay sesión guardada — solo redirige si el rol es válido
  // (no "guest" sin sesión activa, y no un string vacío por bug de escritura)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const role = await AsyncStorage.getItem("userRole");

        // ✅ Guard: solo redirige si existe un rol válido y no nulo.
        // Evita el loop cuando el logout limpia AsyncStorage pero el
        // componente todavía no se ha desmontado y el effect se re-ejecuta.
        if (role && role.trim() !== "") {
          router.replace("/(drawer)/(tabs)");
        }
      } catch (e) {
        console.error("Error comprobando sesión", e);
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, []);

  useShake(() => {
    setEmail("");
    setPassword("");
  });

  if (isChecking) return null;

  // ── Login Manual (Sin Firebase Auth) ──────────────────────────────────────
  const iniciarSesion = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Ingresa tu usuario/correo y contraseña.");
      return;
    }

    setIsLoading(true);
    try {
      const snapshot = await get(ref(db, "usuarios"));

      if (!snapshot.exists()) {
        Alert.alert("Error", "No hay usuarios registrados.");
        setIsLoading(false);
        return;
      }

      const usuarios = snapshot.val();
      let usuarioEncontrado: any = null;
      let uidEncontrado: string = "";

      Object.entries(usuarios).forEach(([key, user]: [string, any]) => {
        if (
          user.correo?.toLowerCase() === email.toLowerCase() ||
          user.nombreUsuario?.toLowerCase() === email.toLowerCase()
        ) {
          usuarioEncontrado = user;
          uidEncontrado = key;
        }
      });

      if (!usuarioEncontrado) {
        Alert.alert("Error", "Usuario o correo incorrecto.");
        setIsLoading(false);
        return;
      }

      if (usuarioEncontrado.contraseña !== password) {
        Alert.alert("Error", "Contraseña incorrecta.");
        setIsLoading(false);
        return;
      }

      // ✅ Persiste sesión — fotoPerfil se guarda como nombre de archivo,
      // que es exactamente la key que usa AVATARES en avatars.ts
      await AsyncStorage.multiSet([
        ["userRole", usuarioEncontrado.rol],
        ["userName", usuarioEncontrado.nombreCompleto],
        ["userAvatar", usuarioEncontrado.fotoPerfil],   // ej: "perro_perfil.jpg"
        ["userEmail", usuarioEncontrado.correo],
        ["userId", uidEncontrado],
      ]);

      router.replace("/(drawer)/(tabs)");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const irARegistro = () => {
    router.push("/registro");
  };

  const continuarInvitado = async () => {
    try {
      await AsyncStorage.setItem("userRole", "guest");
      router.replace("/(drawer)/(tabs)");
    } catch (e) {
      console.error("Error al guardar sesión de invitado", e);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/background_IndexPrincipal.jpg")}
      style={styles.background}
    >
      <View style={styles.card}>
        <Text style={styles.title}>RedPatitas</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#78716C" style={styles.icon} />
          <TextInput
            placeholder="Correo o Nombre de Usuario"
            style={styles.input}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#78716C" style={styles.icon} />
          <TextInput
            placeholder="Contraseña"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable
          style={[styles.btnEntrar, isLoading && { opacity: 0.7 }]}
          onPress={iniciarSesion}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>ENTRAR</Text>
          )}
        </Pressable>

        <View style={styles.opcionesExtras}>
          <Pressable onPress={irARegistro} style={styles.btnSecundario}>
            <Text style={styles.btnSecundarioText}>Crear cuenta nueva</Text>
          </Pressable>

          <View style={styles.divisor}>
            <View style={styles.linea} />
            <Text style={styles.textoDivisor}>o</Text>
            <View style={styles.linea} />
          </View>

          <Pressable onPress={continuarInvitado} style={styles.btnInvitado}>
            <Text style={styles.btnInvitadoText}>Continuar como invitado</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderRadius: 20,
    padding: 25,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#BF7C48",
    textAlign: "center",
    marginBottom: 20,
  },
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
  btnEntrar: {
    backgroundColor: "#F9B701",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
    elevation: 2,
  },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  opcionesExtras: { marginTop: 20 },
  btnSecundario: { alignItems: "center", paddingVertical: 10 },
  btnSecundarioText: { color: "#BF7C48", fontWeight: "bold", fontSize: 15 },
  divisor: { flexDirection: "row", alignItems: "center", marginVertical: 15 },
  linea: { flex: 1, height: 1, backgroundColor: "#D6D3D1" },
  textoDivisor: { width: 30, textAlign: "center", color: "#A8A29E" },
  btnInvitado: { alignItems: "center", paddingVertical: 10 },
  btnInvitadoText: {
    color: "#6D5540",
    textDecorationLine: "underline",
    fontSize: 15,
  },
});
