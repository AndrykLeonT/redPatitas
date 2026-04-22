import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { Mascota } from "../../models/firebaseModels";

function Fila({ label, valor }: { label: string; valor: string | number | boolean }) {
  const texto =
    typeof valor === "boolean" ? (valor ? "Sí" : "No") : String(valor ?? "-");
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      <Text style={styles.filaValor}>{texto || "-"}</Text>
    </View>
  );
}

export default function MascotaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await get(ref(db, `mascotas/${id}`));
        if (snap.exists()) {
          setMascota(snap.val() as Mascota);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Cargando…", headerShown: true, headerTintColor: "#FF8C42" }} />
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  if (error || !mascota) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Mascota", headerShown: true, headerTintColor: "#FF8C42" }} />
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={styles.errorText}>No se encontró la mascota.</Text>
      </View>
    );
  }

  const enfermedades = mascota.enfermedades ? Object.values(mascota.enfermedades) : [];
  const vacunas = mascota.vacunas ? Object.values(mascota.vacunas) : [];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: mascota.nombre,
          headerShown: true,
          headerTintColor: "#FF8C42",
          headerStyle: { backgroundColor: "#FFF" },
          headerTitleStyle: { color: "#2B2D42", fontWeight: "bold" },
        }}
      />

      {/* Ícono principal */}
      <View style={styles.iconBanner}>
        <Ionicons name="paw" size={64} color="#FF8C42" />
        <Text style={styles.nombreGrande}>{mascota.nombre}</Text>
        <Text style={styles.subtitulo}>{mascota.tipoAnimal} · {mascota.raza}</Text>
      </View>

      {/* Datos generales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información general</Text>
        <Fila label="Sexo" valor={mascota.sexo} />
        <Fila label="Edad" valor={`${mascota.edad} ${mascota.edad === 1 ? "año" : "años"}`} />
        <Fila label="Peso" valor={`${mascota.peso} kg`} />
        <Fila label="Esterilizado" valor={mascota.esterilizado} />
        {mascota.fechaNacimiento ? (
          <Fila label="Fecha de nacimiento" valor={mascota.fechaNacimiento} />
        ) : null}
      </View>

      {/* Comportamiento */}
      {mascota.comportamiento ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comportamiento</Text>
          <Text style={styles.texto}>{mascota.comportamiento}</Text>
        </View>
      ) : null}

      {/* Rasgos particulares */}
      {mascota.rasgosParticulares ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rasgos particulares</Text>
          <Text style={styles.texto}>{mascota.rasgosParticulares}</Text>
        </View>
      ) : null}

      {/* Vacunas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vacunas</Text>
        {vacunas.length > 0 ? (
          vacunas.map((v, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.chipText}>{v}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin vacunas registradas.</Text>
        )}
      </View>

      {/* Enfermedades */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enfermedades / Condiciones</Text>
        {enfermedades.length > 0 ? (
          enfermedades.map((e, i) => (
            <View key={i} style={styles.chipRow}>
              <Ionicons name="medkit-outline" size={16} color="#F59E0B" />
              <Text style={styles.chipText}>{e}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.textoVacio}>Sin condiciones registradas.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  content: { paddingBottom: 30 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9F5" },
  errorText: { color: "#EF4444", fontSize: 16, marginTop: 12 },
  iconBanner: {
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 28,
    marginBottom: 12,
    elevation: 2,
  },
  nombreGrande: { fontSize: 26, fontWeight: "bold", color: "#2B2D42", marginTop: 10 },
  subtitulo: { fontSize: 15, color: "#4F6D7A", marginTop: 4 },
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#FF8C42", marginBottom: 10 },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filaLabel: { fontSize: 14, color: "#4F6D7A" },
  filaValor: { fontSize: 14, fontWeight: "600", color: "#2B2D42" },
  texto: { fontSize: 14, color: "#4F6D7A", lineHeight: 22 },
  textoVacio: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  chipText: { fontSize: 14, color: "#4F6D7A" },
});
