import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerAvisos } from '@/servicios/avisos';
import { obtenerLineas } from '@/servicios/lineas';
import type { Aviso, Gravedad } from '@/tipos/aviso';
import type { Linea } from '@/tipos/linea';

function etiquetaGravedad(gravedad: Gravedad) {
  if (gravedad === 'desvio') return 'Desvío';
  if (gravedad === 'suspension') return 'Suspensión';
  return 'Informativo';
}

function colorGravedad(gravedad: Gravedad) {
  if (gravedad === 'desvio') return '#FFF4E5';
  if (gravedad === 'suspension') return '#FEE4E2';
  return '#E8F4FD';
}

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function AvisosScreen() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [lineasPorId, setLineasPorId] = useState<Record<string, Linea>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarAvisos = useCallback(async () => {
    setCargando(true);
    setError(null);

    const [respuestaAvisos, respuestaLineas] = await Promise.all([
      obtenerAvisos(),
      obtenerLineas(),
    ]);

    if ('error' in respuestaLineas) {
      setError(respuestaLineas.error.mensaje);
      setAvisos([]);
      setLineasPorId({});
      setCargando(false);
      return;
    }

    setLineasPorId(
      Object.fromEntries(
        respuestaLineas.datos.map((linea) => [linea.id, linea]),
      ),
    );

    if ('error' in respuestaAvisos) {
      setError(respuestaAvisos.error.mensaje);
      setAvisos([]);
    } else {
      setAvisos(respuestaAvisos.datos);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    cargarAvisos();
  }, [cargarAvisos]);

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <ActivityIndicator size='large' color='#0B3A5D' />
        <Text style={styles.mensaje}>Cargando avisos...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centrado} edges={['bottom']}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={['bottom']}>
      <FlatList
        data={avisos}
        keyExtractor={(item) => item.id}
        refreshing={cargando}
        onRefresh={cargarAvisos}
        renderItem={({ item }) => (
          <View
            style={[
              styles.tarjeta,
              { backgroundColor: colorGravedad(item.gravedad) },
            ]}
          >
            <Text style={styles.etiqueta}>
              {etiquetaGravedad(item.gravedad)}
            </Text>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <View style={styles.lineasFila}>
              {item.lineaIds.map((lineaId) => {
                const linea = lineasPorId[lineaId];

                if (!linea) {
                  return null;
                }

                return (
                  <View
                    key={lineaId}
                    style={[styles.badge, { backgroundColor: linea.color }]}
                  >
                    <Text style={styles.badgeNumero}>{linea.numero}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.detalle}>{item.detalle}</Text>
            <Text style={styles.fecha}>
              Desde {formatearFecha(item.desde)}
              {item.hasta ? ` · Hasta ${formatearFecha(item.hasta)}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Text style={styles.mensaje}>No hay avisos vigentes.</Text>
          </View>
        }
        contentContainerStyle={
          avisos.length === 0 ? styles.listaVacia : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  listaVacia: {
    flexGrow: 1,
  },
  tarjeta: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B3A5D',
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  lineasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumero: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  detalle: {
    fontSize: 15,
    color: '#5C6670',
  },
  fecha: {
    fontSize: 13,
    color: '#5C6670',
  },
  mensaje: {
    fontSize: 16,
    color: '#5C6670',
  },
  error: {
    fontSize: 16,
    color: '#B42318',
    textAlign: 'center',
  },
});
