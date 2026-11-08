import Ionicons from '@react-native-vector-icons/ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EstadoError } from '@/componentes/EstadoError';
import { useTema } from '@/contextos/tema';
import { useOrientacionParada } from '@/hooks/useOrientacionParada';
import type { Coordenadas } from '@/tipos/linea';

export function FlechaParada({
  destino,
  paradaId,
  nombreParada,
}: {
  destino: Coordenadas;
  paradaId: string;
  nombreParada: string;
}) {
  const { colores } = useTema();
  const {
    activa,
    cargando,
    error,
    rotacion,
    distancia,
    enLaParada,
    avisos,
    orientar,
    detener,
    reintentar,
  } = useOrientacionParada(destino, paradaId);

  const metros =
    distancia !== null && Number.isFinite(distancia)
      ? distancia < 1000
        ? `${Math.round(distancia)} m (en línea recta)`
        : `${(distancia / 1000).toFixed(1)} km (en línea recta)`
      : null;

  return (
    <View style={estilos.caja}>
      <Text style={[estilos.titulo, { color: colores.texto }]}>Hacia la parada</Text>
      <Text style={[estilos.aclaracion, { color: colores.textoSecundario }]}>
        Flecha en línea recta, orientativa. No es una ruta por las calles ni un GPS giro a giro. El
        rumbo es magnético estimado, no un norte geográfico exacto. Conviene tener el teléfono más o
        menos horizontal: no medimos la inclinación con acelerómetro.
      </Text>

      {!activa ? (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Orientarme a la parada'
          accessibilityHint='Pide ubicación y usa la brújula del teléfono para apuntar hacia la parada'
          onPress={() => orientar()}
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.fondoSecundario,
              borderColor: colores.borde,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acento }]}>Orientarme a la parada</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Dejar de orientar'
          onPress={() => detener()}
          style={({ pressed }) => [
            estilos.boton,
            {
              backgroundColor: colores.fondoSecundario,
              borderColor: colores.borde,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[estilos.textoBoton, { color: colores.acento }]}>Dejar de orientar</Text>
        </Pressable>
      )}

      {cargando ? (
        <View style={estilos.filaEstado} accessibilityLiveRegion='polite'>
          <ActivityIndicator color={colores.acento} accessibilityLabel='Orientando hacia la parada' />
          <Text style={{ color: colores.textoSecundario }}>Buscando posición y brújula…</Text>
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
  boton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textoBoton: {
    fontWeight: '600',
    fontSize: 16,
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
