import { useRouter } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { FilaLinea } from '@/componentes/FilaLinea';
import { TarjetaAviso } from '@/componentes/TarjetaAviso';
import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';
import { useFavoritos } from '@/hooks/useFavoritos';
import { obtenerAvisos } from '@/servicios/avisos';
import { consultarLineas, consultarParadas } from '@/servicios/consulta';
import type { RespuestaError } from '@/tipos/api';

export default function InicioScreen() {
  const { colores } = useTema();
  const router = useRouter();
  const { sesion } = useSesion();
  const red = useNetworkState();
  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const consultaUsuario = useFavoritos();
  const consultaLineas = useQuery<Awaited<ReturnType<typeof consultarLineas>>, RespuestaError>({
    queryKey: ['lineas'],
    queryFn: consultarLineas,
  });
  const consultaParadas = useQuery<Awaited<ReturnType<typeof consultarParadas>>, RespuestaError>({
    queryKey: ['paradas'],
    queryFn: () => consultarParadas(),
    enabled: !!sesion,
  });
  const consultaAvisos = useQuery<Awaited<ReturnType<typeof obtenerAvisos>>, RespuestaError>({
    queryKey: ['avisos', 'vigentes'],
    queryFn: obtenerAvisos,
    enabled: !sinConexion,
  });
  const lineasFavoritas = (consultaLineas.data?.datos ?? []).filter((linea) =>
    consultaUsuario.lineasFavoritas.includes(linea.id),
  );
  const paradasFavoritas = (consultaParadas.data?.datos ?? []).filter((parada) =>
    consultaUsuario.paradasFavoritas.includes(parada.id),
  );
  const lineasPorId = Object.fromEntries(
    (consultaLineas.data?.datos ?? []).map((linea) => [linea.id, linea]),
  );
  const avisos = [...(consultaAvisos.data?.datos ?? [])].sort((a, b) =>
    Number(b.lineaIds.some((id) => consultaUsuario.lineasFavoritas.includes(id))) -
    Number(a.lineaIds.some((id) => consultaUsuario.lineasFavoritas.includes(id))),
  ).slice(0, 2);
  const errorFavoritos =
    (!consultaUsuario.data ? consultaUsuario.error : null) ??
    (consultaUsuario.lineasFavoritas.length > 0 && !consultaLineas.data ? consultaLineas.error : null) ??
    (consultaUsuario.paradasFavoritas.length > 0 && !consultaParadas.data ? consultaParadas.error : null);
  const cargandoFavoritos = consultaUsuario.isPending ||
    (consultaUsuario.lineasFavoritas.length > 0 && consultaLineas.isPending) ||
    (consultaUsuario.paradasFavoritas.length > 0 && consultaParadas.isPending);
  const errorAvisos = consultaAvisos.error ?? consultaLineas.error;
  const avisosSinRed = sinConexion || consultaAvisos.error?.error.codigo === 'SIN_CONEXION';
  const cargarFavoritos = () => {
    if (sesion) {
      void consultaUsuario.refetch();
      void consultaParadas.refetch();
    }
    void consultaLineas.refetch();
  };
  const cargarAvisos = () => {
    void consultaAvisos.refetch();
    void consultaLineas.refetch();
  };

  return (
    <SafeAreaView style={[estilos.contenedor, { backgroundColor: colores.fondo }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        refreshControl={
          <RefreshControl
            refreshing={consultaUsuario.isRefetching || consultaLineas.isRefetching || consultaParadas.isRefetching || consultaAvisos.isRefetching}
            onRefresh={() => { cargarFavoritos(); cargarAvisos(); }}
            tintColor={colores.acento}
            colors={[colores.acento]}
          />
        }
      >
        <View style={estilos.seccion}>
          <Text role='heading' style={[estilos.titulo, { color: colores.texto }]}>Favoritos</Text>
          {!sesion || (!errorFavoritos && !cargandoFavoritos && lineasFavoritas.length === 0 && paradasFavoritas.length === 0) ? (
            <>
              <EstadoVacio mensaje='Todavía no tenés favoritos' />
              <Pressable
                accessibilityRole='button'
                onPress={() => router.push('/lineas')}
                style={({ pressed }) => [estilos.boton, { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
              >
                  <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>Líneas</Text>
                </Pressable>
            </>
          ) : errorFavoritos ? (
            <EstadoError mensaje={errorFavoritos.error.mensaje} onReintentar={cargarFavoritos} />
          ) : cargandoFavoritos ? (
            <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando favoritos' />
          ) : (
            <>
              {lineasFavoritas.map((linea) => (
                <FilaLinea key={linea.id} linea={linea} esGrilla={false} colores={colores} />
              ))}
              {paradasFavoritas.map((parada) => (
                <Pressable
                  key={parada.id}
                  onPress={() => router.push({ pathname: '/parada/[id]', params: { id: parada.id } })}
                    accessibilityRole='button'
                    accessibilityLabel={`Parada ${parada.nombre}`}
                    accessibilityHint='Abre el detalle de la parada'
                    style={({ pressed }) => [estilos.filaParada, { borderBottomColor: colores.borde, backgroundColor: pressed ? colores.fondoSecundario : colores.fondo }]}
                  >
                    <Text style={[estilos.parada, { color: colores.texto }]}>{parada.nombre}</Text>
                    <Text style={{ color: colores.textoSecundario }}>Parada · {parada.sentido}</Text>
                  </Pressable>
              ))}
            </>
          )}
        </View>

        <View style={estilos.seccion}>
          <View style={estilos.encabezado}>
            <Text role='heading' style={[estilos.titulo, { color: colores.texto }]}>Avisos vigentes</Text>
            <Pressable accessibilityRole='button' accessibilityLabel='Ver todos los avisos' onPress={() => router.push('/avisos')} style={({ pressed }) => [estilos.enlace, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[estilos.botonTexto, { color: colores.acento }]}>Ver todos</Text>
              </Pressable>
          </View>
          {avisosSinRed ? (
            <EstadoError mensaje='Los avisos necesitan conexión a internet. Conectate para ver los avisos vigentes.' onReintentar={cargarAvisos} />
          ) : errorAvisos ? (
            <EstadoError mensaje={errorAvisos.error.mensaje} onReintentar={cargarAvisos} />
          ) : consultaAvisos.isPending || consultaLineas.isPending ? (
            <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando avisos' />
          ) : avisos.length === 0 ? (
            <EstadoVacio mensaje='No hay avisos activos.' />
          ) : avisos.map((aviso) => (
            <TarjetaAviso key={aviso.id} aviso={aviso} lineasPorId={lineasPorId} />
          ))}
        </View>
      </ScrollView>
      <View style={estilos.mapa}>
        <Pressable
          accessibilityRole='button'
          accessibilityHint='Abre la pestaña Mapa'
          onPress={() => router.push('/mapa')}
          style={({ pressed }) => [estilos.boton, { backgroundColor: colores.acento, opacity: pressed ? 0.7 : 1 }]}
        >
            <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>Paradas cerca de mí</Text>
          </Pressable>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { paddingVertical: 8, gap: 12 },
  seccion: { paddingHorizontal: 16, gap: 8 },
  titulo: { fontSize: 20, fontWeight: '700' },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  boton: { minHeight: 48, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontSize: 16, fontWeight: '600' },
  enlace: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  filaParada: { minHeight: 64, padding: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  parada: { fontSize: 16, fontWeight: '600' },
  mapa: { paddingHorizontal: 16, paddingVertical: 8 },
});
