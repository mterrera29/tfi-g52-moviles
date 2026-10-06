import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SesionProvider, useSesion } from '@/contextos/sesion';
import { TemaProvider, useTema } from '@/contextos/tema';

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SesionProvider>
        <TemaProvider preferenciaInicial='sistema'>
          <NavegacionConTema />
        </TemaProvider>
      </SesionProvider>
    </GestureHandlerRootView>
  );
}
