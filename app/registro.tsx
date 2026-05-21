import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, set, update } from "firebase/database";
import { useEffect, useState } from "react";
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
import SimpleDatePicker from "../components/SimpleDatePicker";
import { db } from "../config/firebase";
import { ThemeColors, useTheme } from "../context/ThemeContext";
import { guardarUsuarioLocal, obtenerUsuarioLocal } from "../database/usuariosLocal";
import { useShake } from "../hooks/useShake";
import { Usuario } from "../models/firebaseModels";
import { prepararDatosOffline } from "../services/syncService";
import { AVATARES } from "../utils/avatars";

// Pantalla de registro: crea el usuario remoto y deja una copia local inicial.
export default function RegistroScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = makeStyles(colors, isDarkMode);
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
  const isEditing = edit === "1";

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const local = obtenerUsuarioLocal(userId);
      if (local) {
        setNombre(local.nombreCompleto);
        setUsername(local.nombreUsuario);
        setEmail(local.correo);
        setTelefono(local.celular);
        setFechaNacimiento(local.fechaNacimiento);
        setRol(local.rol);
        setFotoPerfil(local.fotoPerfil || "perro_perfil.jpg");
      }
      try {
        const snap = await get(ref(db, `usuarios/${userId}`));
        if (snap.exists()) {
          const usuario = snap.val() as Usuario;
          setNombre(usuario.nombreCompleto);
          setUsername(usuario.nombreUsuario);
          setEmail(usuario.correo);
          setTelefono(usuario.celular);
          setFechaNacimiento(usuario.fechaNacimiento);
          setRol(usuario.rol);
          setFotoPerfil(usuario.fotoPerfil || "perro_perfil.jpg");
        }
      } catch {
        // Se conserva el respaldo local.
      }
    })();
  }, [isEditing]);

  useShake(() => {
    setNombre("");
    setUsername("");
    setEmail("");
    setTelefono("");
    setFechaNacimiento("");
    setPassword("");
    setConfirmPassword("");
  });

  const registrarUsuario = async () => {
    // Valida el formulario antes de escribir en Firebase y SQLite.
    if (!nombre || !username || !email || (!isEditing && !password) || !telefono || !fechaNacimiento) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos.");
      return;
    }
    if (!isEditing && password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    if (!isEditing && password.length < 6) {
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

      if (isEditing) {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) { Alert.alert("Error", "No hay sesion activa."); return; }
        const actual = obtenerUsuarioLocal(userId);
        const cambios: Partial<Usuario> = {
          nombreCompleto: nombre.trim(),
          nombreUsuario: username.trim(),
          celular: telefono.trim(),
          correo: emailNormalizado,
          fotoPerfil,
          rol,
          fechaNacimiento: fechaNacimiento.trim(),
        };
        await update(ref(db, `usuarios/${userId}`), cambios);
        guardarUsuarioLocal(userId, {
          idAuth: actual?.idAuth ?? userId,
          contraseña: actual?.contraseña,
          fechaRegistro: actual?.fechaRegistro ?? new Date().toISOString(),
          metricas: actual?.metricas ?? { numMascotas: 0, numPublicaciones: 0 },
          ...cambios,
        } as Usuario);
        await AsyncStorage.multiSet([
          ["userRole", rol],
          ["userName", nombre.trim()],
          ["userAvatar", fotoPerfil],
          ["userEmail", emailNormalizado],
        ]);
        Alert.alert("Listo", "Tu perfil fue actualizado.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

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
          Alert.alert("Error", "El correo o nombre de usuario ya esta registrado.");
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

      // Cachea el perfil recien creado en SQLite para soporte offline
      try {
        await prepararDatosOffline(uid);
      } catch (e) {
        console.warn("No se pudo preparar la cache local tras registro. Continuando…", e);
      }

      router.replace("/(drawer)/(tabs)");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error al registrar", e.message ?? "Ocurrio un problema, intenta de nuevo.");
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
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </Pressable>

          <Text style={styles.title}>{isEditing ? "Editar perfil" : "Unete a la Manada"}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? "Actualiza tus datos de RedPatitas" : "Crea tu cuenta en RedPatitas"}
          </Text>

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

          {!isEditing && (
            <>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Nombre completo"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="at-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Nombre de usuario"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Correo electronico"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Numero de celular"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
          </View>

          <SimpleDatePicker
            label="Fecha de nacimiento"
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
          />

          <Text style={styles.labelRol}>¿Como usaras la app?</Text>
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
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Contraseña (minimo 6 caracteres)"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              placeholder="Confirmar Contraseña"
              placeholderTextColor={colors.textSecondary}
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
              <Text style={styles.btnText}>{isEditing ? "GUARDAR CAMBIOS" : "CREAR CUENTA"}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    background: { flex: 1 },
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
    card: {
      backgroundColor: isDarkMode ? "rgba(30, 27, 24, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderRadius: 20,
      padding: 25,
      elevation: 5,
    },
    btnAtras: { marginBottom: 10, alignSelf: "flex-start" },
    title: { fontSize: 26, fontWeight: "bold", color: colors.accent, marginBottom: 5 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 10 },
    avatarScroll: { flexDirection: "row", marginBottom: 20 },
    avatarContainer: {
      marginRight: 10,
      borderWidth: 3,
      borderColor: "transparent",
      borderRadius: 35,
      overflow: "hidden",
    },
    avatarSelected: { borderColor: colors.accent },
    avatarImg: { width: 60, height: 60, borderRadius: 30 },
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
    labelRol: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.textSecondary,
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
      borderColor: colors.border,
      borderRadius: 10,
      alignItems: "center",
      marginHorizontal: 3,
      backgroundColor: isDarkMode ? colors.surface : "#F6F6F6",
    },
    btnRolActivo: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    textoRol: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
    textoRolActivo: { color: colors.accent, fontWeight: "bold" },
    btnRegistrar: {
      backgroundColor: colors.accent,
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 10,
      elevation: 2,
    },
    btnText: { color: colors.textInverse, fontWeight: "bold", fontSize: 16 },
  });
