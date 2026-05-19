import NetInfo from "@react-native-community/netinfo";

// Consulta puntual de conectividad usada antes de decidir entre Firebase y SQLite.
export async function estaConectado(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

// Suscripcion centralizada a cambios de red para hooks y modal de sincronizacion.
export function suscribirseACambiosDeConexion(callback: (conectado: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
