import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
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
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeLinea } from '@/componentes/BadgeLinea';
import { useTema } from '@/contextos/tema';
import { largoTrazadoKm } from '@/lib/resumenLinea';
import { consultarHorariosLineaHoy } from '@/servicios/consulta';
import type { LineaDetalleConsulta } from '@/servicios/consulta';

function PuntoActivo({ activa, color }: { activa: boolean; color: string }) {
  const opacidad = useSharedValue(1);
  useEffect(() => {
    if (!activa) return;
    opacidad.value = withRepeat(
      withSequence(withTiming(0.25, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, [activa, opacidad]);
  const estilo = useAnimatedStyle(() => ({ opacity: activa ? opacidad.value : 1 }));
  return (
    <Animated.View
      importantForAccessibility='no-hide-descendants'
      accessibilityElementsHidden
      style={[estilos.punto, { backgroundColor: color }, estilo]}
    />
  );
}

function textoFrecuencia(minutos: number | null): string {
  return minutos ? ` · cada ${minutos} min` : '';
}

export default function AcercaScreen() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const esWeb = Platform.OS === 'web';
  const params = useLocalSearchParams<{
    lineaId?: string;
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

  const lineaId = Array.isArray(params.lineaId) ? params.lineaId[0] : params.lineaId;
  const queryClient = useQueryClient();
  const detalle = lineaId
    ? queryClient.getQueryData<LineaDetalleConsulta>(['linea', lineaId])
    : undefined;
  const recorridos = detalle?.recorridos ?? [];
  const avisosVigentes = detalle?.avisos.length ?? 0;
  const { data: horariosHoy } = useQuery({
    queryKey: ['linea-horarios-hoy', lineaId],
    enabled: !!detalle,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => consultarHorariosLineaHoy(lineaId as string, recorridos),
  });

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
        {!esDetalleLinea && (
          <Text style={[estilos.parrafo, { color: colores.textoSecundario }]}>
            Transporte Paraná consulta líneas, paradas, horarios de tabla y avisos
            de la Dirección de Transporte.
          </Text>
        )}

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
            <View style={estilos.encabezadoLinea}>
              <BadgeLinea numero={lineaNumero ?? ''} color={detalle?.linea.color} tamano='grande' />
              <View style={estilos.encabezadoTexto}>
                <Text style={[estilos.lineaNumero, { color: colores.texto }]}>
                  Línea {lineaNumero}
                </Text>
                {detalle ? (
                  <View
                    accessible
                    accessibilityLabel={detalle.linea.activa ? 'Línea activa' : 'Línea fuera de servicio'}
                    style={estilos.filaEstado}
                  >
                    <PuntoActivo
                      activa={detalle.linea.activa}
                      color={detalle.linea.activa ? '#22C55E' : colores.error}
                    />
                    <Text
                      style={[
                        estilos.estado,
                        { color: detalle.linea.activa ? colores.texto : colores.error },
                      ]}
                    >
                      {detalle.linea.activa ? 'Activa' : 'Fuera de servicio'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
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
            {recorridos.map((recorrido) => {
              const conRefugio = recorrido.paradas.filter((parada) => parada.refugio).length;
              const etiqueta = recorrido.sentido === 'ida' ? 'Ida' : 'Vuelta';
              const km = largoTrazadoKm(recorrido.trazado);
              const kmTexto = km ? ` · ${km.toFixed(1).replace('.', ',')} km` : '';
              const horario = horariosHoy?.porSentido.find((item) => item.sentido === recorrido.sentido);
              return (
                <View
                  key={recorrido.sentido}
                  accessible
                  accessibilityLabel={`${etiqueta} hacia ${recorrido.destino}. ${recorrido.paradas.length} paradas, ${conRefugio} con refugio${km ? `, ${km.toFixed(1)} kilómetros` : ''}${horario ? `. Hoy de ${horario.resumen.primero} a ${horario.resumen.ultimo}` : ''}`}
                  style={[estilos.recorrido, { borderTopColor: colores.borde }]}
                >
                  <Text style={[estilos.recorridoTitulo, { color: colores.texto }]}>
                    {etiqueta} → {recorrido.destino}
                  </Text>
                  <Text style={[estilos.recorridoDetalle, { color: colores.textoSecundario }]}>
                    {recorrido.paradas.length} paradas · {conRefugio} con refugio{kmTexto}
                  </Text>
                  {horario ? (
                    <Text style={[estilos.recorridoDetalle, { color: colores.textoSecundario }]}>
                      Hoy: {horario.resumen.primero} a {horario.resumen.ultimo}
                      {textoFrecuencia(horario.resumen.cadaMinutos)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {detalle ? (
              avisosVigentes > 0 ? (
                <Link href='/avisos' style={[estilos.parrafo, { color: colores.acento, fontWeight: '600' }]}>
                  {avisosVigentes === 1 ? '1 aviso vigente' : `${avisosVigentes} avisos vigentes`} · Ver avisos
                </Link>
              ) : (
                <Text style={[estilos.recorridoDetalle, { color: colores.textoSecundario }]}>
                  Sin avisos vigentes
                </Text>
              )
            ) : null}
          </View>
        )}

        <Text style={[estilos.nota, { color: colores.textoSecundario }]}>
          Los horarios son los de la tabla publicada, no posición en vivo de los
          colectivos.
        </Text>
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
    height: '85%',
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
  encabezadoLinea: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  encabezadoTexto: { flex: 1 },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  estado: { fontSize: 14, fontWeight: '600' },
  recorrido: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 8 },
  recorridoTitulo: { fontSize: 16, fontWeight: '600' },
  recorridoDetalle: { fontSize: 14 },
  nota: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
