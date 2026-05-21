import OriginalAsyncStorage from "@react-native-async-storage/async-storage";
import { auditoriaService } from "../services/auditoriaService";

const AsyncStorage = {
  getItem: async (key: string, ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "CONSULTA", `Clave: ${key}`);
    // @ts-ignore
    return OriginalAsyncStorage.getItem(key, ...args);
  },
  setItem: async (key: string, value: string, ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "MODIFICACION", `Clave: ${key}`);
    // @ts-ignore
    return OriginalAsyncStorage.setItem(key, value, ...args);
  },
  removeItem: async (key: string, ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "ELIMINACION", `Clave: ${key}`);
    // @ts-ignore
    return OriginalAsyncStorage.removeItem(key, ...args);
  },
  mergeItem: async (key: string, value: string, ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "MODIFICACION", `Clave: ${key}`);
    // @ts-ignore
    return OriginalAsyncStorage.mergeItem(key, value, ...args);
  },
  clear: async (...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "ELIMINACION", "Todo (clear)");
    // @ts-ignore
    return OriginalAsyncStorage.clear(...args);
  },
  getAllKeys: async (...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "CONSULTA", "Todas las claves");
    // @ts-ignore
    return OriginalAsyncStorage.getAllKeys(...args);
  },
  multiGet: async (keys: string[], ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "CONSULTA", `Claves: ${keys.join(", ")}`);
    // @ts-ignore
    return OriginalAsyncStorage.multiGet(keys, ...args);
  },
  multiSet: async (keyValuePairs: string[][], ...args: any[]) => {
    const keys = keyValuePairs.map(pair => pair[0]).join(", ");
    auditoriaService.registrarAcceso("AsyncStorage", "MODIFICACION", `Claves: ${keys}`);
    // @ts-ignore
    return OriginalAsyncStorage.multiSet(keyValuePairs, ...args);
  },
  multiRemove: async (keys: string[], ...args: any[]) => {
    auditoriaService.registrarAcceso("AsyncStorage", "ELIMINACION", `Claves: ${keys.join(", ")}`);
    // @ts-ignore
    return OriginalAsyncStorage.multiRemove(keys, ...args);
  },
  multiMerge: async (keyValuePairs: string[][], ...args: any[]) => {
    const keys = keyValuePairs.map(pair => pair[0]).join(", ");
    auditoriaService.registrarAcceso("AsyncStorage", "MODIFICACION", `Claves: ${keys}`);
    // @ts-ignore
    return OriginalAsyncStorage.multiMerge(keyValuePairs, ...args);
  }
};

export default AsyncStorage;
