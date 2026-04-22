import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { Mascota, Publicacion, Usuario } from "../../models/firebaseModels";
import { AVATARES } from "../../utils/avatars";

type MascotaItem = { id: string; data: Mascota };
type PubItem = { id: string; data: Publicacion };

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreación",
};
const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444", perdidos: "#F59E0B", recreacion: "#10B981",
};

const PREVIEW = 3;

function resolverAvatar(fotoPerfil: string | null) {
  if (!fotoPerfil) return (AVATARES as any)["default"];
  return (AVATARES as any)[fotoPerfil] ?? (AVATARES as any)["default"];
}

export default function PerfilScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mascotas, setMascotas] = useState<MascotaItem[]>([]);
  const [publicaciones, setPublicaciones] = useState<PubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const [userSnap, mascSnap, pubSnap] = await Promise.all([
        get(ref(db, `usuarios/${userId}`)),
        get(ref(db, "mascotas")),
        get(ref(db, "publicaciones")),
      ]);

      if (userSnap.exists()) setUsuario(userSnap.val() as Usuario);

      const mascotasArr: MascotaItem[] = [];
      if (mascSnap.exists()) {
        mascSnap.forEach((child) => {
          const m = child.val() as Mascota;
          if (m.idUsuario === userId) mascotasArr.push({ id: child.key!, data: m });
        });
      }
      setMascotas(mascotasArr);

      const pubsArr: PubItem[] = [];
      if (pubSnap.exists()) {
        pubSnap.forEach((child) => {
          const p = child.val() as Publicacion;
          if (p.idUsuario === userId) pubsArr.push({ id: child.key!, data: p });
        });
      }
      pubsArr.sort((a, b) =>
        new Date(b.data.fechaRegistro).getTime() - new Date(a.data.fechaRegistro).getTime()
      );
      setPublicaciones(pubsArr);
    } catch (e) {
      console.error("Error cargando perfil:", e);
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

  const mascotasPreview = mascotas.slice(0, PREVIEW);
  const pubsPreview = publicaciones.slice(0, PREVIEW);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerCard}>
        <Image source={resolverAvatar(usuario?.fotoPerfil ?? null)} style={styles.avatar} />
        <Text style={styles.nombre}>{usuario?.nombreCompleto ?? "Usuario"}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{usuario?.rol ?? ""}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{mascotas.length}</Text>
            <Text style={styles.statLabel}>Mascotas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{publicaciones.length}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color="#4F6D7A" />
          <Text style={styles.infoText}>{usuario?.correo ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#4F6D7A" />
          <Text style={styles.infoText}>{usuario?.celular ?? "-"}</Text>
        </View>
        {usuario?.fechaRegistro ? (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#4F6D7A" />
            <Text style={styles.infoText}>
              Miembro desde{" "}
              {new Date(usuario.fechaRegistro).toLocaleDateString("es-MX", {
                year: "numeric", month: "long",
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Mis Mascotas */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Mascotas ({mascotas.length})</Text>
        <View style={styles.sectionActions}>
          {mascotas.length > 0 && (
            <Pressable style={styles.btnSmall} onPress={() => router.push("/(drawer)/misMascotas" as any)}>
              <Text style={styles.btnSmallText}>Ver todo</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btnSmall, styles.btnSmallPrimary]} onPress={() => router.push("/mascota/nueva" as any)}>
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={[styles.btnSmallText, { color: "#FFF" }]}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      {mascotas.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="paw-outline" size={36} color="#D1D5DB" />
          <Text style={styles.emptySectionText}>No tienes mascotas registradas.</Text>
        </View>
      ) : (
        <>
          {mascotasPreview.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemCard}
              onPress={() => router.push(`/mascota/${item.id}` as any)}
            >
              <View style={styles.itemIconBox}>
                <Ionicons name="paw" size={28} color="#FF8C42" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.data.nombre}</Text>
                <Text style={styles.itemSub}>
                  {item.data.tipoAnimal} · {item.data.raza} ·{" "}
                  {item.data.edad} {item.data.edad === 1 ? "año" : "años"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          ))}
          {mascotas.length > PREVIEW && (
            <Pressable style={styles.verMasBtn} onPress={() => router.push("/(drawer)/misMascotas" as any)}>
              <Text style={styles.verMasBtnText}>Ver {mascotas.length - PREVIEW} más →</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Mis Publicaciones */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Mis Publicaciones ({publicaciones.length})</Text>
        <View style={styles.sectionActions}>
          {publicaciones.length > 0 && (
            <Pressable style={styles.btnSmall} onPress={() => router.push("/(drawer)/misPublicaciones" as any)}>
              <Text style={styles.btnSmallText}>Ver todo</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btnSmall, styles.btnSmallPrimary]} onPress={() => router.push("/publicacion/nueva" as any)}>
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={[styles.btnSmallText, { color: "#FFF" }]}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      {publicaciones.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="newspaper-outline" size={36} color="#D1D5DB" />
          <Text style={styles.emptySectionText}>No tienes publicaciones.</Text>
        </View>
      ) : (
        <>
          {pubsPreview.map((item) => {
            const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
            return (
              <Pressable
                key={item.id}
                style={styles.pubCard}
                onPress={() => router.push(`/publicacion/${item.id}` as any)}
              >
                {primeraFoto ? (
                  <Image source={{ uri: primeraFoto }} style={styles.pubFoto} />
                ) : (
                  <View style={[styles.pubFoto, styles.pubFotoPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color="#D1D5DB" />
                  </View>
                )}
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <View style={[styles.tagSmall, { backgroundColor: TIPO_COLOR[item.data.tipo] ?? "#6B7280" }]}>
                    <Text style={styles.tagSmallText}>{TIPO_LABEL[item.data.tipo] ?? item.data.tipo}</Text>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.data.descripcion || "Sin descripción"}
                  </Text>
                  <Text style={styles.itemSub}>
                    {new Date(item.data.fechaRegistro).toLocaleDateString("es-MX")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            );
          })}
          {publicaciones.length > PREVIEW && (
            <Pressable style={styles.verMasBtn} onPress={() => router.push("/(drawer)/misPublicaciones" as any)}>
              <Text style={styles.verMasBtnText}>Ver {publicaciones.length - PREVIEW} más →</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  content: { paddingBottom: 30 },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: {
    backgroundColor: "#FFF",
    alignItems: "center",
    padding: 24,
    marginBottom: 8,
    elevation: 2,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  nombre: { fontSize: 22, fontWeight: "bold", color: "#2B2D42" },
  rolBadge: {
    backgroundColor: "#FFE8D6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 16,
  },
  rolText: { color: "#FF8C42", fontWeight: "bold", fontSize: 13 },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  stat: { alignItems: "center", paddingHorizontal: 24 },
  statNum: { fontSize: 24, fontWeight: "bold", color: "#FF8C42" },
  statLabel: { fontSize: 12, color: "#4F6D7A" },
  statDivider: { width: 1, height: 36, backgroundColor: "#E7E5E4" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  infoText: { fontSize: 14, color: "#4F6D7A" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF9F5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#2B2D42" },
  sectionActions: { flexDirection: "row", gap: 6 },
  btnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF8C42",
  },
  btnSmallPrimary: { backgroundColor: "#FF8C42", borderColor: "#FF8C42" },
  btnSmallText: { fontSize: 12, fontWeight: "bold", color: "#FF8C42" },
  verMasBtn: { marginHorizontal: 16, marginBottom: 10, alignItems: "center", paddingVertical: 10 },
  verMasBtnText: { color: "#FF8C42", fontWeight: "bold", fontSize: 14 },
  emptySection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  emptySectionText: { color: "#9CA3AF", marginTop: 8, fontSize: 14 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  itemIconBox: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: "#FFE8D6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: "#2B2D42" },
  itemSub: { fontSize: 13, color: "#4F6D7A", marginTop: 2 },
  pubCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
  },
  pubFoto: { width: 80, height: 80 },
  pubFotoPlaceholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  tagSmall: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  tagSmallText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
});
