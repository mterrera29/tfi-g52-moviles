import type { ExpoConfig, ConfigContext } from 'expo/config';

// app.json no puede leer variables de entorno, por eso la clave de Google Maps
// se agrega acá: sale de GOOGLE_MAPS_KEY (.env local o secret de EAS) y nunca queda en el repo.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name!,
  slug: config.slug!,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_KEY }],
  ],
});
