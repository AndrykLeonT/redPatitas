export interface Usuario {
  idAuth: string; // El ID que te da Firebase Authentication
  nombreCompleto: string;
  nombreUsuario: string;
  celular: string;
  correo: string;
  fotoPerfil: string; // Ej: "avatar_1.png" o "https://..."
  rol: 'Dueño' | 'Refugio'; // Importante para saber qué permisos darle
  metricas: {
    numMascotas: number;
    numPublicaciones: number;
  };
}

export interface Mascota {
  idUsuarioCreador: string; // Referencia a quién la registró
  nombreDueño: string; // Guardarlo aquí evita hacer doble consulta a la base de datos
  nombreMascota: string;
  tipoAnimal: 'Perro' | 'Gato' | 'Ave' | 'Otro';
  raza: string;
  edad: string; // Ej: "2 años", "6 meses"
  peso: string;
  caracteristicas: string;
  fotos: string[]; // Arreglo para guardar múltiples nombres de archivo o URLs
  estado: 'Con su familia' | 'Disponible' | 'En proceso de adopción'; // Crucial para la gestión de refugios [cite: 40]
}

export interface Publicacion {
  idUsuarioCreador: string; // Referencia al informante o dueño
  tipoPublicacion: 'Extravío' | 'Encontrado' | 'Maltrato' | 'Adopción';
  tipoAnimal: string;
  raza: string;
  edad: string;
  peso: string;
  caracteristicas: string;
  fotos: string[]; 
  
  // CAMPOS AÑADIDOS RECOMENDADOS:
  estadoPublicacion: 'Activa' | 'Resuelta'; // Para poder cerrar el caso cuando se encuentre el animal
  fechaReporte: Date; // Para ordenar el feed del más reciente al más antiguo
  ubicacion: { // Indispensable para activar el radio de búsqueda lógico en el mapa [cite: 57]
    latitud: number;
    longitud: number;
    direccionAproximada?: string; 
  };
}
