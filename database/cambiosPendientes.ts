import { localDb } from "./localDb";

export type EntidadCambio = "usuario" | "mascota" | "publicacion" | "adopcion";
export type AccionCambio = "crear" | "actualizar" | "eliminar";

export type CambioPendiente = {
  id: number;
  userId: string;
  entidad: EntidadCambio;
  entidadId: string;
  accion: AccionCambio;
  payload: any;
  fechaLocal: string;
  sincronizado: boolean;
  intentos: number;
  ultimoIntento: string | null;
  error: string | null;
};

type CambioRow = {
  id: number;
  userId: string;
  entidad: string;
  entidadId: string;
  accion: string;
  payloadJson: string;
  fechaLocal: string;
  sincronizado: number;
  intentos: number;
  ultimoIntento: string | null;
  error: string | null;
};

// Deserializa el payload de la cola offline antes de sincronizarlo.
function rowToCambio(row: CambioRow): CambioPendiente {
  let payload: any = null;
  try { payload = JSON.parse(row.payloadJson); } catch { payload = null; }
  return {
    id: row.id,
    userId: row.userId,
    entidad: row.entidad as EntidadCambio,
    entidadId: row.entidadId,
    accion: row.accion as AccionCambio,
    payload,
    fechaLocal: row.fechaLocal,
    sincronizado: row.sincronizado === 1,
    intentos: row.intentos,
    ultimoIntento: row.ultimoIntento,
    error: row.error,
  };
}

export function registrarCambioPendiente(
  userId: string,
  entidad: EntidadCambio,
  entidadId: string,
  accion: AccionCambio,
  payload: any,
) {
  // Encola una operacion offline manteniendo el payload completo de la entidad.
  const fechaLocal = new Date().toISOString();
  localDb.runSync(
    `INSERT INTO cambios_pendientes (
      userId, entidad, entidadId, accion, payloadJson, fechaLocal, sincronizado, intentos
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    [userId, entidad, entidadId, accion, JSON.stringify(payload ?? {}), fechaLocal],
  );
}

export function listarCambiosPendientes(userId: string): CambioPendiente[] {
  // Se procesan en orden cronologico para respetar dependencias entre cambios.
  const rows = localDb.getAllSync<CambioRow>(
    `SELECT * FROM cambios_pendientes
     WHERE userId = ? AND sincronizado = 0
     ORDER BY fechaLocal ASC`,
    [userId],
  );
  return rows.map(rowToCambio);
}

export function contarCambiosPendientes(userId: string): number {
  const row = localDb.getFirstSync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM cambios_pendientes WHERE userId = ? AND sincronizado = 0`,
    [userId],
  );
  return row?.total ?? 0;
}

export function marcarCambioSincronizado(id: number) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE cambios_pendientes SET sincronizado = 1, ultimoIntento = ?, error = NULL
     WHERE id = ?`,
    [ahora, id],
  );
}

export function registrarErrorCambio(id: number, mensaje: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE cambios_pendientes SET intentos = intentos + 1, ultimoIntento = ?, error = ?
     WHERE id = ?`,
    [ahora, mensaje, id],
  );
}

export function limpiarCambiosSincronizados(userId: string) {
  localDb.runSync(
    `DELETE FROM cambios_pendientes WHERE userId = ? AND sincronizado = 1`,
    [userId],
  );
}

/**
 * Cuando se sustituye el ID local por el ID real de Firebase, propagar a los cambios
 * pendientes posteriores que referencian el ID local (ej. una publicacion creada offline
 * vinculada a una mascota creada offline).
 */
export function reemplazarEntidadIdEnCambios(
  entidad: EntidadCambio,
  idAntiguo: string,
  idNuevo: string,
) {
  localDb.runSync(
    `UPDATE cambios_pendientes SET entidadId = ?
     WHERE entidad = ? AND entidadId = ? AND sincronizado = 0`,
    [idNuevo, entidad, idAntiguo],
  );
}
