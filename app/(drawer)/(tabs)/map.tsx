import * as Location from "expo-location";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import OfflineBanner from "../../../components/OfflineBanner";
import { db } from "../../../config/firebase";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { Publicacion } from "../../../models/firebaseModels";
import { obtenerTituloPublicacion } from "../../../utils/publicacionText";

type PuntoMapa = {
  id: string;
  pub: Publicacion;
};

const TIPO_COLOR: Record<string, string> = {
  reporte: "#EF4444",
  perdidos: "#F59E0B",
  recreacion: "#10B981",
};

const FALLBACK = {
  coords: {
    latitude: 24.1426, longitude: -110.3128,
    altitude: null, accuracy: null, altitudeAccuracy: null,
    heading: null, speed: null,
  },
  timestamp: Date.now(),
};

// Mapa global: muestra publicaciones con ubicacion; sin conexion evita consultar Firebase.
export default function Mapa() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConnected } = useNetworkStatus();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);

  useEffect(() => {
    if (isConnected === false) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocation(FALLBACK as any); return; }
        setLocation(await Location.getCurrentPositionAsync({}));
      } catch {
        setLocation(FALLBACK as any);
      }
    })();
  }, [isConnected]);

  const cargarPuntos = useCallback(async () => {
    if (isConnected === false) {
      setPuntos([]);
      return;
    }
    try {
      const pubSnap = await get(ref(db, "publicaciones"));
      const pubsRaw: Record<string, Publicacion> = pubSnap.exists() ? pubSnap.val() : {};

      const items: PuntoMapa[] = Object.entries(pubsRaw)
        .filter(([, pub]) => pub.ubicacion?.latitude && pub.ubicacion?.longitude)
        .map(([id, pub]) => ({
          id,
          pub,
        }));

      setPuntos(items);
    } catch (e) {
      console.error("Error cargando puntos del mapa:", e);
    }
  }, [isConnected]);

  useEffect(() => { cargarPuntos(); }, [cargarPuntos]);

  if (isConnected === false) {
    return (
      <View style={styles.offlineContainer}>
        <OfflineBanner texto="El mapa global requiere conexion para consultar ubicaciones actualizadas." />
        <View style={styles.offlineContent}>
          <Text style={styles.offlineTitle}>Mapa no disponible sin conexion</Text>
          <Text style={styles.offlineText}>
            Puedes seguir revisando tus mascotas y publicaciones personales desde el menu.
          </Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loaderText}>Obteniendo tu ubicacion en el mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {puntos.map(({ id, pub }) => (
          <Marker
            key={id}
            coordinate={{ latitude: pub.ubicacion!.latitude, longitude: pub.ubicacion!.longitude }}
            title={obtenerTituloPublicacion(pub)}
            description={pub.tipo}
            pinColor={TIPO_COLOR[pub.tipo] ?? "red"}
          />
        ))}
      </MapView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    loaderText: { marginTop: 10, color: colors.textSecondary },
    container: { flex: 1 },
    map: { flex: 1 },
    offlineContainer: { flex: 1, backgroundColor: colors.background },
    offlineContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    offlineTitle: { fontSize: 18, fontWeight: "bold", color: colors.text, textAlign: "center" },
    offlineText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: "center", lineHeight: 20 },
  });
