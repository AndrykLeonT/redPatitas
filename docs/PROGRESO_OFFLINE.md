
# Progreso — Implementación offline-first parcial

Referencia: `.claude/command/guia_offline_sqlite_redpatitas.md`

## Estado por fase

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Preparación (deps + database + services + hooks + components + init) | ✅ Completado |
| 2 | Login (`app/index.tsx` + `app/registro.tsx`) | ✅ Completado |
| 3 | `app/(drawer)/perfil.tsx` | ✅ Completado |
| 4 | `app/(drawer)/misMascotas.tsx` | ✅ Completado |
| 5 | `app/(drawer)/misPublicaciones.tsx` | ✅ Completado |
| 6 | `app/mascota/nueva.tsx` + `app/mascota/[id].tsx` | ✅ Completado |
| 7 | `app/publicacion/nueva.tsx` + `app/publicacion/[id].tsx` | ✅ Completado |
| 8 | Modal sync + bloqueo pantallas globales (`tabs/index.tsx`, `tabs/map.tsx`) | ✅ Completado |

Leyenda: ⬜ Pendiente · 🟡 En progreso · ✅ Completado · ⚠️ Bloqueado

---

## Fase 1 — Preparación

**Objetivo:** dejar lista toda la infraestructura para que las fases siguientes solo tengan que importar y usar.

### Checklist

- [x] Instalar `expo-sqlite` (^55.0.16)
- [x] Instalar `@react-native-community/netinfo` (^12.0.1)
- [x] `database/schema.ts` — DDL de las 7 tablas locales
- [x] `database/localDb.ts` — `localDb`, `initLocalDb()`, `limpiarBaseLocal()`, `nuevoIdLocal()`, `esIdLocal()`
- [x] `database/usuariosLocal.ts` — CRUD + conversión
- [x] `database/mascotasLocal.ts` — CRUD + conversión + soft delete + reemplazar ID
- [x] `database/publicacionesLocal.ts` — CRUD + conversión + soft delete + reemplazar ID
- [x] `database/adopcionesLocal.ts` — CRUD + conversión
- [x] `database/estadisticasLocal.ts` — cálculo + guardar + leer + recalcular
- [x] `database/cambiosPendientes.ts` — encolar + listar + marcar + reemplazar ID
- [x] `database/syncEstadoLocal.ts` — leer/guardar estado de sincronización
- [x] `services/networkService.ts` — `estaConectado()` + `suscribirseACambiosDeConexion()`
- [x] `services/firebasePersonalService.ts` — descargar + crear/actualizar/eliminar de las 4 entidades
- [x] `services/syncService.ts` — `prepararDatosOffline()` + `sincronizarCambiosPendientes()` + `refrescarDatosPersonales()` + helpers de cache
- [x] `hooks/useNetworkStatus.ts` — `{ isConnected }`
- [x] `hooks/usePendingSync.ts` — detecta transición offline→online, expone `shouldPrompt/runSync/dismiss`
- [x] `components/OfflineBanner.tsx`
- [x] `components/SyncChangesModal.tsx`
- [x] `components/PendingSyncBadge.tsx`
- [x] Inicializar SQLite en `app/_layout.tsx` (`initLocalDb()` antes del primer render)
- [x] Type-check limpio (solo persiste el error preexistente de `config/firebase.ts` no relacionado)

---

## Decisiones de diseño

- **Estrategia de sync:** LOCAL WINS (cambios offline pisan a Firebase al sincronizar).
- **IDs locales:** formato `local_<timestamp>`. Al sincronizar `crear`, Firebase genera ID real con `push()` y se reemplaza en SQLite.
- **Soft delete:** `eliminadoLocal=1` + `pendienteSync=1` cuando se elimina offline. La fila no se borra físicamente hasta sincronizar.
- **JSON dinámico:** `enfermedades`, `vacunas`, `fotos` se guardan como TEXT (JSON string) en SQLite. NUNCA como array.
- **Booleans:** `INTEGER` (0/1) en SQLite.
- **Foreign keys:** activadas con `PRAGMA foreign_keys = ON;` en init.
- **Pantallas globales:** feed y mapa muestran mensaje "no disponible sin conexión", NO leen SQLite con datos ajenos.
- **Inicio de sesión:** limpia toda la base local antes de descargar los datos del nuevo usuario (evita contaminación entre cuentas).

---

## Bitácora

### 2026-05-19 — Sesión 1

- Plan acordado: dividir en 8 fases. Fase 1 = solo fundación, sin tocar pantallas.
- Doc de progreso creado en `docs/PROGRESO_OFFLINE.md`.
- **Fase 1 completada.** 20 archivos creados/modificados. Type-check limpio (excepto error preexistente firebase/auth).
- **Fase 2 completada.** Login y registro llaman `prepararDatosOffline(userId)` después de persistir la sesión en AsyncStorage. El refactor previo a `prepararDatosOffline` asegura que la descarga ocurra antes de la limpieza local — si Firebase falla, la base local queda intacta.
  - **Decisión:** la auto-redirección por `useEffect` en `app/index.tsx` (cuando ya hay sesión guardada) NO llama `prepararDatosOffline`. Razón: hacerlo borraría cualquier `cambios_pendientes` del usuario que abrió la app sin internet. Las pantallas individuales (Fase 3+) refrescarán de Firebase con el patrón híbrido cuando haya conexión.
  - **Decisión:** se aplicó también a `registro.tsx` porque es el mismo flujo de entrada al sistema (crea usuario en Firebase → persiste sesión → navega al drawer).
  - **UX:** el botón "ENTRAR" muestra "Preparando datos locales..." mientras se descarga la cache. Si falla, se loguea el warning pero se continúa al drawer (las pantallas mostrarán empty state hasta que haya internet).
  - **Edge case conocido:** si el usuario cierra sesión y otro usuario distinto inicia sesión en el mismo dispositivo, `prepararDatosOffline` limpia toda la base local (incluyendo cambios pendientes del usuario anterior que nunca se sincronizaron). Esto es comportamiento documentado en la guía §3.1.
- **Fase 3 completada.** `perfil.tsx` implementa patrón híbrido:
  - **Online:** Firebase es la fuente, cachea cada entidad en SQLite vía `cacheMascotaDesdeFirebase`/`cachePublicacionDesdeFirebase` (respetan `pendienteSync=1` local, no pisan cambios locales), luego `recalcularYGuardarEstadisticas`.
  - **Offline:** lee todo desde SQLite vía `obtenerUsuarioLocal`/`listarMascotasPorUsuario`/`listarPublicacionesPorUsuario`/`listarAdopcionesPorUsuario`. Banner offline arriba del scroll.
  - **Fallback:** si Firebase falla con conexión aparente, hace fallback automático a SQLite.
  - **Botón "Eliminar mi cuenta":** bloqueado offline (muestra alert pidiendo conexión).
  - **Reactividad:** el hook `useNetworkStatus` está en deps de `cargar`, así que cuando cambia la conectividad mientras la pantalla está enfocada, se re-ejecuta el load automáticamente.
  - **Helpers añadidos al archivo:** `mascotaConMetaToItem` y `publicacionConMetaToItem` que despojan los metadatos (`pendienteSync`, `creadoLocal`, `eliminadoLocal`) para que el shape interno `{id, data}` siga funcionando sin tocar las gráficas useMemo.
  - **Limitación conocida (pendiente de Fase 8):** si el usuario crea entidades offline y luego vuelve online, las pantallas online solo muestran datos de Firebase — las entidades pendientes locales no aparecen hasta que se sincronicen vía `SyncChangesModal`. La cache `recalcularYGuardarEstadisticas` SÍ las incluye en stats globales porque lee de SQLite (que tiene tanto Firebase como locales). Esto puede causar inconsistencia visual mínima entre los contadores del header y las tarjetas listadas hasta que se sincronice.
- **Fase 4 completada.** `misMascotas.tsx` con patrón híbrido:
  - **Online:** Firebase + `cacheMascotaDesdeFirebase` por cada mascota propia.
  - **Offline:** `listarMascotasPorUsuario(userId)` (ya filtra `eliminadoLocal = 0`).
  - **Fallback:** si Firebase falla con conexión aparente, cae a SQLite.
  - **`OfflineBanner`** arriba del botón "Nueva Mascota" cuando `isConnected === false`.
  - **`PendingSyncBadge`** dentro de cada card cuando la mascota viene de local con `pendienteSync=1` o `creadoLocal=1`. Desde Firebase, esos flags son `undefined` → no se muestra.
  - **Tipo extendido `MascotaItem`:** ahora opcional `pendienteSync` y `creadoLocal` para no romper el shape `{id, data}` que ya usaba el render.
  - **Reactividad:** `useNetworkStatus` en deps de `cargar` → la pantalla se re-carga al cambiar la conectividad mientras está enfocada.
- **Fase 5 completada.** `misPublicaciones.tsx` con patrón híbrido (idéntico a Fase 4):
  - **Online:** Firebase + `cachePublicacionDesdeFirebase` por cada publicación propia.
  - **Offline:** `listarPublicacionesPorUsuario(userId)` (ya filtra `eliminadoLocal=0` y ordena por `fechaRegistro DESC`).
  - **Fallback:** si Firebase falla con conexión aparente, cae a SQLite.
  - **`OfflineBanner`** arriba del botón "Nueva Publicación" cuando `isConnected === false`.
  - **`PendingSyncBadge`** dentro de cada card cuando `pendienteSync` o `creadoLocal`, ubicado junto al tag de tipo (reporte/perdidos/recreación) en un nuevo `tagRow`.
  - **Tipo `PubItem`** extendido con `pendienteSync?` y `creadoLocal?` opcionales.
  - **Reactividad:** misma que en Fase 4 (useNetworkStatus en deps de cargar).
- **Fase 6 completada.** Mascotas con dual path completo:
  - **Nueva infraestructura:** `services/cloudinaryService.ts` con `subirImagen()`, `esUriLocal()`, `subirFotosLocales(record)` — la última se reusa en `syncService` para reintentar uploads cuando se sincroniza un cambio pendiente con URIs locales.
  - **`syncService.sincronizarCambioMascota` / `sincronizarCambioPublicacion`:** ahora antes de `push`/`update` a Firebase, convierten todas las URIs `file://...` a URLs HTTPS de Cloudinary vía `subirFotosLocales`. Las URLs ya remotas se preservan.
  - **`mascota/nueva.tsx`:**
    - Si `isConnected === false`: genera ID local con `nuevoIdLocal()`, guarda fotos como URIs LOCALES en el payload, `guardarMascotaLocal({pendienteSync:true, creadoLocal:true})`, registra cambio pendiente `"crear"`, recalcula stats. Muestra alert "Mascota guardada localmente. Se sincronizará cuando vuelva la conexión." Banner offline arriba del formulario.
    - Si online: sube fotos a Cloudinary, `crearMascotaEnFirebase` (retorna ID real), cachea en SQLite con ese ID, recalcula stats.
  - **`mascota/[id].tsx`:**
    - **Lectura híbrida:** si `id` empieza con `local_`, va directo a SQLite (no existe en Firebase). Si offline, también SQLite. Si online, Firebase primero y fallback a SQLite.
    - **Estado `pendienteSync`** local: si la fila SQLite tenía pendienteSync o creadoLocal, se muestra `<PendingSyncBadge />` debajo del nombre.
    - **Eliminar (handleBaja "eliminar"):**
      - Online: `eliminarMascotaEnFirebase` + `eliminarMascotaLocalFisico`.
      - Offline: `marcarMascotaEliminadaLocal` (soft delete) + registra cambio pendiente `"eliminar"`. Si era ID local, en el sync se borra físicamente sin tocar Firebase (gracias al `esIdLocal` check).
    - **Adopción (handleBaja "adoptado_app"/"adoptado_externo"):**
      - Online: `crearAdopcionEnFirebase` (retorna ID real) + `guardarAdopcionLocal` + `eliminarMascotaEnFirebase` + `eliminarMascotaLocalFisico`.
      - Offline: crea adopción local con `nuevoIdLocal`, registra 2 cambios pendientes (crear adopción + eliminar mascota), soft delete de la mascota.
    - **Banner offline** entre el header y la galería.
    - **Reactividad:** `isConnected` en deps del useEffect de carga.
  - **Imports limpiados:** se removió `push`, `set`, `remove` de `firebase/database` en `[id].tsx`; las operaciones de Firebase ahora pasan por `firebasePersonalService`.
- **Fase 7 completada.** Publicaciones con dual path completo:
  - **`publicacion/nueva.tsx`:**
    - Offline: guarda fotos como URIs locales, genera `local_<timestamp>`, inserta en `publicaciones_local` con `pendienteSync=1`/`creadoLocal=1`, registra cambio pendiente `"crear"` y recalcula stats.
    - Online: sube fotos con `cloudinaryService.subirImagen`, crea en Firebase via `crearPublicacionEnFirebase`, cachea en SQLite y recalcula stats.
    - La lista de mascotas vinculables usa SQLite offline y Firebase + cache online.
    - Muestra `OfflineBanner` arriba del formulario.
  - **`publicacion/[id].tsx`:**
    - Lectura híbrida: IDs locales y modo offline van a SQLite; online usa Firebase primero con fallback local.
    - Cachea publicación y mascota vinculada al leer desde Firebase.
    - Muestra `PendingSyncBadge` si la publicación local está pendiente o fue creada offline.
    - Eliminar offline usa soft delete + cambio pendiente `"eliminar"`; eliminar online borra Firebase + SQLite.
    - "Marcar como encontrado" offline actualiza SQLite y encola `"actualizar"`; online actualiza Firebase y cache local.
- **Fase 8 completada.**
  - `app/(drawer)/_layout.tsx` monta `usePendingSync()` y `SyncChangesModal` globalmente dentro del Drawer.
  - `tabs/index.tsx` bloquea el feed global sin conexión, evita consultar Firebase y muestra mensaje de no disponibilidad.
  - `tabs/map.tsx` bloquea el mapa global sin conexión, evita consultar Firebase/ubicación y muestra mensaje de no disponibilidad.
  - Validación: `npx.cmd eslint` sobre los 5 archivos modificados pasa limpio.
  - Validación general: `npx.cmd tsc --noEmit` solo reporta el error preexistente en `config/firebase.ts` (`getReactNativePersistence`), documentado desde Fase 1.

### API pública lista para Fase 2+

**Cuando entres a una pantalla:**
```ts
import { useNetworkStatus } from "../hooks/useNetworkStatus";
const { isConnected } = useNetworkStatus(); // null mientras chequea, luego boolean
```

**Al iniciar sesión exitosa (Fase 2):**
```ts
import { prepararDatosOffline } from "../services/syncService";
await prepararDatosOffline(userId); // limpia local + descarga + cachea + calcula stats
```

**Al leer datos personales (Fase 3-5):**
```ts
// Si online: get() Firebase, luego cacheMascotaDesdeFirebase(id, m)
// Si offline: listarMascotasPorUsuario(userId) — devuelve MascotaConMeta[]
import { listarMascotasPorUsuario } from "../database/mascotasLocal";
import { listarPublicacionesPorUsuario } from "../database/publicacionesLocal";
import { obtenerUsuarioLocal } from "../database/usuariosLocal";
import { obtenerEstadisticasLocal, recalcularYGuardarEstadisticas } from "../database/estadisticasLocal";
```

**Al crear/editar/eliminar (Fase 6-7):**
```ts
import { nuevoIdLocal } from "../database/localDb";
import { guardarMascotaLocal, marcarMascotaEliminadaLocal } from "../database/mascotasLocal";
import { registrarCambioPendiente } from "../database/cambiosPendientes";

// Patrón offline:
const idLocal = nuevoIdLocal();
guardarMascotaLocal(idLocal, mascota, { pendienteSync: true, creadoLocal: true });
registrarCambioPendiente(userId, "mascota", idLocal, "crear", mascota);

// Patrón online (después del push/set/update de Firebase):
guardarMascotaLocal(idFirebase, mascota);  // pendienteSync=0 por default
```

**Modal de sync (Fase 8):**
```ts
// En el drawer layout:
import { usePendingSync } from "../hooks/usePendingSync";
import SyncChangesModal from "../components/SyncChangesModal";
const { shouldPrompt, pendingCount, isSyncing, dismiss, runSync } = usePendingSync();
<SyncChangesModal visible={shouldPrompt} pendingCount={pendingCount} isSyncing={isSyncing} onDismiss={dismiss} onConfirm={runSync} />
```

### Notas para resumir

- **MascotaConMeta / PublicacionConMeta / AdopcionConMeta** son los tipos que devuelven los `listar*Local` — incluyen `id`, `pendienteSync`, `creadoLocal`, `eliminadoLocal`. Las pantallas pueden usar el `pendienteSync` directamente para mostrar `<PendingSyncBadge/>`.
- `cacheMascotaDesdeFirebase` y `cachePublicacionDesdeFirebase` respetan cambios locales pendientes: si la fila local tiene `pendienteSync=1`, NO la sobreescriben.
- Cuando un cambio "crear" se sincroniza, `syncService` reemplaza el ID local por el real en SQLite Y en la cola de cambios pendientes (por si hay otro cambio posterior referenciando ese ID local).
- Las fotos offline siguen sin solucionarse: por ahora el payload de cambio guarda los `uri` locales del filesystem. En la Fase 7 hay que decidir si se reintenta la subida a Cloudinary al sincronizar o se omite el campo `fotos`. **TODO**: revisar en Fase 7.
