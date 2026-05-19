import * as Location from "expo-location";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { db } from "../../../config/firebase";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";
import { Mascota, Publicacion } from "../../../models/firebaseModels";
import { calcularDistancia } from "./index";

type PuntoMapa = {
  id: string;
  pub: Publicacion;
  mascota: Mascota | null;
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

export default function Mapa() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocation(FALLBACK as any); return; }
        setLocation(await Location.getCurrentPositionAsync({}));
      } catch {
        setLocation(FALLBACK as any);
      }
    })();
  }, []);

  const cargarPuntos = useCallback(async () => {
    try {
      const [pubSnap, mascSnap] = await Promise.all([
        get(ref(db, "publicaciones")),
        get(ref(db, "mascotas")),
      ]);
      const mascotasMap: Record<string, Mascota> = mascSnap.exists() ? mascSnap.val() : {};
      const pubsRaw: Record<string, Publicacion> = pubSnap.exists() ? pubSnap.val() : {};

      const items: PuntoMapa[] = Object.entries(pubsRaw)
        .filter(([, pub]) => pub.ubicacion?.latitude && pub.ubicacion?.longitude)
        .map(([id, pub]) => ({
          id,
          pub,
          mascota: pub.idMascota ? (mascotasMap[pub.idMascota] ?? null) : null,
        }));

      setPuntos(items);
    } catch (e) {
      console.error("Error cargando puntos del mapa:", e);
    }
  }, []);

  useEffect(() => { cargarPuntos(); }, [cargarPuntos]);

  if (!location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loaderText}>Obteniendo tu ubicación en el mapa...</Text>
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
        {puntos.map(({ id, pub, mascota }) => (
          <Marker
            key={id}
            coordinate={{ latitude: pub.ubicacion!.latitude, longitude: pub.ubicacion!.longitude }}
            title={mascota?.nombre ?? "Mascota"}
            description={`${mascota?.raza ?? ""} · ${pub.tipo}`}
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
  });
