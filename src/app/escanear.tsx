import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';
import { normalizarError } from '@/servicios/cliente';
import { obtenerParadaPorQr } from '@/servicios/paradas';
import type { RespuestaError } from '@/tipos/api';

export default function EscanearScreen() {
  const { colores } = useTema();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<RespuestaError | null>(null);

  async function consultarParada(codigo: string) {
    setEscaneado(true);
    setConsultando(true);
    setError(null);

    try {
      const respuesta = await obtenerParadaPorQr(codigo);
      router.replace({ pathname: '/parada/[id]', params: { id: respuesta.datos.id } });
    } catch (error: unknown) {
      setError(normalizarError(error));
    } finally {
      setConsultando(false);
    }
  }

  if (!permiso) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando permiso de cámara' />
      </SafeAreaView>
    );
  }

  if (!permiso.granted) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <Text style={[estilos.mensaje, { color: colores.texto }]}>
          Usamos la cámara para escanear el QR de la parada y abrir su información.
          También podés buscar la parada por nombre sin usar la cámara.
        </Text>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Permitir cámara'
          onPress={() => { void pedirPermiso(); }}
          style={({ pressed }) => [
            estilos.boton,
            { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acentoTexto }]}>Permitir cámara</Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Buscar la parada por nombre'
          onPress={() => router.replace('/paradas')}
          style={({ pressed }) => [estilos.boton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acento }]}>Buscar la parada por nombre</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <CameraView
        style={estilos.contenedor}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={escaneado ? undefined : ({ data }) => { void consultarParada(data); }}
      />
      {consultando && (
        <View style={estilos.estado}>
          <ActivityIndicator color={colores.acento} accessibilityLabel='Buscando parada' />
          <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>Buscando parada...</Text>
        </View>
      )}
      {error && (
        <View style={estilos.estado}>
          <Text accessibilityLiveRegion='polite' style={[estilos.mensaje, { color: colores.error }]}>
            {error.error.mensaje}
          </Text>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Escanear de nuevo'
            onPress={() => {
              setError(null);
              setEscaneado(false);
            }}
            style={({ pressed }) => [
              estilos.boton,
              { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[estilos.textoBoton, { color: colores.acentoTexto }]}>Escanear de nuevo</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  estado: { alignItems: 'center', padding: 24, gap: 12 },
  mensaje: { fontSize: 16, textAlign: 'center' },
  boton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  textoBoton: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
