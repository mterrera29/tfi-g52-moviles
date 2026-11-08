import Ionicons from '@react-native-vector-icons/ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/contextos/sesion';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useAhoraCadaMinuto } from '@/hooks/useAhoraCadaMinuto';
import { useTema } from '@/contextos/tema';
import {
  resolverProximosParada,
  textoHorarioSegunTabla,
} from '@/lib/proximosHorarios';
import { consultarParadaDetalle } from '@/servicios/consulta';
import { BadgeLinea } from '@/componentes/BadgeLinea';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { BotonRecordatorio } from '@/componentes/BotonRecordatorio';
import { FlechaParada } from '@/componentes/FlechaParada';
import { coordenadasValidas } from '@/lib/rumboParada';
import type { RespuestaError } from '@/tipos/api';

export default function ParadaDetalleScreen() {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const { usuario, actualizando, paradasFavoritas, alternarParadaFavorita, errorParada } = useFavoritos();
  const { id } = useLocalSearchParams<{ id: string }>();
  const paradaId = Array.isArray(id) ? id[0] : id;
  const ahora = useAhoraCadaMinuto();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['parada', paradaId, 'proximos', 3],
    queryFn: async () => {
      if (!paradaId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué parada abrir.' } };
      return consultarParadaDetalle(paradaId, 3);
    },
  });
  const esFavorita = !!sesion && paradasFavoritas.includes(paradaId);
  const parada = data?.parada;
  const lineas = data?.lineas ?? [];
  const horarios = data?.horarios ?? [];
  const tablas = data?.tablas ?? [];
  const feriados = data?.feriados ?? [];
  const proximosResueltos = data
    ? resolverProximosParada({
        tablas,
        fallbackApi: horarios,
        feriados,
        cantidad: 3,
        ahora,
        obtenidoEn: new Date(data.consultadoEn),
        calendarioListo: data.calendarioListo,
        tablasCompletas: data.tablasCompletas,
      })
    : null;
  const horariosAMostrar = proximosResueltos?.proximos ?? [];
  const mensajeSinHorarios =
    proximosResueltos?.mensajeVacio ?? data?.mensajeSinHorarios ?? null;

  if (isPending) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando parada...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !parada) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <EstadoError mensaje={error ? (error as unknown as RespuestaError).error.mensaje : 'No se pudo cargar la parada.'} onReintentar={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen options={{ title: parada.nombre }} />

      <ScrollView contentContainerStyle={estilos.scroll}>
        {errorParada && (
          <Text accessibilityLiveRegion='polite' style={{ color: colores.error }}>
            {errorParada.error.mensaje}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={[estilos.subtitulo, { color: colores.textoSecundario, flex: 1 }]}
            accessibilityLabel={`${parada.refugio ? 'Con refugio' : 'Sin refugio'}. Sentido ${parada.sentido}`}
          >
            {parada.refugio ? 'Con refugio' : 'Sin refugio'} · Sentido{' '}
            {parada.sentido}
          </Text>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={esFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            accessibilityState={{ selected: esFavorita, disabled: !!sesion && (!usuario || actualizando) }}
            disabled={!!sesion && (!usuario || actualizando)}
            onPress={() => {
              if (!sesion) {
                router.push('/login');
                return;
              }
              alternarParadaFavorita(parada.id);
            }}
            style={{ padding: 8 }}
          >
            <Ionicons name={esFavorita ? 'heart' : 'heart-outline'} size={28} color={colores.acento} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Cómo llegar a esta parada'
          onPress={async () => {
            try {
              await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${parada.coordenadas.latitud},${parada.coordenadas.longitud}`);
            } catch {
              Alert.alert('No se pudo abrir el mapa', 'Intentá nuevamente para ver cómo llegar a la parada.');
            }
          }}
          style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, padding: 12, backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color: colores.acentoTexto, fontWeight: '600', fontSize: 16 }}>Cómo llegar</Text>
        </Pressable>

        {coordenadasValidas(parada.coordenadas) ? (
          <FlechaParada
            destino={parada.coordenadas}
            paradaId={parada.id}
            nombreParada={parada.nombre}
          />
        ) : null}

        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Reportar demora en esta parada'
          onPress={() => {
            router.push({
              pathname: '/reportar',
              params: {
                paradaId: parada.id,
                ...(lineas.length === 1 ? { lineaId: lineas[0].id } : {}),
              },
            });
          }}
          style={({ pressed }) => [
            { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colores.acento, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: colores.acento, fontWeight: '600', fontSize: 16 }}>Reportar demora</Text>
        </Pressable>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Líneas que paran acá
        </Text>
        <View style={estilos.lineasFila}>
          {lineas.length === 0 && (
            <EstadoVacio mensaje='No hay líneas para esta parada.' />
          )}
          {lineas.map((linea) => (
            <BadgeLinea
              key={linea.id}
              numero={linea.numero}
              color={linea.color}
              tamano='medio'
              accessibilityLabel={`Línea ${linea.numero}`}
            />
          ))}
        </View>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Próximos horarios (según la tabla)
        </Text>
        <Text style={[estilos.aclaracion, { color: colores.textoSecundario }]}>
          No es seguimiento GPS ni tiempo real: son horarios de la tabla.
        </Text>

        {proximosResueltos?.mensajeHoyAgotado ? (
          <Text
            style={[estilos.avisoServicio, { color: colores.texto }]}
            accessibilityLiveRegion='polite'
          >
            {proximosResueltos.mensajeHoyAgotado}
          </Text>
        ) : null}

        {horariosAMostrar.length === 0 ? (
          <EstadoVacio
            mensaje={mensajeSinHorarios ?? 'No hay próximos servicios para esta parada.'}
          />
        ) : (
          horariosAMostrar.map((item, indice) => {
            const horario = item.horario;
            const linea = lineas.find((lineaItem) => lineaItem.id === horario.lineaId);
            const texto = textoHorarioSegunTabla(item);

            return (
              <View
                key={`${horario.id}-${item.fechaServicio ?? 'sinfcha'}-${indice}`}
                style={[
                  estilos.bloqueHorario,
                  { borderBottomColor: colores.borde },
                ]}
              >
                <View
                  accessible
                  accessibilityLabel={`Línea ${linea?.numero ?? 'desconocida'}, ${texto}`}
                  style={estilos.filaHorario}
                >
                  <BadgeLinea
                    numero={linea?.numero ?? '?'}
                    color={linea?.color}
                    tamano='chico'
                  />
                  <Text style={[estilos.hora, { color: colores.texto }]}>
                    {texto}
                  </Text>
                </View>
                <BotonRecordatorio
                  pedido={{
                    paradaId: parada.id,
                    paradaNombre: parada.nombre,
                    horarioId: horario.id,
                    lineaId: horario.lineaId,
                    lineaNumero: linea?.numero ?? '',
                    hora: horario.hora,
                    fechaServicio: item.fechaServicio,
                    minutosRestantes: item.minutosRestantes,
                  }}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  subtitulo: {
    fontSize: 15,
  },
  seccion: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  lineasFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloqueHorario: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaHorario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hora: {
    fontSize: 16,
    flex: 1,
  },
  aclaracion: {
    fontSize: 13,
    marginTop: -4,
  },
  avisoServicio: {
    fontSize: 15,
    fontWeight: '600',
  },
  mensaje: {
    fontSize: 15,
  },
});
