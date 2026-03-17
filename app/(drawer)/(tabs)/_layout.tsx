import { Tabs } from "expo-router";
import { Image } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // El drawer ya muestra el header
        tabBarActiveTintColor: "#B45309",
        tabBarInactiveTintColor: "#78716C",
        tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 5 }
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
    </Tabs>
  );
}
