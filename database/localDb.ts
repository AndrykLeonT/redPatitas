import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

import { auditoriaService, TipoOperacion } from "../services/auditoriaService";

const _localDb = SQLite.openDatabaseSync("redpatitas.db");

function parseSqlForAuditoria(sql: string): { operacion: TipoOperacion; tabla: string } {
  const query = sql.trim().toUpperCase();
  let operacion: TipoOperacion = 'CONSULTA';
  if (query.startsWith('INSERT')) operacion = 'INSERCION';
  else if (query.startsWith('UPDATE')) operacion = 'MODIFICACION';
  else if (query.startsWith('DELETE')) operacion = 'ELIMINACION';
  
  let tabla = 'desconocida';
  const match = query.match(/(?:FROM|INTO|UPDATE)\s+([a-zA-Z0-9_]+)/i);
  if (match && match[1]) {
    tabla = match[1];
  } else if (query.startsWith('PRAGMA') || query.startsWith('ALTER') || query.startsWith('CREATE')) {
    operacion = 'MODIFICACION';
    tabla = 'schema';
  }

  return { operacion, tabla };
}

function registrar(sql: string) {
  const { operacion, tabla } = parseSqlForAuditoria(sql);
  auditoriaService.registrarAcceso('SQLite', operacion, `Tabla: ${tabla}`);
}

export const localDb = {
  execSync: (source: string) => {
    registrar(source);
    return _localDb.execSync(source);
  },
  runSync: (source: string, ...args: any[]) => {
    registrar(source);
    // @ts-ignore
    return _localDb.runSync(source, ...args);
  },
  getAllSync: <T>(source: string, ...args: any[]): T[] => {
    registrar(source);
    // @ts-ignore
    return _localDb.getAllSync<T>(source, ...args);
  },
  getFirstSync: <T>(source: string, ...args: any[]): T | null => {
    registrar(source);
    // @ts-ignore
    return _localDb.getFirstSync<T>(source, ...args);
  }
};

let initialized = false;

// Abre la base local y crea tablas una sola vez durante el ciclo de vida de la app.
export function initLocalDb() {
  if (initialized) return;
  localDb.execSync("PRAGMA foreign_keys = ON;");
  localDb.execSync(CREATE_TABLES_SQL);
  migrarPublicacionesLocal();
  initialized = true;
}

function columnExists(table: string, column: string): boolean {
  const rows = localDb.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

function migrarPublicacionesLocal() {
  // Agrega campos nuevos en instalaciones que ya tenian la tabla creada.
  if (!columnExists("publicaciones_local", "titulo")) {
    localDb.execSync("ALTER TABLE publicaciones_local ADD COLUMN titulo TEXT NOT NULL DEFAULT '';");
  }
}

// Borra la cache personal local; se usa al preparar datos para una nueva sesion.
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

// Genera IDs temporales para entidades creadas sin conexion.
export function nuevoIdLocal(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function esIdLocal(id: string): boolean {
  return id.startsWith("local_");
}
