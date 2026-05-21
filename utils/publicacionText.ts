import type { Publicacion } from "../models/firebaseModels";

export function obtenerTituloPublicacion(publicacion: Partial<Publicacion> | null | undefined) {
  return publicacion?.titulo?.trim() || "Publicacion sin titulo";
}
