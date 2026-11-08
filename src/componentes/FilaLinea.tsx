import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ColoresTema } from '@/temas/paleta';
import type { Linea } from '@/tipos/linea';
import { BadgeLinea } from '@/componentes/BadgeLinea';

type FilaLineaProps = {
  linea: Linea;
  esGrilla: boolean;
  colores: ColoresTema;
};

export function FilaLinea({ linea, esGrilla, colores }: FilaLineaProps) {
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  return (
    <Animated.View style={[esGrilla ? estilos.celdaAnimada : undefined, estiloAnimado]}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`Línea ${linea.numero}, ${linea.nombre}`}
        accessibilityHint='Abre el detalle de la línea'
        hitSlop={8}
        onPressIn={() => {
          escala.value = withSpring(0.97);
        }}
        onPressOut={() => {
          escala.value = withSpring(1);
        }}
        onPress={() =>
          router.push({
            pathname: '/linea/[id]',
            params: { id: linea.id },
          })
        }
        style={({ pressed }) => [
          estilos.fila,
          esGrilla && estilos.celdaGrilla,
          { borderBottomColor: colores.borde },
          esGrilla && {
            borderColor: colores.borde,
            backgroundColor: colores.fondoSecundario,
          },
          pressed && { backgroundColor: colores.fondoSecundario },
        ]}
      >
        <BadgeLinea numero={linea.numero} color={linea.color} tamano='medio' />
        <View style={estilos.texto}>
          <Text style={[estilos.nombre, { color: colores.texto }]}>
            {linea.nombre}
          </Text>
          <Text style={[estilos.empresa, { color: colores.textoSecundario }]}>
            {linea.empresa}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  celdaAnimada: {
    flex: 1,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  celdaGrilla: {
    flex: 1,
    borderBottomWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 8,
  },
  texto: {
    flex: 1,
  },
  nombre: { fontSize: 16, fontWeight: '600' },
  empresa: { fontSize: 14 },
});
