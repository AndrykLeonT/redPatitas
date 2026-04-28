# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npx expo start       # start dev server (scan QR for Expo Go or choose a, i, w for emulator/browser)
npm run android      # start with Android emulator
npm run ios          # start with iOS simulator
npm run web          # start for browser
npm run lint         # run ESLint via expo lint
```

There is no test suite configured. Type-checking is done implicitly by TypeScript (`tsconfig.json`).

## Architecture

**RedPatitas** is a pet community app (lost pets, reports, recreation). Built with Expo SDK 54 + expo-router (file-based routing) backed by Firebase Realtime Database.

### Navigation layers

```
app/_layout.tsx          — root Stack, ThemeProvider, 2.5 s splash screen
  app/index.tsx          — login screen (also checks existing AsyncStorage session)
  app/registro.tsx       — registration
  app/(drawer)/          — Drawer navigator (slides in from left)
    (tabs)/index.tsx     — publications feed (home tab)
    (tabs)/map.tsx       — geo map of publications (second tab)
    misMascotas.tsx      — list of user's pets
    perfil.tsx           — user profile with stats + danger zone
    misPublicaciones.tsx — user's own publications (hidden from drawer menu)
  app/mascota/[id].tsx   — pet detail / delete
  app/mascota/nueva.tsx  — create pet
  app/publicacion/[id].tsx  — publication detail
  app/publicacion/nueva.tsx — create publication
```

### State & session

Session is stored entirely in `AsyncStorage` (no Firebase Auth flows in the UI). Keys: `userRole`, `userName`, `userAvatar`, `userEmail`, `userId`. Role is either `"Dueño"`, `"Refugio"`, or `"guest"`. The Drawer reads these on every focus event to update the header.

Login performs a manual lookup against `firebase/database` node `usuarios`, comparing `contraseña` field directly (plaintext). There is no token-based auth.

### Data models

Defined in `models/firebaseModels.ts`:
- `Usuario` — `rol: 'Dueño' | 'Refugio'`, avatar stored as a filename key (e.g. `"perro_perfil.jpg"`)
- `Mascota` — linked to user via `idUsuario`; `enfermedades`, `vacunas`, and `fotos` are `Record<string, string>` (Firebase push-key → value)
- `Publicacion` — `tipo: 'reporte' | 'perdidos' | 'recreacion'`; optional `ubicacion: { latitude, longitude }`; `fotos` is also `Record<string, string>`

Firebase nodes: `usuarios/`, `mascotas/`, `publicaciones/`.

### Firebase config

`config/firebase.ts` exports `db` (Realtime Database) and `auth` (initialized but not actively used for sign-in flows). The config object including API key is committed to the repo.

### Avatars

`utils/avatars.ts` exports `AVATARES`, a static map from filename strings to `require()` local images. `fotoPerfil` on a user record must be one of these keys; unknown keys fall back to `"default"`.

### Theme

`context/ThemeContext.tsx` provides `{ isDarkMode, toggleTheme }` via `useTheme()`. The preference is persisted in AsyncStorage under key `"isDarkMode"`. The provider suppresses rendering until the preference loads (avoids flash).

### Notable hooks / utilities

- `hooks/useShake.ts` — uses `expo-sensors` Accelerometer to detect shake (threshold 3.0g, cooldown 1 s) and trigger a callback with vibration feedback. Used on the login screen to clear fields.
- `calcularDistancia` exported from `app/(drawer)/(tabs)/index.tsx` — Haversine formula, reused by `map.tsx`.

### Styling conventions

All styles use `StyleSheet.create` inline per file — no shared stylesheet. Primary brand color: `#FF8C42`. Background: `#FFF9F5`. Dark text: `#2B2D42`. Secondary blue-grey: `#4F6D7A`.
