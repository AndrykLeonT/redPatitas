# Nueva publicación

Genera el scaffold completo para un nuevo tipo de publicación en RedPatitas.

## Pasos

1. Revisa el modelo `Publicacion` en `models/firebaseModels.ts` para entender los campos actuales.
2. Crea o actualiza el tipo en el modelo si el tipo solicitado no existe aún.
3. Genera el componente de pantalla en `app/publicacion/nueva.tsx` con soporte para el nuevo tipo.
4. Asegúrate de que el campo `tipo` en Firebase use uno de los valores válidos: `'reporte' | 'perdidos' | 'recreacion'`.
5. Si se requiere ubicación, incluye el picker de coordenadas con `ubicacion: { latitude, longitude }`.
6. Las fotos deben almacenarse como `Record<string, string>` usando `push()` de Firebase.

## Tipo de publicación a crear
