import { Adopcion } from "../models/firebaseModels";
import { localDb } from "./localDb";

export type AdopcionConMeta = Adopcion & {
  id: string;
  pendienteSync: boolean;
  creadoLocal: boolean;
  eliminadoLocal: boolean;
};

type AdopcionRow = {
  id: string;
  idMascota: string;
  idUsuario: string;
  tipoAnimal: string;
  nombreMascota: string;
  via: string;
  fechaAdopcion: string;
  datosJson: string | null;
  pendienteSync: number;
  eliminadoLocal: number;
  creadoLocal: number;
  actualizadoEn: string | null;
};

function rowToAdopcionConMeta(row: AdopcionRow): AdopcionConMeta {
  const adopcion: Adopcion = {
    idMascota: row.idMascota,
    idUsuario: row.idUsuario,
    tipoAnimal: row.tipoAnimal,
    nombreMascota: row.nombreMascota,
    via: (row.via as Adopcion["via"]) ?? "app",
    fechaAdopcion: row.fechaAdopcion,
  };
  return {
    ...adopcion,
    id: row.id,
    pendienteSync: row.pendienteSync === 1,
    creadoLocal: row.creadoLocal === 1,
    eliminadoLocal: row.eliminadoLocal === 1,
  };
}

export function guardarAdopcionLocal(
  id: string,
  adopcion: Adopcion,
  opts: { pendienteSync?: boolean; creadoLocal?: boolean } = {},
) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `INSERT OR REPLACE INTO adopciones_local (
      id, idMascota, idUsuario, tipoAnimal, nombreMascota, via, fechaAdopcion,
      datosJson, pendienteSync, eliminadoLocal, creadoLocal, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      adopcion.idMascota,
      adopcion.idUsuario,
      adopcion.tipoAnimal,
      adopcion.nombreMascota,
      adopcion.via,
      adopcion.fechaAdopcion,
      JSON.stringify(adopcion),
      opts.pendienteSync ? 1 : 0,
      0,
      opts.creadoLocal ? 1 : 0,
      ahora,
    ],
  );
}

export function listarAdopcionesPorUsuario(idUsuario: string): AdopcionConMeta[] {
  const rows = localDb.getAllSync<AdopcionRow>(
    `SELECT * FROM adopciones_local WHERE idUsuario = ? AND eliminadoLocal = 0
     ORDER BY fechaAdopcion DESC`,
    [idUsuario],
  );
  return rows.map(rowToAdopcionConMeta);
}

export function reemplazarIdAdopcionLocal(idAntiguo: string, idNuevo: string) {
  localDb.runSync(
    `UPDATE adopciones_local SET id = ?, pendienteSync = 0, creadoLocal = 0
     WHERE id = ?`,
    [idNuevo, idAntiguo],
  );
}

export function marcarAdopcionSincronizadaLocal(id: string) {
  localDb.runSync(
    `UPDATE adopciones_local SET pendienteSync = 0, creadoLocal = 0 WHERE id = ?`,
    [id],
  );
}

export function vaciarAdopcionesUsuario(idUsuario: string) {
  localDb.runSync(`DELETE FROM adopciones_local WHERE idUsuario = ?`, [idUsuario]);
}
