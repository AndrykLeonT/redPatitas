export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS usuarios_local (
  id TEXT PRIMARY KEY NOT NULL,
  idAuth TEXT,
  nombreCompleto TEXT NOT NULL,
  nombreUsuario TEXT NOT NULL,
  celular TEXT,
  correo TEXT NOT NULL,
  fotoPerfil TEXT,
  rol TEXT NOT NULL,
  fechaNacimiento TEXT,
  fechaRegistro TEXT,
  numMascotas INTEGER DEFAULT 0,
  numPublicaciones INTEGER DEFAULT 0,
  datosJson TEXT,
  pendienteSync INTEGER DEFAULT 0,
  actualizadoEn TEXT
);

CREATE TABLE IF NOT EXISTS mascotas_local (
  id TEXT PRIMARY KEY NOT NULL,
  idUsuario TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipoAnimal TEXT NOT NULL,
  raza TEXT,
  comportamiento TEXT,
  rasgosParticulares TEXT,
  edad INTEGER,
  peso REAL,
  fechaNacimiento TEXT,
  fechaRegistro TEXT,
  enfermedadesJson TEXT,
  vacunasJson TEXT,
  sexo TEXT,
  esterilizado INTEGER DEFAULT 0,
  fotosJson TEXT,
  datosJson TEXT,
  pendienteSync INTEGER DEFAULT 0,
  eliminadoLocal INTEGER DEFAULT 0,
  creadoLocal INTEGER DEFAULT 0,
  actualizadoEn TEXT,
  FOREIGN KEY (idUsuario) REFERENCES usuarios_local(id)
);

CREATE TABLE IF NOT EXISTS publicaciones_local (
  id TEXT PRIMARY KEY NOT NULL,
  idUsuario TEXT NOT NULL,
  idMascota TEXT,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fechaRegistro TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  fotosJson TEXT,
  estado TEXT,
  fechaResolucion TEXT,
  latitude REAL,
  longitude REAL,
  datosJson TEXT,
  pendienteSync INTEGER DEFAULT 0,
  eliminadoLocal INTEGER DEFAULT 0,
  creadoLocal INTEGER DEFAULT 0,
  actualizadoEn TEXT,
  FOREIGN KEY (idUsuario) REFERENCES usuarios_local(id),
  FOREIGN KEY (idMascota) REFERENCES mascotas_local(id)
);

CREATE TABLE IF NOT EXISTS adopciones_local (
  id TEXT PRIMARY KEY NOT NULL,
  idMascota TEXT NOT NULL,
  idUsuario TEXT NOT NULL,
  tipoAnimal TEXT NOT NULL,
  nombreMascota TEXT NOT NULL,
  via TEXT NOT NULL,
  fechaAdopcion TEXT NOT NULL,
  datosJson TEXT,
  pendienteSync INTEGER DEFAULT 0,
  eliminadoLocal INTEGER DEFAULT 0,
  creadoLocal INTEGER DEFAULT 0,
  actualizadoEn TEXT,
  FOREIGN KEY (idUsuario) REFERENCES usuarios_local(id)
);

CREATE TABLE IF NOT EXISTS estadisticas_local (
  idUsuario TEXT PRIMARY KEY NOT NULL,
  totalMascotas INTEGER DEFAULT 0,
  totalPublicaciones INTEGER DEFAULT 0,
  totalReportes INTEGER DEFAULT 0,
  totalPerdidos INTEGER DEFAULT 0,
  totalRecreacion INTEGER DEFAULT 0,
  totalAdopciones INTEGER DEFAULT 0,
  adopcionesApp INTEGER DEFAULT 0,
  adopcionesExternas INTEGER DEFAULT 0,
  mascotasPorTipoJson TEXT,
  publicacionesPorPeriodoJson TEXT,
  adopcionesPorMesJson TEXT,
  actualizadoEn TEXT,
  FOREIGN KEY (idUsuario) REFERENCES usuarios_local(id)
);

CREATE TABLE IF NOT EXISTS cambios_pendientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidadId TEXT NOT NULL,
  accion TEXT NOT NULL,
  payloadJson TEXT NOT NULL,
  fechaLocal TEXT NOT NULL,
  sincronizado INTEGER DEFAULT 0,
  intentos INTEGER DEFAULT 0,
  ultimoIntento TEXT,
  error TEXT,
  FOREIGN KEY (userId) REFERENCES usuarios_local(id)
);

CREATE TABLE IF NOT EXISTS sync_estado (
  idUsuario TEXT PRIMARY KEY NOT NULL,
  ultimaCargaFirebase TEXT,
  ultimaSincronizacion TEXT,
  hayCambiosPendientes INTEGER DEFAULT 0,
  ultimaConexionDetectada TEXT,
  FOREIGN KEY (idUsuario) REFERENCES usuarios_local(id)
);

CREATE TABLE IF NOT EXISTS reportes_generados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  entidadOrigen TEXT NOT NULL,
  entidadId TEXT,
  fileName TEXT NOT NULL,
  fileUri TEXT NOT NULL,
  fechaCreacion TEXT NOT NULL,
  fechaModificacion TEXT,
  descripcion TEXT
);
`;
