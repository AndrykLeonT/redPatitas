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
import SyncChangesModal from "../../components/SyncChangesModal";
import { useTheme } from "../../context/ThemeContext";
import { usePendingSync } from "../../hooks/usePendingSync";
import { AVATARES } from "../../utils/avatars";

// ─── Helper: resuelve el source de imagen de forma segura ─────────────────────
// Resuelve el avatar guardado en AsyncStorage y usa "default" si la clave no existe.
function resolverAvatar(fotoPerfil: string | null) {
  if (!fotoPerfil) return (AVATARES as any)["default"];
  const source = (AVATARES as any)[fotoPerfil];
  return source ?? (AVATARES as any)["default"];
}

// ─── Drawer content ────────────────────────────────────────────────────────────
// Contenido personalizado del Drawer: encabezado de usuario, tema y cierre de sesion.
function CustomDrawerContent(props: any) {
  const { role, userAvatar, userName, isDarkMode, toggleTheme, colors, onSessionChange, navigation } = props;

  const isGuest = role === "guest" || !role;

  // navigation.getParent() accede al Stack raiz que contiene este Drawer,
  // evitando conflictos con la animacion de cierre del propio DrawerItem.
  const goToLogin = () => {
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "index" }] })
    );
  };

  const handleLoginRedirect = async () => {
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

  const bgColor = colors.surfaceAlt;
  const textColor = colors.text;
  const avatarSource = resolverAvatar(userAvatar);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.background }}
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
                isDarkMode && { backgroundColor: colors.surface },
              ]}
            >
              <Ionicons
                name="person"
                size={50}
                color={colors.textSecondary}
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
        labelStyle={{ color: colors.text }}
        icon={({ color }) => (
          <Ionicons
            name={isDarkMode ? "sunny-outline" : "moon-outline"}
            size={24}
            color={isDarkMode ? colors.text : color}
          />
        )}
        onPress={toggleTheme}
      />

      <DrawerItem
        label={isGuest ? "Iniciar sesion" : "Cerrar sesion"}
        labelStyle={{ color: colors.text }}
        icon={({ color }) => (
          <Ionicons
            name={isGuest ? "log-in-outline" : "log-out-outline"}
            size={24}
            color={isDarkMode ? colors.text : color}
          />
        )}
        onPress={isGuest ? handleLoginRedirect : handleLogout}
      />
    </DrawerContentScrollView>
  );
}

// ─── Layout principal ──────────────────────────────────────────────────────────
// Layout principal del Drawer: registra rutas y monta el modal de sincronizacion offline.
export default function DrawerLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { shouldPrompt, pendingCount, isSyncing, dismiss, runSync } = usePendingSync();
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
    <>
      <Drawer
        drawerContent={(props) => (
          <CustomDrawerContent
            {...props}
            role={role}
            userName={userName}
            userAvatar={userAvatar}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            colors={colors}
            onSessionChange={handleSessionChange}
          />
        )}
        screenOptions={{
          headerStyle: { backgroundColor: isDarkMode ? colors.background : colors.accent },
          headerTintColor: "#fff",
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textSecondary,
          drawerStyle: {
            backgroundColor: colors.background,
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
        <Drawer.Screen
          name="reportesGenerados"
          options={{
            headerTitle: "Reportes generados",
            drawerLabel: "Reportes generados",
            drawerIcon: ({ color }) => (
              <Ionicons name="document-text-outline" size={24} color={color} />
            ),
          }}
        />
      </Drawer>
      <SyncChangesModal
        visible={shouldPrompt}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onDismiss={dismiss}
        onConfirm={runSync}
      />
    </>
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
