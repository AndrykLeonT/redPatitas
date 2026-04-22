import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { Publicacion } from "../../models/firebaseModels";

type PubItem = { id: string; data: Publicacion };

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreación",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

export default function MisPublicaciones() {
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<PubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const snap = await get(ref(db, "publicaciones"));
      const arr: PubItem[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const p = child.val() as Publicacion;
          if (p.idUsuario === userId) arr.push({ id: child.key!, data: p });
        });
      }
      arr.sort((a, b) =>
        new Date(b.data.fechaRegistro).getTime() - new Date(a.data.fechaRegistro).getTime()
      );
      setPublicaciones(arr);
    } catch (e) {
      console.error("Error cargando publicaciones:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <Pressable style={styles.btnNueva} onPress={() => router.push("/publicacion/nueva" as any)}>
        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
        <Text style={styles.btnNuevaText}>Nueva Publicación</Text>
      </Pressable>

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={publicaciones.length === 0 ? styles.centradoFlex : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin publicaciones</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes publicaciones.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/publicacion/${item.id}` as any)}
            >
              {primeraFoto ? (
                <Image source={{ uri: primeraFoto }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder]}>
                  <Ionicons name="image-outline" size={24} color="#D1D5DB" />
                </View>
              )}
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <View style={[styles.tag, { backgroundColor: TIPO_COLOR[item.data.tipo] ?? "#6B7280" }]}>
                  <Text style={styles.tagText}>{TIPO_LABEL[item.data.tipo] ?? item.data.tipo}</Text>
                </View>
                <Text style={styles.descripcion} numberOfLines={2}>
                  {item.data.descripcion || "Sin descripción"}
                </Text>
                <Text style={styles.fecha}>
                  {new Date(item.data.fechaRegistro).toLocaleDateString("es-MX")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9F5" },
  centradoFlex: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnNueva: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF8C42",
    margin: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  btnNuevaText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { alignItems: "center", paddingTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#4F6D7A", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    elevation: 2,
  },
  foto: { width: 80, height: 80 },
  fotoPlaceholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  tagText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  descripcion: { fontSize: 14, color: "#2B2D42", fontWeight: "500" },
  fecha: { fontSize: 12, color: "#4F6D7A", marginTop: 2 },
});
