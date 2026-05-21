import { get, push, ref, remove, set, update } from "firebase/database";
import { db } from "../config/firebase";
import { Adopcion, Mascota, Publicacion, Usuario } from "../models/firebaseModels";
import { auditoriaService } from "./auditoriaService";

export type DatosPersonales = {
  usuario: Usuario | null;
  mascotas: Array<{ id: string; data: Mascota }>;
  publicaciones: Array<{ id: string; data: Publicacion }>;
  adopciones: Array<{ id: string; data: Adopcion }>;
};

// Descarga solo datos del usuario activo para poblar la cache local sin datos globales.
export async function descargarDatosPersonales(userId: string): Promise<DatosPersonales> {
  const [userSnap, mascSnap, pubSnap, adoptSnap] = await Promise.all([
    get(ref(db, `usuarios/${userId}`)),
    get(ref(db, "mascotas")),
    get(ref(db, "publicaciones")),
    get(ref(db, "adopciones")),
  ]);

  const usuario = userSnap.exists() ? (userSnap.val() as Usuario) : null;

  const mascotas: Array<{ id: string; data: Mascota }> = [];
  if (mascSnap.exists()) {
    mascSnap.forEach((child) => {
      const m = child.val() as Mascota;
      if (m.idUsuario === userId) mascotas.push({ id: child.key!, data: m });
    });
  }

  const publicaciones: Array<{ id: string; data: Publicacion }> = [];
  if (pubSnap.exists()) {
    pubSnap.forEach((child) => {
      const p = child.val() as Publicacion;
      if (p.idUsuario === userId) publicaciones.push({ id: child.key!, data: p });
    });
  }

  const adopciones: Array<{ id: string; data: Adopcion }> = [];
  if (adoptSnap.exists()) {
    adoptSnap.forEach((child) => {
      const a = child.val() as Adopcion;
      if (a.idUsuario === userId) adopciones.push({ id: child.key!, data: a });
    });
  }

  auditoriaService.registrarAcceso('Firebase', 'CONSULTA', `Nodos: usuarios/${userId}, mascotas, publicaciones, adopciones`);

  return { usuario, mascotas, publicaciones, adopciones };
}

// ─── Operaciones por entidad (usadas tanto en línea como durante sincronización) ──

export async function crearMascotaEnFirebase(payload: Mascota): Promise<string> {
  const nuevoRef = push(ref(db, "mascotas"));
  await set(nuevoRef, payload);
  auditoriaService.registrarAcceso('Firebase', 'INSERCION', 'Nodo: mascotas');
  return nuevoRef.key!;
}

export async function actualizarMascotaEnFirebase(id: string, payload: Partial<Mascota>) {
  await update(ref(db, `mascotas/${id}`), payload);
  auditoriaService.registrarAcceso('Firebase', 'MODIFICACION', `Nodo: mascotas/${id}`);
}

export async function eliminarMascotaEnFirebase(id: string) {
  await remove(ref(db, `mascotas/${id}`));
  auditoriaService.registrarAcceso('Firebase', 'ELIMINACION', `Nodo: mascotas/${id}`);
}

export async function crearPublicacionEnFirebase(payload: Publicacion): Promise<string> {
  const nuevoRef = push(ref(db, "publicaciones"));
  await set(nuevoRef, payload);
  auditoriaService.registrarAcceso('Firebase', 'INSERCION', 'Nodo: publicaciones');
  return nuevoRef.key!;
}

export async function actualizarPublicacionEnFirebase(
  id: string,
  payload: Partial<Publicacion>,
) {
  await update(ref(db, `publicaciones/${id}`), payload);
  auditoriaService.registrarAcceso('Firebase', 'MODIFICACION', `Nodo: publicaciones/${id}`);
}

export async function eliminarPublicacionEnFirebase(id: string) {
  await remove(ref(db, `publicaciones/${id}`));
  auditoriaService.registrarAcceso('Firebase', 'ELIMINACION', `Nodo: publicaciones/${id}`);
}

export async function actualizarUsuarioEnFirebase(
  userId: string,
  payload: Partial<Usuario>,
) {
  await update(ref(db, `usuarios/${userId}`), payload);
  auditoriaService.registrarAcceso('Firebase', 'MODIFICACION', `Nodo: usuarios/${userId}`);
}

export async function crearAdopcionEnFirebase(payload: Adopcion): Promise<string> {
  const nuevoRef = push(ref(db, "adopciones"));
  await set(nuevoRef, payload);
  auditoriaService.registrarAcceso('Firebase', 'INSERCION', 'Nodo: adopciones');
  return nuevoRef.key!;
}

export async function actualizarAdopcionEnFirebase(id: string, payload: Partial<Adopcion>) {
  await update(ref(db, `adopciones/${id}`), payload);
  auditoriaService.registrarAcceso('Firebase', 'MODIFICACION', `Nodo: adopciones/${id}`);
}

export async function eliminarAdopcionEnFirebase(id: string) {
  await remove(ref(db, `adopciones/${id}`));
  auditoriaService.registrarAcceso('Firebase', 'ELIMINACION', `Nodo: adopciones/${id}`);
}
