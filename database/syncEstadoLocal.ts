import { localDb } from "./localDb";

export type SyncEstado = {
  idUsuario: string;
  ultimaCargaFirebase: string | null;
  ultimaSincronizacion: string | null;
  hayCambiosPendientes: boolean;
  ultimaConexionDetectada: string | null;
};

type SyncEstadoRow = {
  idUsuario: string;
  ultimaCargaFirebase: string | null;
  ultimaSincronizacion: string | null;
  hayCambiosPendientes: number;
  ultimaConexionDetectada: string | null;
};

function rowToEstado(row: SyncEstadoRow): SyncEstado {
  return {
    idUsuario: row.idUsuario,
    ultimaCargaFirebase: row.ultimaCargaFirebase,
    ultimaSincronizacion: row.ultimaSincronizacion,
    hayCambiosPendientes: row.hayCambiosPendientes === 1,
    ultimaConexionDetectada: row.ultimaConexionDetectada,
  };
}

export function obtenerSyncEstado(idUsuario: string): SyncEstado | null {
  const row = localDb.getFirstSync<SyncEstadoRow>(
    `SELECT * FROM sync_estado WHERE idUsuario = ?`,
    [idUsuario],
  );
  return row ? rowToEstado(row) : null;
}

export function actualizarSyncEstado(
  idUsuario: string,
  cambios: Partial<Omit<SyncEstado, "idUsuario">>,
) {
  const actual = obtenerSyncEstado(idUsuario) ?? {
    idUsuario,
    ultimaCargaFirebase: null,
    ultimaSincronizacion: null,
    hayCambiosPendientes: false,
    ultimaConexionDetectada: null,
  };
  const next = { ...actual, ...cambios };
  localDb.runSync(
    `INSERT OR REPLACE INTO sync_estado (
      idUsuario, ultimaCargaFirebase, ultimaSincronizacion, hayCambiosPendientes, ultimaConexionDetectada
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      idUsuario,
      next.ultimaCargaFirebase,
      next.ultimaSincronizacion,
      next.hayCambiosPendientes ? 1 : 0,
      next.ultimaConexionDetectada,
    ],
  );
}

export function marcarCargaFirebase(idUsuario: string) {
  actualizarSyncEstado(idUsuario, { ultimaCargaFirebase: new Date().toISOString() });
}

export function marcarSincronizacionCompleta(idUsuario: string) {
  actualizarSyncEstado(idUsuario, {
    ultimaSincronizacion: new Date().toISOString(),
    hayCambiosPendientes: false,
  });
}

export function marcarHayCambiosPendientes(idUsuario: string, hay: boolean) {
  actualizarSyncEstado(idUsuario, { hayCambiosPendientes: hay });
}
