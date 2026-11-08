import Ionicons from '@react-native-vector-icons/ionicons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/contextos/sesion';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useTema } from '@/contextos/tema';
import { consultarLineaDetalle } from '@/servicios/consulta';
import { BadgeLinea } from '@/componentes/BadgeLinea';
import { CartelParada } from '@/componentes/CartelParada';
import { EstadoError } from '@/componentes/EstadoError';
import { HorariosLinea } from '@/componentes/HorariosLinea';
import { MapaRecorridoLinea } from '@/componentes/MapaRecorridoLinea';
import { filtrarTrazadosAlternativos } from '@/lib/trazadoAlternativo';
import type { RespuestaError } from '@/tipos/api';

export default function LineaDetalleScreen() {
  const { colores } = useTema();
  const { sesion } = useSesion();
  const { usuario, actualizando, lineasFavoritas, alternarLineaFavorita, errorLinea } = useFavoritos();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lineaId = Array.isArray(id) ? id[0] : id;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['linea', lineaId],
    queryFn: async () => {
      if (!lineaId) throw { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'No se indicó qué línea abrir.' } };
      return consultarLineaDetalle(lineaId);
    },
  });
  const esFavorita = !!sesion && lineasFavoritas.includes(lineaId);
  const linea = data?.linea;
  const recorridos = data?.recorridos ?? [];
  const avisos = data?.avisos ?? [];
  const trazadosAlternativos = filtrarTrazadosAlternativos(avisos);

  if (isPending) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando línea...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !linea) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <EstadoError mensaje={error ? (error as unknown as RespuestaError).error.mensaje : 'No se pudo cargar la línea.'} onReintentar={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          title: `Línea ${linea.numero}`,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/acerca',
                  params: {
                    lineaId: linea.id,
                    lineaNumero: linea.numero,
                    lineaNombre: linea.nombre,
                    empresa: linea.empresa,
                  },
                })
              }
              accessibilityRole='button'
              accessibilityLabel='Más información sobre esta línea'
              hitSlop={10}
              style={estilos.botonHeader}
            >
              <Ionicons
                name='information-circle-outline'
                size={24}
                color={colores.headerTexto}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={estilos.scroll}>
        {errorLinea && (
          <Text accessibilityLiveRegion='polite' style={{ color: colores.error }}>
            {errorLinea.error.mensaje}
          </Text>
        )}

        <View
          accessible
          accessibilityLabel={`Línea ${linea.numero}, ${linea.nombre}. Empresa ${linea.empresa}`}
          style={estilos.encabezado}
        >
          <BadgeLinea numero={linea.numero} color={linea.color} tamano='grande' />
          <View style={estilos.encabezadoTexto}>
            <Text style={[estilos.nombre, { color: colores.texto }]}>
              {linea.nombre}
            </Text>
            <Text style={[estilos.empresa, { color: colores.textoSecundario }]}>
              {linea.empresa}
            </Text>
          </View>
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
                alternarLineaFavorita(linea.id);
              }}
              style={{ padding: 8 }}
            >
              <Ionicons name={esFavorita ? 'heart' : 'heart-outline'} size={28} color={colores.acento} />
            </Pressable>
        </View>

        {!linea.activa && (
          <View
            accessibilityRole='alert'
            accessibilityLabel='Línea inactiva'
            style={[
              estilos.alertaInactiva,
              { backgroundColor: colores.tarjetaAvisoSuspension },
            ]}
          >
            <Text style={[estilos.alertaTexto, { color: colores.error }]}>
              Línea inactiva
            </Text>
          </View>
        )}

        {avisos.length === 0 && <Text style={{ color: colores.textoSecundario }}>No hay avisos vigentes para esta línea.</Text>}
        {recorridos.length === 0 && <Text style={{ color: colores.textoSecundario }}>No hay recorridos para esta línea.</Text>}

        {avisos.map((aviso) => (
          <View
            key={aviso.id}
            accessible
            accessibilityRole='alert'
            accessibilityLabel={`${aviso.titulo}. ${aviso.detalle}`}
            style={[
              estilos.alertaDesvio,
              { backgroundColor: colores.tarjetaAvisoDesvio },
            ]}
          >
            <Text style={[estilos.alertaTitulo, { color: colores.texto }]}>
              {aviso.titulo}
            </Text>
            <Text
              style={[estilos.alertaDetalle, { color: colores.textoSecundario }]}
            >
              {aviso.detalle}
            </Text>
            {trazadosAlternativos.some((trazado) => trazado.id === aviso.id) ? (
              <Text style={[estilos.alertaDetalle, { color: colores.texto }]}>
                El trazado alternativo de este desvío está dibujado en el mapa.
              </Text>
            ) : null}
            {aviso.videoUrl ? (
              <Link href={{ pathname: '/aviso/[id]', params: { id: aviso.id } }} asChild>
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel='Ver video del aviso'
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: colores.texto, fontWeight: '600' }}>Ver video</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        ))}

        <MapaRecorridoLinea
          numeroLinea={linea.numero}
          colorLinea={linea.color}
          recorridos={linea.recorridos}
          paradas={recorridos.flatMap((recorrido) => recorrido.paradas)}
          trazadosAlternativos={trazadosAlternativos}
          compacto
          onPantallaCompleta={() =>
            router.push({ pathname: '/linea/[id]/mapa', params: { id: linea.id } })
          }
        />
        {linea.recorridos.map((recorrido) => (
          <Text key={recorrido.sentido} style={{ color: colores.texto }}>
            {recorrido.sentido === 'ida' ? 'Ida (azul, continua)' : 'Vuelta (magenta, discontinua)'} — {recorrido.destino}
          </Text>
        ))}
        {trazadosAlternativos.length > 0 ? (
          <Text
            style={{ color: colores.texto }}
            accessibilityLiveRegion='polite'
          >
            Desvío vigente (línea naranja punteada): trazado publicado en el aviso, no es el recorrido habitual ni una ruta calculada.
          </Text>
        ) : null}

        {recorridos.length > 0 && (
        <HorariosLinea
          lineaId={linea.id}
          sentidos={recorridos.map((recorrido) => ({
            sentido: recorrido.sentido,
            destino: recorrido.destino,
            paradaId: recorrido.paradas[0]?.id ?? null,
          }))}
        />
        )}

        {recorridos.map((recorrido) => (
          <View key={recorrido.sentido} style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color: colores.acento }]}>
              {recorrido.sentido === 'ida' ? 'Ida' : 'Vuelta'} —{' '}
              {recorrido.destino}
            </Text>

            {recorrido.paradas.length === 0 ? (
              <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
                Sin paradas para este sentido.
              </Text>
            ) : (
              recorrido.paradas.map((parada, indice) => (
                <Pressable
                  key={parada.id}
                  accessibilityRole='button'
                  accessibilityLabel={`Parada ${indice + 1}, ${parada.nombre}${parada.refugio ? ', con refugio' : ''}`}
                  accessibilityHint='Abre el detalle de la parada'
                  hitSlop={8}
                  onPress={() =>
                    router.push({
                      pathname: '/parada/[id]',
                      params: { id: parada.id },
                    })
                  }
                  style={[
                    estilos.filaParada,
                    { borderBottomColor: colores.borde },
                  ]}
                >
                  <Text style={[estilos.orden, { color: colores.acento }]}>
                    {indice + 1}
                  </Text>
                  <CartelParada tamano={36} />
                  <View style={estilos.paradaInfo}>
                    <Text style={[estilos.paradaNombre, { color: colores.texto }]}>
                      {parada.nombre}
                    </Text>
                  </View>
                  {parada.refugio && (
                    <Ionicons
                      name='umbrella-outline'
                      size={22}
                      color={colores.textoSecundario}
                      accessible={false}
                    />
                  )}
                </Pressable>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  botonHeader: {
    marginRight: 8,
    padding: 4,
  },
  contenedor: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  encabezadoTexto: {
    flex: 1,
    gap: 4,
  },
  nombre: {
    fontSize: 20,
    fontWeight: '700',
  },
  empresa: {
    fontSize: 15,
  },
  alertaInactiva: {
    padding: 12,
    borderRadius: 8,
  },
  alertaDesvio: {
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  alertaTitulo: {
    fontWeight: '700',
  },
  alertaDetalle: {},
  alertaTexto: {
    fontWeight: '600',
  },
  seccion: {
    gap: 8,
  },
  seccionTitulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  filaParada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orden: {
    width: 24,
    fontWeight: '700',
  },
  paradaInfo: {
    flex: 1,
    gap: 2,
  },
  paradaNombre: {
    fontSize: 16,
  },
  mensaje: {
    fontSize: 15,
  },
});
