import { localDb } from "./localDb";
import { listarAdopcionesPorUsuario } from "./adopcionesLocal";
import { listarMascotasPorUsuario } from "./mascotasLocal";
import { listarPublicacionesPorUsuario } from "./publicacionesLocal";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type EstadisticasPersonales = {
  totalMascotas: number;
  totalPublicaciones: number;
  totalReportes: number;
  totalPerdidos: number;
  totalRecreacion: number;
  totalAdopciones: number;
  adopcionesApp: number;
  adopcionesExternas: number;
  mascotasPorTipo: Record<string, number>;
  publicacionesPorMes: Array<{ mes: string; total: number }>;
  adopcionesPorMes: Array<{ mes: string; perros: number; gatos: number }>;
};

export function calcularEstadisticasPersonales(idUsuario: string): EstadisticasPersonales {
  const mascotas = listarMascotasPorUsuario(idUsuario);
  const publicaciones = listarPublicacionesPorUsuario(idUsuario);
  const adopciones = listarAdopcionesPorUsuario(idUsuario);

  const mascotasPorTipo: Record<string, number> = {};
  for (const m of mascotas) {
    const tipo = m.tipoAnimal || "Otro";
    mascotasPorTipo[tipo] = (mascotasPorTipo[tipo] ?? 0) + 1;
  }

  let totalReportes = 0;
  let totalPerdidos = 0;
  let totalRecreacion = 0;
  for (const p of publicaciones) {
    if (p.tipo === "reporte") totalReportes++;
    else if (p.tipo === "perdidos") totalPerdidos++;
    else if (p.tipo === "recreacion") totalRecreacion++;
  }

  const ahora = new Date();
  const publicacionesPorMes = Array.from({ length: 12 }, (_, i) => {
    const target = new Date(ahora.getFullYear(), ahora.getMonth() - (11 - i), 1);
    const total = publicaciones.filter((p) => {
      const d = new Date(p.fechaRegistro);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
    }).length;
    return { mes: MESES[target.getMonth()], total };
  });

  const adopcionesPorMes = Array.from({ length: 6 }, (_, i) => {
    const target = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    const filtro = (kw: string) =>
      adopciones.filter((a) => {
        const d = new Date(a.fechaAdopcion);
        return (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth() === target.getMonth() &&
          a.tipoAnimal.toLowerCase().includes(kw)
        );
      }).length;
    return { mes: MESES[target.getMonth()], perros: filtro("perro"), gatos: filtro("gato") };
  });

  const adopcionesApp = adopciones.filter((a) => a.via === "app").length;
  const adopcionesExternas = adopciones.filter((a) => a.via === "externo").length;

  return {
    totalMascotas: mascotas.length,
    totalPublicaciones: publicaciones.length,
    totalReportes,
    totalPerdidos,
    totalRecreacion,
    totalAdopciones: adopciones.length,
    adopcionesApp,
    adopcionesExternas,
    mascotasPorTipo,
    publicacionesPorMes,
    adopcionesPorMes,
  };
}

export function guardarEstadisticasLocal(idUsuario: string, stats: EstadisticasPersonales) {
  const ahora = new Date().toISOString();
  localDb.runSync(
    `INSERT OR REPLACE INTO estadisticas_local (
      idUsuario, totalMascotas, totalPublicaciones, totalReportes, totalPerdidos,
      totalRecreacion, totalAdopciones, adopcionesApp, adopcionesExternas,
      mascotasPorTipoJson, publicacionesPorPeriodoJson, adopcionesPorMesJson, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idUsuario,
      stats.totalMascotas,
      stats.totalPublicaciones,
      stats.totalReportes,
      stats.totalPerdidos,
      stats.totalRecreacion,
      stats.totalAdopciones,
      stats.adopcionesApp,
      stats.adopcionesExternas,
      JSON.stringify(stats.mascotasPorTipo),
      JSON.stringify(stats.publicacionesPorMes),
      JSON.stringify(stats.adopcionesPorMes),
      ahora,
    ],
  );
}

export function recalcularYGuardarEstadisticas(idUsuario: string) {
  const stats = calcularEstadisticasPersonales(idUsuario);
  guardarEstadisticasLocal(idUsuario, stats);
  return stats;
}

export function obtenerEstadisticasLocal(idUsuario: string): EstadisticasPersonales | null {
  const row = localDb.getFirstSync<{
    totalMascotas: number;
    totalPublicaciones: number;
    totalReportes: number;
    totalPerdidos: number;
    totalRecreacion: number;
    totalAdopciones: number;
    adopcionesApp: number;
    adopcionesExternas: number;
    mascotasPorTipoJson: string | null;
    publicacionesPorPeriodoJson: string | null;
    adopcionesPorMesJson: string | null;
  }>(
    `SELECT * FROM estadisticas_local WHERE idUsuario = ?`,
    [idUsuario],
  );
  if (!row) return null;
  const safeParse = <T>(value: string | null, fallback: T): T => {
    if (!value) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  };
  return {
    totalMascotas: row.totalMascotas,
    totalPublicaciones: row.totalPublicaciones,
    totalReportes: row.totalReportes,
    totalPerdidos: row.totalPerdidos,
    totalRecreacion: row.totalRecreacion,
    totalAdopciones: row.totalAdopciones,
    adopcionesApp: row.adopcionesApp,
    adopcionesExternas: row.adopcionesExternas,
    mascotasPorTipo: safeParse(row.mascotasPorTipoJson, {} as Record<string, number>),
    publicacionesPorMes: safeParse(row.publicacionesPorPeriodoJson, [] as EstadisticasPersonales["publicacionesPorMes"]),
    adopcionesPorMes: safeParse(row.adopcionesPorMesJson, [] as EstadisticasPersonales["adopcionesPorMes"]),
  };
}
