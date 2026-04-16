import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useFocusEffect, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { AVATARES } from "../../utils/avatars";

// ─── Helper: resuelve el source de imagen de forma segura ─────────────────────
// fotoPerfil guarda el nombre exacto del asset, p.ej. "perro_perfil.jpg".
// AVATARES debe tener ese mismo string como key apuntando al require().
// Si no hay match, cae al "default" en lugar de fallar silenciosamente.
function resolverAvatar(fotoPerfil: string | null) {
  if (!fotoPerfil) return (AVATARES as any)["default"];
  const source = (AVATARES as any)[fotoPerfil];
  return source ?? (AVATARES as any)["default"];
}

// ─── Drawer content ────────────────────────────────────────────────────────────
function CustomDrawerContent(props: any) {
  const { role, userAvatar, userName, router, isDarkMode, toggleTheme } = props;

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      "userRole",
      "userName",
      "userAvatar",
      "userEmail",
      "userId",
    ]);
    router.replace("/");
  };

  const bgColor = isDarkMode ? "#374151" : "#E7E5E4";
  const textColor = isDarkMode ? "#F9FAFB" : "#1C1917";
  const avatarSource = resolverAvatar(userAvatar);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }}
    >
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        {role !== "guest" && role != null ? (
          <>
            <Image source={avatarSource} style={styles.profilePic} />
            <Text style={[styles.userName, { color: textColor }]}>
              {userName || "Usuario"}
            </Text>
          </>
        ) : (
          <>
            <View
              style={[
                styles.profilePic,
                styles.guestPic,
                isDarkMode && { backgroundColor: "#4B5563" },
              ]}
            >
              <Ionicons
                name="person"
                size={50}
                color={isDarkMode ? "#D1D5DB" : "#9CA3AF"}
              />
            </View>
            <Text style={[styles.userName, { color: textColor }]}>
              Invitado
            </Text>
          </>
        )}
      </View>

      <DrawerItemList {...props} />

      <DrawerItem
        label={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        labelStyle={{ color: isDarkMode ? "#F9FAFB" : "#1C1917" }}
        icon={({ color }) => (
          <Ionicons
            name={isDarkMode ? "sunny-outline" : "moon-outline"}
            size={24}
            color={isDarkMode ? "#F9FAFB" : color}
          />
        )}
        onPress={toggleTheme}
      />

      <DrawerItem
        label={role === "guest" || !role ? "Iniciar sesión" : "Cerrar sesión"}
        labelStyle={{ color: isDarkMode ? "#F9FAFB" : "#1C1917" }}
        icon={({ color }) => (
          <Ionicons
            name={
              role === "guest" || !role ? "log-in-outline" : "log-out-outline"
            }
            size={24}
            color={isDarkMode ? "#F9FAFB" : color}
          />
        )}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

// ─── Layout principal ──────────────────────────────────────────────────────────
export default function DrawerLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const appState = useRef(AppState.currentState);

  const fetchSession = useCallback(async () => {
    try {
      const [storedRole, storedName, storedAvatar] = await Promise.all([
        AsyncStorage.getItem("userRole"),
        AsyncStorage.getItem("userName"),
        AsyncStorage.getItem("userAvatar"),
      ]);
      setRole(storedRole);
      setUserName(storedName);
      setUserAvatar(storedAvatar);
    } catch (e) {
      console.error("Error al leer datos del Drawer", e);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Re-lee cuando la app vuelve de background (cubre login → drawer sin re-montar)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          fetchSession();
        }
        appState.current = nextState;
      }
    );
    return () => subscription.remove();
  }, [fetchSession]);

  // Re-lee cuando el drawer gana foco dentro del stack
  useFocusEffect(
    useCallback(() => {
      fetchSession();
    }, [fetchSession])
  );

  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          role={role}
          userName={userName}
          userAvatar={userAvatar}
          router={router}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: isDarkMode ? "#111827" : "#BF7C48" },
        headerTintColor: "#fff",
        drawerActiveTintColor: isDarkMode ? "#F9B701" : "#BF7C48",
        drawerInactiveTintColor: isDarkMode ? "#D1D5DB" : "#6D5540",
        drawerStyle: {
          backgroundColor: isDarkMode ? "#1F2937" : "#F6F6F6",
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "RedPatitas",
          drawerLabel: "Inicio",
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="misMascotas"
        options={{
          headerTitle: "Mis Mascotas",
          drawerLabel: "Mis Mascotas",
          drawerItemStyle: role === "guest" ? { display: "none" } : {},
          drawerIcon: ({ color }) => (
            <Ionicons name="paw-outline" size={24} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  guestPic: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
