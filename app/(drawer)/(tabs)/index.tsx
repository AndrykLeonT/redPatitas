import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";
import { get, ref } from "firebase/database";
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
import { db } from "../../../config/firebase";
import { Mascota, Publicacion } from "../../../models/firebaseModels";

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
  recreacion: "Recreación",
};

const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444",
  perdidos: "#F59E0B",
  recreacion: "#10B981",
};

type FeedItem = {
  id: string;
  pub: Publicacion;
  mascota: Mascota | null;
};

const FALLBACK_LOCATION = {
  coords: {
    latitude: 24.1426, longitude: -110.3128,
    altitude: null, accuracy: null, altitudeAccuracy: null,
    heading: null, speed: null,
  },
  timestamp: Date.now(),
};

export default function HomeScreen() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [las isLoading, setIsLoading] = useState(true);
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
    try {
      const [pubSnap, mascSnap] = await Promise.all([
        get(ref(db, "publicaciones")),
        get(ref(db, "mascotas")),
      ]);

      const mascotasMap: Record<string, Mascota> = mascSnap.exists() ? mascSnap.val() : {};
      const pubsRaw: Record<string, Publicacion> = pubSnap.exists() ? pubSnap.val() : {};

      const items: FeedItem[] = Object.entries(pubsRaw)
        .map(([id, pub]) => ({
          id,
          pub,
          mascota: pub.idMascota ? (mascotasMap[pub.idMascota] ?? null) : null,
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
  }, []);

  useFocusEffect(useCallback(() => { cargarFeed(); }, [cargarFeed]));

  const renderTarjeta = ({ item }: { item: FeedItem }) => {
    const { pub, mascota } = item;
    const tipo = pub.tipo ?? "perdido";
    const primeraFoto = pub.fotos ? Object.values(pub.fotos)[0] : null;

    let distanciaStr = "Sin ubicación";
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
            <Ionicons name="paw-outline" size={48} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre} numberOfLines={1}>
              {mascota?.nombre ?? "Mascota sin nombre"}
            </Text>
            <Text style={styles.detalles} numberOfLines={1}>
              {mascota ? `${mascota.tipoAnimal} · ${mascota.raza}` : "Sin información"} · {distanciaStr}
            </Text>
          </View>
          <Pressable
            style={styles.btnVerMas}
            onPress={() => router.push(`/publicacion/${item.id}` as any)}
          >
            <Text style={styles.btnVerMasText}>Ver más</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loaderText}>Cargando publicaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderTarjeta}
        contentContainerStyle={feed.length === 0 ? styles.centradoFlex : styles.container}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No hay publicaciones</Text>
            <Text style={styles.emptySubtitle}>Aún no hay reportes ni mascotas en adopción.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#FFF9F5" },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9F5" },
  centradoFlex: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 10, color: "#4F6D7A" },
  container: { padding: 15 },
  emptyContainer: { alignItems: "center", paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#4F6D7A", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#9CA3AF", marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    overflow: "hidden",
  },
  imagen: { width: "100%", height: 200 },
  imagenPlaceholder: {
    backgroundColor: "#F3F4F6",
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
  nombre: { fontSize: 20, fontWeight: "bold", color: "#2B2D42" },
  detalles: { fontSize: 13, color: "#4F6D7A", marginTop: 2 },
  btnVerMas: {
    backgroundColor: "#FF8C42",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  btnVerMasText: { color: "#FFF", fontWeight: "bold" },
});
