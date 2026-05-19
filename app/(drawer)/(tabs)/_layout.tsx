import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Image } from "react-native";
import { useTheme } from "../../../context/ThemeContext";

// Tabs principales: feed global, mapa y estadisticas publicas.
export default function TabsLayout() {
  const { colors, isDarkMode } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: isDarkMode ? colors.surface : "#F6F6F6",
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/images/home_tab.png")}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("../../../assets/images/map_tab.png")}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
