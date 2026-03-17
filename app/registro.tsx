import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useShake } from "../hooks/useShake";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useShake(() => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setPassword("");
    setConfirmPassword("");
  });

  const registrarUsuario = async () => {
    try {
      await AsyncStorage.setItem("userRole", "user");
      router.replace("/(drawer)/(tabs)");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b",
      }}
      style={styles.background}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Pressable onPress={() => router.back()} style={styles.btnAtras}>
            <Ionicons name="arrow-back" size={24} color="#B45309" />
          </Pressable>

          <Text style={styles.title}>Únete a la Manada</Text>
          <Text style={styles.subtitle}>Crea tu cuenta en RedPatitas</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#78716C"
              style={styles.icon}
            />
            <TextInput 
              placeholder="Nombre completo" 
              style={styles.input} 
              value={nombre}
              onChangeText={setNombre}
            />
          </View>

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
              name="call-outline"
              size={20}
              color="#78716C"
              style={styles.icon}
            />
            <TextInput
              placeholder="Teléfono de contacto"
              style={styles.input}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
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

          <View style={styles.inputContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#78716C"
              style={styles.icon}
            />
            <TextInput
              placeholder="Confirmar Contraseña"
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <Pressable style={styles.btnRegistrar} onPress={registrarUsuario}>
            <Text style={styles.btnText}>CREAR CUENTA</Text>
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
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#B45309",
    marginBottom: 5,
  },
  subtitle: { fontSize: 14, color: "#78716C", marginBottom: 20 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F4",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E7E5E4",
  },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: "#444" },

  btnRegistrar: {
    backgroundColor: "#F59E0B",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
