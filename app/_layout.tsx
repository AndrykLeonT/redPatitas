import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { initLocalDb } from "../database/localDb";

// Inicializa SQLite una sola vez al cargar el modulo (antes del primer render).
initLocalDb();

// Stack raiz: aplica tema global, registra rutas principales y muestra el splash.
function RootNavigation() {
  const { isDarkMode } = useTheme();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../assets/images/splash_Screen.png")}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="registro" />
          <Stack.Screen name="(drawer)" />
          <Stack.Screen
            name="mascota/[id]"
            options={{ headerShown: true, headerBackTitle: "Atras", headerTintColor: "#FF8C42" }}
          />
          <Stack.Screen
            name="mascota/nueva"
            options={{ headerShown: true, headerBackTitle: "Atras", headerTintColor: "#FF8C42" }}
          />
          <Stack.Screen
            name="publicacion/[id]"
            options={{ headerShown: true, headerBackTitle: "Atras", headerTintColor: "#FF8C42" }}
          />
          <Stack.Screen
            name="publicacion/nueva"
            options={{ headerShown: true, headerBackTitle: "Atras", headerTintColor: "#FF8C42" }}
          />
          <Stack.Screen
            name="usuario/[id]"
            options={{ headerShown: true, headerBackTitle: "Atras", headerTintColor: "#FF8C42" }}
          />
        </Stack>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
      </NavThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigation />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
});
