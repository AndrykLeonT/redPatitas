import { useEffect, useState } from "react";
import { estaConectado, suscribirseACambiosDeConexion } from "../services/networkService";

// Hook de conectividad compartido por pantallas offline-first.
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    estaConectado().then((c) => {
      if (mounted) setIsConnected(c);
    });
    const unsub = suscribirseACambiosDeConexion((c) => {
      if (mounted) setIsConnected(c);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { isConnected };
}
