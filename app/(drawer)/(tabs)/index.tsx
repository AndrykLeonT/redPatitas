import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator
} from "react-native";
import * as Location from 'expo-location';

export const MASCOTAS = [
  {
    id: "1",
    nombre: "Max",
    raza: "Golden Retriever",
    estado: "¡Perdido!",
    fecha: "Hace 2 horas",
    foto: "https://images.unsplash.com/photo-1552053831-71594a27632d",
    ubicacion: { latitude: 24.1486, longitude: -110.3200 } // La Paz
  },
  {
    id: "2",
    nombre: "Luna",
    raza: "Mestiza",
    estado: "En Adopción",
    fecha: "Ayer",
    foto: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b",
    ubicacion: { latitude: 24.1350, longitude: -110.3100 } // La Paz
  },
];

export const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Fallback a La Paz
          setLocation({
            coords: { latitude: 24.1426, longitude: -110.3128, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
            timestamp: Date.now()
          });
          return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
        // Fallback a La Paz
        setLocation({
          coords: { latitude: 24.1426, longitude: -110.3128, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
          timestamp: Date.now()
        });
      }
    })();
  }, []);

  const renderTarjeta = ({ item }: { item: typeof MASCOTAS[0] }) => {
    let distanciaStr = "Calculando...";
    if (location) {
      const dist = calcularDistancia(
        location.coords.latitude, 
        location.coords.longitude, 
        item.ubicacion.latitude, 
        item.ubicacion.longitude
      );
      distanciaStr = `${dist.toFixed(1)} km`;
    } else if (errorMsg) {
      distanciaStr = "Sin GPS";
    }

    return (
      <View style={styles.card}>
        <View
          style={[
            styles.tag,
            item.estado === "¡Perdido!" ? styles.tagPerdido : styles.tagAdopcion,
          ]}
        >
          <Text style={styles.tagText}>{item.estado}</Text>
        </View>

        <Image source={{ uri: item.foto }} style={styles.imagen} />

        <View style={styles.cardBody}>
          <View>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.detalles}>
              {item.raza} • {distanciaStr}
            </Text>
          </View>
          <Pressable style={styles.btnVerMas}>
            <Text style={styles.btnVerMasText}>Ver más</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.bg}>
      {!location && !errorMsg && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#B45309" />
          <Text style={styles.loaderText}>Obteniendo ubicación...</Text>
        </View>
      )}
      
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#EF4444" />
          <Text style={styles.errorText}>
            {errorMsg} - Activa el GPS para calcular distancias.
          </Text>
        </View>
      )}
      <FlatList
        data={MASCOTAS}
        keyExtractor={(item) => item.id}
        renderItem={renderTarjeta}
        contentContainerStyle={styles.container}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#F5F5F4" },
  loaderContainer: { padding: 20, alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#78716C' },
  errorContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FEE2E2', 
    padding: 10, 
    margin: 15, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  errorText: { color: '#B91C1C', marginLeft: 10, flex: 1, fontSize: 13 },
  container: { padding: 15, paddingTop: 0 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    overflow: "hidden",
  },
  imagen: { width: "100%", height: 200 },
  tag: {
    position: "absolute",
    top: 15,
    left: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 1,
  },
  tagPerdido: { backgroundColor: "#EF4444" },
  tagAdopcion: { backgroundColor: "#10B981" },
  tagText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  cardBody: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nombre: { fontSize: 20, fontWeight: "bold", color: "#1C1917" },
  detalles: { fontSize: 14, color: "#78716C", marginTop: 2 },
  btnVerMas: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  btnVerMasText: { color: "#D97706", fontWeight: "bold" },
});
