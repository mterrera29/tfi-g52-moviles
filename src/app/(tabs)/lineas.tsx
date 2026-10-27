import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilaLinea } from '@/componentes/FilaLinea';
import { useTema } from '@/contextos/tema';
import { useColumnasLista } from '@/hooks/useColumnasLista';
import { obtenerLineas } from '@/servicios/lineas';
import type { RespuestaError } from '@/tipos/api';
import { EstadoError } from '@/componentes/EstadoError';

export default function LineasScreen() {
  const { colores } = useTema();
  const { columnas, onLayout } = useColumnasLista();
  // La clave identifica la copia en caché (U05.T01 diap. 18).
  const { data, isPending, error, refetch } = useQuery<Awaited<ReturnType<typeof obtenerLineas>>, RespuestaError>({
    queryKey: ['lineas'],
    queryFn: obtenerLineas,
  });
  const lineas = data?.datos ?? [];
  const esGrilla = columnas > 1;

  if (isPending) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator
          size='large'
          color={colores.acento}
          accessibilityLabel='Cargando líneas'
        />
        <Text style={{ color: colores.textoSecundario }}>Cargando líneas...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <EstadoError
          mensaje={error.error.mensaje}
          onReintentar={() => { void refetch(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      onLayout={onLayout}
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <FlatList
        key={esGrilla ? `grilla-${columnas}` : 'lista'}
        data={lineas}
        {...(esGrilla
          ? { numColumns: columnas, columnWrapperStyle: estilos.filaGrilla }
          : {})}
        keyExtractor={(item) => item.id}
        contentContainerStyle={esGrilla ? estilos.contenidoGrilla : undefined}
        renderItem={({ item }) => (
          <FilaLinea linea={item} esGrilla={esGrilla} colores={colores} />
        )}
        ListEmptyComponent={
          <Text style={{ color: colores.textoSecundario, padding: 16 }}>
            No hay líneas.
          </Text>
        }
      />
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
  contenidoGrilla: {
    padding: 8,
  },
  filaGrilla: {
    gap: 8,
  },
});
