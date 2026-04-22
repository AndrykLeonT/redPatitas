export interface Usuario {
  idAuth: string;
  nombreCompleto: string;
  nombreUsuario: string;
  celular: string;
  correo: string;
  contraseña?: string;
  fotoPerfil: string;
  rol: 'Dueño' | 'Refugio';
  fechaNacimiento: string;
  fechaRegistro: string;
  metricas: {
    numMascotas: number;
    numPublicaciones: number;
  };
}

export interface Mascota {
  idUsuario: string;
  nombre: string;
  tipoAnimal: string;
  raza: string;
  comportamiento: string;
  rasgosParticulares: string;
  edad: number;
  peso: number;
  fechaNacimiento: string;
  fechaRegistro: string;
  enfermedades: Record<string, string>;
  vacunas: Record<string, string>;
  sexo: 'macho' | 'hembra';
  esterilizado: boolean;
}

export interface FotoMascota {
  idFoto: string;
  idMascota: string;
  idUsuario: string;
  fechaRegistro: string;
  url: string;
}

export interface Publicacion {
  idUsuario: string;
  idMascota?: string;
  tipo: 'reporte' | 'perdidos' | 'recreacion';
  descripcion: string;
  fechaRegistro: string;
  likes: number;
  fotos: Record<string, string>;
  estado: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
  };
}
