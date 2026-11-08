import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';
import { consultarAvisos, consultarLineas } from '@/servicios/consulta';
import type { RespuestaError } from '@/tipos/api';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { TarjetaAviso } from '@/componentes/TarjetaAviso';

export default function AvisosScreen() {
  const { colores } = useTema();
  const consultaAvisos = useQuery<Awaited<ReturnType<typeof consultarAvisos>>, RespuestaError>({ queryKey: ['avisos', 'vigentes'], queryFn: consultarAvisos });
  const consultaLineas = useQuery<Awaited<ReturnType<typeof consultarLineas>>, RespuestaError>({ queryKey: ['lineas'], queryFn: consultarLineas });
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
        renderItem={({ item }) => (
          <TarjetaAviso aviso={item} lineasPorId={lineasPorId} videoGuardado={consultaAvisos.data?.videosGuardados.includes(item.id)} />
        )}
        ListEmptyComponent={<EstadoVacio mensaje='No hay avisos activos.' />}
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
  mensaje: {
    fontSize: 16,
  },
});
