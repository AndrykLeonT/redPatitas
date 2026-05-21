# Plan de Implementación: Sistema de Bitácora de Accesos a Datos (Auditoría)

Permitir el rastreo y auditoría centralizada de cualquier operación de lectura o escritura realizada en los distintos motores de almacenamiento de la aplicación (Firebase Realtime Database, SQLite local via Expo SQLite, AsyncStorage y Archivos de Texto locales). Los registros se persistirán en un archivo de texto dedicado y serán accesibles mediante una nueva pantalla protegida en el menú del Drawer, permitiendo además su visualización y vaciado (reinicio).

---

## 📋 Resumen de Requerimientos Técnicos

1. **Persistencia de la Bitácora**: Un archivo de texto plano (`bitacora_accesos.txt`) gestionado mediante `expo-file-system`.
2. **Formato por Registro**: Cada línea o bloque de transacción debe registrar estrictamente:
   `[No. Transacción] | [Fecha ISO/Local] | [Tipo Almacenamiento] | [Operación] | [Resumen Tablas/Colecciones]`
3. **Puntos de Intersección (Hooks/Interceptors)**: Interceptar de forma global o mediante wrappers las operaciones de:
   - **Firebase**: Consultas (`get`, `onValue`), inserciones/cambios (`set`, `push`, `update`, `remove`).
   - **SQLite**: Ejecución de sentencias en `localDb.ts` (Queries, Mutations).
   - **AsyncStorage**: Lecturas/escrituras de sesión o configuraciones.
   - **Archivos de Texto**: Generación o lectura de reportes TXT existentes.
4. **Pantalla de Visualización**: Nueva ruta en el Drawer con una interfaz limpia, un botón para refrescar/leer el archivo y un botón crítico de peligro para "Reiniciar Bitácora" (eliminar/truncar archivo).

---

## 📐 Cambios Propuestos de Arquitectura y Archivos

### 1. Capa de Servicio Core (Nueva)
* **[NEW] `services/auditoriaService.ts`**
  - Encargado de centralizar las llamadas de registro.
  - Mantener un contador incremental para el `Número de Transacción` (persistido de forma segura para no reiniciarse con un crash de la app).
  - Método `registrarAcceso(almacenamiento: string, operacion: 'CONSULTA' | 'INSERCION' | 'MODIFICACION' | 'ELIMINACION', resumen: string): Promise<void>`.
  - Métodos `leerBitacora(): Promise<string>` y `reiniciarBitacora(): Promise<void>`.

### 2. Intercepción en Capas de Datos Existentes (Modificaciones)
* **[MODIFY] `database/localDb.ts`**
  - Modificar el wrapper ejecutor de SQL para invocar automáticamente a `auditoriaService.registrarAcceso('SQLite', ...)`. Debe parsear de forma simple la sentencia SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) para derivar la operación y extraer el nombre de la tabla implicada.
* **[MODIFY] `services/firebasePersonalService.ts` & `services/syncService.ts`**
  - Añadir llamadas al servicio de auditoría tras cada consulta exitosa o sincronización ascendente/descendente reflejando los nodos (`usuarios`, `mascotas`, `publicaciones`).
* **[MODIFY] Auxiliares de Almacenamiento**
  - Envolver llamadas críticas a `AsyncStorage` y la generación de archivos de texto en `utils/reportFiles.ts` para registrar sus accesos correspondientes.

### 3. Configuración del Sistema de Navegación
* **[MODIFY] `app/(drawer)/_layout.tsx`**
  - Registrar la nueva pantalla en el componente `<Drawer>` con un ícono alusivo (ej. `list-bullet.indent.left` o `shield-text`).
  - Restringir el acceso o etiquetarla visiblemente según convenga.

### 4. Interfaz de Usuario de la Bitácora
* **[NEW] `app/(drawer)/bitacora.tsx`**
  - Interfaz de diseño oscuro premium (`constants/theme.ts`).
  - Área de texto con scroll o una lista optimizada (`FlatList`) que renderice las líneas del archivo de manera legible y monoespaciada para simular una terminal de auditoría.
  - Botón superior de refresco manual.
  - Botón inferior flotante o destacado: **"Reiniciar Bitácora"**. Debe lanzar un `Alert.alert` de confirmación obligatoria debido a la pérdida irreversible de los logs de auditoría.

---

## 📋 Plan de Verificación (QA)

1. **Verificación de Formato**: Realizar operaciones mixtas (leer el feed, registrar una mascota offline, sincronizar con Firebase) y abrir la pantalla para comprobar que el parser divida correctamente los campos sin desalinear las columnas de texto.
2. **Robustez ante Vacíos**: Eliminar el archivo de texto usando el botón de reinicio y validar que la pantalla maneje un estado vacío elegante (`EmptyState`) sin crasheos y que la siguiente transacción empiece correctamente desde el ID 1 (o mantenga la secuencia según definición).
3. **Carga Eficiente**: Asegurar que si el archivo de texto crece sustancialmente, la lectura use técnicas eficientes o muestre un indicador de carga (`ActivityIndicator`) adecuado para no congelar el hilo principal de la UI.

---

## 💬 Espacio Abierto para el Agente (Aclaraciones de Comportamiento - BDD)

> **Instrucciones para el Agente CLI (Gemini/Claude):** Antes de proceder a generar código o modificar la estructura actual, revisa los siguientes puntos de comportamiento lógico y de negocio. Si encuentras ambigüedades, escribe tus dudas detalladas al usuario en la terminal.

* **Duda de Sincronización Híbrida**: Cuando la app arranca offline y lee datos de SQLite, se genera un log de tipo `SQLite`. Si un segundo después detecta red y descarga datos nuevos de `Firebase`, ¿se deben registrar como dos transacciones separadas en la bitácora o consolidarse en un único evento híbrido de sincronización?
* **Duda de Inserciones Indirectas**: Al guardar una publicación localmente, el sistema inserta registros tanto en la tabla de contenido como en la tabla interna de `cambios_pendientes`. ¿Esto cuenta como una única transacción hacia el usuario final ("Inserción en Publicaciones") o debe generar logs atómicos separados por cada tabla afectada en SQLite?
* **Secuenciador de Transacciones**: ¿El número de transacción debe ser un entero global autoincremental (`1, 2, 3...`) permanente a lo largo de la vida de la app, o se debe resetear a `1` cuando el usuario borre y limpie el archivo de texto?
* *[Deja aquí tus preguntas adicionales sobre el flujo de datos o criterios de aceptación específicos de BDD antes de iniciar...]*
