import { Mascota, Publicacion, Usuario } from "../models/firebaseModels";

function listaONinguno(items: string[], vacio: string) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : vacio;
}

function siNo(value: boolean) {
  return value ? "Si" : "No";
}

function formatearFecha(value?: string | null) {
  if (!value) return "No disponible";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return value;
  return fecha.toLocaleString("es-MX");
}

function usuarioRelacionado(usuario?: Usuario | null) {
  return usuario
    ? `${usuario.nombreCompleto} (${usuario.correo})`
    : "No disponible";
}

// Convierte una mascota en texto plano listo para guardar como reporte local.
export function generarReporteMascota(params: {
  id: string;
  mascota: Mascota;
  usuario?: Usuario | null;
}) {
  const { id, mascota, usuario } = params;
  const enfermedades = Object.values(mascota.enfermedades ?? {});
  const vacunas = Object.values(mascota.vacunas ?? {});
  const fotos = Object.values(mascota.fotos ?? {});

  return `REDPATITAS - REPORTE DE MASCOTA

ID de mascota: ${id}
Nombre: ${mascota.nombre}
Tipo de animal: ${mascota.tipoAnimal}
Raza: ${mascota.raza || "Sin informacion"}
Sexo: ${mascota.sexo}
Edad: ${mascota.edad} ano(s)
Peso: ${mascota.peso} kg
Esterilizado: ${siNo(mascota.esterilizado)}

Fecha de nacimiento:
${mascota.fechaNacimiento || "No registrada"}

Comportamiento:
${mascota.comportamiento || "Sin informacion"}

Rasgos particulares:
${mascota.rasgosParticulares || "Sin informacion"}

Enfermedades:
${listaONinguno(enfermedades, "Sin enfermedades registradas")}

Vacunas:
${listaONinguno(vacunas, "Sin vacunas registradas")}

Fotos registradas:
${listaONinguno(fotos, "Sin fotos registradas")}

Usuario relacionado:
${usuarioRelacionado(usuario)}

Fecha de registro:
${formatearFecha(mascota.fechaRegistro)}

Fecha de generacion:
${new Date().toLocaleString("es-MX")}
`;
}

// Convierte una publicacion y su contexto opcional en texto plano exportable.
export function generarReportePublicacion(params: {
  id: string;
  publicacion: Publicacion;
  usuario?: Usuario | null;
  mascota?: Mascota | null;
}) {
  const { id, publicacion, usuario, mascota } = params;
  const fotos = Object.values(publicacion.fotos ?? {});

  return `REDPATITAS - REPORTE DE PUBLICACION

ID de publicacion: ${id}
Tipo: ${publicacion.tipo}
Estado: ${publicacion.estado || "Sin estado"}
Likes: ${publicacion.likes ?? 0}

Descripcion:
${publicacion.descripcion || "Sin descripcion"}

Fecha de registro:
${formatearFecha(publicacion.fechaRegistro)}

Fecha de resolucion:
${formatearFecha(publicacion.fechaResolucion)}

Ubicacion:
${
  publicacion.ubicacion
    ? `Latitud: ${publicacion.ubicacion.latitude}\nLongitud: ${publicacion.ubicacion.longitude}`
    : "Sin ubicacion registrada"
}

Fotos registradas:
${listaONinguno(fotos, "Sin fotos registradas")}

Mascota relacionada:
${mascota ? `${mascota.nombre} - ${mascota.tipoAnimal} - ${mascota.raza}` : "No asociada"}

Usuario relacionado:
${usuarioRelacionado(usuario)}

Fecha de generacion:
${new Date().toLocaleString("es-MX")}
`;
}
