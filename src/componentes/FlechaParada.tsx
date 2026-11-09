import Ionicons from '@react-native-vector-icons/ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EstadoError } from '@/componentes/EstadoError';
import { useTema } from '@/contextos/tema';
import { useOrientacionParada } from '@/hooks/useOrientacionParada';
import type { Coordenadas } from '@/tipos/linea';

export function FlechaParada({
  destino,
  paradaId,
  nombreParada,
  botonComoLlegar,
}: {
  destino: Coordenadas;
  paradaId: string;
  nombreParada: string;
  botonComoLlegar?: ReactNode;
}) {
  const { colores } = useTema();
  const {
    activa,
    error,
    rotacion,
    distancia,
    enLaParada,
    senales,
    avisos,
    orientar,
    detener,
    reintentar,
  } = useOrientacionParada(destino, paradaId);

  // El giro dura hasta que aparece la flecha, así no parpadea mientras llegan las señales.
  const buscando = activa && !error && !enLaParada && rotacion === null;

  const metros =
    distancia !== null && Number.isFinite(distancia)
      ? distancia < 1000
        ? `${Math.round(distancia)} m (en línea recta)`
        : `${(distancia / 1000).toFixed(1)} km (en línea recta)`
      : null;

  return (
    <View style={estilos.caja}>
      <Text style={[estilos.titulo, { color: colores.texto }]}>Hacia la parada</Text>
      <View style={estilos.filaBotones}>
        {botonComoLlegar}
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={activa ? 'Dejar de orientar' : 'Orientarme a la parada'}
          accessibilityHint='Pide ubicación y usa la brújula del teléfono para apuntar hacia la parada'
          onPress={() => (activa ? detener() : orientar())}
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.fondoSecundario,
              borderColor: colores.acento,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name='compass-outline' size={22} color={colores.acento} />
          <Text style={[estilos.textoBoton, { color: colores.acento }]}>
            {activa ? 'Dejar de orientar' : 'Orientarme'}
          </Text>
        </Pressable>
      </View>

      <Text style={[estilos.aclaracion, { color: colores.textoSecundario }]}>
        Flecha en línea recta, orientativa. No es una ruta por las calles ni un GPS giro a giro. El
        rumbo es magnético estimado, no un norte geográfico exacto. Conviene tener el teléfono más o
        menos horizontal: no medimos la inclinación con acelerómetro.
      </Text>

      {buscando ? (
        <View style={estilos.filaEstado} accessibilityLiveRegion='polite'>
          <ActivityIndicator color={colores.acento} accessibilityLabel='Orientando hacia la parada' />
          <View>
            <Text style={{ color: colores.textoSecundario }}>
              Ubicación (GPS): {senales.gps ? 'lista' : 'buscando…'}
            </Text>
            <Text style={{ color: colores.textoSecundario }}>
              Brújula: {senales.brujula ? 'lista' : 'sin datos todavía'}
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <EstadoError
          mensaje={`${error} Si no se puede orientar, usá Cómo llegar.`}
          onReintentar={() => reintentar()}
        />
      ) : null}

      {activa && !error && enLaParada ? (
        <Text accessibilityLiveRegion='polite' style={[estilos.aviso, { color: colores.texto }]}>
          Ya estás en la parada o muy cerca.
        </Text>
      ) : null}

      {activa && !error && !enLaParada && rotacion !== null ? (
        <View
          accessible
          accessibilityLabel={`Flecha orientativa hacia ${nombreParada}. El ángulo no se anuncia.`}
          style={estilos.flechaCaja}
        >
          <View
            accessible={false}
            importantForAccessibility='no'
            style={[
              estilos.flecha,
              {
                backgroundColor: colores.fondoSecundario,
                borderColor: colores.borde,
                transform: [{ rotate: `${rotacion}deg` }],
              },
            ]}
          >
            <Ionicons name='arrow-up' size={56} color={colores.acento} />
          </View>
        </View>
      ) : null}

      {activa && !error && metros && !enLaParada ? (
        <Text style={[estilos.aviso, { color: colores.textoSecundario }]}>{metros}</Text>
      ) : null}

      {activa && avisos.postura ? (
        <Text style={[estilos.aviso, { color: colores.textoSecundario }]}>{avisos.postura}</Text>
      ) : null}
      {activa && avisos.calibracion ? (
        <Text style={[estilos.aviso, { color: colores.textoSecundario }]}>{avisos.calibracion}</Text>
      ) : null}
      {activa && avisos.precision ? (
        <Text style={[estilos.aviso, { color: colores.textoSecundario }]}>{avisos.precision}</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    gap: 8,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  aclaracion: {
    fontSize: 13,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 8,
  },
  boton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  textoBoton: {
    fontWeight: '600',
    fontSize: 15,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flechaCaja: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  flecha: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  aviso: {
    fontSize: 14,
  },
});
