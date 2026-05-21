import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";
import { get, ref } from "../../../utils/firebaseWrapper";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import OfflineBanner from "../../../components/OfflineBanner";
import { db } from "../../../config/firebase";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { Publicacion } from "../../../models/firebaseModels";
import { obtenerTituloPublicacion } from "../../../utils/publicacionText";

// Calcula distancia Haversine entre dos coordenadas para ordenar publicaciones cercanas.
export const calcularDistancia = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const TIPO_LABEL: Record<string, string> = {
  reporte: "Reporte",
  perdidos: "Perdidos",
  recreacion: "Recreacion",
};

const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444",
  perdidos: "#F59E0B",
  recreacion: "#10B981",
};

type FeedItem = {
  id: string;
  pub: Publicacion;
};

type FiltroEstado = "todas" | "resueltas" | "sin_resolver";
type FiltroTipo = "todos" | Publicacion["tipo"];

const FILTROS_ESTADO: { key: FiltroEstado; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "sin_resolver", label: "Sin resolver" },
  { key: "resueltas", label: "Resueltas" },
];

const FILTROS_TIPO: { key: FiltroTipo; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "recreacion", label: "Recreacion" },
  { key: "perdidos", label: "Perdido" },
  { key: "reporte", label: "Reporte" },
];

const FALLBACK_LOCATION = {
  coords: {
    latitude: 24.1426, longitude: -110.3128,
    altitude: null, accuracy: null, altitudeAccuracy: null,
    heading: null, speed: null,
  },
  timestamp: Date.now(),
};

// Feed global: lee publicaciones desde Firebase y muestra una vista limitada sin internet.
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocation(FALLBACK_LOCATION as any); return; }
        setLocation(await Location.getCurrentPositionAsync({}));
      } catch {
        setLocation(FALLBACK_LOCATION as any);
      }
    })();
  }, []);

  const cargarFeed = useCallback(async () => {
    setIsLoading(true);
    if (isConnected === false) {
      setFeed([]);
      setIsLoading(false);
      return;
    }
    try {
      const pubSnap = await get(ref(db, "publicaciones"));
      const pubsRaw: Record<string, Publicacion> = pubSnap.exists() ? pubSnap.val() : {};

      const items: FeedItem[] = Object.entries(pubsRaw)
        .map(([id, pub]) => ({
          id,
          pub,
        }))
        .sort((a, b) =>
          new Date(b.pub.fechaRegistro).getTime() -
          new Date(a.pub.fechaRegistro).getTime()
        );

      setFeed(items);
    } catch (e) {
      console.error("Error cargando feed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useFocusEffect(useCallback(() => { cargarFeed(); }, [cargarFeed]));

  const feedFiltrado = feed.filter(({ pub }) => {
    const estaResuelta = pub.estado === "resuelto";
    const coincideEstado =
      filtroEstado === "todas" ||
      (filtroEstado === "resueltas" && estaResuelta) ||
      (filtroEstado === "sin_resolver" && !estaResuelta);
    const coincideTipo = filtroTipo === "todos" || pub.tipo === filtroTipo;

    return coincideEstado && coincideTipo;
  });

  const renderTarjeta = ({ item }: { item: FeedItem }) => {
    const { pub } = item;
    const tipo = pub.tipo ?? "reporte";
    const titulo = obtenerTituloPublicacion(pub);
    const primeraFoto = pub.fotos ? Object.values(pub.fotos)[0] : null;

    let distanciaStr = "Sin ubicacion";
    if (location && pub.ubicacion?.latitude && pub.ubicacion?.longitude) {
      const dist = calcularDistancia(
        location.coords.latitude, location.coords.longitude,
        pub.ubicacion.latitude, pub.ubicacion.longitude
      );
      distanciaStr = `${dist.toFixed(1)} km`;
    }

    return (
      <View style={styles.card}>
        <View style={[styles.tag, { backgroundColor: TIPO_COLOR[tipo] ?? "#6B7280" }]}>
          <Text style={styles.tagText}>{TIPO_LABEL[tipo] ?? tipo}</Text>
        </View>

        {primeraFoto ? (
          <Image source={{ uri: primeraFoto }} style={styles.imagen} />
        ) : (
          <View style={[styles.imagen, styles.imagenPlaceholder]}>
            <Ionicons name="paw-outline" size={48} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre} numberOfLines={2}>
              {titulo}
            </Text>
            <Text style={styles.detalles} numberOfLines={1}>
              {distanciaStr}
            </Text>
            <Pressable
              style={styles.btnPerfilLink}
              onPress={() => router.push(`/usuario/${pub.idUsuario}` as any)}
            >
              <Ionicons name="person-outline" size={12} color={colors.accent} />
              <Text style={styles.btnPerfilLinkText}>Ver perfil del autor</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.btnVerMas}
            onPress={() => router.push(`/publicacion/${item.id}` as any)}
          >
            <Text style={styles.btnVerMasText}>Ver mas</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loaderText}>Cargando publicaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      {isConnected === false && (
        <OfflineBanner texto="Las publicaciones globales no estan disponibles sin conexion. Puedes seguir consultando tus mascotas y publicaciones personales." />
      )}
      <FlatList
        data={feedFiltrado}
        keyExtractor={(item) => item.id}
        renderItem={renderTarjeta}
        contentContainerStyle={feed.length === 0 ? styles.centradoFlex : styles.container}
        ListHeaderComponent={
          feed.length > 0 ? (
            <View style={styles.filtrosContainer}>
              <Text style={styles.filtroTitulo}>Estado</Text>
              <View style={styles.filtroRow}>
                {FILTROS_ESTADO.map((filtro) => {
                  const activo = filtroEstado === filtro.key;
                  return (
                    <Pressable
                      key={filtro.key}
                      style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
                      onPress={() => setFiltroEstado(filtro.key)}
                    >
                      <Text style={[styles.filtroBtnText, activo && styles.filtroBtnTextActivo]}>
                        {filtro.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filtroTitulo}>Tipo de publicacion</Text>
              <View style={styles.filtroRow}>
                {FILTROS_TIPO.map((filtro) => {
                  const activo = filtroTipo === filtro.key;
                  return (
                    <Pressable
                      key={filtro.key}
                      style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
                      onPress={() => setFiltroTipo(filtro.key)}
                    >
                      <Text style={[styles.filtroBtnText, activo && styles.filtroBtnTextActivo]}>
                        {filtro.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={isConnected === false ? "cloud-offline-outline" : "paw-outline"}
              size={56}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              {isConnected === false ? "Sin conexion" : "No hay publicaciones"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isConnected === false
                ? "El feed global requiere internet."
                : feed.length > 0
                  ? "No hay publicaciones que coincidan con los filtros."
                  : "Aun no hay reportes ni mascotas en adopcion."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    centradoFlex: { flex: 1, justifyContent: "center", alignItems: "center" },
    loaderText: { marginTop: 10, color: colors.textSecondary },
    container: { padding: 15 },
    emptyContainer: { alignItems: "center", paddingTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", color: colors.textSecondary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
    filtrosContainer: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
      elevation: 2,
    },
    filtroTitulo: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    filtroRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    filtroBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surfaceAlt,
    },
    filtroBtnActivo: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    filtroBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    filtroBtnTextActivo: {
      color: colors.textInverse,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginBottom: 20,
      elevation: 4,
      overflow: "hidden",
    },
    imagen: { width: "100%", height: 200 },
    imagenPlaceholder: {
      backgroundColor: colors.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    tag: {
      position: "absolute",
      top: 15,
      left: 15,
      paddingVertical: 5,
      paddingHorizontal: 15,
      borderRadius: 20,
      zIndex: 1,
    },
    tagText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
    cardBody: {
      padding: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    nombre: { fontSize: 18, fontWeight: "bold", color: colors.text, lineHeight: 22 },
    detalles: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    btnVerMas: {
      backgroundColor: colors.accent,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 10,
      marginLeft: 10,
    },
    btnVerMasText: { color: colors.textInverse, fontWeight: "bold" },
    btnPerfilLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    btnPerfilLinkText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "bold",
    },
  });
