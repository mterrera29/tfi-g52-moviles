import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';

export default function NotFoundScreen() {
  const { colores } = useTema();

  return (
    <>
      <Stack.Screen options={{ title: 'No encontrada' }} />
      <SafeAreaView
        style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <View style={estilos.contenido}>
          <Text style={[estilos.titulo, { color: colores.texto }]}>
            Esta pantalla no existe
          </Text>
          <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
            La ruta que abriste no forma parte de la app. Volvé al listado de
            líneas para seguir.
          </Text>

          <Link href='/lineas' asChild>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Ir al listado de líneas'
              style={({ pressed }) => [
                estilos.boton,
                {
                  backgroundColor: colores.acento,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
                Ir a Líneas
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  detalle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  boton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
});
