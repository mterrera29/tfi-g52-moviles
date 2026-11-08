import { Stack } from 'expo-router';

import { useTema } from '@/contextos/tema';

export default function LineaIdLayout() {
  const { colores } = useTema();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.headerFondo },
        headerTintColor: colores.headerTexto,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      {/* Título provisorio mientras carga: después cada pantalla pone el suyo. */}
      <Stack.Screen name='index' options={{ title: 'Línea' }} />
      <Stack.Screen name='mapa' options={{ title: 'Mapa del recorrido' }} />
    </Stack>
  );
}
