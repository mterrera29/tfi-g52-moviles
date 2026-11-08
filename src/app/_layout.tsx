import { SQLiteProvider } from 'expo-sqlite';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { debeAplicarTemaDeSesion } from '@/lib/temaPreferencia';

import { AvisoSinConexion } from '@/componentes/AvisoSinConexion';
import { PantallaBloqueo } from '@/componentes/PantallaBloqueo';
import { migrar } from '@/db/migrar';
import { SesionProvider, useSesion } from '@/contextos/sesion';
import { TemaProvider, useTema } from '@/contextos/tema';
import { useAvisosFavoritos } from '@/hooks/useAvisosFavoritos';
import { useDrenajeReportes } from '@/hooks/useDrenajeReportes';
import { useRespuestaNotificaciones } from '@/hooks/useRespuestaNotificaciones';
import { queryClient } from '@/servicios/queryClient';
import '@/servicios/notificaciones';

// Se mantiene el splash hasta restaurar la sesión (U3.Nav diap. 17).
void SplashScreen.preventAutoHideAsync().catch(() => {});

function NavegacionConTema() {
  const { colores, modo, setPreferencia } = useTema();
  const { sesion, restaurando, bloqueada } = useSesion();
  useDrenajeReportes();
  useAvisosFavoritos();
  useRespuestaNotificaciones();

  useEffect(() => {
    if (restaurando) return;
    const marco = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(marco);
  }, [restaurando]);

  const idTemaAplicado = useRef<string | null>(null);
  useEffect(() => {
    const idUsuario = sesion?.usuario?.id;
    const temaServidor = sesion?.usuario?.tema;
    if (!idUsuario) {
      idTemaAplicado.current = null;
      return;
    }
    if (!debeAplicarTemaDeSesion({
      idUsuario,
      idYaAplicado: idTemaAplicado.current,
      temaServidor,
    })) {
      return;
    }
    idTemaAplicado.current = idUsuario;
    setPreferencia(temaServidor!);
  }, [sesion?.usuario?.id, sesion?.usuario?.tema, setPreferencia]);

  if (restaurando) return null;

  return (
    <>
      <StatusBar style={modo === 'oscuro' ? 'light' : 'dark'} />
      <AvisoSinConexion />
      {bloqueada ? (
        <PantallaBloqueo />
      ) : (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colores.headerFondo },
            headerTintColor: colores.headerTexto,
            contentStyle: { backgroundColor: colores.fondo },
          }}
        >
          <Stack.Screen name='index' options={{ headerShown: false }} />
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen name='linea/[id]' options={{ headerShown: false }} />
          <Stack.Screen name='parada/[id]' options={{ title: 'Parada' }} />
          <Stack.Screen name='aviso/[id]' options={{ title: 'Aviso' }} />
          <Stack.Screen name='escanear' options={{ title: 'Escanear QR' }} />
          <Stack.Screen name='reportar' options={{ title: 'Reportar demora' }} />
          <Stack.Screen
            name='acerca'
            options={{
              headerShown: false,
              presentation:
                Platform.OS === 'web' ? 'transparentModal' : 'formSheet',
              animation: 'slide_from_bottom',
              sheetAllowedDetents: [0.9],
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
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // En móvil el foco lo marca AppState, no una ventana (U05.T01 diap. 22).
    const sincronizarFoco = (estado: AppStateStatus) => {
      focusManager.setFocused(estado === 'active');
    };
    const marco = requestAnimationFrame(() => {
      sincronizarFoco(AppState.currentState);
    });
    const suscripcion = AppState.addEventListener('change', sincronizarFoco);
    return () => {
      cancelAnimationFrame(marco);
      suscripcion.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName='transporte.db' onInit={migrar}>
        <QueryClientProvider client={queryClient}>
          <SesionProvider>
            <TemaProvider preferenciaInicial='sistema'>
              <NavegacionConTema />
            </TemaProvider>
          </SesionProvider>
        </QueryClientProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
