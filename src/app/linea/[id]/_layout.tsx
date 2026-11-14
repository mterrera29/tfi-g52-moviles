import { Stack } from 'expo-router';

import { useTema } from '@/contextos/tema';
import { AvisoSinConexion } from '@/componentes/AvisoSinConexion';

export default function LineaIdLayout() {
  const { colores } = useTema();

  return (
    <Stack
      // el aviso de sin conexión va debajo del header (el header nativo ya ocupa la barra de estado)
      screenLayout={({ children }) => (
        <>
          <AvisoSinConexion ocupaBarraDeEstado={false} />
          {children}
        </>
      )}
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
