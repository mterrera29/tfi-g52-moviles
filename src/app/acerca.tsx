import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';

export default function AcercaScreen() {
  const { colores } = useTema();
  const params = useLocalSearchParams<{
    lineaNumero?: string;
    lineaNombre?: string;
    empresa?: string;
  }>();

  const lineaNumero = Array.isArray(params.lineaNumero)
    ? params.lineaNumero[0]
    : params.lineaNumero;
  const lineaNombre = Array.isArray(params.lineaNombre)
    ? params.lineaNombre[0]
    : params.lineaNombre;
  const empresa = Array.isArray(params.empresa)
    ? params.empresa[0]
    : params.empresa;

  const esDetalleLinea = Boolean(lineaNumero);

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: 'Acerca de' }} />

      <ScrollView contentContainerStyle={estilos.scroll}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>
          Transporte Paraná
        </Text>
        <Text style={[estilos.parrafo, { color: colores.textoSecundario }]}>
          Información de la aplicación móvil para consultar líneas, paradas,
          horarios según tabla y avisos de la Dirección de Transporte.
        </Text>

        {esDetalleLinea && (
          <View
            style={[
              estilos.tarjeta,
              {
                backgroundColor: colores.fondoSecundario,
                borderColor: colores.borde,
              },
            ]}
          >
            <Text style={[estilos.etiqueta, { color: colores.acento }]}>
              Línea consultada
            </Text>
            <Text style={[estilos.lineaNumero, { color: colores.texto }]}>
              Línea {lineaNumero}
            </Text>
            {lineaNombre ? (
              <Text style={[estilos.parrafo, { color: colores.texto }]}>
                {lineaNombre}
              </Text>
            ) : null}
            {empresa ? (
              <Text style={[estilos.parrafo, { color: colores.textoSecundario }]}>
                {empresa}
              </Text>
            ) : null}
          </View>
        )}

        <Text style={[estilos.nota, { color: colores.textoSecundario }]}>
          Los horarios son los de la tabla publicada, no posición en vivo de los
          colectivos.
        </Text>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel='Cerrar'
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.acento,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
            Cerrar
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    gap: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
  },
  parrafo: {
    fontSize: 16,
    lineHeight: 22,
  },
  tarjeta: {
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginTop: 4,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  lineaNumero: {
    fontSize: 18,
    fontWeight: '700',
  },
  nota: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  boton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
});
