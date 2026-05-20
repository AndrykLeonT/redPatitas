# Diagramas de diseño — RedPatitas

Este documento reúne únicamente los diagramas principales de diseño para entrega académica. Los diagramas se basan en `models/firebaseModels.ts`, la estructura real de `app/` con `expo-router`, y las guías de `.claude/command/` para SQLite offline y reportes TXT.

## 1. Diagrama de clases

El siguiente diagrama representa los modelos principales del dominio de RedPatitas. `Usuario`, `Mascota`, `Publicacion`, `Adopcion` y `FotoMascota` provienen de `models/firebaseModels.ts`. `CambioPendiente` y `ReporteGenerado` se incluyen por estar descritos en las guías de funcionalidad offline y reportes TXT.

```mermaid
classDiagram
  class Usuario {
    +string idAuth
    +string nombreCompleto
    +string nombreUsuario
    +string celular
    +string correo
    +string contrasena
    +string fotoPerfil
    +string rol
    +string fechaNacimiento
    +string fechaRegistro
    +Metricas metricas
  }

  class Metricas {
    +number numMascotas
    +number numPublicaciones
  }

  class Mascota {
    +string idUsuario
    +string nombre
    +string tipoAnimal
    +string raza
    +string comportamiento
    +string rasgosParticulares
    +number edad
    +number peso
    +string fechaNacimiento
    +string fechaRegistro
    +Record enfermedades
    +Record vacunas
    +string sexo
    +boolean esterilizado
    +Record fotos
  }

  class Publicacion {
    +string idUsuario
    +string idMascota
    +string tipo
    +string descripcion
    +string fechaRegistro
    +number likes
    +Record fotos
    +string estado
    +string fechaResolucion
    +Ubicacion ubicacion
  }

  class Ubicacion {
    +number latitude
    +number longitude
  }

  class Adopcion {
    +string idMascota
    +string idUsuario
    +string tipoAnimal
    +string nombreMascota
    +string via
    +string fechaAdopcion
  }

  class FotoMascota {
    +string idFoto
    +string idMascota
    +string idUsuario
    +string fechaRegistro
    +string url
  }

  class CambioPendiente {
    +number id
    +string userId
    +string entidad
    +string entidadId
    +string accion
    +object payload
    +string fechaLocal
    +boolean sincronizado
    +number intentos
    +string error
  }

  class ReporteGenerado {
    +number id
    +string userId
    +string titulo
    +string tipo
    +string entidadOrigen
    +string entidadId
    +string fileName
    +string fileUri
    +string fechaCreacion
    +string fechaModificacion
    +string descripcion
  }

  Usuario *-- Metricas
  Publicacion *-- Ubicacion
  Usuario "1" --> "0..*" Mascota : registra
  Usuario "1" --> "0..*" Publicacion : crea
  Usuario "1" --> "0..*" Adopcion : registra
  Usuario "1" --> "0..*" CambioPendiente : encola
  Usuario "1" --> "0..*" ReporteGenerado : genera
  Mascota "1" --> "0..*" Publicacion : puede vincularse
  Mascota "1" --> "0..*" FotoMascota : fotos
  Mascota "1" --> "0..*" Adopcion : baja por adopcion

  note for CambioPendiente "Soporte offline descrito en guia SQLite"
  note for ReporteGenerado "Reportes TXT locales (planeado)"
```

## 2. Diagrama entidad-relación

### 2.1 Entidad-relación de Firebase

Este ERD representa los nodos principales de Firebase Realtime Database según `models/firebaseModels.ts`. Las llaves primarias corresponden a las claves generadas por Firebase en cada nodo.

```mermaid
erDiagram
  USUARIOS ||--o{ MASCOTAS : "idUsuario FK"
  USUARIOS ||--o{ PUBLICACIONES : "idUsuario FK"
  USUARIOS ||--o{ ADOPCIONES : "idUsuario FK"
  MASCOTAS ||--o{ PUBLICACIONES : "idMascota FK opcional"
  MASCOTAS ||--o{ FOTOS_MASCOTA : "idMascota FK"
  MASCOTAS ||--o{ ADOPCIONES : "idMascota FK"

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

  FOTOS_MASCOTA {
    string idFoto PK
    string idMascota FK
    string idUsuario FK
    string fechaRegistro
    string url
  }
```

### 2.2 Entidad-relación de SQLite offline

Este ERD resume las tablas locales propuestas/definidas para soporte offline y reportes TXT. Se basa en la guía offline SQLite, la guía de reportes TXT y el esquema local del proyecto.

```mermaid
erDiagram
  USUARIOS_LOCAL ||--o{ MASCOTAS_LOCAL : "idUsuario FK"
  USUARIOS_LOCAL ||--o{ PUBLICACIONES_LOCAL : "idUsuario FK"
  USUARIOS_LOCAL ||--o{ ADOPCIONES_LOCAL : "idUsuario FK"
  USUARIOS_LOCAL ||--|| ESTADISTICAS_LOCAL : "idUsuario PK FK"
  USUARIOS_LOCAL ||--o{ CAMBIOS_PENDIENTES : "userId FK"
  USUARIOS_LOCAL ||--|| SYNC_ESTADO : "idUsuario PK FK"
  USUARIOS_LOCAL ||--o{ REPORTES_GENERADOS_PLANEADO : "userId FK opcional"
  MASCOTAS_LOCAL ||--o{ PUBLICACIONES_LOCAL : "idMascota FK opcional"

  USUARIOS_LOCAL {
    string id PK
    string idAuth
    string nombreCompleto
    string nombreUsuario
    string correo
    string fotoPerfil
    string rol
    int numMascotas
    int numPublicaciones
    string datosJson
    int pendienteSync
  }

  MASCOTAS_LOCAL {
    string id PK
    string idUsuario FK
    string nombre
    string tipoAnimal
    string raza
    int edad
    float peso
    string enfermedadesJson
    string vacunasJson
    string fotosJson
    int pendienteSync
    int eliminadoLocal
    int creadoLocal
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
    float latitude
    float longitude
    int pendienteSync
    int eliminadoLocal
    int creadoLocal
  }

  ADOPCIONES_LOCAL {
    string id PK
    string idMascota
    string idUsuario FK
    string tipoAnimal
    string nombreMascota
    string via
    string fechaAdopcion
    int pendienteSync
  }

  ESTADISTICAS_LOCAL {
    string idUsuario PK_FK
    int totalMascotas
    int totalPublicaciones
    int totalReportes
    int totalPerdidos
    int totalRecreacion
    int totalAdopciones
    string mascotasPorTipoJson
    string publicacionesPorPeriodoJson
    string adopcionesPorMesJson
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
    string error
  }

  SYNC_ESTADO {
    string idUsuario PK_FK
    string ultimaCargaFirebase
    string ultimaSincronizacion
    int hayCambiosPendientes
    string ultimaConexionDetectada
  }

  REPORTES_GENERADOS_PLANEADO {
    int id PK
    string userId FK
    string titulo
    string tipo
    string entidadOrigen
    string entidadId
    string fileName
    string fileUri
    string fechaCreacion
    string fechaModificacion
  }
```

## 3. Diagrama de navegación de la app

El siguiente diagrama muestra la navegación principal basada en la estructura real de `app/` y `expo-router`. La pantalla `reportesGenerados.tsx` se marca como `(planeado)` por estar asociada a la guía de reportes TXT.

```mermaid
stateDiagram-v2
  [*] --> LayoutRaiz

  state "app/_layout.tsx" as LayoutRaiz
  state "app/index.tsx\nLogin / Inicio" as Login
  state "app/registro.tsx\nRegistro" as Registro
  state "app/(drawer)/\nDrawer" as Drawer
  state "app/(drawer)/(tabs)/index.tsx\nFeed principal" as Feed
  state "app/(drawer)/(tabs)/map.tsx\nMapa" as Mapa
  state "app/(drawer)/misMascotas.tsx\nMis Mascotas" as MisMascotas
  state "app/(drawer)/misPublicaciones.tsx\nMis Publicaciones" as MisPublicaciones
  state "app/(drawer)/perfil.tsx\nPerfil" as Perfil
  state "app/(drawer)/reportesGenerados.tsx\nReportes Generados (planeado)" as Reportes
  state "app/mascota/[id].tsx\nDetalle Mascota" as MascotaDetalle
  state "app/mascota/nueva.tsx\nNueva Mascota" as MascotaNueva
  state "app/publicacion/[id].tsx\nDetalle Publicacion" as PublicacionDetalle
  state "app/publicacion/nueva.tsx\nNueva Publicacion" as PublicacionNueva

  LayoutRaiz --> Login
  Login --> Registro
  Login --> Drawer
  Drawer --> Feed
  Drawer --> Mapa
  Drawer --> MisMascotas
  Drawer --> MisPublicaciones
  Drawer --> Perfil
  Drawer --> Reportes

  Feed --> PublicacionDetalle
  MisMascotas --> MascotaNueva
  MisMascotas --> MascotaDetalle
  MisPublicaciones --> PublicacionNueva
  MisPublicaciones --> PublicacionDetalle
  Perfil --> MisMascotas
  Perfil --> MisPublicaciones
  Perfil --> MascotaNueva
  Perfil --> PublicacionNueva
  Perfil --> MascotaDetalle
  Perfil --> PublicacionDetalle
  MascotaDetalle --> Reportes
  PublicacionDetalle --> Reportes
```
