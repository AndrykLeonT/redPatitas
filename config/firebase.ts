import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // IMPORTANTE: Firebase Auth requiere el apiKey para el inicio de sesión
  apiKey: "INGRESA_TU_API_KEY_AQUI", // 🔴 DEBES REEMPLAZAR ESTO CON TU CÓDIGO REAL
  authDomain: "redpatitas-4f131.firebaseapp.com",
  projectId: "redpatitas-4f131",
  databaseURL: "https://redpatitas-4f131-default-rtdb.firebaseio.com/",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getDatabase(app);
