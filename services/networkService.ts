import NetInfo from "@react-native-community/netinfo";

export async function estaConectado(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function suscribirseACambiosDeConexion(callback: (conectado: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
