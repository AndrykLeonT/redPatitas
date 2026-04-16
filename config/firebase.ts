import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAUfQ7rbzLkFO_SEtfaziBNCkj1swcqMv0",
  authDomain: "redpatitas-4f131.firebaseapp.com",
  databaseURL: "https://redpatitas-4f131-default-rtdb.firebaseio.com",
  projectId: "redpatitas-4f131",
  storageBucket: "redpatitas-4f131.firebasestorage.app",
  messagingSenderId: "364923743096",
  appId: "1:364923743096:web:a78a717a872ddd71ebf68d",
  measurementId: "G-285D9LY2MG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getDatabase(app);
