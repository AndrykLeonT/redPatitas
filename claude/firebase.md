# Reglas Firebase — RedPatitas

## Estructura de nodos

- `usuarios/{userId}` — datos del usuario
- `mascotas/{mascotaId}` — mascotas (enlazadas por `idUsuario`)
- `publicaciones/{pubId}` — publicaciones

## Convenciones obligatorias

- Los campos `fotos`, `vacunas` y `enfermedades` son `Record<string, string>` (push-key → valor). **Nunca los trates como arrays.**  
  Usa siempre `Object.entries(campo ?? {})` para iterar.
- Las escrituras deben usar `push()` de Firebase para generar las claves de estos campos, no índices numéricos.
- `fotoPerfil` en `Usuario` debe ser una clave válida del mapa `AVATARES` en `utils/avatars.ts`. Valida antes de guardar; en caso de duda, usa `"default"`.
- La autenticación es manual (comparación directa del campo `contraseña`). No introduzcas Firebase Auth flows sin actualizar el Drawer y `app/index.tsx`.
- El objeto de config de Firebase (incluyendo API key) está commiteado intencionalmente. No lo muevas a `.env` sin coordinar con el equipo.

## Patrones de lectura/escritura

```ts
// Leer colección
const snap = await get(ref(db, 'mascotas'));
const data = snap.val() as Record<string, Mascota> | null;

// Iterar fotos / vacunas / enfermedades
Object.entries(mascota.fotos ?? {}).forEach(([key, url]) => { ... });

// Escribir nuevo ítem con push-key
const newRef = push(ref(db, 'mascotas'));
await set(newRef, nuevaMascota);
```
