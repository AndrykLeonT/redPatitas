import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Paletas ───────────────────────────────────────────────────────────────────
export interface ThemeColors {
  background: string;        // fondo de pantalla
  surface: string;           // tarjetas, inputs, superficies elevadas
  surfaceAlt: string;        // superficie alterna (header drawer, chips)
  text: string;              // texto principal
  textSecondary: string;     // texto/iconos secundarios
  textInverse: string;       // texto sobre acento (#fff usualmente)
  border: string;            // bordes y separadores
  accent: string;            // marca / botón principal
  accentSoft: string;        // fondo suave del acento
  danger: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  background: "#FFF9F5",
  surface: "#FFFFFF",
  surfaceAlt: "#E7E5E4",
  text: "#2B2D42",
  textSecondary: "#4F6D7A",
  textInverse: "#FFFFFF",
  border: "#E5E7EB",
  accent: "#FF8C42",
  accentSoft: "#FFE8D6",
  danger: "#EF4444",
  shadow: "#000000",
};

const darkColors: ThemeColors = {
  background: "#1E1B18",
  surface: "#2A2621",
  surfaceAlt: "#2A2621",
  text: "#F4EFEA",
  textSecondary: "#A89F95",
  textInverse: "#FFFFFF",
  border: "#3A352F",
  accent: "#E67E22",
  accentSoft: "#3A2A1F",
  danger: "#F87171",
  shadow: "#000000",
};

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  colors: lightColors,
});

// ─── Provider ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "isDarkMode";

// Proveedor de tema: persiste modo oscuro y centraliza la paleta de la app.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Lee la preferencia guardada al iniciar la app
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setIsDarkMode(stored === "true");
        }
      } catch (e) {
        console.error("Error al leer tema", e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Alterna el tema y lo persiste inmediatamente
  const toggleTheme = useCallback(async () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      // Guarda en AsyncStorage sin bloquear el re-render
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch((e) =>
        console.error("Error al guardar tema", e)
      );
      return next;
    });
  }, []);

  // Evita un flash de tema incorrecto mientras se carga la preferencia
  if (!loaded) return null;

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
