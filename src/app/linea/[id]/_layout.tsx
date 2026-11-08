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
    />
  );
}
