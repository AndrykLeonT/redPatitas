import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { Mascota, Publicacion } from "../../models/firebaseModels";

const { width } = Dimensions.get("window");

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreación",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

export default function PublicacionDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const pubSnap = await get(ref(db, `publicaciones/${id}`));
        if (!pubSnap.exists()) { setError(true); return; }

        const pub = pubSnap.val() as Publicacion;
        setPublicacion(pub);

        if (pub.idMascota) {
          const mascSnap = await get(ref(db, `mascotas/${pub.idMascota}`));
          if (mascSnap.exists()) setMascota(mascSnap.val() as Mascota);
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

  if (error || !publicacion) {
    return (
      <View style={styles.centrado}>
        <Stack.Screen options={{ title: "Publicación", headerShown: true, headerTintColor: "#FF8C42" }} />
        <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
        <Text style={styles.errorText}>No se encontró la publicación.</Text>
      </View>
    );
  }

  const fotos = publicacion.fotos ? Object.values(publicacion.fotos) : [];
  const tipo = publicacion.tipo ?? "perdido";
  const color = TIPO_COLOR[tipo] ?? "#6B7280";
  const label = TIPO_LABEL[tipo] ?? tipo;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: mascota?.nombre ?? "Publicación",
          headerShown: true,
          headerTintColor: "#FF8C42",
          headerStyle: { backgroundColor: "#FFF" },
          headerTitleStyle: { color: "#2B2D42", fontWeight: "bold" },
        }}
      />

      {/* Galería de fotos */}
      {fotos.length > 0 ? (
        <FlatList
          data={fotos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.foto} />
          )}
          scrollEnabled={fotos.length > 1}
        />
      ) : (
        <View style={styles.fotoPlaceholder}>
          <Ionicons name="image-outline" size={56} color="#D1D5DB" />
          <Text style={{ color: "#9CA3AF", marginTop: 8 }}>Sin fotos</Text>
        </View>
      )}

      {/* Tipo */}
      <View style={styles.headerInfo}>
        <View style={[styles.tag, { backgroundColor: color }]}>
          <Text style={styles.tagText}>{label}</Text>
        </View>
        {publicacion.estado ? (
          <Text style={styles.estado}>Estado: {publicacion.estado}</Text>
        ) : null}
        <Text style={styles.fecha}>
          {new Date(publicacion.fechaRegistro).toLocaleDateString("es-MX", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </Text>
      </View>

      {/* Mascota vinculada */}
      {mascota ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mascota</Text>
          <View style={styles.mascotaRow}>
            <Ionicons name="paw" size={28} color="#FF8C42" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.mascotaNombre}>{mascota.nombre}</Text>
              <Text style={styles.mascotaSub}>
                {mascota.tipoAnimal} · {mascota.raza} · {mascota.sexo}
              </Text>
              <Text style={styles.mascotaSub}>
                {mascota.edad} {mascota.edad === 1 ? "año" : "años"} · {mascota.peso} kg
              </Text>
            </View>
          </View>
          {mascota.rasgosParticulares ? (
            <Text style={styles.rasgos}>{mascota.rasgosParticulares}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Descripción */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descripción</Text>
        <Text style={styles.descripcion}>
          {publicacion.descripcion || "Sin descripción."}
        </Text>
      </View>

      {/* Ubicación */}
      {publicacion.ubicacion?.latitude && publicacion.ubicacion?.longitude ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicación aproximada</Text>
          <View style={styles.ubicacionRow}>
            <Ionicons name="location-outline" size={18} color="#4F6D7A" />
            <Text style={styles.ubicacionText}>
              {publicacion.ubicacion.latitude.toFixed(5)}, {publicacion.ubicacion.longitude.toFixed(5)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Likes */}
      <View style={styles.card}>
        <View style={styles.likesRow}>
          <Ionicons name="heart" size={20} color="#EF4444" />
          <Text style={styles.likesText}>{publicacion.likes ?? 0} personas están atentas</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  content: { paddingBottom: 30 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9F5" },
  errorText: { color: "#EF4444", fontSize: 16, marginTop: 12 },
  foto: { width, height: 280, resizeMode: "cover" },
  fotoPlaceholder: {
    width: "100%", height: 200,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },
  headerInfo: {
    backgroundColor: "#FFF",
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    gap: 6,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  tagText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  estado: { fontSize: 14, color: "#4F6D7A" },
  fecha: { fontSize: 13, color: "#9CA3AF" },
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#FF8C42", marginBottom: 10 },
  mascotaRow: { flexDirection: "row", alignItems: "flex-start" },
  mascotaNombre: { fontSize: 18, fontWeight: "bold", color: "#2B2D42" },
  mascotaSub: { fontSize: 13, color: "#4F6D7A", marginTop: 2 },
  rasgos: { fontSize: 13, color: "#4F6D7A", marginTop: 10, fontStyle: "italic" },
  descripcion: { fontSize: 14, color: "#4F6D7A", lineHeight: 22 },
  ubicacionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ubicacionText: { fontSize: 14, color: "#4F6D7A" },
  likesRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  likesText: { fontSize: 14, color: "#4F6D7A" },
});
