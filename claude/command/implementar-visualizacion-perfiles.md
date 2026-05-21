# Contexto de la Tarea: Perfiles Públicos (Solo Lectura)

Objetivo: Permitir que cualquier usuario (incluso invitados) pueda ver la información, mascotas y publicaciones de otros usuarios. La información debe ser estrictamente de solo lectura, a menos que el perfil visitado pertenezca al usuario actualmente autenticado en `AsyncStorage`.

## Reglas Arquitectónicas Críticas (¡LEER ANTES DE CODIFICAR!)

1. NO MODIFICAR drásticamente `app/(drawer)/perfil.tsx`. Esa ruta debe mantenerse como el panel de administración privado.
2. Todo el flujo de perfil público debe construirse en una NUEVA ruta dinámica: `app/usuario/[id].tsx`.
3. Respetar la arquitectura Híbrida: La carga de datos en la nueva pantalla debe intentar leer de SQLite local primero y respaldarse con Firebase si es necesario.
4. Las listas de fotos, vacunas o enfermedades de las mascotas de otros usuarios deben seguir procesándose como `Record<string, string>` (diccionarios), NUNCA como arrays.

---

## Plan de Implementación Paso a Paso

Por favor, ejecuta estos pasos secuencialmente, confirmando cada uno antes de pasar al siguiente.

### Paso 1: Puntos de Entrada (Navegación al Perfil)

Debes agregar un botón o área clickeable que diga "Ver perfil" y redirija a `router.push('/usuario/${idUsuarioPublicacion}')`.

- **Archivo 1:** `app/(drawer)/(tabs)/index.tsx` (Listado global de publicaciones). Agrega el botón de "Ver perfil" en la tarjeta de previsualización de cada publicación.
- **Archivo 2:** `app/publicacion/[id].tsx` (Detalle de la publicación). Agrega el botón debajo del nombre del autor de la publicación.

### Paso 2: Creación de la Ruta del Perfil Público

Crea el archivo `app/usuario/[id].tsx`.

- **Lógica de Estado:** Recupera el `[id]` de los parámetros de la ruta.
- **Validación de Sesión:** Lee el usuario actual de `AsyncStorage`. Crea una variable booleana derivada: `const isOwner = currentUser?.id === idPerfilVisitado`.

### Paso 3: Fetching de Datos (Usuario, Mascotas y Publicaciones)

En `app/usuario/[id].tsx`, implementa consultas para traer los datos del perfil visitado:

- Obtén los datos del Usuario (Nombre, foto, rol).
- Obtén la lista de Mascotas vinculadas a ese `idUsuario`.
- Obtén la lista de Publicaciones vinculadas a ese `idUsuario`.
- _Nota de seguridad:_ NO consultes la tabla de estadísticas ni reportes. Esa información queda excluida de esta vista.

### Paso 4: Renderizado Condicional y Bloqueo de Acciones (UI)

Construye la interfaz de `app/usuario/[id].tsx` reutilizando los componentes visuales existentes (Tarjetas de mascota/publicación, colores del tema), pero aplicando restricciones estrictas:

- **Modo Solo Lectura (Si `!isOwner`):** \* Muestra la información del usuario, sus mascotas y sus publicaciones.
  - Oculta o deshabilita cualquier botón de "Editar", "Eliminar" o "Añadir".
  - Oculta las métricas personales o accesos a "Reportes Generados".
- **Modo Propietario (Si `isOwner`):**
  - Puedes mostrar un mensaje sutil como "Este es tu perfil público" o simplemente permitir que los botones de acción (Editar/Eliminar) redirijan a las rutas privadas correspondientes de edición.

### Paso 5: Revisión de Permisos

Verifica que los componentes de navegación (Stack/Tabs) permitan el acceso a `app/usuario/[id].tsx` incluso si el estado de `AsyncStorage` indica que el usuario actual es un perfil "Invitado".
