import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, remove } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { Mascota } from "../../models/firebaseModels";

const { width, height } = Dimensions.get("window");

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
  const [userId, setUserId] = useState<string | null>(null);
  const [fotoViewer, setFotoViewer] = useState<{ fotos: string[]; index: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("userId").then(setUserId);
  }, []);

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

  const eliminar = () => {
    Alert.alert(
      "Eliminar mascota",
      `¿Seguro que deseas eliminar a ${mascota?.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await remove(ref(db, `mascotas/${id}`));
              router.back();
            } catch {
              Alert.alert("Error", "No se pudo eliminar la mascota.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

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

  const esOwner = userId === mascota.idUsuario;
  const enfermedades = mascota.enfermedades ? Object.values(mascota.enfermedades) : [];
  const vacunas = mascota.vacunas ? Object.values(mascota.vacunas) : [];
  const fotos = mascota.fotos ? Object.values(mascota.fotos) : [];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: mascota.nombre,
          headerShown: true,
          headerTintColor: "#FF8C42",
          headerStyle: { backgroundColor: "#FFF" },
          headerTitleStyle: { color: "#2B2D42", fontWeight: "bold" },
          ...(esOwner && {
            headerRight: () => (
              <Pressable onPress={eliminar} style={{ marginRight: 12 }} disabled={deleting}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </Pressable>
            ),
          }),
        }}
      />

      {/* Visor de foto en pantalla completa */}
      <Modal
        visible={!!fotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoViewer(null)}
      >
        <View style={styles.viewerBg}>
          <Pressable style={styles.viewerClose} onPress={() => setFotoViewer(null)}>
            <Ionicons name="close" size={30} color="#FFF" />
          </Pressable>
          {fotoViewer && (
            <>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.viewerContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: fotoViewer.fotos[fotoViewer.index] }}
                  style={styles.viewerImg}
                  resizeMode="contain"
                />
              </ScrollView>
              {fotoViewer.fotos.length > 1 && (
                <View style={styles.viewerNav}>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) => f && f.index > 0 ? { ...f, index: f.index - 1 } : f)
                    }
                  >
                    <Ionicons
                      name="chevron-back"
                      size={36}
                      color={fotoViewer.index > 0 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                  <Text style={styles.viewerCounter}>
                    {fotoViewer.index + 1} / {fotoViewer.fotos.length}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setFotoViewer((f) =>
                        f && f.index < f.fotos.length - 1 ? { ...f, index: f.index + 1 } : f
                      )
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={36}
                      color={fotoViewer.index < fotoViewer.fotos.length - 1 ? "#FFF" : "#444"}
                    />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Galería de fotos o banner con ícono */}
      {fotos.length > 0 ? (
        <FlatList
          data={fotos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setFotoViewer({ fotos, index })}>
              <Image source={{ uri: item }} style={styles.foto} />
            </Pressable>
          )}
          scrollEnabled={fotos.length > 1}
        />
      ) : (
        <View style={styles.iconBanner}>
          <Ionicons name="paw" size={64} color="#FF8C42" />
        </View>
      )}

      {/* Nombre y especie */}
      <View style={styles.nameBanner}>
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

      {/* Eliminar (solo dueño) */}
      {esOwner && (
        <Pressable
          style={[styles.btnEliminar, deleting && { opacity: 0.6 }]}
          onPress={eliminar}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.btnEliminarText}>Eliminar mascota</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  content: { paddingBottom: 30 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9F5" },
  errorText: { color: "#EF4444", fontSize: 16, marginTop: 12 },
  foto: { width, height: 260, resizeMode: "cover" },
  iconBanner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    height: 140,
    elevation: 2,
  },
  nameBanner: {
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    paddingBottom: 20,
    marginBottom: 12,
    elevation: 2,
  },
  nombreGrande: { fontSize: 26, fontWeight: "bold", color: "#2B2D42" },
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
  btnEliminar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "#FFF",
  },
  btnEliminarText: { color: "#EF4444", fontWeight: "bold", fontSize: 15 },
  viewerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  viewerClose: { position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 },
  viewerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerImg: { width, height: height * 0.75 },
  viewerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  viewerCounter: { color: "#FFF", fontSize: 16 },
});
