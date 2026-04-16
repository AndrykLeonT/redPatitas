import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "isDarkMode";

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

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
