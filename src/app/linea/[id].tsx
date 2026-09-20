import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';
import { obtenerAvisosPorLinea } from '@/servicios/avisos';
import { obtenerLineaPorId } from '@/servicios/lineas';
import { obtenerParadasPorIds } from '@/servicios/paradas';
import type { Aviso } from '@/tipos/aviso';
import type { Linea, Recorrido } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

type RecorridoConParadas = Recorrido & { paradas: Parada[] };

export default function LineaDetalleScreen() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lineaId = Array.isArray(id) ? id[0] : id;

  const [linea, setLinea] = useState<Linea | null>(null);
  const [recorridos, setRecorridos] = useState<RecorridoConParadas[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDetalle = useCallback(async () => {
    if (!lineaId) {
      setError('No se indicó qué línea abrir.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    const respuestaLinea = await obtenerLineaPorId(lineaId);

    if ('error' in respuestaLinea) {
      setError(respuestaLinea.error.mensaje);
      setLinea(null);
      setRecorridos([]);
      setAvisos([]);
      setCargando(false);
      return;
    }

    const lineaActual = respuestaLinea.datos;
    setLinea(lineaActual);

    const recorridosConParadas: RecorridoConParadas[] = [];

    for (const recorrido of lineaActual.recorridos) {
      const respuestaParadas = await obtenerParadasPorIds(recorrido.paradaIds);

      if ('error' in respuestaParadas) {
        setError(respuestaParadas.error.mensaje);
        setCargando(false);
        return;
      }

      recorridosConParadas.push({
        ...recorrido,
        paradas: respuestaParadas.datos,
      });
    }

    setRecorridos(recorridosConParadas);

    const respuestaAvisos = await obtenerAvisosPorLinea(lineaId);

    if ('error' in respuestaAvisos) {
      setError(respuestaAvisos.error.mensaje);
      setCargando(false);
      return;
    }

    setAvisos(respuestaAvisos.datos);
    setCargando(false);
  }, [lineaId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  if (cargando) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando línea...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !linea) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <Text style={[estilos.error, { color: colores.error }]}>
          {error ?? 'No se pudo cargar la línea.'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: `Línea ${linea.numero}` }} />

      <ScrollView contentContainerStyle={estilos.scroll}>
        <View style={estilos.encabezado}>
          <View style={[estilos.badge, { backgroundColor: linea.color }]}>
            <Text style={estilos.numero}>{linea.numero}</Text>
          </View>
          <View style={estilos.encabezadoTexto}>
            <Text style={[estilos.nombre, { color: colores.texto }]}>
              {linea.nombre}
            </Text>
            <Text style={[estilos.empresa, { color: colores.textoSecundario }]}>
              {linea.empresa}
            </Text>
          </View>
        </View>

        {!linea.activa && (
          <View
            style={[
              estilos.alertaInactiva,
              { backgroundColor: colores.tarjetaAvisoSuspension },
            ]}
          >
            <Text style={[estilos.alertaTexto, { color: colores.error }]}>
              Línea inactiva
            </Text>
          </View>
        )}

        {avisos.map((aviso) => (
          <View
            key={aviso.id}
            style={[
              estilos.alertaDesvio,
              { backgroundColor: colores.tarjetaAvisoDesvio },
            ]}
          >
            <Text style={[estilos.alertaTitulo, { color: colores.texto }]}>
              {aviso.titulo}
            </Text>
            <Text
              style={[estilos.alertaDetalle, { color: colores.textoSecundario }]}
            >
              {aviso.detalle}
            </Text>
          </View>
        ))}

        {recorridos.map((recorrido) => (
          <View key={recorrido.sentido} style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color: colores.acento }]}>
              {recorrido.sentido === 'ida' ? 'Ida' : 'Vuelta'} —{' '}
              {recorrido.destino}
            </Text>

            {recorrido.paradas.length === 0 ? (
              <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
                Sin paradas para este sentido.
              </Text>
            ) : (
              recorrido.paradas.map((parada, indice) => (
                <View
                  key={parada.id}
                  style={[
                    estilos.filaParada,
                    { borderBottomColor: colores.borde },
                  ]}
                >
                  <Text style={[estilos.orden, { color: colores.acento }]}>
                    {indice + 1}
                  </Text>
                  <View style={estilos.paradaInfo}>
                    <Text style={[estilos.paradaNombre, { color: colores.texto }]}>
                      {parada.nombre}
                    </Text>
                    {parada.refugio && (
                      <Text
                        style={[
                          estilos.paradaDetalle,
                          { color: colores.textoSecundario },
                        ]}
                      >
                        Con refugio
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  encabezadoTexto: {
    flex: 1,
    gap: 4,
  },
  nombre: {
    fontSize: 20,
    fontWeight: '700',
  },
  empresa: {
    fontSize: 15,
  },
  alertaInactiva: {
    padding: 12,
    borderRadius: 8,
  },
  alertaDesvio: {
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  alertaTitulo: {
    fontWeight: '700',
  },
  alertaDetalle: {},
  alertaTexto: {
    fontWeight: '600',
  },
  seccion: {
    gap: 8,
  },
  seccionTitulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  filaParada: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orden: {
    width: 24,
    fontWeight: '700',
  },
  paradaInfo: {
    flex: 1,
    gap: 2,
  },
  paradaNombre: {
    fontSize: 16,
  },
  paradaDetalle: {
    fontSize: 13,
  },
  mensaje: {
    fontSize: 15,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});
