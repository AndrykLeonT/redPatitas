# Diagramas RedPatitas

Documentacion tecnica de diagramas para RedPatitas, basada en `models/firebaseModels.ts`, `app/`, `database/`, `services/`, `hooks/`, `utils/` y las guias de `.claude/command/`.

Notas de lectura:

- Firebase Realtime Database es la fuente principal en linea.
- SQLite funciona como cache personal local y cola de sincronizacion.
- Los reportes `.txt` son locales y no se sincronizan con Firebase.
- Cuando una capacidad proviene de las guias y no esta completamente visible como flujo productivo, se marca como `(planeado)`.

## 1. Casos de uso

```mermaid
flowchart LR
  Dueno["Dueno"]
  Refugio["Refugio"]
  Invitado["Invitado"]

  subgraph App["RedPatitas"]
    UC1["Iniciar sesion"]
    UC2["Registrarse"]
    UC3["Ver feed global"]
    UC4["Ver mapa global"]
    UC5["Ver estadisticas globales"]
    UC6["Gestionar mascotas propias"]
    UC7["Crear publicacion"]
    UC8["Ver mis publicaciones"]
    UC9["Ver perfil y estadisticas personales"]
    UC10["Exportar reporte TXT"]
    UC11["Consultar reportes generados"]
    UC12["Usar app sin conexion"]
    UC13["Sincronizar cambios pendientes"]
    UC14["Gestionar adopciones"]
  end

  Invitado --> UC3
  Invitado --> UC4
  Invitado --> UC5
  Invitado --> UC1
  Invitado --> UC2

  Dueno --> UC1
  Dueno --> UC6
  Dueno --> UC7
  Dueno --> UC8
  Dueno --> UC9
  Dueno --> UC10
  Dueno --> UC11
  Dueno --> UC12
  Dueno --> UC13

  Refugio --> UC1
  Refugio --> UC6
  Refugio --> UC7
  Refugio --> UC8
  Refugio --> UC9
  Refugio --> UC10
  Refugio --> UC11
  Refugio --> UC12
  Refugio --> UC13
  Refugio --> UC14

  UC12 -. "bloquea vistas globales sin internet" .-> UC3
  UC12 -. "bloquea mapa global sin internet" .-> UC4
  UC13 -. "LOCAL WINS" .-> UC6
  UC13 -. "LOCAL WINS" .-> UC7
```

## 2. ERD de Firebase

```mermaid
erDiagram
  USUARIOS ||--o{ MASCOTAS : "idUsuario"
  USUARIOS ||--o{ PUBLICACIONES : "idUsuario"
  USUARIOS ||--o{ ADOPCIONES : "idUsuario"
  MASCOTAS ||--o{ PUBLICACIONES : "idMascota opcional"
  MASCOTAS ||--o{ ADOPCIONES : "idMascota"

  USUARIOS {
    string userId PK
    string idAuth
    string nombreCompleto
    string nombreUsuario
    string celular
    string correo
    string contrasena
    string fotoPerfil
    string rol
    string fechaNacimiento
    string fechaRegistro
    object metricas
  }

  MASCOTAS {
    string mascotaId PK
    string idUsuario FK
    string nombre
    string tipoAnimal
    string raza
    string comportamiento
    string rasgosParticulares
    number edad
    number peso
    string fechaNacimiento
    string fechaRegistro
    object enfermedades
    object vacunas
    string sexo
    boolean esterilizado
    object fotos
  }

  PUBLICACIONES {
    string publicacionId PK
    string idUsuario FK
    string idMascota FK
    string tipo
    string descripcion
    string fechaRegistro
    number likes
    object fotos
    string estado
    string fechaResolucion
    object ubicacion
  }

  ADOPCIONES {
    string adopcionId PK
    string idMascota FK
    string idUsuario FK
    string tipoAnimal
    string nombreMascota
    string via
    string fechaAdopcion
  }
```

## 3. ERD de SQLite offline planeado

Este diagrama representa la estructura local definida en `database/schema.ts`. La guia la describe como planeada, pero el esquema ya existe en el proyecto.

```mermaid
erDiagram
  USUARIOS_LOCAL ||--o{ MASCOTAS_LOCAL : "idUsuario"
  USUARIOS_LOCAL ||--o{ PUBLICACIONES_LOCAL : "idUsuario"
  MASCOTAS_LOCAL ||--o{ PUBLICACIONES_LOCAL : "idMascota opcional"
  USUARIOS_LOCAL ||--o{ ADOPCIONES_LOCAL : "idUsuario"
  USUARIOS_LOCAL ||--o{ ESTADISTICAS_LOCAL : "idUsuario"
  USUARIOS_LOCAL ||--o{ CAMBIOS_PENDIENTES : "userId"
  USUARIOS_LOCAL ||--o{ SYNC_ESTADO : "idUsuario"
  USUARIOS_LOCAL ||--o{ REPORTES_GENERADOS : "userId opcional"

  USUARIOS_LOCAL {
    string id PK
    string idAuth
    string nombreCompleto
    string nombreUsuario
    string celular
    string correo
    string fotoPerfil
    string rol
    string fechaNacimiento
    string fechaRegistro
    int numMascotas
    int numPublicaciones
    string datosJson
    int pendienteSync
    string actualizadoEn
  }

  MASCOTAS_LOCAL {
    string id PK
    string idUsuario FK
    string nombre
    string tipoAnimal
    string raza
    string comportamiento
    string rasgosParticulares
    int edad
    float peso
    string fechaNacimiento
    string fechaRegistro
    string enfermedadesJson
    string vacunasJson
    string sexo
    int esterilizado
    string fotosJson
    string datosJson
    int pendienteSync
    int eliminadoLocal
    int creadoLocal
    string actualizadoEn
  }

  PUBLICACIONES_LOCAL {
    string id PK
    string idUsuario FK
    string idMascota FK
    string tipo
    string descripcion
    string fechaRegistro
    int likes
    string fotosJson
    string estado
    string fechaResolucion
    float latitude
    float longitude
    string datosJson
    int pendienteSync
    int eliminadoLocal
    int creadoLocal
    string actualizadoEn
  }

  ADOPCIONES_LOCAL {
    string id PK
    string idMascota
    string idUsuario FK
    string tipoAnimal
    string nombreMascota
    string via
    string fechaAdopcion
    string datosJson
    int pendienteSync
    int eliminadoLocal
    int creadoLocal
    string actualizadoEn
  }

  ESTADISTICAS_LOCAL {
    string idUsuario PK
    int totalMascotas
    int totalPublicaciones
    int totalReportes
    int totalPerdidos
    int totalRecreacion
    int totalAdopciones
    int adopcionesApp
    int adopcionesExternas
    string mascotasPorTipoJson
    string publicacionesPorPeriodoJson
    string adopcionesPorMesJson
    string actualizadoEn
  }

  CAMBIOS_PENDIENTES {
    int id PK
    string userId FK
    string entidad
    string entidadId
    string accion
    string payloadJson
    string fechaLocal
    int sincronizado
    int intentos
    string ultimoIntento
    string error
  }

  SYNC_ESTADO {
    string idUsuario PK
    string ultimaCargaFirebase
    string ultimaSincronizacion
    int hayCambiosPendientes
    string ultimaConexionDetectada
  }

  REPORTES_GENERADOS {
    int id PK
    string userId
    string titulo
    string tipo
    string entidadOrigen
    string entidadId
    string fileName
    string fileUri
    string fechaCreacion
    string fechaModificacion
    string descripcion
  }
```

## 4. Clases y modelos principales

```mermaid
classDiagram
  class Usuario {
    string idAuth
    string nombreCompleto
    string nombreUsuario
    string celular
    string correo
    string contrasena
    string fotoPerfil
    string rol
    string fechaNacimiento
    string fechaRegistro
    Metricas metricas
  }

  class Metricas {
    number numMascotas
    number numPublicaciones
  }

  class Mascota {
    string idUsuario
    string nombre
    string tipoAnimal
    string raza
    string comportamiento
    string rasgosParticulares
    number edad
    number peso
    string fechaNacimiento
    string fechaRegistro
    object enfermedades
    object vacunas
    string sexo
    boolean esterilizado
    object fotos
  }

  class Publicacion {
    string idUsuario
    string idMascota
    string tipo
    string descripcion
    string fechaRegistro
    number likes
    object fotos
    string estado
    string fechaResolucion
    Ubicacion ubicacion
  }

  class Ubicacion {
    number latitude
    number longitude
  }

  class Adopcion {
    string idMascota
    string idUsuario
    string tipoAnimal
    string nombreMascota
    string via
    string fechaAdopcion
  }

  class FotoMascota {
    string idFoto
    string idMascota
    string idUsuario
    string fechaRegistro
    string url
  }

  class ReporteGenerado {
    number id
    string userId
    string titulo
    string tipo
    string entidadOrigen
    string entidadId
    string fileName
    string fileUri
    string fechaCreacion
    string fechaModificacion
    string descripcion
  }

  Usuario *-- Metricas
  Usuario "1" --> "0..*" Mascota : idUsuario
  Usuario "1" --> "0..*" Publicacion : idUsuario
  Usuario "1" --> "0..*" Adopcion : idUsuario
  Mascota "1" --> "0..*" Publicacion : idMascota opcional
  Mascota "1" --> "0..*" FotoMascota : referencia
  Publicacion *-- Ubicacion
```

## 5. Arquitectura general

```mermaid
flowchart TB
  subgraph UI["Expo React Native UI"]
    Stack["app/_layout.tsx Stack"]
    Login["app/index.tsx Login"]
    Registro["app/registro.tsx Registro"]
    Drawer["app/(drawer)/_layout.tsx Drawer"]
    Tabs["app/(drawer)/(tabs)"]
    Detail["Detalle mascota/publicacion"]
    Create["Crear mascota/publicacion"]
    ReportsUI["Reportes generados"]
  end

  subgraph State["Estado local de app"]
    AsyncStorage["AsyncStorage sesion y tema"]
    Theme["ThemeContext"]
    NetworkHooks["useNetworkStatus y usePendingSync"]
  end

  subgraph Local["Capa local"]
    SQLite["SQLite redpatitas.db"]
    LocalRepos["database/*Local.ts"]
    Pending["cambios_pendientes"]
    ReportIndex["reportes_generados"]
    FileSystem["FileSystem reportes/*.txt"]
  end

  subgraph Services["Servicios"]
    FirebasePersonal["firebasePersonalService"]
    SyncService["syncService"]
    Cloudinary["cloudinaryService"]
    ReportFiles["utils/reportFiles.ts"]
    ReportTemplates["utils/reportTemplates.ts"]
  end

  subgraph Remote["Servicios remotos"]
    Firebase["Firebase Realtime Database"]
    Cloud["Cloudinary imagenes"]
  end

  Stack --> Theme
  Stack --> SQLite
  Login --> AsyncStorage
  Login --> SyncService
  Drawer --> NetworkHooks
  Drawer --> AsyncStorage
  Tabs --> FirebasePersonal
  Tabs --> LocalRepos
  Detail --> ReportTemplates
  Detail --> ReportFiles
  Create --> Cloudinary
  ReportsUI --> ReportIndex
  ReportsUI --> FileSystem

  SyncService --> FirebasePersonal
  SyncService --> LocalRepos
  SyncService --> Pending
  SyncService --> Cloudinary
  FirebasePersonal --> Firebase
  Cloudinary --> Cloud
  LocalRepos --> SQLite
  ReportFiles --> FileSystem
```

## 6. Navegacion de la app

```mermaid
flowchart TD
  Root["app/_layout.tsx"]
  Splash["Splash 2.5 s"]
  Login["app/index.tsx Login"]
  Registro["app/registro.tsx Registro"]
  Drawer["app/(drawer)/_layout.tsx"]
  Tabs["app/(drawer)/(tabs)/_layout.tsx"]
  Home["(tabs)/index.tsx Feed"]
  Map["(tabs)/map.tsx Mapa"]
  Stats["(tabs)/estadisticas.tsx Estadisticas"]
  MisMascotas["misMascotas.tsx"]
  Perfil["perfil.tsx"]
  MisPublicaciones["misPublicaciones.tsx oculto en drawer"]
  Reportes["reportesGenerados.tsx"]
  MascotaDetalle["app/mascota/[id].tsx"]
  MascotaNueva["app/mascota/nueva.tsx"]
  PubDetalle["app/publicacion/[id].tsx"]
  PubNueva["app/publicacion/nueva.tsx"]

  Root --> Splash
  Splash --> Login
  Login --> Registro
  Login --> Drawer
  Drawer --> Tabs
  Tabs --> Home
  Tabs --> Map
  Tabs --> Stats
  Drawer --> MisMascotas
  Drawer --> Perfil
  Drawer --> MisPublicaciones
  Drawer --> Reportes
  MisMascotas --> MascotaNueva
  MisMascotas --> MascotaDetalle
  Perfil --> MascotaNueva
  Perfil --> MascotaDetalle
  Perfil --> MisPublicaciones
  Perfil --> PubNueva
  Perfil --> PubDetalle
  MisPublicaciones --> PubNueva
  MisPublicaciones --> PubDetalle
  Home --> PubDetalle
  MascotaDetalle --> Reportes
  PubDetalle --> Reportes
```

## 7. Secuencia de inicio de sesion y carga local

```mermaid
sequenceDiagram
  actor U as Usuario
  participant Login as app/index.tsx
  participant FB as Firebase usuarios
  participant AS as AsyncStorage
  participant Sync as syncService
  participant FPS as firebasePersonalService
  participant DB as SQLite
  participant Nav as expo-router

  U->>Login: Ingresa correo/usuario y contrasena
  Login->>FB: get(usuarios)
  FB-->>Login: usuarios
  Login->>Login: Busca usuario y compara contrasena manual
  alt Credenciales validas
    Login->>AS: Guarda userRole, userName, userAvatar, userEmail, userId
    Login->>Sync: prepararDatosOffline(userId)
    Sync->>FPS: descargarDatosPersonales(userId)
    FPS->>FB: Lee usuario, mascotas, publicaciones, adopciones
    FB-->>FPS: Datos filtrables por idUsuario
    FPS-->>Sync: Datos personales
    Sync->>DB: limpiarBaseLocal()
    Sync->>DB: guardar usuario, mascotas, publicaciones, adopciones
    Sync->>DB: recalcular estadisticas y marcar carga
    Login->>Nav: replace("/(drawer)/(tabs)")
  else Credenciales invalidas
    Login-->>U: Alert de error
  end
```

## 8. Secuencia de creacion offline

```mermaid
sequenceDiagram
  actor U as Usuario
  participant Screen as Pantalla nueva mascota/publicacion
  participant Net as useNetworkStatus
  participant DB as SQLite
  participant Pending as cambios_pendientes
  participant Stats as estadisticasLocal
  participant UI as UI

  U->>Screen: Completa formulario
  Screen->>Net: Consulta isConnected
  Net-->>Screen: false
  Screen->>Screen: Genera id local local_timestamp_random
  alt Mascota
    Screen->>DB: INSERT mascotas_local pendienteSync=1 creadoLocal=1
    Screen->>Pending: registrarCambioPendiente("mascota","crear",payload)
  else Publicacion
    Screen->>DB: INSERT publicaciones_local pendienteSync=1 creadoLocal=1
    Screen->>Pending: registrarCambioPendiente("publicacion","crear",payload)
  end
  Screen->>Stats: recalcularYGuardarEstadisticas(userId)
  Screen-->>UI: Alert "guardado localmente"
  UI-->>U: Item visible con PendingSyncBadge
```

## 9. Secuencia de sincronizacion al recuperar internet

```mermaid
sequenceDiagram
  actor U as Usuario
  participant Hook as usePendingSync
  participant Net as useNetworkStatus
  participant Modal as SyncChangesModal
  participant Sync as syncService
  participant Pending as cambios_pendientes
  participant Cloudinary as Cloudinary
  participant FB as Firebase
  participant DB as SQLite

  Net-->>Hook: Transicion offline a online
  Hook->>Pending: contarCambiosPendientes(userId)
  alt Hay pendientes
    Hook-->>Modal: Mostrar modal con total
    U->>Modal: Presiona "Subir cambios"
    Modal->>Sync: sincronizarCambiosPendientes(userId)
    Sync->>Pending: listarCambiosPendientes(userId)
    loop Por cambio en fechaLocal ascendente
      alt crear o actualizar con fotos locales
        Sync->>Cloudinary: subirFotosLocales(payload.fotos)
        Cloudinary-->>Sync: URLs remotas
      end
      alt entidad mascota
        Sync->>FB: push/update/remove mascotas
      else entidad publicacion
        Sync->>FB: push/update/remove publicaciones
      else entidad usuario
        Sync->>FB: update usuarios/userId
      else entidad adopcion
        Sync->>FB: push/update/remove adopciones
      end
      alt Exito
        Sync->>DB: reemplaza id local o marca sincronizado
        Sync->>Pending: marcarCambioSincronizado
      else Error
        Sync->>Pending: registrarErrorCambio
      end
    end
    Sync->>Pending: limpiarCambiosSincronizados
    Sync->>DB: refrescarDatosPersonales desde Firebase si todo salio bien
    Modal-->>U: Cierra modal
  else Sin pendientes
    Hook-->>Modal: No mostrar
  end
```

## 10. Secuencia de exportacion TXT

```mermaid
sequenceDiagram
  actor U as Usuario
  participant Detail as Detalle mascota/publicacion
  participant AS as AsyncStorage
  participant Template as reportTemplates.ts
  participant Files as reportFiles.ts
  participant FS as FileSystem
  participant Index as reportesLocal.ts
  participant Share as expo-sharing

  U->>Detail: Presiona Exportar reporte
  Detail->>AS: getItem(userId)
  alt Reporte de mascota
    Detail->>Template: generarReporteMascota(id, mascota, usuario)
  else Reporte de publicacion
    Detail->>Template: generarReportePublicacion(id, publicacion, usuario, mascota)
  end
  Template-->>Detail: Contenido TXT
  Detail->>Files: crearNombreArchivo(prefix, titulo)
  Detail->>Files: guardarReporteTxt(fileName, contenido)
  Files->>FS: asegurarCarpetaReportes()
  Files->>FS: writeAsStringAsync(fileUri, contenido)
  Files-->>Detail: fileUri
  Detail->>Index: insertarReporteGenerado(metadata)
  Detail-->>U: Alert "Reporte generado"
  opt Compartir ahora
    Detail->>Files: compartirReporteTxt(fileUri)
    Files->>Share: shareAsync(fileUri)
  end
```

## 11. Flujo del modo offline

```mermaid
flowchart TD
  Start["App con sesion activa"]
  Detect["useNetworkStatus detecta conexion"]
  Online{"isConnected?"}
  Personal["Pantallas personales: perfil, mis mascotas, mis publicaciones"]
  Global["Pantallas globales: feed, mapa, estadisticas"]
  LocalRead["Leer SQLite local"]
  FirebaseRead["Leer Firebase y refrescar SQLite"]
  OfflineBanner["Mostrar OfflineBanner"]
  BlockGlobal["Mostrar mensaje de no disponibilidad"]
  WriteAction{"Crear, editar o eliminar?"}
  LocalWrite["Guardar en SQLite"]
  Pending["Registrar cambio pendiente"]
  Badge["Mostrar PendingSyncBadge"]
  ReturnOnline["Conexion recuperada"]
  Prompt["SyncChangesModal"]
  Sync["Sincronizar con Firebase"]

  Start --> Detect
  Detect --> Online
  Online -- "si" --> FirebaseRead
  Online -- "no" --> Personal
  Online -- "no" --> Global
  Personal --> LocalRead
  LocalRead --> OfflineBanner
  Global --> BlockGlobal
  OfflineBanner --> WriteAction
  WriteAction -- "si" --> LocalWrite
  LocalWrite --> Pending
  Pending --> Badge
  Detect --> ReturnOnline
  ReturnOnline --> Prompt
  Prompt --> Sync
```

## 12. Componentes y modulos

```mermaid
flowchart LR
  subgraph Screens["Pantallas"]
    Login["index.tsx"]
    Registro["registro.tsx"]
    Home["(tabs)/index.tsx"]
    Mapa["(tabs)/map.tsx"]
    Estadisticas["(tabs)/estadisticas.tsx"]
    Perfil["perfil.tsx"]
    MisMascotas["misMascotas.tsx"]
    MisPublicaciones["misPublicaciones.tsx"]
    MascotaDetalle["mascota/[id].tsx"]
    MascotaNueva["mascota/nueva.tsx"]
    PubDetalle["publicacion/[id].tsx"]
    PubNueva["publicacion/nueva.tsx"]
    Reportes["reportesGenerados.tsx"]
  end

  subgraph Components["Componentes"]
    OfflineBanner["OfflineBanner"]
    PendingSyncBadge["PendingSyncBadge"]
    SyncChangesModal["SyncChangesModal"]
    ReporteCard["ReporteCard"]
  end

  subgraph Hooks["Hooks"]
    UseNetwork["useNetworkStatus"]
    UsePending["usePendingSync"]
    UseShake["useShake"]
  end

  subgraph Database["Database local"]
    Schema["schema.ts"]
    LocalDb["localDb.ts"]
    UsuariosLocal["usuariosLocal.ts"]
    MascotasLocal["mascotasLocal.ts"]
    PublicacionesLocal["publicacionesLocal.ts"]
    AdopcionesLocal["adopcionesLocal.ts"]
    EstadisticasLocal["estadisticasLocal.ts"]
    Cambios["cambiosPendientes.ts"]
    SyncEstado["syncEstadoLocal.ts"]
    ReportesLocal["reportesLocal.ts"]
  end

  subgraph Services["Servicios y utils"]
    FirebaseSvc["firebasePersonalService.ts"]
    SyncSvc["syncService.ts"]
    NetworkSvc["networkService.ts"]
    CloudinarySvc["cloudinaryService.ts"]
    ReportTemplates["reportTemplates.ts"]
    ReportFiles["reportFiles.ts"]
    Avatars["avatars.ts"]
  end

  Screens --> Components
  Screens --> Hooks
  Screens --> Database
  Screens --> Services
  Hooks --> NetworkSvc
  UsePending --> SyncSvc
  SyncSvc --> Database
  SyncSvc --> FirebaseSvc
  SyncSvc --> CloudinarySvc
  MascotaDetalle --> ReportTemplates
  PubDetalle --> ReportTemplates
  MascotaDetalle --> ReportFiles
  PubDetalle --> ReportFiles
  Reportes --> ReportesLocal
```

## 13. Estados de sincronizacion

Diagrama adicional generado a partir de la arquitectura offline.

```mermaid
stateDiagram-v2
  [*] --> SinSesion
  SinSesion --> CargandoSesion: login valido
  CargandoSesion --> OnlineSinPendientes: prepararDatosOffline exitoso
  CargandoSesion --> OnlineSinCacheCompleta: prepararDatosOffline falla
  OnlineSinPendientes --> Offline: se pierde conexion
  OnlineSinCacheCompleta --> Offline: se pierde conexion
  Offline --> OfflineConPendientes: crear actualizar eliminar local
  OfflineConPendientes --> ConexionRecuperada: vuelve internet
  Offline --> OnlineSinPendientes: vuelve internet sin cambios
  ConexionRecuperada --> EsperandoDecision: hay cambios_pendientes
  EsperandoDecision --> OfflineConPendientes: Ahora no
  EsperandoDecision --> Sincronizando: Subir cambios
  Sincronizando --> OnlineSinPendientes: todos los cambios exitosos
  Sincronizando --> OnlineConErrores: algun cambio falla
  OnlineConErrores --> EsperandoDecision: reintentar
  OnlineSinPendientes --> SinSesion: cerrar sesion
```

## 14. Flujo de reportes generados

Diagrama adicional porque el proyecto ya contiene la funcionalidad de reportes TXT y su pantalla en el Drawer.

```mermaid
flowchart TD
  Detail["Detalle de mascota o publicacion"]
  Generate["Generar contenido con reportTemplates"]
  Save["Guardar TXT con reportFiles"]
  Index["Insertar metadata en reportes_generados"]
  Drawer["Drawer: Reportes generados"]
  List["Listar reportes con reportesLocal"]
  Actions{"Accion del usuario"}
  Open["Leer archivo TXT"]
  Edit["Editar contenido y actualizar metadata"]
  Share["Compartir con expo-sharing"]
  Delete["Eliminar archivo y registro local"]
  Firebase["Firebase"]

  Detail --> Generate
  Generate --> Save
  Save --> Index
  Index --> Drawer
  Drawer --> List
  List --> Actions
  Actions -- "Ver" --> Open
  Actions -- "Editar" --> Edit
  Actions -- "Compartir" --> Share
  Actions -- "Eliminar" --> Delete
  Open -. "no modifica" .-> Firebase
  Edit -. "no modifica" .-> Firebase
  Delete -. "no modifica" .-> Firebase
```

## 15. Lectura por pantalla segun conectividad

Diagrama adicional para resumir la politica de fuentes de datos.

```mermaid
flowchart TB
  Screen{"Pantalla"}
  Conn{"Hay internet?"}
  Personal{"Es personal?"}
  FB["Firebase"]
  Cache["Actualizar SQLite"]
  SQLite["SQLite"]
  Block["Mensaje de no disponibilidad"]
  Render["Renderizar UI"]

  Screen --> Conn
  Conn -- "si" --> FB
  FB --> Cache
  Cache --> Render
  Conn -- "no" --> Personal
  Personal -- "si: perfil, mis mascotas, mis publicaciones, detalle local" --> SQLite
  SQLite --> Render
  Personal -- "no: feed global o mapa global" --> Block
  Block --> Render
```

