import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/contextos/tema';

export default function AcercaScreen() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const esWeb = Platform.OS === 'web';
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
  const desplazamiento = useSharedValue(0);

  const cerrar = useCallback(() => {
    router.back();
  }, []);

  const pan = Gesture.Pan()
    .enabled(esWeb)
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((evento) => {
      desplazamiento.value = Math.max(0, evento.translationY);
    })
    .onEnd((evento) => {
      const alcanza = evento.translationY > 80 || evento.velocityY > 900;
      if (alcanza) {
        runOnJS(cerrar)();
      } else {
        desplazamiento.value = withSpring(0);
      }
    });

  const estiloHoja = useAnimatedStyle(() => ({
    transform: [{ translateY: desplazamiento.value }],
  }));

  const asaInterna = (
    <View
      accessible
      accessibilityRole='adjustable'
      accessibilityLabel='Cerrar deslizando hacia abajo'
      accessibilityHint='Arrastrá hacia abajo para cerrar'
      style={estilos.asa}
    >
      <View style={[estilos.asaBarra, { backgroundColor: colores.borde }]} />
    </View>
  );

  const asa = esWeb ? (
    <GestureDetector gesture={pan}>{asaInterna}</GestureDetector>
  ) : (
    asaInterna
  );

  const hoja = (
    <Animated.View
      style={[
        esWeb ? estilos.hojaWeb : estilos.hojaNativa,
        {
          backgroundColor: colores.fondo,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        estiloHoja,
      ]}
    >
      {asa}

      <ScrollView contentContainerStyle={estilos.scroll}>
        <Text style={[estilos.titulo, { color: colores.texto }]}>Acerca de</Text>
        <Text style={[estilos.parrafo, { color: colores.textoSecundario }]}>
          Transporte Paraná consulta líneas, paradas, horarios de tabla y avisos
          de la Dirección de Transporte.
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
          onPress={cerrar}
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
    </Animated.View>
  );

  if (!esWeb) {
    return hoja;
  }

  return (
    <View style={estilos.overlay}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Cerrar'
        onPress={cerrar}
        style={estilos.fondoOscuro}
      />
      {hoja}
    </View>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fondoOscuro: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  hojaNativa: {
    flex: 1,
  },
  hojaWeb: {
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  asa: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 44,
  },
  asaBarra: {
    width: 40,
    height: 5,
    borderRadius: 999,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
});
