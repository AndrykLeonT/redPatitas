export interface Usuario {
  idAuth: string;
  nombreCompleto: string;
  nombreUsuario: string;
  celular: string;
  correo: string;
  contraseña?: string;
  fotoPerfil: string;
  rol: 'Dueño' | 'Refugio';
  metricas: {
    numMascotas: number;
    numPublicaciones: number;
  };
}

export interface Mascota {
  idUsuarioCreador: string;
  nombreDueño: string;
  nombreMascota: string;
  tipoAnimal: 'Perro' | 'Gato' | 'Ave' | 'Otro';
  raza: string;
  edad: string;
  peso: string;
  caracteristicas: string;
  fotos: string[];
  estado: 'Con su familia' | 'Disponible' | 'En proceso de adopción';
}

export interface Publicacion {
  idUsuarioCreador: string;
  tipoPublicacion: 'Extravío' | 'Encontrado' | 'Maltrato' | 'Adopción';
  tipoAnimal: string;
  raza: string;
  edad: string;
  peso: string;
  caracteristicas: string;
  fotos: string[];

  estadoPublicacion: 'Activa' | 'Resuelta';
  fechaReporte: Date;
  ubicacion: {
    latitud: number;
    longitud: number;
    direccionAproximada?: string;
  };
}
