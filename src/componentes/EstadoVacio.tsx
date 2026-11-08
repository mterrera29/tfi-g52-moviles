import { StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contextos/tema';

interface Props {
  mensaje: string;
}

export function EstadoVacio({ mensaje }: Props) {
  const { colores } = useTema();

  return (
    <View style={estilos.contenedor}>
      <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
        {mensaje}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    padding: 24,
    alignItems: 'center',
  },
  mensaje: {
    fontSize: 16,
    textAlign: 'center',
  },
});
