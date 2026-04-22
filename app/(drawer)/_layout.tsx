import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useFocusEffect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { AVATARES } from "../../utils/avatars";

// ─── Helper: resuelve el source de imagen de forma segura ─────────────────────
function resolverAvatar(fotoPerfil: string | null) {
  if (!fotoPerfil) return (AVATARES as any)["default"];
  const source = (AVATARES as any)[fotoPerfil];
  return source ?? (AVATARES as any)["default"];
}

// ─── Drawer content ────────────────────────────────────────────────────────────
function CustomDrawerContent(props: any) {
  const { role, userAvatar, userName, isDarkMode, toggleTheme, onSessionChange, navigation } = props;

  const isGuest = role === "guest" || !role;

  // navigation.getParent() accede al Stack raíz que contiene este Drawer,
  // evitando conflictos con la animación de cierre del propio DrawerItem.
  const goToLogin = () => {
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "index" }] })
    );
  };

  const handleLoginRedirect = async () => {
    await AsyncStorage.removeItem("userRole");
    onSessionChange();
    goToLogin();
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      "userRole",
      "userName",
      "userAvatar",
      "userEmail",
      "userId",
    ]);
    onSessionChange();
    goToLogin();
  };

  const bgColor = isDarkMode ? "#2D2D2E" : "#E7E5E4";
  const textColor = isDarkMode ? "#EDF2F4" : "#2B2D42";
  const avatarSource = resolverAvatar(userAvatar);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: isDarkMode ? "#1A1A1B" : "#FFFFFF" }}
    >
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        {role !== "guest" && role != null ? (
          <>
            {/* ✅ Avatar cargado desde AVATARES usando el nombre guardado en AsyncStorage */}
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
                isDarkMode && { backgroundColor: "#2D2D2E" },
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
        label={isGuest ? "Iniciar sesión" : "Cerrar sesión"}
        labelStyle={{ color: isDarkMode ? "#F9FAFB" : "#1C1917" }}
        icon={({ color }) => (
          <Ionicons
            name={isGuest ? "log-in-outline" : "log-out-outline"}
            size={24}
            color={isDarkMode ? "#F9FAFB" : color}
          />
        )}
        onPress={isGuest ? handleLoginRedirect : handleLogout}
      />
    </DrawerContentScrollView>
  );
}

// ─── Layout principal ──────────────────────────────────────────────────────────
export default function DrawerLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
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

  const handleSessionChange = useCallback(() => {
    setRole(null);
    setUserName(null);
    setUserAvatar(null);
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Re-lee cuando la app vuelve de background
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

  // ✅ Re-lee cuando el drawer gana foco — cubre el caso de login → drawer
  // donde el componente ya estaba montado y no se re-monta
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
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onSessionChange={handleSessionChange}
        />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: isDarkMode ? "#1A1A1B" : "#FF8C42" },
        headerTintColor: "#fff",
        drawerActiveTintColor: isDarkMode ? "#FFA56D" : "#FF8C42",
        drawerInactiveTintColor: isDarkMode ? "#95AFBA" : "#4F6D7A",
        drawerStyle: {
          backgroundColor: isDarkMode ? "#1A1A1B" : "#FFF9F5",
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
          drawerItemStyle: (!role || role === "guest") ? { display: "none" } : {},
          drawerIcon: ({ color }) => (
            <Ionicons name="paw-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="perfil"
        options={{
          headerTitle: "Mi Perfil",
          drawerLabel: "Mi Perfil",
          drawerItemStyle: (!role || role === "guest") ? { display: "none" } : {},
          drawerIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="misPublicaciones"
        options={{
          headerTitle: "Mis Publicaciones",
          drawerLabel: "Mis Publicaciones",
          drawerItemStyle: { display: "none" },
          drawerIcon: ({ color }) => (
            <Ionicons name="newspaper-outline" size={24} color={color} />
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
