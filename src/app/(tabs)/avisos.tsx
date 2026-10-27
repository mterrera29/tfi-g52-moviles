import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';
import type { ColoresTema } from '@/temas/paleta';
import { obtenerAvisos } from '@/servicios/avisos';
import { obtenerLineas } from '@/servicios/lineas';
import type { Gravedad } from '@/tipos/aviso';
import type { RespuestaError } from '@/tipos/api';
import { EstadoError } from '@/componentes/EstadoError';

function etiquetaGravedad(gravedad: Gravedad) {
  if (gravedad === 'desvio') return 'Desvío';
  if (gravedad === 'suspension') return 'Suspensión';
  return 'Informativo';
}

function colorGravedad(gravedad: Gravedad, colores: ColoresTema) {
  if (gravedad === 'desvio') return colores.tarjetaAvisoDesvio;
  if (gravedad === 'suspension') return colores.tarjetaAvisoSuspension;
  return colores.tarjetaAvisoInfo;
}

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export default function AvisosScreen() {
  const { colores } = useTema();
  const consultaAvisos = useQuery<Awaited<ReturnType<typeof obtenerAvisos>>, RespuestaError>({ queryKey: ['avisos', 'vigentes'], queryFn: obtenerAvisos });
  const consultaLineas = useQuery<Awaited<ReturnType<typeof obtenerLineas>>, RespuestaError>({ queryKey: ['lineas'], queryFn: obtenerLineas });
  const avisos = consultaAvisos.data?.datos ?? [];
  const lineasPorId = Object.fromEntries((consultaLineas.data?.datos ?? []).map((linea) => [linea.id, linea]));
  const error = consultaAvisos.error ?? consultaLineas.error;
  const cargando = consultaAvisos.isPending || consultaLineas.isPending;
  const cargarAvisos = () => { void consultaAvisos.refetch(); void consultaLineas.refetch(); };

  if (cargando) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator
          size='large'
          color={colores.acento}
          accessibilityLabel='Cargando avisos'
        />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando avisos...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <EstadoError mensaje={error.error.mensaje} onReintentar={cargarAvisos} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <FlatList
        data={avisos}
        keyExtractor={(item) => item.id}
        refreshing={consultaAvisos.isRefetching || consultaLineas.isRefetching}
        onRefresh={cargarAvisos}
        renderItem={({ item }) => {
          const numerosLineas = item.lineaIds
            .map((lineaId) => lineasPorId[lineaId]?.numero)
            .filter(Boolean)
            .join(', ');

          return (
          <View
            accessible
            accessibilityRole='text'
            accessibilityLabel={`${etiquetaGravedad(item.gravedad)}. ${item.titulo}. Líneas ${numerosLineas}. ${item.detalle}. Desde ${formatearFecha(item.desde)}${item.hasta ? `. Hasta ${formatearFecha(item.hasta)}` : ''}`}
            style={[
              estilos.tarjeta,
              { backgroundColor: colorGravedad(item.gravedad, colores) },
            ]}
          >
            <Text style={[estilos.etiqueta, { color: colores.acento }]}>
              {etiquetaGravedad(item.gravedad)}
            </Text>
            <Text style={[estilos.titulo, { color: colores.texto }]}>
              {item.titulo}
            </Text>
            <View style={estilos.lineasFila}>
              {item.lineaIds.map((lineaId) => {
                const linea = lineasPorId[lineaId];

                if (!linea) {
                  return null;
                }

                return (
                  <View
                    key={lineaId}
                    style={[estilos.badge, { backgroundColor: linea.color }]}
                    importantForAccessibility='no-hide-descendants'
                    accessibilityElementsHidden
                  >
                    <Text style={estilos.badgeNumero}>{linea.numero}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
              {item.detalle}
            </Text>
            <Text style={[estilos.fecha, { color: colores.textoSecundario }]}>
              Desde {formatearFecha(item.desde)}
              {item.hasta ? ` · Hasta ${formatearFecha(item.hasta)}` : ''}
            </Text>
          </View>
          );
        }}
        ListEmptyComponent={
          <View style={estilos.listaVacia}>
            <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
              No hay avisos vigentes.
            </Text>
          </View>
        }
        contentContainerStyle={
          avisos.length === 0 ? estilos.listaVaciaContenedor : undefined
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  listaVacia: {
    padding: 24,
    alignItems: 'center',
  },
  listaVaciaContenedor: {
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
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
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
  },
  fecha: {
    fontSize: 13,
  },
  mensaje: {
    fontSize: 16,
  },
});
