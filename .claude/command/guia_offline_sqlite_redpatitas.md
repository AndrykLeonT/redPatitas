# GUIA DE IMPLEMENTACION OFFLINE-FIRST PARCIAL - REDPATITAS / PETLINK

## 1. Contexto del proyecto

RedPatitas es una aplicacion movil desarrollada con Expo, React Native, TypeScript y expo-router. Actualmente utiliza Firebase Realtime Database como backend principal. La sesion se maneja localmente con AsyncStorage usando claves como userId, userRole, userName, userAvatar y userEmail.

El proyecto tiene modelos principales en Firebase:

- Usuario
- Mascota
- Publicacion
- Adopcion
- FotoMascota

Las pantallas actuales relevantes son:

- app/(drawer)/misMascotas.tsx
- app/(drawer)/misPublicaciones.tsx
- app/(drawer)/perfil.tsx
- app/mascota/nueva.tsx
- app/mascota/[id].tsx
- app/publicacion/nueva.tsx
- app/publicacion/[id].tsx
- app/index.tsx
- app/_layout.tsx

Actualmente, las pantallas de mascotas y publicaciones cargan la informacion desde Firebase, recorren las colecciones completas y filtran por idUsuario comparandolo contra el userId almacenado en AsyncStorage.

El objetivo de esta guia es implementar una arquitectura offline-first parcial, donde Firebase siga siendo la fuente oficial en linea, pero SQLite funcione como almacenamiento local personal para que la aplicacion no quede inservible cuando se pierda la conexion a internet.

IMPORTANTE:
No sustituir Firebase por SQLite. SQLite sera una cache local y una cola de cambios pendientes.


## 2. Objetivo funcional

Implementar soporte offline para que, cuando el dispositivo pierda conexion a internet, el usuario pueda seguir usando las secciones personales de la aplicacion.

Cuando no haya internet, el usuario podra:

- Ver su perfil local.
- Ver sus mascotas registradas.
- Ver sus propias publicaciones.
- Ver sus estadisticas personales.
- Crear mascotas.
- Editar mascotas.
- Eliminar mascotas.
- Crear publicaciones.
- Editar publicaciones.
- Eliminar publicaciones.

Cuando no haya internet, el usuario NO podra:

- Ver publicaciones globales actualizadas.
- Ver estadisticas globales.
- Ver publicaciones de otros usuarios.
- Consultar informacion global desde Firebase.
- Sincronizar cambios hasta recuperar conexion.

Cuando vuelva la conexion:

- La app debe detectar que hay conexion.
- Revisar si existen cambios pendientes en SQLite.
- Mostrar un modal preguntando si desea subir los cambios a internet.
- Si el usuario acepta, sincronizar los cambios pendientes con Firebase.
- Si la sincronizacion termina correctamente, limpiar los cambios pendientes.
- Despues de sincronizar, volver a descargar desde Firebase la informacion personal actualizada y reemplazar la informacion local.


## 3. Comportamiento general esperado

### 3.1 Flujo al iniciar sesion

Al iniciar sesion correctamente:

1. Obtener userId desde AsyncStorage.
2. Inicializar SQLite si aun no se ha inicializado.
3. Vaciar tablas locales relacionadas con el usuario anterior.
4. Descargar desde Firebase solo los datos personales del usuario actual:
   - usuarios/{userId}
   - mascotas donde idUsuario === userId
   - publicaciones donde idUsuario === userId
   - adopciones donde idUsuario === userId, si aplica
5. Guardar esos datos en SQLite.
6. Calcular estadisticas personales.
7. Guardar estado de sincronizacion.
8. Entrar a la app.

Razon:
Esto evita duplicacion y evita mezclar datos de un usuario con otro.


### 3.2 Flujo cuando hay internet

Cuando hay internet:

- Firebase es la fuente principal.
- Las pantallas pueden consultar Firebase.
- Despues de consultar Firebase, deben actualizar SQLite para mantener la cache local fresca.
- Si se crea, modifica o elimina algo estando en linea, se debe aplicar en Firebase y luego reflejarse en SQLite.


### 3.3 Flujo cuando no hay internet

Cuando no hay internet:

- Las pantallas personales deben leer desde SQLite.
- Las pantallas globales deben mostrar un mensaje de no disponibilidad.
- Las operaciones locales se guardan en SQLite.
- Cada operacion local debe registrarse en la tabla cambios_pendientes.
- Los elementos locales no sincronizados deben mostrar una etiqueta visual: "Pendiente de sincronizar".


### 3.4 Flujo al recuperar conexion

Cuando la app detecte que la conexion regreso:

1. Consultar cambios_pendientes donde sincronizado = 0 y userId = usuario actual.
2. Si no hay cambios, no mostrar modal.
3. Si hay cambios, mostrar modal:

   "Conexion recuperada. Tienes cambios locales pendientes. ¿Deseas subirlos a internet?"

4. Botones:
   - Ahora no
   - Subir cambios

5. Si el usuario presiona "Ahora no":
   - No borrar cambios.
   - Mantenerlos pendientes.

6. Si el usuario presiona "Subir cambios":
   - Procesar cambios en orden por fechaLocal ascendente.
   - Aplicar cada cambio en Firebase.
   - Marcar cada cambio como sincronizado.
   - Limpiar cambios sincronizados.
   - Descargar datos personales desde Firebase.
   - Reemplazar datos locales.


## 4. Estrategia de sincronizacion

La estrategia recomendada para este proyecto es: LOCAL WINS.

Significa que si el usuario hizo un cambio offline, ese cambio tendra prioridad cuando se sincronice con Firebase.

Ejemplo:

- Firebase tiene mascota.nombre = "Firulais".
- Offline, el usuario cambia el nombre a "Max".
- Al sincronizar, Firebase queda con mascota.nombre = "Max".

Esta estrategia es simple, clara y adecuada para el alcance del proyecto.


## 5. Manejo de IDs locales

Cuando se crea una mascota, publicacion o adopcion sin internet, Firebase no puede generar una push-key. Por eso se debe generar un ID local temporal.

Formato recomendado:

local_<timestamp>

Ejemplo:

local_1716151221000

Cuando se recupere internet y se sincronice:

1. Si el cambio es de tipo crear, usar push() en Firebase.
2. Firebase generara un ID real.
3. Guardar el dato con ese ID en Firebase.
4. Actualizar SQLite reemplazando el ID local por el ID real, si es necesario.
5. Marcar el cambio como sincronizado.

IMPORTANTE:
Para Firebase, las nuevas mascotas y publicaciones deben crearse usando push(), no indices manuales.


## 6. Librerias necesarias

Instalar SQLite:

npx expo install expo-sqlite

Instalar detector de conexion:

npx expo install @react-native-community/netinfo

Opcional para exportacion futura de archivos:

npx expo install expo-file-system expo-sharing


## 7. Estructura de carpetas recomendada

Crear las siguientes carpetas y archivos:

```txt
database/
  localDb.ts
  schema.ts
  usuariosLocal.ts
  mascotasLocal.ts
  publicacionesLocal.ts
  adopcionesLocal.ts
  estadisticasLocal.ts
  cambiosPendientes.ts
  syncEstadoLocal.ts

services/
  firebasePersonalService.ts
  syncService.ts
  networkService.ts

hooks/
  useNetworkStatus.ts
  usePendingSync.ts

components/
  OfflineBanner.tsx
  SyncChangesModal.tsx
  PendingSyncBadge.tsx
```

No crear stylesheet global. Mantener StyleSheet.create por archivo, respetando la convencion actual del proyecto.


## 8. Modelos Firebase actuales

Estos son los modelos a respetar.

```ts
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
  fotos?: Record<string, string>;
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
  fechaResolucion?: string;
  ubicacion?: {
    latitude: number;
    longitude: number;
  };
}

export interface Adopcion {
  idMascota: string;
  idUsuario: string;
  tipoAnimal: string;
  nombreMascota: string;
  via: 'app' | 'externo';
  fechaAdopcion: string;
}
```


## 9. Definicion de base de datos local SQLite

Archivo recomendado:

database/schema.ts

Contenido sugerido:

```ts
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
`;
```


## 10. Archivo localDb.ts

Crear:

database/localDb.ts

Responsabilidades:

- Abrir la base redpatitas.db.
- Ejecutar CREATE_TABLES_SQL.
- Exponer initLocalDb().
- Exponer limpiarBaseLocal().
- Activar foreign keys si aplica.

Ejemplo base:

```ts
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

export const localDb = SQLite.openDatabaseSync('redpatitas.db');

export function initLocalDb() {
  localDb.execSync('PRAGMA foreign_keys = ON;');
  localDb.execSync(CREATE_TABLES_SQL);
}

export function limpiarBaseLocal() {
  localDb.execSync(`
    DELETE FROM cambios_pendientes;
    DELETE FROM sync_estado;
    DELETE FROM estadisticas_local;
    DELETE FROM adopciones_local;
    DELETE FROM publicaciones_local;
    DELETE FROM mascotas_local;
    DELETE FROM usuarios_local;
  `);
}
```

Nota:
Al iniciar sesion se debe limpiar la base local para evitar mezclar informacion entre usuarios.


## 11. Conversiones importantes Firebase <-> SQLite

### 11.1 Booleanos

SQLite no tiene boolean real. Usar INTEGER:

- true = 1
- false = 0

Ejemplo:

esterilizado INTEGER DEFAULT 0

Al guardar:

```ts
esterilizado: mascota.esterilizado ? 1 : 0
```

Al leer:

```ts
esterilizado: row.esterilizado === 1
```


### 11.2 Records dinamicos

En Firebase estos campos son Record<string, string>:

- Mascota.enfermedades
- Mascota.vacunas
- Mascota.fotos
- Publicacion.fotos

En SQLite se guardan como JSON string:

- enfermedadesJson
- vacunasJson
- fotosJson

Al guardar:

```ts
JSON.stringify(mascota.enfermedades ?? {})
```

Al leer:

```ts
JSON.parse(row.enfermedadesJson ?? '{}')
```

No tratarlos como arrays.


### 11.3 Ubicacion

Firebase:

```ts
ubicacion?: {
  latitude: number;
  longitude: number;
}
```

SQLite:

```sql
latitude REAL,
longitude REAL
```

Al leer desde SQLite, reconstruir:

```ts
ubicacion: row.latitude != null && row.longitude != null
  ? { latitude: row.latitude, longitude: row.longitude }
  : undefined
```


## 12. Reglas para cambios pendientes

Cada operacion offline debe crear un registro en cambios_pendientes.

### 12.1 Valores validos para entidad

- usuario
- mascota
- publicacion
- adopcion

### 12.2 Valores validos para accion

- crear
- actualizar
- eliminar

### 12.3 Ejemplo de cambio pendiente

```json
{
  "userId": "abc123",
  "entidad": "mascota",
  "entidadId": "local_1716151221000",
  "accion": "crear",
  "payloadJson": {
    "idUsuario": "abc123",
    "nombre": "Max",
    "tipoAnimal": "Perro",
    "raza": "Labrador",
    "comportamiento": "Tranquilo",
    "rasgosParticulares": "Collar rojo",
    "edad": 3,
    "peso": 18.5,
    "fechaNacimiento": "2023-01-01",
    "fechaRegistro": "2026-05-19T12:00:00.000Z",
    "enfermedades": {},
    "vacunas": {},
    "sexo": "macho",
    "esterilizado": true,
    "fotos": {}
  },
  "fechaLocal": "2026-05-19T12:00:00.000Z",
  "sincronizado": 0
}
```


## 13. BDD - comportamiento esperado

Usar estos escenarios como guia funcional.

### Escenario 1: Cargar datos personales al iniciar sesion

Dado que el usuario inicia sesion correctamente
Y existe conexion a internet
Cuando la app obtiene el userId de AsyncStorage
Entonces debe limpiar la base SQLite local
Y debe descargar desde Firebase el perfil del usuario
Y debe descargar sus mascotas
Y debe descargar sus publicaciones
Y debe descargar sus adopciones si existen
Y debe calcular estadisticas personales
Y debe guardar todo en SQLite


### Escenario 2: Perder conexion despues de iniciar sesion

Dado que el usuario ya inicio sesion
Y SQLite contiene datos personales recientes
Cuando el dispositivo pierde conexion a internet
Entonces la app debe mostrar un aviso de modo sin conexion
Y debe permitir ver mascotas propias desde SQLite
Y debe permitir ver publicaciones propias desde SQLite
Y debe permitir ver perfil y estadisticas personales desde SQLite
Y debe bloquear publicaciones globales
Y debe bloquear estadisticas globales


### Escenario 3: Crear mascota sin conexion

Dado que el usuario no tiene conexion
Cuando crea una nueva mascota
Entonces la app debe generar un id local temporal
Y debe insertar la mascota en mascotas_local
Y debe marcarla con pendienteSync = 1
Y debe marcarla con creadoLocal = 1
Y debe registrar un cambio pendiente con entidad = mascota y accion = crear
Y debe mostrar la mascota en la lista local
Y debe indicar que esta pendiente de sincronizar


### Escenario 4: Editar mascota sin conexion

Dado que el usuario no tiene conexion
Y ya existe una mascota en SQLite
Cuando edita la mascota
Entonces la app debe actualizar mascotas_local
Y debe marcar pendienteSync = 1
Y debe registrar un cambio pendiente con entidad = mascota y accion = actualizar


### Escenario 5: Eliminar mascota sin conexion

Dado que el usuario no tiene conexion
Y ya existe una mascota en SQLite
Cuando elimina la mascota
Entonces la app no debe borrarla fisicamente de inmediato
Y debe marcar eliminadoLocal = 1
Y debe marcar pendienteSync = 1
Y debe registrar un cambio pendiente con entidad = mascota y accion = eliminar
Y la mascota no debe aparecer en las listas visibles


### Escenario 6: Crear publicacion sin conexion

Dado que el usuario no tiene conexion
Cuando crea una publicacion
Entonces la app debe generar un id local temporal
Y debe insertar la publicacion en publicaciones_local
Y debe marcar pendienteSync = 1
Y debe marcar creadoLocal = 1
Y debe registrar un cambio pendiente con entidad = publicacion y accion = crear
Y debe mostrar la publicacion en Mis Publicaciones
Y debe indicar que esta pendiente de sincronizar


### Escenario 7: Recuperar conexion con cambios pendientes

Dado que el usuario tiene cambios_pendientes con sincronizado = 0
Cuando la app detecta que regreso la conexion
Entonces debe mostrar un modal preguntando si desea subir cambios a internet
Y si el usuario acepta
Entonces debe procesar los cambios en orden de fechaLocal ascendente
Y debe aplicar los cambios en Firebase
Y debe marcar los cambios como sincronizados
Y debe limpiar los cambios ya sincronizados
Y debe volver a descargar los datos personales desde Firebase
Y debe reemplazar la informacion local


### Escenario 8: Recuperar conexion sin aceptar sincronizacion

Dado que el usuario tiene cambios pendientes
Cuando la app detecta conexion
Y el usuario presiona Ahora no
Entonces no debe subir cambios a Firebase
Y no debe borrar cambios_pendientes
Y debe mantener los elementos locales como pendientes de sincronizar


### Escenario 9: Sincronizacion fallida

Dado que el usuario tiene cambios pendientes
Cuando intenta sincronizar
Y Firebase responde con error
Entonces el cambio debe conservarse en cambios_pendientes
Y debe incrementarse intentos
Y debe guardarse el mensaje de error
Y debe informarse al usuario que algunos cambios no se pudieron subir


## 14. SDD - diseno tecnico del sistema

### 14.1 Componentes principales

#### database/localDb.ts

Responsable de:

- Abrir SQLite.
- Crear tablas.
- Limpiar tablas locales.
- Exponer la instancia localDb.


#### database/schema.ts

Responsable de:

- Contener el SQL de creacion de tablas.


#### database/usuariosLocal.ts

Responsable de:

- Insertar usuario local.
- Leer usuario local por id.
- Actualizar usuario local.
- Convertir Usuario Firebase a row SQLite.
- Convertir row SQLite a Usuario.


#### database/mascotasLocal.ts

Responsable de:

- Insertar mascotas locales.
- Leer mascotas por idUsuario.
- Leer mascota por id.
- Actualizar mascota local.
- Marcar mascota como eliminada local.
- Convertir Mascota Firebase a row SQLite.
- Convertir row SQLite a Mascota.


#### database/publicacionesLocal.ts

Responsable de:

- Insertar publicaciones locales.
- Leer publicaciones por idUsuario.
- Leer publicacion por id.
- Actualizar publicacion local.
- Marcar publicacion como eliminada local.
- Convertir Publicacion Firebase a row SQLite.
- Convertir row SQLite a Publicacion.


#### database/adopcionesLocal.ts

Responsable de:

- Insertar adopciones locales.
- Leer adopciones por idUsuario.
- Convertir Adopcion Firebase a row SQLite.


#### database/estadisticasLocal.ts

Responsable de:

- Calcular estadisticas desde mascotas, publicaciones y adopciones locales.
- Guardar estadisticas personales.
- Leer estadisticas personales.


#### database/cambiosPendientes.ts

Responsable de:

- Registrar cambios pendientes.
- Listar cambios pendientes por userId.
- Marcar cambio como sincronizado.
- Incrementar intentos.
- Guardar error.
- Limpiar cambios sincronizados.


#### services/firebasePersonalService.ts

Responsable de:

- Descargar usuario desde Firebase.
- Descargar mascotas del usuario desde Firebase.
- Descargar publicaciones del usuario desde Firebase.
- Descargar adopciones del usuario desde Firebase.
- Guardar cambios en Firebase durante sincronizacion.


#### services/syncService.ts

Responsable de:

- Preparar datos offline al iniciar sesion.
- Procesar cambios pendientes.
- Aplicar cambios en Firebase.
- Refrescar SQLite desde Firebase despues de sincronizar.


#### hooks/useNetworkStatus.ts

Responsable de:

- Escuchar cambios de conexion usando NetInfo.
- Retornar isConnected.


#### hooks/usePendingSync.ts

Responsable de:

- Consultar si hay cambios pendientes.
- Disparar el modal cuando vuelve la conexion.


#### components/OfflineBanner.tsx

Responsable de mostrar:

"Sin conexion. Estas viendo informacion guardada en este dispositivo."


#### components/SyncChangesModal.tsx

Responsable de mostrar:

"Conexion recuperada. Tienes cambios locales pendientes. ¿Deseas subirlos a internet?"

Botones:

- Ahora no
- Subir cambios


#### components/PendingSyncBadge.tsx

Responsable de mostrar:

"Pendiente de sincronizar"

En tarjetas de mascotas o publicaciones.


## 15. Reglas de lectura por pantalla

### 15.1 MisMascotas

Archivo actual:

app/(drawer)/misMascotas.tsx

Comportamiento nuevo:

Si hay internet:

1. Consultar Firebase.
2. Filtrar por idUsuario.
3. Guardar/actualizar SQLite.
4. Mostrar datos.

Si no hay internet:

1. Leer mascotas_local donde idUsuario = userId y eliminadoLocal = 0.
2. Mostrar datos.
3. Mostrar banner offline.
4. Mostrar badge si pendienteSync = 1.


### 15.2 MisPublicaciones

Archivo actual:

app/(drawer)/misPublicaciones.tsx

Comportamiento nuevo:

Si hay internet:

1. Consultar Firebase.
2. Filtrar por idUsuario.
3. Ordenar por fechaRegistro descendente.
4. Guardar/actualizar SQLite.
5. Mostrar datos.

Si no hay internet:

1. Leer publicaciones_local donde idUsuario = userId y eliminadoLocal = 0.
2. Ordenar por fechaRegistro descendente.
3. Mostrar datos.
4. Mostrar banner offline.
5. Mostrar badge si pendienteSync = 1.


### 15.3 Perfil

Archivo actual:

app/(drawer)/perfil.tsx

Comportamiento nuevo:

Si hay internet:

1. Consultar usuario, mascotas, publicaciones y adopciones desde Firebase.
2. Filtrar por userId.
3. Guardar todo en SQLite.
4. Calcular estadisticas personales.
5. Mostrar perfil y graficas.

Si no hay internet:

1. Leer usuario desde usuarios_local.
2. Leer mascotas_local.
3. Leer publicaciones_local.
4. Leer adopciones_local si aplica.
5. Leer o recalcular estadisticas_local.
6. Mostrar perfil y graficas personales.
7. Mostrar banner offline.


### 15.4 Feed global

Archivo probable:

app/(drawer)/(tabs)/index.tsx

Comportamiento nuevo:

Si hay internet:

- Funciona normal consultando Firebase.

Si no hay internet:

- No mostrar publicaciones globales.
- Mostrar mensaje:

"Las publicaciones globales no estan disponibles sin conexion. Puedes seguir consultando tus mascotas y publicaciones personales."


### 15.5 Mapa global

Archivo probable:

app/(drawer)/(tabs)/map.tsx

Comportamiento nuevo:

Si hay internet:

- Funciona normal.

Si no hay internet:

- Bloquear vista global o mostrar mensaje de que el mapa requiere conexion.


## 16. Reglas de escritura por pantalla

### 16.1 Nueva mascota

Archivo:

app/mascota/nueva.tsx

Si hay internet:

1. Crear mascota en Firebase con push().
2. Guardar copia en SQLite.
3. Actualizar metricas si aplica.

Si no hay internet:

1. Crear id local.
2. Insertar en mascotas_local.
3. Marcar creadoLocal = 1.
4. Marcar pendienteSync = 1.
5. Registrar cambio pendiente.
6. Mostrar mensaje:

"Mascota guardada localmente. Se sincronizara cuando vuelva la conexion."


### 16.2 Editar mascota

Si hay internet:

1. Actualizar Firebase.
2. Actualizar SQLite.

Si no hay internet:

1. Actualizar SQLite.
2. Marcar pendienteSync = 1.
3. Registrar cambio pendiente con accion = actualizar.


### 16.3 Eliminar mascota

Si hay internet:

1. Eliminar en Firebase.
2. Eliminar o marcar como eliminada en SQLite.

Si no hay internet:

1. Marcar eliminadoLocal = 1.
2. Marcar pendienteSync = 1.
3. Registrar cambio pendiente con accion = eliminar.


### 16.4 Nueva publicacion

Archivo:

app/publicacion/nueva.tsx

Si hay internet:

1. Crear publicacion en Firebase con push().
2. Guardar copia en SQLite.

Si no hay internet:

1. Crear id local.
2. Insertar en publicaciones_local.
3. Marcar creadoLocal = 1.
4. Marcar pendienteSync = 1.
5. Registrar cambio pendiente.


### 16.5 Editar publicacion

Si hay internet:

1. Actualizar Firebase.
2. Actualizar SQLite.

Si no hay internet:

1. Actualizar SQLite.
2. Marcar pendienteSync = 1.
3. Registrar cambio pendiente con accion = actualizar.


### 16.6 Eliminar publicacion

Si hay internet:

1. Eliminar Firebase.
2. Eliminar o marcar en SQLite.

Si no hay internet:

1. Marcar eliminadoLocal = 1.
2. Marcar pendienteSync = 1.
3. Registrar cambio pendiente con accion = eliminar.


## 17. Pseudocodigo de sincronizacion

```ts
export async function sincronizarCambiosPendientes(userId: string) {
  const cambios = await obtenerCambiosPendientes(userId);

  for (const cambio of cambios) {
    try {
      if (cambio.entidad === 'mascota') {
        await sincronizarCambioMascota(cambio);
      }

      if (cambio.entidad === 'publicacion') {
        await sincronizarCambioPublicacion(cambio);
      }

      if (cambio.entidad === 'usuario') {
        await sincronizarCambioUsuario(cambio);
      }

      if (cambio.entidad === 'adopcion') {
        await sincronizarCambioAdopcion(cambio);
      }

      await marcarCambioComoSincronizado(cambio.id);
    } catch (error) {
      await registrarErrorCambio(cambio.id, String(error));
    }
  }

  await limpiarCambiosSincronizados(userId);
  await prepararDatosOffline(userId);
}
```


## 18. Reglas por entidad al sincronizar

### 18.1 Mascota

crear:

- Usar push(ref(db, 'mascotas'))
- set(newRef, payload)

actualizar:

- update(ref(db, `mascotas/${entidadId}`), payload)

eliminar:

- remove(ref(db, `mascotas/${entidadId}`))


### 18.2 Publicacion

crear:

- Usar push(ref(db, 'publicaciones'))
- set(newRef, payload)

actualizar:

- update(ref(db, `publicaciones/${entidadId}`), payload)

eliminar:

- remove(ref(db, `publicaciones/${entidadId}`))


### 18.3 Usuario

actualizar:

- update(ref(db, `usuarios/${userId}`), payload)

No permitir crear usuario offline.
No permitir eliminar usuario offline en esta fase.


### 18.4 Adopcion

crear:

- Usar push(ref(db, 'adopciones'))
- set(newRef, payload)

actualizar:

- update(ref(db, `adopciones/${entidadId}`), payload)

eliminar:

- remove(ref(db, `adopciones/${entidadId}`))


## 19. Reglas visuales

Usar componentes reutilizables:

### OfflineBanner

Texto sugerido:

"Sin conexion. Estas viendo informacion guardada en este dispositivo."

### PendingSyncBadge

Texto sugerido:

"Pendiente de sincronizar"

### SyncChangesModal

Titulo:

"Conexion recuperada"

Mensaje:

"Tienes cambios locales pendientes. ¿Deseas subirlos a internet?"

Botones:

- Ahora no
- Subir cambios


## 20. Reglas de estilo del proyecto

Mantener las convenciones actuales:

- Usar StyleSheet.create dentro de cada archivo.
- No crear stylesheet global.
- Usar ThemeContext y colors cuando sea posible.
- Respetar colores del tema actual.
- Usar expo-router para navegacion.
- Usar useFocusEffect cuando una pantalla deba recargar informacion al enfocarse.
- No cambiar el sistema de autenticacion actual.
- No introducir Firebase Auth real en esta fase.
- No cambiar la estructura de Firebase existente.


## 21. Plan de accion para Claude Code

### Fase 1: Instalacion de dependencias

1. Instalar expo-sqlite.
2. Instalar @react-native-community/netinfo.

Comandos:

```bash
npx expo install expo-sqlite
npx expo install @react-native-community/netinfo
```


### Fase 2: Crear base SQLite

1. Crear carpeta database.
2. Crear schema.ts.
3. Crear localDb.ts.
4. Crear funciones de limpieza.
5. Inicializar SQLite desde app/_layout.tsx.


### Fase 3: Crear repositorios locales

Crear:

- usuariosLocal.ts
- mascotasLocal.ts
- publicacionesLocal.ts
- adopcionesLocal.ts
- estadisticasLocal.ts
- cambiosPendientes.ts
- syncEstadoLocal.ts

Cada archivo debe tener funciones especificas de insert, update, select y conversion.


### Fase 4: Crear servicios

Crear:

- firebasePersonalService.ts
- syncService.ts
- networkService.ts

firebasePersonalService debe descargar informacion personal de Firebase.
syncService debe preparar datos offline y sincronizar cambios pendientes.
networkService o hooks deben detectar conexion.


### Fase 5: Modificar login

En app/index.tsx:

Despues de login correcto:

1. Guardar sesion en AsyncStorage.
2. Llamar initLocalDb si hace falta.
3. Llamar prepararDatosOffline(userId).
4. Navegar al drawer.


### Fase 6: Modificar MisMascotas

En app/(drawer)/misMascotas.tsx:

1. Detectar conexion.
2. Si hay conexion, cargar desde Firebase y actualizar SQLite.
3. Si no hay conexion, cargar desde SQLite.
4. Mostrar OfflineBanner si no hay conexion.
5. Mostrar PendingSyncBadge en mascotas pendientes.


### Fase 7: Modificar MisPublicaciones

En app/(drawer)/misPublicaciones.tsx:

1. Detectar conexion.
2. Si hay conexion, cargar desde Firebase y actualizar SQLite.
3. Si no hay conexion, cargar desde SQLite.
4. Mostrar OfflineBanner si no hay conexion.
5. Mostrar PendingSyncBadge en publicaciones pendientes.


### Fase 8: Modificar Perfil

En app/(drawer)/perfil.tsx:

1. Detectar conexion.
2. Si hay conexion, cargar Firebase y actualizar SQLite.
3. Si no hay conexion, cargar usuario, mascotas, publicaciones, adopciones y estadisticas desde SQLite.
4. Mantener graficas personales funcionales.
5. Mostrar OfflineBanner si no hay conexion.


### Fase 9: Modificar creacion y edicion

Modificar:

- app/mascota/nueva.tsx
- app/mascota/[id].tsx
- app/publicacion/nueva.tsx
- app/publicacion/[id].tsx

Regla:

Si hay internet:
- Firebase + SQLite.

Si no hay internet:
- SQLite + cambios_pendientes.


### Fase 10: Modal de sincronizacion

1. Crear SyncChangesModal.
2. Detectar regreso de conexion.
3. Consultar cambios pendientes.
4. Mostrar modal.
5. Ejecutar sincronizarCambiosPendientes si el usuario acepta.


### Fase 11: Bloquear pantallas globales sin conexion

Modificar feed global y mapa:

- Si no hay internet, mostrar mensaje de no disponibilidad.
- No intentar consultar Firebase sin conexion.


### Fase 12: Pruebas manuales

Probar:

1. Login con internet.
2. Ver mascotas.
3. Ver publicaciones.
4. Ver perfil.
5. Apagar internet.
6. Ver mascotas offline.
7. Ver publicaciones offline.
8. Crear mascota offline.
9. Crear publicacion offline.
10. Editar mascota offline.
11. Eliminar publicacion offline.
12. Recuperar internet.
13. Aceptar sincronizacion.
14. Confirmar que Firebase se actualizo.
15. Confirmar que SQLite se refresco.
16. Cerrar sesion.
17. Iniciar con otro usuario.
18. Confirmar que no se mezclan datos.


## 22. Criterios de aceptacion

La implementacion se considera correcta si:

- La app no queda inutilizable al perder conexion.
- Mis mascotas se pueden ver offline.
- Mis publicaciones se pueden ver offline.
- El perfil muestra datos personales offline.
- Las estadisticas personales funcionan offline.
- Las publicaciones globales se bloquean sin conexion.
- Las operaciones offline se registran en cambios_pendientes.
- Al recuperar conexion se pregunta antes de subir cambios.
- Al aceptar, los cambios se sincronizan con Firebase.
- Los cambios sincronizados se eliminan o marcan como sincronizados.
- La base local se limpia al iniciar sesion.
- No se mezclan datos entre usuarios.
- Se respetan los modelos actuales de Firebase.
- Los campos Record<string, string> se guardan como JSON y no como arrays.
- Las nuevas entidades en Firebase se crean usando push().


## 23. Prioridad minima de implementacion

Si el tiempo es limitado, implementar en este orden:

1. SQLite con usuarios_local, mascotas_local, publicaciones_local y cambios_pendientes.
2. Preparar datos offline al iniciar sesion.
3. MisMascotas offline.
4. MisPublicaciones offline.
5. Crear mascota offline.
6. Crear publicacion offline.
7. Sincronizacion basica de crear.
8. Actualizar y eliminar offline.
9. Perfil offline.
10. Estadisticas y adopciones offline.


## 24. Notas importantes

- No modificar el modelo Firebase salvo que sea estrictamente necesario.
- No cambiar el sistema de login actual.
- No mover config/firebase.ts a .env.
- No tratar fotos, vacunas o enfermedades como arrays.
- Mantener el filtro por idUsuario en todos los datos personales.
- No sincronizar informacion global en SQLite.
- No usar SQLite para almacenar datos de otros usuarios.
- No borrar fisicamente elementos eliminados offline hasta que se sincronicen.
- Mostrar siempre feedback visual cuando la app este offline.
- Mostrar siempre feedback visual cuando un item este pendiente de sincronizar.

FIN DE LA GUIA.
