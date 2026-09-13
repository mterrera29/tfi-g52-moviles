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

import { obtenerAvisosPorLinea } from '@/servicios/avisos';
import { obtenerLineaPorId } from '@/servicios/lineas';
import { obtenerParadasPorIds } from '@/servicios/paradas';
import type { Aviso } from '@/tipos/aviso';
import type { Linea, Recorrido } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';

type RecorridoConParadas = Recorrido & { paradas: Parada[] };

export default function LineaDetalleScreen() {
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
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size="large" color="#0B3A5D" />
        <Text style={styles.mensaje}>Cargando línea...</Text>
      </SafeAreaView>
    );
  }

  if (error || !linea) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <Text style={styles.error}>{error ?? 'No se pudo cargar la línea.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['bottom']}>
      <Stack.Screen options={{ title: `Línea ${linea.numero}` }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.encabezado}>
          <View style={[styles.badge, { backgroundColor: linea.color }]}>
            <Text style={styles.numero}>{linea.numero}</Text>
          </View>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.nombre}>{linea.nombre}</Text>
            <Text style={styles.empresa}>{linea.empresa}</Text>
          </View>
        </View>

        {!linea.activa && (
          <View style={styles.alertaInactiva}>
            <Text style={styles.alertaTexto}>Línea inactiva</Text>
          </View>
        )}

        {avisos.map((aviso) => (
          <View key={aviso.id} style={styles.alertaDesvio}>
            <Text style={styles.alertaTitulo}>{aviso.titulo}</Text>
            <Text style={styles.alertaDetalle}>{aviso.detalle}</Text>
          </View>
        ))}

        {recorridos.map((recorrido) => (
          <View key={recorrido.sentido} style={styles.seccion}>
            <Text style={styles.seccionTitulo}>
              {recorrido.sentido === 'ida' ? 'Ida' : 'Vuelta'} — {recorrido.destino}
            </Text>

            {recorrido.paradas.length === 0 ? (
              <Text style={styles.mensaje}>Sin paradas para este sentido.</Text>
            ) : (
              recorrido.paradas.map((parada, indice) => (
                <View key={parada.id} style={styles.filaParada}>
                  <Text style={styles.orden}>{indice + 1}</Text>
                  <View style={styles.paradaInfo}>
                    <Text style={styles.paradaNombre}>{parada.nombre}</Text>
                    {parada.refugio && (
                      <Text style={styles.paradaDetalle}>Con refugio</Text>
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

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#1A1A1A',
  },
  empresa: {
    fontSize: 15,
    color: '#5C6670',
  },
  alertaInactiva: {
    backgroundColor: '#FEE4E2',
    padding: 12,
    borderRadius: 8,
  },
  alertaDesvio: {
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  alertaTitulo: {
    fontWeight: '700',
    color: '#8A4B00',
  },
  alertaDetalle: {
    color: '#5C6670',
  },
  alertaTexto: {
    color: '#B42318',
    fontWeight: '600',
  },
  seccion: {
    gap: 8,
  },
  seccionTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B3A5D',
  },
  filaParada: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D7DE',
  },
  orden: {
    width: 24,
    fontWeight: '700',
    color: '#0B3A5D',
  },
  paradaInfo: {
    flex: 1,
    gap: 2,
  },
  paradaNombre: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  paradaDetalle: {
    fontSize: 13,
    color: '#5C6670',
  },
  mensaje: {
    fontSize: 15,
    color: '#5C6670',
  },
  error: {
    fontSize: 16,
    color: '#B42318',
    textAlign: 'center',
  },
});
