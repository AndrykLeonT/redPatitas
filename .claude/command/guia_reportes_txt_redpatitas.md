# Guía de implementación: Reportes en archivos de texto — RedPatitas

## 1. Objetivo

Implementar una funcionalidad sencilla y coherente para exportar información de mascotas y publicaciones a archivos `.txt`.

La funcionalidad debe permitir que el usuario genere reportes locales desde:

- Detalle de una mascota propia.
- Detalle de una publicación propia.
- Detalle de una publicación global.
- Detalle de una mascota asociada a una publicación, cuando aplique.

Además, se debe agregar una nueva opción en el Drawer llamada **Reportes generados**, donde el usuario pueda consultar, abrir, editar y eliminar los archivos de texto creados desde la aplicación.

Esta funcionalidad es independiente del perfil del usuario. No debe sincronizarse con Firebase ni depender de la sesión activa, salvo para incluir información del usuario actual cuando se genere el archivo.

---

## 2. Alcance funcional

### 2.1 Funciones principales

La app deberá permitir:

1. Exportar información de una mascota a un archivo `.txt`.
2. Exportar información de una publicación a un archivo `.txt`.
3. Guardar el archivo localmente en el dispositivo.
4. Registrar el archivo generado en un índice local.
5. Mostrar los reportes generados desde una pantalla en el Drawer.
6. Abrir/compartir un reporte generado.
7. Editar el contenido de un reporte generado.
8. Eliminar un reporte generado.

---

## 3. Librerías necesarias

Instalar:

```bash
npx expo install expo-file-system expo-sharing
```

Opcional si se desea abrir archivos con apps externas:

```bash
npx expo install expo-intent-launcher
```

Para este proyecto, lo mínimo recomendado es:

```bash
npx expo install expo-file-system expo-sharing
```

---

## 4. Estructura sugerida de archivos

Crear los siguientes archivos:

```txt
utils/
  reportTemplates.ts
  reportFiles.ts

database/
  reportesLocal.ts

components/
  ReporteCard.tsx

app/
  (drawer)/
    reportesGenerados.tsx
```

Modificar:

```txt
app/(drawer)/_layout.tsx
app/mascota/[id].tsx
app/publicacion/[id].tsx
```

---

## 5. Comportamiento general

### 5.1 Exportar mascota

En la pantalla de detalle de mascota se agregará un botón:

```txt
Exportar reporte
```

Al presionarlo:

1. Se toma la información de la mascota actual.
2. Se genera un contenido en formato texto.
3. Se crea un archivo `.txt` local.
4. Se guarda un registro del archivo en un índice local.
5. Se muestra confirmación al usuario.
6. Opcionalmente se ofrece compartir el archivo.

---

### 5.2 Exportar publicación

En la pantalla de detalle de publicación se agregará un botón:

```txt
Exportar reporte
```

Al presionarlo:

1. Se toma la información de la publicación actual.
2. Si tiene mascota asociada, se puede incluir información básica de la mascota.
3. Si tiene ubicación, se agregan latitud y longitud.
4. Se genera un archivo `.txt`.
5. Se registra localmente.
6. Se muestra confirmación.

---

### 5.3 Reportes generados en Drawer

Agregar una nueva pantalla al Drawer:

```txt
Reportes generados
```

La pantalla mostrará una lista de archivos generados localmente.

Cada reporte deberá mostrar:

- Título.
- Tipo de reporte.
- Fecha de creación.
- Nombre del archivo.
- Acciones: abrir, editar, eliminar, compartir.

---

## 6. Almacenamiento de archivos

Los archivos se deben guardar en una carpeta interna de la app:

```txt
FileSystem.documentDirectory + "reportes/"
```

Ejemplo de ruta:

```txt
file:///data/user/0/.../files/reportes/mascota_max_2026-05-19.txt
```

Antes de guardar archivos, asegurarse de que la carpeta exista.

---

## 7. Índice local de reportes

Aunque los archivos `.txt` se guardan físicamente en el almacenamiento local, conviene tener un índice para listarlos fácilmente.

Como el proyecto ya integrará SQLite para la lógica offline, se recomienda crear una tabla local:

```sql
CREATE TABLE IF NOT EXISTS reportes_generados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
```

---

## 8. Valores permitidos

### 8.1 Campo `tipo`

```txt
mascota
publicacion
reporte_perdido
reporte_maltrato
recreacion
general
```

### 8.2 Campo `entidadOrigen`

```txt
mascota
publicacion
global
manual
```

---

## 9. Archivo `utils/reportTemplates.ts`

Este archivo debe encargarse únicamente de generar el contenido textual de los reportes.

No debe guardar archivos.

Ejemplo:

```ts
import { Mascota, Publicacion, Usuario } from "../models/firebaseModels";

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
Raza: ${mascota.raza}
Sexo: ${mascota.sexo}
Edad: ${mascota.edad} año(s)
Peso: ${mascota.peso} kg
Esterilizado: ${mascota.esterilizado ? "Sí" : "No"}

Comportamiento:
${mascota.comportamiento || "Sin información"}

Rasgos particulares:
${mascota.rasgosParticulares || "Sin información"}

Enfermedades:
${enfermedades.length ? enfermedades.map((e) => `- ${e}`).join("\n") : "Sin enfermedades registradas"}

Vacunas:
${vacunas.length ? vacunas.map((v) => `- ${v}`).join("\n") : "Sin vacunas registradas"}

Fotos registradas:
${fotos.length ? fotos.map((f) => `- ${f}`).join("\n") : "Sin fotos registradas"}

Usuario relacionado:
${usuario ? `${usuario.nombreCompleto} (${usuario.correo})` : "No disponible"}

Fecha de registro:
${mascota.fechaRegistro}

Fecha de generación:
${new Date().toLocaleString("es-MX")}
`;
}
```

---

## 10. Plantilla para publicación

```ts
import { Mascota, Publicacion, Usuario } from "../models/firebaseModels";

export function generarReportePublicacion(params: {
  id: string;
  publicacion: Publicacion;
  usuario?: Usuario | null;
  mascota?: Mascota | null;
}) {
  const { id, publicacion, usuario, mascota } = params;

  const fotos = Object.values(publicacion.fotos ?? {});

  return `REDPATITAS - REPORTE DE PUBLICACIÓN

ID de publicación: ${id}
Tipo: ${publicacion.tipo}
Estado: ${publicacion.estado}
Likes: ${publicacion.likes}

Descripción:
${publicacion.descripcion || "Sin descripción"}

Fecha de registro:
${publicacion.fechaRegistro}

Fecha de resolución:
${publicacion.fechaResolucion ?? "No resuelta"}

Ubicación:
${
  publicacion.ubicacion
    ? `Latitud: ${publicacion.ubicacion.latitude}\nLongitud: ${publicacion.ubicacion.longitude}`
    : "Sin ubicación registrada"
}

Fotos registradas:
${fotos.length ? fotos.map((f) => `- ${f}`).join("\n") : "Sin fotos registradas"}

Mascota relacionada:
${mascota ? `${mascota.nombre} - ${mascota.tipoAnimal} - ${mascota.raza}` : "No asociada"}

Usuario relacionado:
${usuario ? `${usuario.nombreCompleto} (${usuario.correo})` : "No disponible"}

Fecha de generación:
${new Date().toLocaleString("es-MX")}
`;
}
```

---

## 11. Archivo `utils/reportFiles.ts`

Este archivo debe encargarse de operaciones físicas con archivos.

Responsabilidades:

- Crear carpeta `reportes/`.
- Crear archivo `.txt`.
- Leer archivo.
- Sobrescribir archivo.
- Eliminar archivo.
- Compartir archivo.

Ejemplo:

```ts
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const REPORTES_DIR = `${FileSystem.documentDirectory}reportes/`;

export async function asegurarCarpetaReportes() {
  const info = await FileSystem.getInfoAsync(REPORTES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(REPORTES_DIR, { intermediates: true });
  }
}

export function crearNombreArchivo(prefix: string, titulo: string) {
  const limpio = titulo
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  const fecha = new Date().toISOString().slice(0, 10);

  return `${prefix}_${limpio || "reporte"}_${fecha}.txt`;
}

export async function guardarReporteTxt(fileName: string, contenido: string) {
  await asegurarCarpetaReportes();

  const fileUri = `${REPORTES_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}

export async function leerReporteTxt(fileUri: string) {
  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function actualizarReporteTxt(fileUri: string, contenido: string) {
  await FileSystem.writeAsStringAsync(fileUri, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function eliminarReporteTxt(fileUri: string) {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    await FileSystem.deleteAsync(fileUri);
  }
}

export async function compartirReporteTxt(fileUri: string) {
  const disponible = await Sharing.isAvailableAsync();

  if (!disponible) {
    throw new Error("La función de compartir no está disponible en este dispositivo.");
  }

  await Sharing.shareAsync(fileUri);
}
```

---

## 12. Archivo `database/reportesLocal.ts`

Este archivo debe manejar el índice local de reportes.

Funciones sugeridas:

```ts
export type ReporteGenerado = {
  id: number;
  titulo: string;
  tipo: string;
  entidadOrigen: string;
  entidadId?: string | null;
  fileName: string;
  fileUri: string;
  fechaCreacion: string;
  fechaModificacion?: string | null;
  descripcion?: string | null;
};

export async function insertarReporteGenerado(reporte: Omit<ReporteGenerado, "id">) {}

export async function obtenerReportesGenerados(): Promise<ReporteGenerado[]> {}

export async function obtenerReporteGenerado(id: number): Promise<ReporteGenerado | null> {}

export async function actualizarMetadataReporte(
  id: number,
  data: Partial<Pick<ReporteGenerado, "titulo" | "descripcion" | "fechaModificacion">>
) {}

export async function eliminarRegistroReporte(id: number) {}
```

---

## 13. Flujo para crear reporte de mascota

```txt
Usuario abre detalle de mascota
  ↓
Presiona "Exportar reporte"
  ↓
Se genera contenido con reportTemplates.ts
  ↓
Se genera nombre de archivo con reportFiles.ts
  ↓
Se guarda archivo en FileSystem
  ↓
Se registra en reportes_generados
  ↓
Se muestra Alert:
"Reporte generado correctamente"
```

---

## 14. Flujo para crear reporte de publicación

```txt
Usuario abre detalle de publicación
  ↓
Presiona "Exportar reporte"
  ↓
Se genera contenido con datos de la publicación
  ↓
Si hay mascota asociada, incluir datos básicos
  ↓
Si hay ubicación, incluir coordenadas
  ↓
Se guarda archivo
  ↓
Se registra en reportes_generados
  ↓
Se muestra Alert:
"Reporte generado correctamente"
```

---

## 15. Pantalla `app/(drawer)/reportesGenerados.tsx`

La pantalla debe:

1. Cargar reportes desde SQLite.
2. Mostrar lista con `FlatList`.
3. Permitir buscar por título o tipo.
4. Permitir abrir detalle de reporte.
5. Permitir compartir.
6. Permitir eliminar.
7. Permitir editar contenido.

Diseño sugerido:

```txt
[ Reportes generados ]

Buscar reporte...

Card:
--------------------------------
Reporte de mascota: Max
Tipo: mascota
Creado: 19/05/2026
Archivo: mascota_max_2026-05-19.txt

[Ver] [Compartir] [Editar] [Eliminar]
--------------------------------
```

---

## 16. Edición de reportes

Para editar un reporte:

1. Leer contenido del archivo con `leerReporteTxt`.
2. Mostrarlo en un `TextInput` multiline.
3. Permitir guardar cambios.
4. Sobrescribir archivo con `actualizarReporteTxt`.
5. Actualizar `fechaModificacion` en `reportes_generados`.

La edición solo modifica el archivo `.txt`, no modifica Firebase, SQLite offline ni los datos originales.

---

## 17. Eliminación de reportes

Cuando el usuario elimina un reporte:

1. Confirmar con `Alert`.
2. Eliminar archivo físico.
3. Eliminar registro de `reportes_generados`.
4. Actualizar lista.

Importante:

La eliminación de un reporte generado no debe eliminar mascotas, publicaciones ni datos de Firebase.

---

## 18. Relación con la sesión

Los reportes generados serán locales e independientes del perfil.

Esto significa:

- No se sincronizan con Firebase.
- No se borran automáticamente al cerrar sesión.
- Pueden permanecer aunque otro usuario inicie sesión en el mismo dispositivo.
- No forman parte de las estadísticas del perfil.
- No forman parte de `cambios_pendientes`.

Si se desea evitar que otros usuarios vean reportes anteriores, se puede agregar `userId` a la tabla `reportes_generados`.

Versión recomendada para mayor privacidad:

```sql
ALTER TABLE reportes_generados ADD COLUMN userId TEXT;
```

Y filtrar por usuario actual.

Sin embargo, si se quiere que sea un repositorio local independiente, se puede omitir `userId`.

Para este proyecto se recomienda incluir `userId` pero no eliminar los reportes al cerrar sesión.

Tabla recomendada final:

```sql
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
```

---

## 19. BDD

### Escenario 1: Exportar mascota propia

```gherkin
Dado que el usuario está viendo el detalle de una mascota
Cuando presiona el botón "Exportar reporte"
Entonces la aplicación genera un archivo de texto con la información de la mascota
Y guarda el archivo localmente
Y registra el reporte en la sección "Reportes generados"
```

---

### Escenario 2: Exportar publicación propia

```gherkin
Dado que el usuario está viendo una publicación propia
Cuando presiona el botón "Exportar reporte"
Entonces la aplicación genera un archivo de texto con la información de la publicación
Y lo guarda localmente
Y permite consultarlo desde "Reportes generados"
```

---

### Escenario 3: Exportar publicación global

```gherkin
Dado que el usuario está viendo una publicación global
Cuando presiona el botón "Exportar reporte"
Entonces la aplicación genera un archivo de texto con la información visible de la publicación
Y lo guarda localmente
Y no modifica Firebase
```

---

### Escenario 4: Ver reportes generados

```gherkin
Dado que existen reportes generados en el dispositivo
Cuando el usuario entra a la opción "Reportes generados" del Drawer
Entonces la aplicación muestra una lista de reportes locales
```

---

### Escenario 5: Editar reporte generado

```gherkin
Dado que el usuario abrió un reporte generado
Cuando modifica el contenido y presiona "Guardar"
Entonces la aplicación sobrescribe el archivo de texto
Y actualiza la fecha de modificación del reporte
Y no modifica la mascota o publicación original
```

---

### Escenario 6: Eliminar reporte generado

```gherkin
Dado que existe un reporte generado
Cuando el usuario presiona "Eliminar"
Entonces la aplicación elimina el archivo local
Y elimina el registro del índice local
Y no elimina información de Firebase
```

---

## 20. SDD

### 20.1 Módulo de plantillas

Archivo:

```txt
utils/reportTemplates.ts
```

Responsabilidad:

- Transformar objetos `Mascota` y `Publicacion` en texto plano.
- No debe acceder a Firebase.
- No debe acceder a FileSystem.
- No debe modificar datos.

---

### 20.2 Módulo de archivos

Archivo:

```txt
utils/reportFiles.ts
```

Responsabilidad:

- Crear carpeta de reportes.
- Crear archivos `.txt`.
- Leer archivos.
- Actualizar archivos.
- Eliminar archivos.
- Compartir archivos.

---

### 20.3 Módulo de índice local

Archivo:

```txt
database/reportesLocal.ts
```

Responsabilidad:

- Insertar registros en `reportes_generados`.
- Listar reportes generados.
- Buscar por ID.
- Actualizar metadata.
- Eliminar registros.

---

### 20.4 Pantalla de reportes generados

Archivo:

```txt
app/(drawer)/reportesGenerados.tsx
```

Responsabilidad:

- Mostrar los reportes locales.
- Permitir buscar.
- Permitir abrir.
- Permitir compartir.
- Permitir editar.
- Permitir eliminar.

---

### 20.5 Integración con detalle de mascota

Archivo:

```txt
app/mascota/[id].tsx
```

Responsabilidad:

- Agregar botón "Exportar reporte".
- Obtener mascota actual.
- Generar contenido con `generarReporteMascota`.
- Guardar archivo con `guardarReporteTxt`.
- Registrar índice con `insertarReporteGenerado`.

---

### 20.6 Integración con detalle de publicación

Archivo:

```txt
app/publicacion/[id].tsx
```

Responsabilidad:

- Agregar botón "Exportar reporte".
- Obtener publicación actual.
- Incluir ubicación si existe.
- Incluir mascota relacionada si existe.
- Guardar archivo.
- Registrar índice.

---

## 21. Reglas importantes

1. Los reportes `.txt` no se sincronizan con Firebase.
2. Los reportes `.txt` no forman parte de los cambios pendientes offline.
3. Editar un reporte no modifica la mascota o publicación original.
4. Eliminar un reporte no elimina datos reales de la app.
5. El reporte debe contener únicamente información disponible para la pantalla actual.
6. Las fotos se guardan como URLs de texto, no como archivos de imagen.
7. La sección del Drawer debe seguir la estética del proyecto.
8. Usar `useTheme()` para colores.
9. No usar stylesheet global.
10. Mantener estilos con `StyleSheet.create`.

---

## 22. Criterios de aceptación

La implementación se considera completa si:

- Existe una opción nueva en el Drawer llamada "Reportes generados".
- Se puede exportar una mascota como `.txt`.
- Se puede exportar una publicación como `.txt`.
- Los archivos se guardan localmente.
- Los reportes aparecen en la pantalla de reportes generados.
- Se puede leer el contenido de un reporte.
- Se puede editar el contenido de un reporte.
- Se puede eliminar un reporte.
- Se puede compartir un reporte.
- La funcionalidad no altera Firebase.
- La funcionalidad no interfiere con la sincronización offline de SQLite.

---

## 23. Implementación mínima recomendada

Para una primera versión, implementar en este orden:

1. Instalar `expo-file-system` y `expo-sharing`.
2. Crear tabla `reportes_generados`.
3. Crear `utils/reportTemplates.ts`.
4. Crear `utils/reportFiles.ts`.
5. Crear `database/reportesLocal.ts`.
6. Agregar botón en detalle de mascota.
7. Agregar botón en detalle de publicación.
8. Crear pantalla `reportesGenerados.tsx`.
9. Agregar opción al Drawer.
10. Implementar eliminar y compartir.
11. Implementar edición.

---

## 24. Nota para Claude Code

Respetar la arquitectura actual del proyecto RedPatitas:

- Expo + React Native + TypeScript.
- `expo-router` con rutas basadas en archivos.
- Drawer en `app/(drawer)/`.
- Estilos locales con `StyleSheet.create`.
- Tema mediante `useTheme()`.
- Firebase como fuente principal de datos.
- SQLite para persistencia local offline.
- Archivos `.txt` como reportes locales independientes.

No modificar la estructura de Firebase para esta funcionalidad.

No agregar Firebase Storage.

No guardar archivos `.txt` en Firebase.

No mezclar esta funcionalidad con `cambios_pendientes`.

Esta funcionalidad debe ser local, simple y complementaria.
