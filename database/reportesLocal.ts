import { localDb } from "./localDb";

export type TipoReporte =
  | "mascota"
  | "publicacion"
  | "reporte_perdido"
  | "reporte_maltrato"
  | "recreacion"
  | "general";

export type EntidadOrigenReporte = "mascota" | "publicacion" | "global" | "manual";

export type ReporteGenerado = {
  id: number;
  userId?: string | null;
  titulo: string;
  tipo: TipoReporte;
  entidadOrigen: EntidadOrigenReporte;
  entidadId?: string | null;
  fileName: string;
  fileUri: string;
  fechaCreacion: string;
  fechaModificacion?: string | null;
  descripcion?: string | null;
};

type ReporteRow = {
  id: number;
  userId: string | null;
  titulo: string;
  tipo: string;
  entidadOrigen: string;
  entidadId: string | null;
  fileName: string;
  fileUri: string;
  fechaCreacion: string;
  fechaModificacion: string | null;
  descripcion: string | null;
};

// Convierte el indice SQLite en el tipo usado por la pantalla de reportes.
function rowToReporte(row: ReporteRow): ReporteGenerado {
  return {
    id: row.id,
    userId: row.userId,
    titulo: row.titulo,
    tipo: row.tipo as TipoReporte,
    entidadOrigen: row.entidadOrigen as EntidadOrigenReporte,
    entidadId: row.entidadId,
    fileName: row.fileName,
    fileUri: row.fileUri,
    fechaCreacion: row.fechaCreacion,
    fechaModificacion: row.fechaModificacion,
    descripcion: row.descripcion,
  };
}

export function insertarReporteGenerado(reporte: Omit<ReporteGenerado, "id">): number {
  // Solo registra metadata; el contenido vive como archivo TXT en FileSystem.
  const result = localDb.runSync(
    `INSERT INTO reportes_generados (
      userId, titulo, tipo, entidadOrigen, entidadId, fileName, fileUri,
      fechaCreacion, fechaModificacion, descripcion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reporte.userId ?? null,
      reporte.titulo,
      reporte.tipo,
      reporte.entidadOrigen,
      reporte.entidadId ?? null,
      reporte.fileName,
      reporte.fileUri,
      reporte.fechaCreacion,
      reporte.fechaModificacion ?? null,
      reporte.descripcion ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export function obtenerReportesGenerados(userId?: string | null): ReporteGenerado[] {
  // Incluye reportes globales sin userId y reportes del usuario activo.
  const rows = userId
    ? localDb.getAllSync<ReporteRow>(
        `SELECT * FROM reportes_generados
         WHERE userId IS NULL OR userId = ?
         ORDER BY fechaCreacion DESC`,
        [userId],
      )
    : localDb.getAllSync<ReporteRow>(
        `SELECT * FROM reportes_generados ORDER BY fechaCreacion DESC`,
      );
  return rows.map(rowToReporte);
}

export function obtenerReporteGenerado(id: number): ReporteGenerado | null {
  const row = localDb.getFirstSync<ReporteRow>(
    `SELECT * FROM reportes_generados WHERE id = ?`,
    [id],
  );
  return row ? rowToReporte(row) : null;
}

export function actualizarMetadataReporte(
  id: number,
  data: Partial<Pick<ReporteGenerado, "titulo" | "descripcion" | "fechaModificacion">>,
) {
  const actual = obtenerReporteGenerado(id);
  if (!actual) return;
  localDb.runSync(
    `UPDATE reportes_generados
     SET titulo = ?, descripcion = ?, fechaModificacion = ?
     WHERE id = ?`,
    [
      data.titulo ?? actual.titulo,
      data.descripcion ?? actual.descripcion ?? null,
      data.fechaModificacion ?? actual.fechaModificacion ?? null,
      id,
    ],
  );
}

export function eliminarRegistroReporte(id: number) {
  localDb.runSync(`DELETE FROM reportes_generados WHERE id = ?`, [id]);
}
