import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { equalTo, get, orderByChild, query, ref } from "firebase/database";
import { useEffect, useState } from "react";
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
import { db } from "../../config/firebase";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { obtenerUsuarioLocal } from "../../database/usuariosLocal";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Mascota, Publicacion, Usuario } from "../../models/firebaseModels";
import { AVATARES } from "../../utils/avatars";
import { formatearEdad } from "../../utils/dateUtils";

type TabType = "mascotas" | "publicaciones";

export default function UsuarioPerfilPublico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mascotas, setMascotas] = useState<{ id: string; data: Mascota }[]>([]);
  const [publicaciones, setPublicaciones] = useState<{ id: string; data: Publicacion }[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("mascotas");

  useEffect(() => {
    if (!id) return;

    const cargarPerfil = async () => {
      setIsLoadingUser(true);
      const local = obtenerUsuarioLocal(id);
      
      if (isConnected === false) {
        if (local) setUsuario(local);
        setIsLoadingUser(false);
        return;
      }

      try {
        const snap = await get(ref(db, `usuarios/${id}`));
        if (snap.exists()) {
          setUsuario(snap.val() as Usuario);
        } else if (local) {
          setUsuario(local);
        }
      } catch (e) {
        if (local) setUsuario(local);
      } finally {
        setIsLoadingUser(false);
      }
    };

    cargarPerfil();
  }, [id, isConnected]);

  useEffect(() => {
    if (!id || isConnected === false) {
      setIsLoadingData(false);
      return;
    }

    const cargarDatos = async () => {
      setIsLoadingData(true);
      try {
        const qMascotas = query(ref(db, "mascotas"), orderByChild("idUsuario"), equalTo(id));
        const qPublicaciones = query(ref(db, "publicaciones"), orderByChild("idUsuario"), equalTo(id));

        const [snapM, snapP] = await Promise.all([get(qMascotas), get(qPublicaciones)]);
        
        const arrM: { id: string; data: Mascota }[] = [];
        if (snapM.exists()) {
          snapM.forEach((child) => {
            arrM.push({ id: child.key!, data: child.val() as Mascota });
          });
        }
        setMascotas(arrM);

        const arrP: { id: string; data: Publicacion }[] = [];
        if (snapP.exists()) {
          snapP.forEach((child) => {
            arrP.push({ id: child.key!, data: child.val() as Publicacion });
          });
        }
        setPublicaciones(arrP);
      } catch (e) {
        console.warn("Error cargando mascotas/publicaciones del usuario", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    cargarDatos();
  }, [id, isConnected]);

  if (isLoadingUser) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.errorText}>No se pudo cargar el perfil del usuario.</Text>
      </View>
    );
  }

  const renderMascota = ({ item }: { item: { id: string; data: Mascota } }) => {
    const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/mascota/${item.id}` as any)}>
        {primeraFoto ? (
          <Image source={{ uri: primeraFoto }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoPlaceholder]}>
            <Ionicons name="paw" size={28} color={colors.accent} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.nombre}>{item.data.nombre}</Text>
          <Text style={styles.sub}>{item.data.tipoAnimal} · {item.data.raza}</Text>
          <Text style={styles.sub}>{formatearEdad(item.data.fechaNacimiento)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginRight: 15 }} />
      </Pressable>
    );
  };

  const renderPublicacion = ({ item }: { item: { id: string; data: Publicacion } }) => {
    const primeraFoto = item.data.fotos ? Object.values(item.data.fotos)[0] : null;
    const tipoLabel = { reporte: "Reporte", perdidos: "Perdidos", recreacion: "Recreacion" }[item.data.tipo ?? "reporte"] ?? "Publicacion";
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/publicacion/${item.id}` as any)}>
        {primeraFoto ? (
          <Image source={{ uri: primeraFoto }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.fotoPlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.accent} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.nombre} numberOfLines={2}>{item.data.descripcion}</Text>
          <Text style={styles.sub}>{tipoLabel}</Text>
          <Text style={styles.sub}>{new Date(item.data.fechaCreacion).toLocaleDateString()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginRight: 15 }} />
      </Pressable>
    );
  };

  return (
    <View style={styles.bg}>
      <Stack.Screen options={{ title: "Perfil del Autor" }} />
      {isConnected === false && <OfflineBanner />}

      <View style={styles.headerProfile}>
        <Image
          source={
            usuario.fotoPerfil && AVATARES[usuario.fotoPerfil]
              ? AVATARES[usuario.fotoPerfil]
              : AVATARES["default"]
          }
          style={styles.avatarProfile}
        />
        <Text style={styles.profileName}>{usuario.nombreCompleto || usuario.nombreUsuario}</Text>
        <Text style={styles.profileRole}>{usuario.rol}</Text>
        
        {usuario.celular ? (
          <View style={styles.contactContainer}>
            <Ionicons name="call" size={14} color={colors.accent} />
            <Text style={styles.contactText}>{usuario.celular}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "mascotas" && styles.tabActive]}
          onPress={() => setActiveTab("mascotas")}
        >
          <Text style={[styles.tabText, activeTab === "mascotas" && styles.tabTextActive]}>
            Mascotas ({mascotas.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "publicaciones" && styles.tabActive]}
          onPress={() => setActiveTab("publicaciones")}
        >
          <Text style={[styles.tabText, activeTab === "publicaciones" && styles.tabTextActive]}>
            Publicaciones ({publicaciones.length})
          </Text>
        </Pressable>
      </View>

      {isLoadingData ? (
        <View style={styles.centradoList}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === "mascotas" ? (
        <FlatList
          data={mascotas}
          keyExtractor={(item) => item.id}
          renderItem={renderMascota}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="paw-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay mascotas registradas.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => item.id}
          renderItem={renderPublicacion}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay publicaciones.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    centradoList: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 },
    errorText: { color: colors.danger, fontSize: 16 },
    headerProfile: {
      alignItems: "center",
      padding: 20,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarProfile: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      backgroundColor: colors.surfaceAlt,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    profileRole: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    contactContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      gap: 6,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    contactText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      elevation: 2,
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.accent,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.accent,
    },
    listContent: { padding: 15 },
    emptyContainer: { alignItems: "center", paddingTop: 40 },
    emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: 10 },
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
    cardBody: { flex: 1, paddingHorizontal: 12, gap: 2 },
    nombre: { fontSize: 16, fontWeight: "bold", color: colors.text },
    sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
