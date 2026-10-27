import Ionicons from '@react-native-vector-icons/ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
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
import { EstadoError } from '@/componentes/EstadoError';
import type { RespuestaError } from '@/tipos/api';

export default function LineaDetalleScreen() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lineaId = Array.isArray(id) ? id[0] : id;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['linea', lineaId],
    queryFn: async () => {
      if (!lineaId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué línea abrir.' } };
      const { datos: linea } = await obtenerLineaPorId(lineaId);
      const [recorridos, respuestaAvisos] = await Promise.all([
        Promise.all(linea.recorridos.map(async (recorrido) => ({
          ...recorrido,
          paradas: (await obtenerParadasPorIds(recorrido.paradaIds)).datos,
        }))),
        obtenerAvisosPorLinea(lineaId),
      ]);
      return { linea, recorridos, avisos: respuestaAvisos.datos };
    },
  });
  const linea = data?.linea;
  const recorridos = data?.recorridos ?? [];
  const avisos = data?.avisos ?? [];

  if (isPending) {
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
        <EstadoError mensaje={error ? (error as unknown as RespuestaError).error.mensaje : 'No se pudo cargar la línea.'} onReintentar={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          title: `Línea ${linea.numero}`,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/acerca',
                  params: {
                    lineaNumero: linea.numero,
                    lineaNombre: linea.nombre,
                    empresa: linea.empresa,
                  },
                })
              }
              accessibilityRole='button'
              accessibilityLabel='Más información sobre esta línea'
              hitSlop={10}
              style={estilos.botonHeader}
            >
              <Ionicons
                name='information-circle-outline'
                size={24}
                color={colores.headerTexto}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={estilos.scroll}>
        <View
          accessible
          accessibilityLabel={`Línea ${linea.numero}, ${linea.nombre}. Empresa ${linea.empresa}`}
          style={estilos.encabezado}
        >
          <View
            style={[estilos.badge, { backgroundColor: linea.color }]}
            importantForAccessibility='no-hide-descendants'
            accessibilityElementsHidden
          >
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
            accessibilityRole='alert'
            accessibilityLabel='Línea inactiva'
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

        {avisos.length === 0 && <Text style={{ color: colores.textoSecundario }}>No hay avisos vigentes para esta línea.</Text>}
        {recorridos.length === 0 && <Text style={{ color: colores.textoSecundario }}>No hay recorridos para esta línea.</Text>}

        {avisos.map((aviso) => (
          <View
            key={aviso.id}
            accessible
            accessibilityRole='alert'
            accessibilityLabel={`${aviso.titulo}. ${aviso.detalle}`}
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
                <Pressable
                  key={parada.id}
                  accessibilityRole='button'
                  accessibilityLabel={`Parada ${indice + 1}, ${parada.nombre}${parada.refugio ? ', con refugio' : ''}`}
                  accessibilityHint='Abre el detalle de la parada'
                  hitSlop={8}
                  onPress={() =>
                    router.push({
                      pathname: '/parada/[id]',
                      params: { id: parada.id },
                    })
                  }
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
                </Pressable>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  botonHeader: {
    marginRight: 8,
    padding: 4,
  },
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
});
