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
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { Mascota } from "../../models/firebaseModels";

type MascotaItem = { id: string; data: Mascota };

export default function MisMascotas() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [mascotas, setMascotas] = useState<MascotaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const snap = await get(ref(db, "mascotas"));
      const arr: MascotaItem[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const m = child.val() as Mascota;
          if (m.idUsuario === userId) arr.push({ id: child.key!, data: m });
        });
      }
      setMascotas(arr);
    } catch (e) {
      console.error("Error cargando mascotas:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
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
