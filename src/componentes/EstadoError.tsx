import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/contextos/tema';

interface Props {
  mensaje: string;
  onReintentar: () => void;
}

// El error siempre tiene una salida (U05.T01 diap. 7).
export function EstadoError({ mensaje, onReintentar }: Props) {
  const { colores } = useTema();
  return (
    <View style={estilos.contenedor}>
      <Text accessibilityRole='alert' style={[estilos.mensaje, { color: colores.error }]}>
        {mensaje}
      </Text>
      <Pressable
        onPress={onReintentar}
        accessibilityRole='button'
        accessibilityLabel='Reintentar'
        accessibilityHint='Vuelve a cargar los datos'
        style={({ pressed }) => [
          estilos.boton,
          { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={{ color: colores.acentoTexto, fontWeight: '600' }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 12 },
  mensaje: { fontSize: 16, textAlign: 'center' },
  boton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8 },
});
