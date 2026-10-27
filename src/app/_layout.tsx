import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SesionProvider, useSesion } from '@/contextos/sesion';
import { TemaProvider, useTema } from '@/contextos/tema';

// Una caché estable para la app (U05.T01 diap. 22).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 2 } },
});

function NavegacionConTema() {
  const { colores, modo, setPreferencia } = useTema();
  const { sesion } = useSesion();

  useEffect(() => {
    if (sesion?.usuario) {
      setPreferencia(sesion.usuario.tema);
    }
  }, [sesion?.usuario, setPreferencia]);

  return (
    <>
      <StatusBar style={modo === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colores.headerFondo },
          headerTintColor: colores.headerTexto,
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Screen name='index' options={{ headerShown: false }} />
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='linea/[id]' options={{ title: 'Línea' }} />
        <Stack.Screen name='parada/[id]' options={{ title: 'Parada' }} />
        <Stack.Screen
          name='acerca'
          options={{
            headerShown: false,
            presentation:
              Platform.OS === 'web' ? 'transparentModal' : 'formSheet',
            animation: 'slide_from_bottom',
            sheetAllowedDetents: [0.5],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            contentStyle: {
              backgroundColor:
                Platform.OS === 'web' ? 'transparent' : colores.fondo,
            },
          }}
        />

        <Stack.Protected guard={!sesion}>
          <Stack.Screen name='login' options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name='registro' options={{ title: 'Crear cuenta' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // En móvil el foco lo marca AppState, no una ventana (U05.T01 diap. 22).
    const suscripcion = AppState.addEventListener('change', (estado) => {
      focusManager.setFocused(estado === 'active');
    });
    return () => suscripcion.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SesionProvider>
          <TemaProvider preferenciaInicial='sistema'>
            <NavegacionConTema />
          </TemaProvider>
        </SesionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
