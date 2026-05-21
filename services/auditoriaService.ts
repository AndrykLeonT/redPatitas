import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BITACORA_FILE = `${FileSystem.documentDirectory}bitacora_accesos.txt`;
const TX_COUNTER_KEY = 'auditoria_tx_counter';

export type TipoAlmacenamiento = 'Firebase' | 'SQLite' | 'AsyncStorage' | 'Archivos';
export type TipoOperacion = 'CONSULTA' | 'INSERCION' | 'MODIFICACION' | 'ELIMINACION';

class AuditoriaService {
  private currentTxId: number = 0;
  private initialized: boolean = false;

  private async init() {
    if (this.initialized) return;
    try {
      const savedCounter = await AsyncStorage.getItem(TX_COUNTER_KEY);
      if (savedCounter) {
        this.currentTxId = parseInt(savedCounter, 10);
      }
      
      const info = await FileSystem.getInfoAsync(BITACORA_FILE);
      if (!info.exists) {
        await FileSystem.writeAsStringAsync(BITACORA_FILE, '', { encoding: FileSystem.EncodingType.UTF8 });
      }
      this.initialized = true;
    } catch (error) {
      console.warn("AuditoriaService init error:", error);
    }
  }

  async registrarAcceso(
    almacenamiento: TipoAlmacenamiento,
    operacion: TipoOperacion,
    resumen: string
  ): Promise<void> {
    try {
      await this.init();
      
      this.currentTxId += 1;
      await AsyncStorage.setItem(TX_COUNTER_KEY, this.currentTxId.toString());

      // Try to get current user info safely
      let userInfo = '';
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const userRole = await AsyncStorage.getItem('userRole') || 'guest';
          userInfo = ` [User:${userId}|${userRole}]`;
        }
      } catch (e) {}

      const fecha = new Date().toISOString();
      const linea = `[${this.currentTxId}] | [${fecha}] | [${almacenamiento}] | [${operacion}] | [${resumen}]${userInfo}\n`;

      let content = '';
      const info = await FileSystem.getInfoAsync(BITACORA_FILE);
      if (info.exists) {
        content = await FileSystem.readAsStringAsync(BITACORA_FILE, { encoding: FileSystem.EncodingType.UTF8 });
      }
      content += linea;
      await FileSystem.writeAsStringAsync(BITACORA_FILE, content, { encoding: FileSystem.EncodingType.UTF8 });
    } catch (error) {
      // Ignorar de forma silenciosa para no romper la app principal (BDD requirement)
    }
  }

  async leerBitacora(): Promise<string> {
    try {
      await this.init();
      const info = await FileSystem.getInfoAsync(BITACORA_FILE);
      if (info.exists) {
        return await FileSystem.readAsStringAsync(BITACORA_FILE, { encoding: FileSystem.EncodingType.UTF8 });
      }
      return '';
    } catch (error) {
      console.warn("AuditoriaService read error:", error);
      return '';
    }
  }

  async reiniciarBitacora(): Promise<void> {
    try {
      await this.init();
      await FileSystem.writeAsStringAsync(BITACORA_FILE, '', { encoding: FileSystem.EncodingType.UTF8 });
      this.currentTxId = 0;
      await AsyncStorage.setItem(TX_COUNTER_KEY, '0');
    } catch (error) {
      console.warn("AuditoriaService reset error:", error);
    }
  }
}

export const auditoriaService = new AuditoriaService();
