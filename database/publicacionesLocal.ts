import { Publicacion } from "../models/firebaseModels";
import { localDb } from "./localDb";

export type PublicacionConMeta = Publicacion & {
  id: string;
  pendienteSync: boolean;
  creadoLocal: boolean;
  eliminadoLocal: boolean;
};

type PublicacionRow = {
  id: string;
  idUsuario: string;
  idMascota: string | null;
  tipo: string;
  descripcion: string;
  fechaRegistro: string;
  likes: number;
  fotosJson: string | null;
  estado: string | null;
  fechaResolucion: string | null;
  latitude: number | null;
  longitude: number | null;
  datosJson: string | null;
  pendienteSync: number;
  eliminadoLocal: number;
  creadoLocal: number;
  actualizadoEn: string | null;
};

// Convierte el JSON local de fotos al Record esperado por el modelo Firebase.
function parseFotos(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const obj = JSON.parse(value);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// Trata strings vacios como NULL para no romper foreign keys opcionales.
function normalizeOptionalId(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

// Reconstruye Publicacion y adjunta banderas locales de sincronizacion.
function rowToPublicacionConMeta(row: PublicacionRow): PublicacionConMeta {
  const idMascota = normalizeOptionalId(row.idMascota);
  const pub: Publicacion = {
    idUsuario: row.idUsuario,
    ...(idMascota ? { idMascota } : {}),
    tipo: (row.tipo as Publicacion["tipo"]) ?? "reporte",
    descripcion: row.descripcion,
    fechaRegistro: row.fechaRegistro,
    likes: row.likes ?? 0,
    fotos: parseFotos(row.fotosJson),
    estado: row.estado ?? "activo",
    ...(row.fechaResolucion ? { fechaResolucion: row.fechaResolucion } : {}),
    ...(row.latitude != null && row.longitude != null
      ? { ubicacion: { latitude: row.latitude, longitude: row.longitude } }
      : {}),
  };
  return {
    ...pub,
    id: row.id,
    pendienteSync: row.pendienteSync === 1,
    creadoLocal: row.creadoLocal === 1,
    eliminadoLocal: row.eliminadoLocal === 1,
  };
}

export function guardarPublicacionLocal(
  id: string,
  publicacion: Publicacion,
  opts: { pendienteSync?: boolean; creadoLocal?: boolean } = {},
) {
  // Guarda publicaciones online u offline normalizando la mascota opcional.
  const ahora = new Date().toISOString();
  localDb.runSync(
    `INSERT OR REPLACE INTO publicaciones_local (
      id, idUsuario, idMascota, tipo, descripcion, fechaRegistro, likes, fotosJson,
      estado, fechaResolucion, latitude, longitude, datosJson, pendienteSync,
      eliminadoLocal, creadoLocal, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      publicacion.idUsuario,
      normalizeOptionalId(publicacion.idMascota),
      publicacion.tipo,
      publicacion.descripcion,
      publicacion.fechaRegistro,
      publicacion.likes ?? 0,
      JSON.stringify(publicacion.fotos ?? {}),
      publicacion.estado ?? null,
      publicacion.fechaResolucion ?? null,
      publicacion.ubicacion?.latitude ?? null,
      publicacion.ubicacion?.longitude ?? null,
      JSON.stringify(publicacion),
      opts.pendienteSync ? 1 : 0,
      0,
      opts.creadoLocal ? 1 : 0,
      ahora,
    ],
  );
}

export function listarPublicacionesPorUsuario(idUsuario: string): PublicacionConMeta[] {
  const rows = localDb.getAllSync<PublicacionRow>(
    `SELECT * FROM publicaciones_local WHERE idUsuario = ? AND eliminadoLocal = 0
     ORDER BY fechaRegistro DESC`,
    [idUsuario],
  );
  return rows.map(rowToPublicacionConMeta);
}

export function obtenerPublicacionLocal(id: string): PublicacionConMeta | null {
  const row = localDb.getFirstSync<PublicacionRow>(
    `SELECT * FROM publicaciones_local WHERE id = ?`,
    [id],
  );
  return row ? rowToPublicacionConMeta(row) : null;
}

export function marcarPublicacionEliminadaLocal(id: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE publicaciones_local SET eliminadoLocal = 1, pendienteSync = 1, actualizadoEn = ?
     WHERE id = ?`,
    [ahora, id],
  );
}

export function eliminarPublicacionLocalFisico(id: string) {
  localDb.runSync(`DELETE FROM publicaciones_local WHERE id = ?`, [id]);
}

export function reemplazarIdPublicacionLocal(idAntiguo: string, idNuevo: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE publicaciones_local SET id = ?, pendienteSync = 0, creadoLocal = 0, actualizadoEn = ?
     WHERE id = ?`,
    [idNuevo, ahora, idAntiguo],
  );
}

export function marcarPublicacionSincronizadaLocal(id: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE publicaciones_local SET pendienteSync = 0, creadoLocal = 0, actualizadoEn = ?
     WHERE id = ?`,
    [ahora, id],
  );
}

export function vaciarPublicacionesUsuario(idUsuario: string) {
  localDb.runSync(`DELETE FROM publicaciones_local WHERE idUsuario = ?`, [idUsuario]);
}
