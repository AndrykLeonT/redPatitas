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
import OfflineBanner from "../../components/OfflineBanner";
import PendingSyncBadge from "../../components/PendingSyncBadge";
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { listarPublicacionesPorUsuario } from "../../database/publicacionesLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Publicacion } from "../../models/firebaseModels";
import { cachePublicacionDesdeFirebase } from "../../services/syncService";
import { obtenerTituloPublicacion } from "../../utils/publicacionText";

type PubItem = {
  id: string;
  data: Publicacion;
  pendienteSync?: boolean;
  creadoLocal?: boolean;
};

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreación",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

// Lista personal de publicaciones; respeta pendientes locales y fallback offline.
export default function MisPublicaciones() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [publicaciones, setPublicaciones] = useState<PubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setIsLoading(false);
        return;
      }

      const cargarDesdeLocal = () => {
        // Fallback offline: mantiene visibles las publicaciones propias no eliminadas.
        // listarPublicacionesPorUsuario ya filtra eliminadoLocal=0 y ordena por fechaRegistro DESC
        const locales = listarPublicacionesPorUsuario(userId).map((p) => {
          const { id, pendienteSync, creadoLocal, eliminadoLocal, ...data } = p;
          return { id, data: data as Publicacion, pendienteSync, creadoLocal };
        });
        setPublicaciones(locales);
      };

      // Sin conexión: solo SQLite
      if (isConnected === false) {
        cargarDesdeLocal();
        return;
      }

      // Con conexión: Firebase primero, fallback a SQLite si falla
      try {
        const snap = await get(ref(db, "publicaciones"));
        const arr: PubItem[] = [];
        if (snap.exists()) {
          snap.forEach((child) => {
            const p = child.val() as Publicacion;
            if (p.idUsuario === userId) {
              arr.push({ id: child.key!, data: p });
              cachePublicacionDesdeFirebase(child.key!, p);
            }
          });
        }
        arr.sort((a, b) =>
          new Date(b.data.fechaRegistro).getTime() - new Date(a.data.fechaRegistro).getTime()
        );
        setPublicaciones(arr);
      } catch (firebaseErr) {
        console.warn("Firebase falló al cargar publicaciones, fallback a SQLite", firebaseErr);
        cargarDesdeLocal();
      }
    } catch (e) {
      console.error("Error cargando publicaciones:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      {isConnected === false && <OfflineBanner />}
      <Pressable style={styles.btnNueva} onPress={() => router.push("/publicacion/nueva" as any)}>
        <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
        <Text style={styles.btnNuevaText}>Nueva Publicación</Text>
      </Pressable>

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={publicaciones.length === 0 ? styles.centradoFlex : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={56} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sin publicaciones</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes publicaciones.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
          const showBadge = item.pendienteSync || item.creadoLocal;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/publicacion/${item.id}` as any)}
            >
              {primeraFoto ? (
                <Image source={{ uri: primeraFoto }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder]}>
                  <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: TIPO_COLOR[item.data.tipo] ?? "#6B7280" }]}>
                    <Text style={styles.tagText}>{TIPO_LABEL[item.data.tipo] ?? item.data.tipo}</Text>
                  </View>
                  {showBadge && <PendingSyncBadge />}
                </View>
                <Text style={styles.titulo} numberOfLines={2}>
                  {obtenerTituloPublicacion(item.data)}
                </Text>
                <Text style={styles.descripcion} numberOfLines={1}>
                  {item.data.descripcion || "Sin descripcion"}
                </Text>
                <Text style={styles.fecha}>
                  {new Date(item.data.fechaRegistro).toLocaleDateString("es-MX")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    centradoFlex: { flex: 1, justifyContent: "center", alignItems: "center" },
    btnNueva: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      margin: 16,
      paddingVertical: 12,
      borderRadius: 12,
      elevation: 2,
    },
    btnNuevaText: { color: colors.textInverse, fontWeight: "bold", fontSize: 15 },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    emptyContainer: { alignItems: "center", paddingTop: 20 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: colors.textSecondary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 10,
      elevation: 2,
    },
    foto: { width: 80, height: 80 },
    fotoPlaceholder: { backgroundColor: colors.surfaceAlt, justifyContent: "center", alignItems: "center" },
    tagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    tag: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: "flex-start",
    },
    tagText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
    titulo: { fontSize: 14, color: colors.text, fontWeight: "700" },
    descripcion: { fontSize: 12, color: colors.textSecondary },
    fecha: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  });
