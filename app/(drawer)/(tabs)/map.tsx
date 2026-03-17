import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MASCOTAS } from './index';

export default function Mapa() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Fallback a La Paz si deniega
          setLocation({
            coords: { latitude: 24.1426, longitude: -110.3128, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
            timestamp: Date.now()
          });
          return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
         // Fallback a La Paz en caso de error
         setLocation({
          coords: { latitude: 24.1426, longitude: -110.3128, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
          timestamp: Date.now()
        });
      }
    })();
  }, []);

  if (!location) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#B45309" />
        <Text style={styles.loaderText}>Obteniendo tu ubicación en el mapa...</Text>
      </View>
    );
  }

  const region = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true} 
      >
        <Marker
          coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
          title={"Tu ubicación en el dispositivo"}
          description={"Calculada u obtenida por defecto"}
          pinColor="blue"
        />

        {MASCOTAS.map(mascota => (
          <Marker
            key={mascota.id}
            coordinate={mascota.ubicacion}
            title={mascota.nombre}
            description={`${mascota.raza} - ${mascota.estado}`}
            pinColor="red"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F4'
  },
  loaderText: { marginTop: 10, color: '#78716C' },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
