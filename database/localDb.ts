import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

export const localDb = SQLite.openDatabaseSync("redpatitas.db");

let initialized = false;

export function initLocalDb() {
  if (initialized) return;
  localDb.execSync("PRAGMA foreign_keys = ON;");
  localDb.execSync(CREATE_TABLES_SQL);
  initialized = true;
}

export function limpiarBaseLocal() {
  localDb.execSync(`
    DELETE FROM cambios_pendientes;
    DELETE FROM sync_estado;
    DELETE FROM estadisticas_local;
    DELETE FROM adopciones_local;
    DELETE FROM publicaciones_local;
    DELETE FROM mascotas_local;
    DELETE FROM usuarios_local;
  `);
}

export function nuevoIdLocal(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function esIdLocal(id: string): boolean {
  return id.startsWith("local_");
}
