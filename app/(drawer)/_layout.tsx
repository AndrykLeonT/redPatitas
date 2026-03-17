import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { AVATARES } from "../../utils/avatars";

function CustomDrawerContent(props: any) {
  const { role, router, isDarkMode, toggleTheme } = props;
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem("userRole");
    await AsyncStorage.removeItem("userName");
    await AsyncStorage.removeItem("userAvatar");
    await AsyncStorage.removeItem("userEmail");
    router.replace("/");
  };

  const bgColor = isDarkMode ? "#374151" : "#E7E5E4";
  const textColor = isDarkMode ? "#F9FAFB" : "#1C1917";

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF" }}>
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        {role !== "guest" && role != null ? (
          <>
            <Image 
              source={(AVATARES as any)[props.userAvatar || 'default']} 
              style={styles.profilePic} 
            />
            <Text style={[styles.userName, { color: textColor }]}>{props.userName || 'Usuario'}</Text>
          </>
        ) : (
          <>
            <View style={[styles.profilePic, styles.guestPic, isDarkMode && { backgroundColor: "#4B5563" }]}>
              <Ionicons name="person" size={50} color={isDarkMode ? "#D1D5DB" : "#9CA3AF"} />
            </View>
            <Text style={[styles.userName, { color: textColor }]}>Invitado</Text>
          </>
        )}
      </View>
      <DrawerItemList {...props} />
      
      <DrawerItem
        label={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
        labelStyle={{ color: isDarkMode ? "#F9FAFB" : "#1C1917" }}
        icon={({ color }) => <Ionicons name={isDarkMode ? "sunny-outline" : "moon-outline"} size={24} color={isDarkMode ? "#F9FAFB" : color} />}
        onPress={toggleTheme}
      />

      <DrawerItem
        label={role === "guest" || !role ? "Iniciar sesión" : "Cerrar sesión"}
        labelStyle={{ color: isDarkMode ? "#F9FAFB" : "#1C1917" }}
        icon={({ color }) => <Ionicons name={role === "guest" || !role ? "log-in-outline" : "log-out-outline"} size={24} color={isDarkMode ? "#F9FAFB" : color} />}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function DrawerLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        try {
          const storedRole = await AsyncStorage.getItem("userRole");
          const storedName = await AsyncStorage.getItem("userName");
          const storedAvatar = await AsyncStorage.getItem("userAvatar");
          
          if (isActive) {
            setRole(storedRole);
            setUserName(storedName);
            setUserAvatar(storedAvatar);
          }
        } catch (e) {
          console.error("Error al leer datos del Drawer", e);
        }
      };

      fetchData();

      return () => {
        isActive = false;
      };
    }, [])
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
          backgroundColor: isDarkMode ? "#1F2937" : "#F6F6F6"
        }
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "RedPatitas",
          drawerLabel: "Inicio",
          drawerIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="misMascotas"
        options={{
          headerTitle: "Mis Mascotas",
          drawerLabel: "Mis Mascotas",
          drawerItemStyle: role === "guest" ? { display: "none" } : {},
          drawerIcon: ({ color }) => <Ionicons name="paw-outline" size={24} color={color} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: "#E7E5E4",
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
    color: "#1C1917",
  },
});
