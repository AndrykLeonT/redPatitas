# Reglas Expo + React Native — RedPatitas

## Navegación (expo-router)

- El enrutamiento es **basado en archivos**. Crear nuevas pantallas = crear archivos en `app/`.
- El Drawer re-lee `AsyncStorage` en cada evento `focus` — cualquier cambio de sesión se refleja automáticamente.
- Las rutas dinámicas usan `[id].tsx`. Acceder al parámetro con `useLocalSearchParams()`.

## Estilos

- **Sin stylesheet global.** Cada archivo tiene su propio `StyleSheet.create({ ... })`.
- Paleta del proyecto (no usar colores hardcoded fuera de estos):
  - Marca principal: `#FF8C42`
  - Fondo: `#FFF9F5`
  - Texto oscuro: `#2B2D42`
  - Azul-gris secundario: `#4F6D7A`

## Tema oscuro

- Usar siempre `useTheme()` de `context/ThemeContext.tsx` para leer `isDarkMode`.
- No leer `AsyncStorage` directamente para el tema; el contexto ya lo maneja.

## Sesión

- Las claves de sesión en `AsyncStorage` son: `userRole`, `userName`, `userAvatar`, `userEmail`, `userId`.
- `userRole` puede ser `"Dueño"`, `"Refugio"` o `"guest"`.
- No crear claves nuevas de sesión sin documentarlas en `CLAUDE.md`.

## Avatares

- `fotoPerfil` debe ser siempre una clave del mapa `AVATARES` exportado por `utils/avatars.ts`.
- Claves desconocidas hacen fallback a `"default"` automáticamente.

## Sensor de sacudida

- `hooks/useShake.ts` usa el Accelerometer de `expo-sensors` (umbral 3.0g, cooldown 1 s).
- Solo está activo en la pantalla de login para limpiar campos.
- Si necesitas detectar sacudida en otra pantalla, reutiliza el hook — no dupliques la lógica.

## Distancia

- `calcularDistancia` (Haversine) vive en `app/(drawer)/(tabs)/index.tsx` y es reexportada para `map.tsx`.
- No duplicar esta función. Si se necesita en más lugares, moverla a `utils/`.
