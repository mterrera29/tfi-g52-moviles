import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { VideoAviso } from '@/componentes/VideoAviso';
import { useTema } from '@/contextos/tema';
import { elegirFuenteVideo } from '@/lib/videoAviso';
import { consultarAvisoPorId } from '@/servicios/consulta';
import {
  eliminarVideoAviso,
  estadoArchivoVideo,
  guardarVideoAviso,
  leerDescargaVideo,
} from '@/servicios/videoAviso';
import type { RespuestaError } from '@/tipos/api';

export default function AvisoVideoScreen() {
  const { colores } = useTema();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const avisoId = Array.isArray(id) ? id[0] : id;
  const [mensajeLocal, setMensajeLocal] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ['aviso', avisoId],
    queryFn: async () => {
      if (!avisoId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué aviso abrir.' } };
      return consultarAvisoPorId(avisoId);
    },
  });

  const aviso = consulta.data?.aviso;
  const [descarga, setDescarga] = useState<Awaited<ReturnType<typeof leerDescargaVideo>>>(null);
  const [archivo, setArchivo] = useState({ existe: false, bytes: 0, uri: '' });

  useEffect(() => {
    if (!aviso) return;
    let cancelado = false;
    void (async () => {
      const guardado = await leerDescargaVideo(aviso.id);
      const estado = estadoArchivoVideo(aviso.id);
      if (!cancelado) {
        setDescarga(guardado);
        setArchivo(estado);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [aviso, consulta.dataUpdatedAt]);

  const fuente = aviso
    ? elegirFuenteVideo({
        videoUrl: aviso.videoUrl,
        descarga,
        archivoExiste: archivo.existe,
        archivoBytes: archivo.bytes,
      })
    : { tipo: 'ninguna' as const };

  const guardar = useMutation({
    mutationFn: async () => {
      if (!aviso) throw new Error('No hay aviso.');
      return guardarVideoAviso(aviso);
    },
    onSuccess: async () => {
      setMensajeLocal('Video guardado para ver sin conexión.');
      await queryClient.invalidateQueries({ queryKey: ['aviso', avisoId] });
      await queryClient.invalidateQueries({ queryKey: ['avisos'] });
    },
    onError: (error: unknown) => {
      setMensajeLocal(error instanceof Error ? error.message : 'No se pudo guardar el video.');
    },
  });

  const eliminar = useMutation({
    mutationFn: async () => {
      if (!avisoId) return;
      await eliminarVideoAviso(avisoId);
    },
    onSuccess: async () => {
      setMensajeLocal('Se eliminó la descarga de este video.');
      await queryClient.invalidateQueries({ queryKey: ['aviso', avisoId] });
      await queryClient.invalidateQueries({ queryKey: ['avisos'] });
    },
    onError: () => {
      setMensajeLocal('No se pudo eliminar la descarga.');
    },
  });

  if (consulta.isPending) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={{ color: colores.textoSecundario }}>Cargando aviso…</Text>
      </SafeAreaView>
    );
  }

  if (consulta.error || !aviso) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: colores.fondo }]} edges={['bottom']}>
        <EstadoError
          mensaje={consulta.error ? (consulta.error as unknown as RespuestaError).error.mensaje : 'No se pudo abrir el aviso.'}
          onReintentar={() => { void consulta.refetch(); }}
        />
      </SafeAreaView>
    );
  }

  const sePuedeGuardar = Platform.OS !== 'web' && fuente.tipo === 'remoto';
  const sePuedeEliminar = Platform.OS !== 'web' && fuente.tipo === 'local';

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <Stack.Screen options={{ title: aviso.titulo }} />
      <ScrollView contentContainerStyle={estilos.scroll}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>{aviso.titulo}</Text>
        <Text style={{ color: colores.textoSecundario }}>{aviso.detalle}</Text>
        {fuente.tipo === 'local' ? (
          <Text style={{ color: colores.texto }} accessibilityLiveRegion='polite'>
            Reproduciendo la copia guardada en el teléfono.
          </Text>
        ) : null}

        {fuente.tipo === 'ninguna' ? (
          <EstadoVacio mensaje='Este aviso no tiene video.' />
        ) : (
          <VideoAviso
            uri={fuente.uri}
            etiqueta={`Video del aviso ${aviso.titulo}. Controles nativos para reproducir, pausar y avanzar.`}
          />
        )}

        {sePuedeGuardar ? (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Guardar para ver sin conexión'
            accessibilityState={{ disabled: guardar.isPending }}
            disabled={guardar.isPending}
            onPress={() => {
              setMensajeLocal(null);
              guardar.mutate();
            }}
            style={({ pressed }) => [
              estilos.boton,
              { backgroundColor: colores.acento, opacity: pressed || guardar.isPending ? 0.7 : 1 },
            ]}
          >
            <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
              {guardar.isPending ? 'Guardando…' : 'Guardar para ver sin conexión'}
            </Text>
          </Pressable>
        ) : null}

        {sePuedeEliminar ? (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Eliminar descarga'
            accessibilityState={{ disabled: eliminar.isPending }}
            disabled={eliminar.isPending}
            onPress={() => {
              setMensajeLocal(null);
              eliminar.mutate();
            }}
            style={({ pressed }) => [estilos.boton, { opacity: pressed || eliminar.isPending ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botonTexto, { color: colores.acento }]}>
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar descarga'}
            </Text>
          </Pressable>
        ) : null}

        {mensajeLocal ? (
          <Text accessibilityLiveRegion='polite' style={{ color: colores.texto }}>
            {mensajeLocal}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '700' },
  boton: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 12 },
  botonTexto: { fontSize: 16, fontWeight: '600' },
});
