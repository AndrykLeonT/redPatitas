import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { contarCambiosPendientes } from "../database/cambiosPendientes";
import { sincronizarCambiosPendientes, ResultadoSync } from "../services/syncService";
import { useNetworkStatus } from "./useNetworkStatus";

/**
 * Detecta el regreso de la conexión y, si hay cambios pendientes, expone
 * una bandera `shouldPrompt` para abrir el modal de sincronización.
 *
 * El componente que lo monta debe llamar a `dismiss()` (botón "Ahora no")
 * o `runSync()` (botón "Subir cambios").
 */
export function usePendingSync() {
  const { isConnected } = useNetworkStatus();
  const prevConnected = useRef<boolean | null>(null);
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<ResultadoSync | null>(null);

  useEffect(() => {
    // Solo nos interesa la transición offline -> online
    const recoveredConnection =
      prevConnected.current === false && isConnected === true;
    prevConnected.current = isConnected;

    if (!recoveredConnection) return;

    (async () => {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;
      const total = contarCambiosPendientes(userId);
      if (total > 0) {
        setPendingCount(total);
        setShouldPrompt(true);
      }
    })();
  }, [isConnected]);

  const dismiss = () => setShouldPrompt(false);

  const runSync = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      setShouldPrompt(false);
      return;
    }
    setIsSyncing(true);
    try {
      const result = await sincronizarCambiosPendientes(userId);
      setLastResult(result);
      setPendingCount(contarCambiosPendientes(userId));
    } finally {
      setIsSyncing(false);
      setShouldPrompt(false);
    }
  };

  return { shouldPrompt, pendingCount, isSyncing, lastResult, dismiss, runSync };
}
