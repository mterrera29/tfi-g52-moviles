# Transporte Público

Aplicación móvil para consultar líneas, paradas, horarios y avisos del transporte público de Paraná.

## Requisitos

- Node.js 18+
- npm o yarn
- Expo Go (para desarrollo) o un dispositivo Android/iOS

## Instalación

```bash
npm install
```

## Configuración

1. Copiá `.env.example` a `.env` y configurá las variables:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.7:3100
GOOGLE_MAPS_KEY=TU_CLAVE_DE_GOOGLE_MAPS
```

- `EXPO_PUBLIC_API_URL`: URL de la API backend.
- `GOOGLE_MAPS_KEY`: Clave de Google Maps para Android. No la subas al repo; usá un secret de EAS o tu `.env` local.

## Ejecutar la app

```bash
npm start
```

Luego escaneá el código QR con Expo Go o usá un emulador.

## Scripts

- `npm start`: Inicia el servidor de desarrollo.
- `npm run android`: Inicia en Android.
- `npm run ios`: Inicia en iOS.
- `npm run web`: Inicia en web.
- `npm test`: Ejecuta tests con Jest.
- `npm run lint`: Ejecuta ESLint.
- `npm run typecheck`: Verifica tipos con TypeScript.

## Funcionalidades

- Consulta de líneas, paradas y horarios.
- Modo sin conexión con datos guardados en SQLite.
- Favoritos de líneas y paradas.
- Reportes de demora con foto (cola offline).
- Avisos de servicio con recorrido alternativo y video.
- Mapa con paradas cercanas y brújula para llegar a la parada.
- Notificaciones locales para recordatorios de horario.
- Modo oscuro y accesibilidad.

## Estructura del proyecto

```
src/
  app/           # Pantallas (Expo Router)
  componentes/   # Componentes reutilizables
  contextos/     # Contextos de React (sesión, tema)
  db/            # SQLite y migraciones
  hooks/         # Hooks personalizados
  lib/           # Utilidades
  mocks/         # Datos de prueba
  servicios/     # Servicios de API y almacenamiento
  temas/         # Paletas de colores
  tipos/         # Tipos TypeScript
```

## Tests

Los tests usan `jest-expo` y `@testing-library/react-native`. Para agregar tests, creá archivos `*.test.tsx` dentro de `src/`.

## API

La app consume una API REST con los siguientes endpoints principales:

- `GET /lineas` - Lista de líneas.
- `GET /paradas` - Lista de paradas.
- `GET /paradas/:id` - Detalle de parada.
- `GET /paradas/:id/proximos` - Próximos horarios.
- `GET /avisos` - Avisos vigentes.
- `POST /reportes` - Reporte de demora (multipart/form-data).
- `GET /yo` - Usuario actual.
- `PUT /yo/lineas-favoritas/:id` - Agregar línea favorita.
- `DELETE /yo/lineas-favoritas/:id` - Quitar línea favorita.
- `PUT /yo/paradas-favoritas/:id` - Agregar parada favorita.
- `DELETE /yo/paradas-favoritas/:id` - Quitar parada favorita.

## Notas

- La app funciona sin conexión para consultas básicas usando SQLite.
- Los reportes se encolan localmente y se envían cuando hay conexión.
- Las notificaciones locales requieren permisos del sistema.
