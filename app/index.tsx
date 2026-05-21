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
import { ThemeColors, useTheme } from "../context/ThemeContext";
import { useShake } from "../hooks/useShake";
import { prepararDatosOffline } from "../services/syncService";

// Pantalla de login: autentica manualmente y prepara la cache SQLite personal.
export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = makeStyles(colors, isDarkMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");

  // ✅ Comprueba si hay sesión guardada — solo redirige si el rol es válido
  // (no "guest" sin sesión activa, y no un string vacío por bug de escritura)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const role = await AsyncStorage.getItem("userRole");

        if (role && role.trim() !== "" && role !== "guest") {
          router.replace("/(drawer)/(tabs)");
        }
      } catch (e) {
        console.error("Error comprobando sesión", e);
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router]);

  useShake(() => {
    setEmail("");
    setPassword("");
  });

  if (isChecking) return null;

  // ── Login Manual (Sin Firebase Auth) ──────────────────────────────────────
  const iniciarSesion = async () => {
    // Busca por correo o nombreUsuario y compara la contrasena guardada en Firebase.
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

      // Descarga datos personales del usuario y los cachea en SQLite
      // para que la app funcione cuando se pierda la conexión.
      // Si falla, no bloquea el login: el usuario podrá entrar y se
      // intentará refrescar cuando vuelva la conexión.
      try {
        setLoadingStatus("Preparando datos locales...");
        await prepararDatosOffline(uidEncontrado);
      } catch (e) {
        console.warn("No se pudo preparar la cache local. Continuando…", e);
      }

      router.replace("/(drawer)/(tabs)");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  const irARegistro = () => {
    router.push("/registro");
  };

  const continuarInvitado = async () => {
    try {
      await AsyncStorage.multiRemove(["userName", "userAvatar", "userEmail", "userId"]);
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
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput
            placeholder="Correo o Nombre de Usuario"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
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
            <View style={{ alignItems: "center", gap: 4 }}>
              <ActivityIndicator color="#FFF" />
              {loadingStatus ? <Text style={styles.loadingStatusText}>{loadingStatus}</Text> : null}
            </View>
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

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    background: { flex: 1, justifyContent: "center", padding: 20 },
    card: {
      backgroundColor: isDarkMode ? "rgba(30, 27, 24, 0.92)" : "rgba(255, 255, 255, 0.90)",
      borderRadius: 20,
      padding: 25,
      elevation: 5,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.accent,
      textAlign: "center",
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? colors.surface : "#F6F6F6",
      borderRadius: 10,
      marginBottom: 15,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 50, color: colors.text },
    btnEntrar: {
      backgroundColor: colors.accent,
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 5,
      elevation: 2,
    },
    btnText: { color: colors.textInverse, fontWeight: "bold", fontSize: 16 },
    loadingStatusText: { color: colors.textInverse, fontSize: 11 },
    opcionesExtras: { marginTop: 20 },
    btnSecundario: { alignItems: "center", paddingVertical: 10 },
    btnSecundarioText: { color: colors.accent, fontWeight: "bold", fontSize: 15 },
    divisor: { flexDirection: "row", alignItems: "center", marginVertical: 15 },
    linea: { flex: 1, height: 1, backgroundColor: colors.border },
    textoDivisor: { width: 30, textAlign: "center", color: colors.textSecondary },
    btnInvitado: { alignItems: "center", paddingVertical: 10 },
    btnInvitadoText: {
      color: colors.textSecondary,
      textDecorationLine: "underline",
      fontSize: 15,
    },
  });
