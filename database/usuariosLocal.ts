import { Usuario } from "../models/firebaseModels";
import { localDb } from "./localDb";

type UsuarioRow = {
  id: string;
  idAuth: string | null;
  nombreCompleto: string;
  nombreUsuario: string;
  celular: string | null;
  correo: string;
  fotoPerfil: string | null;
  rol: string;
  fechaNacimiento: string | null;
  fechaRegistro: string | null;
  numMascotas: number;
  numPublicaciones: number;
  datosJson: string | null;
  pendienteSync: number;
  actualizadoEn: string | null;
};

// Reconstruye el modelo Firebase desde la fila SQLite del usuario.
function rowToUsuario(row: UsuarioRow): Usuario {
  return {
    idAuth: row.idAuth ?? "",
    nombreCompleto: row.nombreCompleto,
    nombreUsuario: row.nombreUsuario,
    celular: row.celular ?? "",
    correo: row.correo,
    fotoPerfil: row.fotoPerfil ?? "",
    rol: (row.rol as Usuario["rol"]) ?? "Dueño",
    fechaNacimiento: row.fechaNacimiento ?? "",
    fechaRegistro: row.fechaRegistro ?? "",
    metricas: {
      numMascotas: row.numMascotas ?? 0,
      numPublicaciones: row.numPublicaciones ?? 0,
    },
  };
}

export function guardarUsuarioLocal(
  userId: string,
  usuario: Usuario,
  opts: { pendienteSync?: boolean } = {},
) {
  // Guarda el perfil completo como columnas consultables y como JSON de respaldo.
  const pendienteSync = opts.pendienteSync ? 1 : 0;
  const ahora = new Date().toISOString();
  localDb.runSync(
    `INSERT OR REPLACE INTO usuarios_local (
      id, idAuth, nombreCompleto, nombreUsuario, celular, correo, fotoPerfil, rol,
      fechaNacimiento, fechaRegistro, numMascotas, numPublicaciones, datosJson,
      pendienteSync, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      usuario.idAuth ?? null,
      usuario.nombreCompleto,
      usuario.nombreUsuario,
      usuario.celular ?? null,
      usuario.correo,
      usuario.fotoPerfil ?? null,
      usuario.rol,
      usuario.fechaNacimiento ?? null,
      usuario.fechaRegistro ?? null,
      usuario.metricas?.numMascotas ?? 0,
      usuario.metricas?.numPublicaciones ?? 0,
      JSON.stringify(usuario),
      pendienteSync,
      ahora,
    ],
  );
}

export function obtenerUsuarioLocal(userId: string): Usuario | null {
  const row = localDb.getFirstSync<UsuarioRow>(
    `SELECT * FROM usuarios_local WHERE id = ?`,
    [userId],
  );
  return row ? rowToUsuario(row) : null;
}

export function actualizarUsuarioLocal(
  userId: string,
  cambios: Partial<Usuario>,
  opts: { pendienteSync?: boolean } = {},
) {
  const actual = obtenerUsuarioLocal(userId);
  if (!actual) return;
  guardarUsuarioLocal(userId, { ...actual, ...cambios } as Usuario, opts);
}
