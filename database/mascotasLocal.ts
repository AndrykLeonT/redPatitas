import { Mascota } from "../models/firebaseModels";
import { localDb } from "./localDb";

export type MascotaConMeta = Mascota & {
  id: string;
  pendienteSync: boolean;
  creadoLocal: boolean;
  eliminadoLocal: boolean;
};

type MascotaRow = {
  id: string;
  idUsuario: string;
  nombre: string;
  tipoAnimal: string;
  raza: string | null;
  comportamiento: string | null;
  rasgosParticulares: string | null;
  edad: number | null;
  peso: number | null;
  fechaNacimiento: string | null;
  fechaRegistro: string | null;
  enfermedadesJson: string | null;
  vacunasJson: string | null;
  sexo: string | null;
  esterilizado: number;
  fotosJson: string | null;
  datosJson: string | null;
  pendienteSync: number;
  eliminadoLocal: number;
  creadoLocal: number;
  actualizadoEn: string | null;
};

// Convierte campos Record de Firebase guardados como JSON en SQLite.
function parseJsonRecord(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const obj = JSON.parse(value);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// Reconstruye Mascota y agrega metadatos locales de sincronizacion.
function rowToMascotaConMeta(row: MascotaRow): MascotaConMeta {
  const mascota: Mascota = {
    idUsuario: row.idUsuario,
    nombre: row.nombre,
    tipoAnimal: row.tipoAnimal,
    raza: row.raza ?? "",
    comportamiento: row.comportamiento ?? "",
    rasgosParticulares: row.rasgosParticulares ?? "",
    edad: row.edad ?? 0,
    peso: row.peso ?? 0,
    fechaNacimiento: row.fechaNacimiento ?? "",
    fechaRegistro: row.fechaRegistro ?? "",
    enfermedades: parseJsonRecord(row.enfermedadesJson),
    vacunas: parseJsonRecord(row.vacunasJson),
    sexo: (row.sexo as Mascota["sexo"]) ?? "macho",
    esterilizado: row.esterilizado === 1,
    fotos: parseJsonRecord(row.fotosJson),
  };
  return {
    ...mascota,
    id: row.id,
    pendienteSync: row.pendienteSync === 1,
    creadoLocal: row.creadoLocal === 1,
    eliminadoLocal: row.eliminadoLocal === 1,
  };
}

export function guardarMascotaLocal(
  id: string,
  mascota: Mascota,
  opts: { pendienteSync?: boolean; creadoLocal?: boolean } = {},
) {
  // Persiste la mascota y conserva su payload original para sincronizacion o fallback.
  const ahora = new Date().toISOString();
  localDb.runSync(
    `INSERT OR REPLACE INTO mascotas_local (
      id, idUsuario, nombre, tipoAnimal, raza, comportamiento, rasgosParticulares,
      edad, peso, fechaNacimiento, fechaRegistro, enfermedadesJson, vacunasJson,
      sexo, esterilizado, fotosJson, datosJson, pendienteSync, eliminadoLocal,
      creadoLocal, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      mascota.idUsuario,
      mascota.nombre,
      mascota.tipoAnimal,
      mascota.raza ?? null,
      mascota.comportamiento ?? null,
      mascota.rasgosParticulares ?? null,
      mascota.edad ?? null,
      mascota.peso ?? null,
      mascota.fechaNacimiento ?? null,
      mascota.fechaRegistro ?? null,
      JSON.stringify(mascota.enfermedades ?? {}),
      JSON.stringify(mascota.vacunas ?? {}),
      mascota.sexo,
      mascota.esterilizado ? 1 : 0,
      JSON.stringify(mascota.fotos ?? {}),
      JSON.stringify(mascota),
      opts.pendienteSync ? 1 : 0,
      0,
      opts.creadoLocal ? 1 : 0,
      ahora,
    ],
  );
}

export function listarMascotasPorUsuario(idUsuario: string): MascotaConMeta[] {
  const rows = localDb.getAllSync<MascotaRow>(
    `SELECT * FROM mascotas_local WHERE idUsuario = ? AND eliminadoLocal = 0
     ORDER BY actualizadoEn DESC`,
    [idUsuario],
  );
  return rows.map(rowToMascotaConMeta);
}

export function obtenerMascotaLocal(id: string): MascotaConMeta | null {
  const row = localDb.getFirstSync<MascotaRow>(
    `SELECT * FROM mascotas_local WHERE id = ?`,
    [id],
  );
  return row ? rowToMascotaConMeta(row) : null;
}

export function marcarMascotaEliminadaLocal(id: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE mascotas_local SET eliminadoLocal = 1, pendienteSync = 1, actualizadoEn = ?
     WHERE id = ?`,
    [ahora, id],
  );
}

export function eliminarMascotaLocalFisico(id: string) {
  localDb.runSync(`DELETE FROM mascotas_local WHERE id = ?`, [id]);
}

export function reemplazarIdMascotaLocal(idAntiguo: string, idNuevo: string) {
  // Al recibir ID real de Firebase, actualiza tambien publicaciones vinculadas al ID local.
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE mascotas_local SET id = ?, pendienteSync = 0, creadoLocal = 0, actualizadoEn = ?
     WHERE id = ?`,
    [idNuevo, ahora, idAntiguo],
  );
  // Si alguna publicación apuntaba a este idMascota local, actualizarla
  localDb.runSync(
    `UPDATE publicaciones_local SET idMascota = ? WHERE idMascota = ?`,
    [idNuevo, idAntiguo],
  );
}

export function marcarMascotaSincronizadaLocal(id: string) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `UPDATE mascotas_local SET pendienteSync = 0, creadoLocal = 0, actualizadoEn = ?
     WHERE id = ?`,
    [ahora, id],
  );
}

export function vaciarMascotasUsuario(idUsuario: string) {
  localDb.runSync(`DELETE FROM mascotas_local WHERE idUsuario = ?`, [idUsuario]);
}
