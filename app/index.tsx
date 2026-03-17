import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useShake } from "../hooks/useShake";


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const role = await AsyncStorage.getItem("userRole");
        if (role) {
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

  if (isChecking) {
    return null; // O un ActivityIndicator si lo prefieres, pero null evita flasheos
  }

  const iniciarSesion = async () => {
    try {
      await AsyncStorage.setItem("userRole", "user");
      router.replace("/(drawer)/(tabs)");
    } catch (e) {
      console.error("Error al guardar sesión", e);
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
      console.error("Error al guardar sesión", e);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1543466835-00a7907e9de1",
      }}
      style={styles.background}
    >
      <View style={styles.card}>
        <Text style={styles.title}>RedPatitas</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#78716C"
            style={styles.icon}
          />
          <TextInput
            placeholder="Correo electrónico"
            style={styles.input}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#78716C"
            style={styles.icon}
          />
          <TextInput
            placeholder="Contraseña"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable style={styles.btnEntrar} onPress={iniciarSesion}>
          <Text style={styles.btnText}>ENTRAR</Text>
        </Pressable>

        {/* NUEVAS OPCIONES */}
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
