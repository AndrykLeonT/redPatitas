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
import { listarMascotasPorUsuario } from "../../database/mascotasLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Mascota } from "../../models/firebaseModels";
import { cacheMascotaDesdeFirebase } from "../../services/syncService";

type MascotaItem = {
  id: string;
  data: Mascota;
  pendienteSync?: boolean;
  creadoLocal?: boolean;
};

// Lista personal de mascotas con lectura Firebase/SQLite segun conectividad.
export default function MisMascotas() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [mascotas, setMascotas] = useState<MascotaItem[]>([]);
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
        // Fallback offline: solo muestra datos propios guardados en SQLite.
        const locales = listarMascotasPorUsuario(userId).map((m) => {
          const { id, pendienteSync, creadoLocal, eliminadoLocal, ...data } = m;
          return { id, data: data as Mascota, pendienteSync, creadoLocal };
        });
        setMascotas(locales);
      };

      // Sin conexión: solo SQLite
      if (isConnected === false) {
        cargarDesdeLocal();
        return;
      }

      // Con conexión: Firebase primero, fallback a SQLite si falla
      try {
        const snap = await get(ref(db, "mascotas"));
        const arr: MascotaItem[] = [];
        if (snap.exists()) {
          snap.forEach((child) => {
            const m = child.val() as Mascota;
            if (m.idUsuario === userId) {
              arr.push({ id: child.key!, data: m });
              cacheMascotaDesdeFirebase(child.key!, m);
            }
          });
        }
        setMascotas(arr);
      } catch (firebaseErr) {
        console.warn("Firebase falló al cargar mascotas, fallback a SQLite", firebaseErr);
        cargarDesdeLocal();
      }
    } catch (e) {
      console.error("Error cargando mascotas:", e);
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
      <Pressable style={styles.btnNueva} onPress={() => router.push("/mascota/nueva" as any)}>
        <Ionicons name="add-circle-outline" size={20} color={colors.textInverse} />
        <Text style={styles.btnNuevaText}>Nueva Mascota</Text>
      </Pressable>

      <FlatList
        data={mascotas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={mascotas.length === 0 ? styles.centradoFlex : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={56} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sin mascotas</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes mascotas registradas.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
          const showBadge = item.pendienteSync || item.creadoLocal;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/mascota/${item.id}` as any)}
            >
              {primeraFoto ? (
                <Image source={{ uri: primeraFoto }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.fotoPlaceholder]}>
                  <Ionicons name="paw" size={28} color={colors.accent} />
                </View>
              )}
              <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
                {showBadge && <PendingSyncBadge />}
                <Text style={styles.nombre}>{item.data.nombre}</Text>
                <Text style={styles.sub}>
                  {item.data.tipoAnimal} · {item.data.raza}
                </Text>
                <Text style={styles.sub}>
                  {item.data.edad} {item.data.edad === 1 ? "año" : "años"} · {item.data.peso} kg
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
    fotoPlaceholder: { backgroundColor: colors.accentSoft, justifyContent: "center", alignItems: "center" },
    nombre: { fontSize: 16, fontWeight: "bold", color: colors.text },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
