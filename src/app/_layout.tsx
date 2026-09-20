import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { TemaProvider, useTema } from '@/contextos/tema';
import { obtenerUsuario } from '@/servicios/usuario';
import type { Tema as PreferenciaTema } from '@/tipos/usuario';

function NavegacionConTema() {
  const { colores, modo } = useTema();

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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [preferenciaInicial, setPreferenciaInicial] =
    useState<PreferenciaTema>('sistema');
  const [cargandoPreferencia, setCargandoPreferencia] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargarPreferencia = async () => {
      const respuesta = await obtenerUsuario();

      if (!activo) {
        return;
      }

      if (!('error' in respuesta)) {
        setPreferenciaInicial(respuesta.datos.tema);
      }

      setCargandoPreferencia(false);
    };

    cargarPreferencia();

    return () => {
      activo = false;
    };
  }, []);

  if (cargandoPreferencia) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ActivityIndicator size='large' color='#0B3A5D' />
      </View>
    );
  }

  return (
    <TemaProvider preferenciaInicial={preferenciaInicial}>
      <NavegacionConTema />
    </TemaProvider>
  );
}
