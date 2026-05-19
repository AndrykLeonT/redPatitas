import {
  guardarAdopcionLocal,
  marcarAdopcionSincronizadaLocal,
  reemplazarIdAdopcionLocal,
  vaciarAdopcionesUsuario,
} from "../database/adopcionesLocal";
import {
  CambioPendiente,
  limpiarCambiosSincronizados,
  listarCambiosPendientes,
  marcarCambioSincronizado,
  registrarErrorCambio,
  reemplazarEntidadIdEnCambios,
} from "../database/cambiosPendientes";
import { recalcularYGuardarEstadisticas } from "../database/estadisticasLocal";
import { esIdLocal, limpiarBaseLocal } from "../database/localDb";
import {
  eliminarMascotaLocalFisico,
  guardarMascotaLocal,
  marcarMascotaSincronizadaLocal,
  obtenerMascotaLocal,
  reemplazarIdMascotaLocal,
  vaciarMascotasUsuario,
} from "../database/mascotasLocal";
import {
  eliminarPublicacionLocalFisico,
  guardarPublicacionLocal,
  marcarPublicacionSincronizadaLocal,
  obtenerPublicacionLocal,
  reemplazarIdPublicacionLocal,
  vaciarPublicacionesUsuario,
} from "../database/publicacionesLocal";
import {
  marcarCargaFirebase,
  marcarHayCambiosPendientes,
  marcarSincronizacionCompleta,
} from "../database/syncEstadoLocal";
import {
  actualizarUsuarioLocal,
  guardarUsuarioLocal,
} from "../database/usuariosLocal";
import { subirFotosLocales } from "./cloudinaryService";
import {
  actualizarAdopcionEnFirebase,
  actualizarMascotaEnFirebase,
  actualizarPublicacionEnFirebase,
  actualizarUsuarioEnFirebase,
  crearAdopcionEnFirebase,
  crearMascotaEnFirebase,
  crearPublicacionEnFirebase,
  descargarDatosPersonales,
  eliminarAdopcionEnFirebase,
  eliminarMascotaEnFirebase,
  eliminarPublicacionEnFirebase,
} from "./firebasePersonalService";

/**
 * Limpia la base local y descarga del usuario actual.
 * Usado al iniciar sesión y después de sincronizar.
 *
 * La descarga se hace ANTES de limpiar para evitar que un fallo de red
 * deje la base vacía sin haber traído los datos nuevos.
 */
export async function prepararDatosOffline(userId: string) {
  // 1. Descargar primero (puede fallar — si falla, la base local queda intacta)
  const datos = await descargarDatosPersonales(userId);

  // 2. Si llegamos aquí, la descarga fue exitosa. Limpiar y reemplazar.
  limpiarBaseLocal();

  if (datos.usuario) guardarUsuarioLocal(userId, datos.usuario);
  for (const m of datos.mascotas) guardarMascotaLocal(m.id, m.data);
  for (const p of datos.publicaciones) guardarPublicacionLocal(p.id, p.data);
  for (const a of datos.adopciones) guardarAdopcionLocal(a.id, a.data);

  recalcularYGuardarEstadisticas(userId);
  marcarCargaFirebase(userId);
  marcarHayCambiosPendientes(userId, false);
}

/**
 * Refresca solo los datos del usuario desde Firebase sin tocar la cola de cambios pendientes.
 * Útil cuando no se quiere perder cambios locales (caso raro).
 */
export async function refrescarDatosPersonales(userId: string) {
  const datos = await descargarDatosPersonales(userId);

  vaciarMascotasUsuario(userId);
  vaciarPublicacionesUsuario(userId);
  vaciarAdopcionesUsuario(userId);

  if (datos.usuario) guardarUsuarioLocal(userId, datos.usuario);
  for (const m of datos.mascotas) guardarMascotaLocal(m.id, m.data);
  for (const p of datos.publicaciones) guardarPublicacionLocal(p.id, p.data);
  for (const a of datos.adopciones) guardarAdopcionLocal(a.id, a.data);

  recalcularYGuardarEstadisticas(userId);
  marcarCargaFirebase(userId);
}

// ─── Sincronización de cambios pendientes ─────────────────────────────────────

async function sincronizarCambioMascota(cambio: CambioPendiente) {
  const { entidadId, accion, payload } = cambio;

  if (accion === "crear") {
    // Sube las fotos locales (file://...) a Cloudinary antes de persistir en Firebase
    const fotosRemotas = await subirFotosLocales(payload?.fotos);
    const payloadConFotos = { ...payload, fotos: fotosRemotas };
    const nuevoId = await crearMascotaEnFirebase(payloadConFotos);
    if (esIdLocal(entidadId)) {
      reemplazarIdMascotaLocal(entidadId, nuevoId);
      reemplazarEntidadIdEnCambios("mascota", entidadId, nuevoId);
    }
    return;
  }

  if (accion === "actualizar") {
    const fotosRemotas = payload?.fotos
      ? await subirFotosLocales(payload.fotos)
      : undefined;
    const payloadFinal = fotosRemotas ? { ...payload, fotos: fotosRemotas } : payload;
    await actualizarMascotaEnFirebase(entidadId, payloadFinal);
    marcarMascotaSincronizadaLocal(entidadId);
    return;
  }

  if (accion === "eliminar") {
    if (!esIdLocal(entidadId)) {
      await eliminarMascotaEnFirebase(entidadId);
    }
    eliminarMascotaLocalFisico(entidadId);
  }
}

async function sincronizarCambioPublicacion(cambio: CambioPendiente) {
  const { entidadId, accion, payload } = cambio;

  if (accion === "crear") {
    const fotosRemotas = await subirFotosLocales(payload?.fotos);
    const payloadConFotos = { ...payload, fotos: fotosRemotas };
    const nuevoId = await crearPublicacionEnFirebase(payloadConFotos);
    if (esIdLocal(entidadId)) {
      reemplazarIdPublicacionLocal(entidadId, nuevoId);
      reemplazarEntidadIdEnCambios("publicacion", entidadId, nuevoId);
    }
    return;
  }

  if (accion === "actualizar") {
    const fotosRemotas = payload?.fotos
      ? await subirFotosLocales(payload.fotos)
      : undefined;
    const payloadFinal = fotosRemotas ? { ...payload, fotos: fotosRemotas } : payload;
    await actualizarPublicacionEnFirebase(entidadId, payloadFinal);
    marcarPublicacionSincronizadaLocal(entidadId);
    return;
  }

  if (accion === "eliminar") {
    if (!esIdLocal(entidadId)) {
      await eliminarPublicacionEnFirebase(entidadId);
    }
    eliminarPublicacionLocalFisico(entidadId);
  }
}

async function sincronizarCambioUsuario(cambio: CambioPendiente) {
  if (cambio.accion !== "actualizar") {
    throw new Error(`Acción no soportada para usuario: ${cambio.accion}`);
  }
  await actualizarUsuarioEnFirebase(cambio.userId, cambio.payload);
  actualizarUsuarioLocal(cambio.userId, cambio.payload, { pendienteSync: false });
}

async function sincronizarCambioAdopcion(cambio: CambioPendiente) {
  const { entidadId, accion, payload } = cambio;

  if (accion === "crear") {
    const nuevoId = await crearAdopcionEnFirebase(payload);
    if (esIdLocal(entidadId)) {
      reemplazarIdAdopcionLocal(entidadId, nuevoId);
      reemplazarEntidadIdEnCambios("adopcion", entidadId, nuevoId);
    }
    return;
  }

  if (accion === "actualizar") {
    await actualizarAdopcionEnFirebase(entidadId, payload);
    marcarAdopcionSincronizadaLocal(entidadId);
    return;
  }

  if (accion === "eliminar") {
    if (!esIdLocal(entidadId)) {
      await eliminarAdopcionEnFirebase(entidadId);
    }
    // Adopciones se borran físico también
    marcarAdopcionSincronizadaLocal(entidadId);
  }
}

export type ResultadoSync = {
  intentados: number;
  exitosos: number;
  fallidos: number;
  errores: Array<{ cambioId: number; mensaje: string }>;
};

/**
 * Procesa la cola de cambios pendientes del usuario en orden cronológico.
 * Después de terminar, refresca los datos desde Firebase.
 */
export async function sincronizarCambiosPendientes(userId: string): Promise<ResultadoSync> {
  const cambios = listarCambiosPendientes(userId);
  const resultado: ResultadoSync = {
    intentados: cambios.length,
    exitosos: 0,
    fallidos: 0,
    errores: [],
  };

  for (const cambio of cambios) {
    try {
      switch (cambio.entidad) {
        case "mascota":
          await sincronizarCambioMascota(cambio);
          break;
        case "publicacion":
          await sincronizarCambioPublicacion(cambio);
          break;
        case "usuario":
          await sincronizarCambioUsuario(cambio);
          break;
        case "adopcion":
          await sincronizarCambioAdopcion(cambio);
          break;
        default:
          throw new Error(`Entidad desconocida: ${cambio.entidad}`);
      }
      marcarCambioSincronizado(cambio.id);
      resultado.exitosos++;
    } catch (err: any) {
      const mensaje = err?.message ?? String(err);
      registrarErrorCambio(cambio.id, mensaje);
      resultado.fallidos++;
      resultado.errores.push({ cambioId: cambio.id, mensaje });
    }
  }

  limpiarCambiosSincronizados(userId);

  if (resultado.fallidos === 0) {
    marcarSincronizacionCompleta(userId);
    // Refrescar datos personales solo si todo salió bien
    try {
      await refrescarDatosPersonales(userId);
    } catch {
      // Si la red volvió a caer, conservamos lo local
    }
  } else {
    marcarHayCambiosPendientes(userId, true);
  }

  return resultado;
}

// Helpers usados por las pantallas para mantener consistencia local cuando hay conexión

export function cacheMascotaDesdeFirebase(id: string, mascota: import("../models/firebaseModels").Mascota) {
  // Si en local existe versión modificada con pendienteSync, no sobreescribir
  const existente = obtenerMascotaLocal(id);
  if (existente?.pendienteSync) return;
  guardarMascotaLocal(id, mascota);
}

export function cachePublicacionDesdeFirebase(
  id: string,
  publicacion: import("../models/firebaseModels").Publicacion,
) {
  const existente = obtenerPublicacionLocal(id);
  if (existente?.pendienteSync) return;
  guardarPublicacionLocal(id, publicacion);
}
