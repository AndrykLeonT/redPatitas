import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MisMascotas() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Mascotas</Text>
      <Text style={styles.subtitle}>Aquí aparecerán tus mascotas registradas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B45309',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#78716C',
  },
});
