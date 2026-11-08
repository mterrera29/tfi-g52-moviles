import Ionicons from '@react-native-vector-icons/ionicons';
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
import { useUbicacionConocida } from '@/hooks/useUbicacionConocida';
import { textoDistancia } from '@/lib/rumboParada';
import { CartelParada } from '@/componentes/CartelParada';
import { useFavoritos } from '@/hooks/useFavoritos';
import { consultarAvisos, consultarLineas, consultarParadas } from '@/servicios/consulta';
import type { RespuestaError } from '@/tipos/api';

export default function InicioScreen() {
  const { colores } = useTema();
  const router = useRouter();
  const { sesion } = useSesion();
  const red = useNetworkState();
  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const consultaUsuario = useFavoritos();
  const miUbicacion = useUbicacionConocida();
  const consultaLineas = useQuery<Awaited<ReturnType<typeof consultarLineas>>, RespuestaError>({
    queryKey: ['lineas'],
    queryFn: consultarLineas,
  });
  const consultaParadas = useQuery<Awaited<ReturnType<typeof consultarParadas>>, RespuestaError>({
    queryKey: ['paradas'],
    queryFn: () => consultarParadas(),
    enabled: !!sesion,
  });
  const consultaAvisos = useQuery<Awaited<ReturnType<typeof consultarAvisos>>, RespuestaError>({
    queryKey: ['avisos', 'vigentes'],
    queryFn: consultarAvisos,
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
  const avisosSinRed = !consultaAvisos.data && (sinConexion || consultaAvisos.error?.error.codigo === 'SIN_CONEXION');
  const cantidadAvisos = !avisosSinRed && !consultaAvisos.isFetching && consultaAvisos.isSuccess
    ? consultaAvisos.data.datos.length
    : null;
  const descripcionAvisos = cantidadAvisos === null
    ? 'Cambios en el servicio'
    : cantidadAvisos === 0
      ? 'Sin avisos hoy'
      : `${cantidadAvisos} ${cantidadAvisos === 1 ? 'aviso' : 'avisos'} hoy`;
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

  const nombreUsuario = sesion?.usuario.nombre.trim();
  const empresas = [...new Set(
    (consultaLineas.data?.datos ?? []).map((linea) => linea.empresa.trim()).filter(Boolean),
  )].join(' · ');
  const accesos = [
    { ruta: '/lineas', icono: 'bus-outline', titulo: 'Líneas', descripcion: 'Recorridos y horarios', pista: 'Abre las líneas de colectivo' },
    { ruta: '/paradas', icono: 'location-outline', titulo: 'Paradas', descripcion: 'Buscá tu parada', pista: 'Abre la búsqueda de paradas' },
    { ruta: '/mapa', icono: 'map-outline', titulo: 'Mapa', descripcion: 'Paradas cerca de mí', pista: 'Abre el mapa sin pedir tu ubicación. Podés compartirla desde esa pantalla' },
    { ruta: '/avisos', icono: 'notifications-outline', titulo: 'Avisos', descripcion: descripcionAvisos, pista: 'Abre todos los avisos' },
  ] as const;

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
        <View style={[estilos.hero, { backgroundColor: colores.headerFondo }]}>
          <Text accessibilityRole='header' style={[estilos.saludo, { color: colores.headerTexto }]}>
            {nombreUsuario ? `Hola, ${nombreUsuario}` : 'Hola'}
          </Text>
          <Text style={[estilos.descripcionHero, { color: colores.headerTexto }]}>
            Consultá líneas, paradas y avisos de Paraná para organizar tu viaje.
          </Text>
          <View style={[estilos.separadorHero, { backgroundColor: colores.headerTexto }]} />
          <View style={estilos.marca}>
            <View style={estilos.logoMarca}>
              <Ionicons name='bus' size={18} color='#0D3A5C' accessible={false} />
            </View>
            <Text style={[estilos.nombreApp, { color: colores.headerTexto }]}>Transporte Público</Text>
          </View>
          {empresas ? <Text style={[estilos.empresas, { color: colores.headerTexto }]}>{empresas}</Text> : null}
        </View>

        <View style={estilos.seccion}>
          <Text accessibilityRole='header' style={[estilos.titulo, { color: colores.texto }]}>¿A dónde vamos?</Text>
          <View style={estilos.accesos}>
            {accesos.map((acceso) => (
              <Pressable
                key={acceso.ruta}
                accessibilityRole='button'
                accessibilityLabel={`${acceso.titulo}. ${acceso.descripcion}`}
                accessibilityHint={acceso.pista}
                onPress={() => router.push(acceso.ruta)}
                style={({ pressed }) => [estilos.acceso, {
                  backgroundColor: pressed ? colores.fondo : colores.fondoSecundario,
                  borderColor: colores.borde,
                }]}
              >
                <View style={estilos.accesoIcono}>
                  <Ionicons name={acceso.icono} size={26} color={colores.acento} accessible={false} />
                  {acceso.ruta === '/avisos' && cantidadAvisos !== null ? (
                    <View style={[estilos.badgeAvisos, { backgroundColor: colores.acento }]}>
                      <Text style={[estilos.badgeAvisosTexto, { color: colores.acentoTexto }]}>{cantidadAvisos}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[estilos.accesoTitulo, { color: colores.texto }]}>{acceso.titulo}</Text>
                <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>{acceso.descripcion}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text accessibilityRole='header' style={[estilos.titulo, { color: colores.texto }]}>Tus favoritos</Text>
          <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>
            Tus líneas y paradas guardadas, siempre a mano.
          </Text>
          {!sesion || (!errorFavoritos && !cargandoFavoritos && lineasFavoritas.length === 0 && paradasFavoritas.length === 0) ? (
            <View style={[estilos.tarjetaVacia, { backgroundColor: colores.fondoSecundario, borderColor: colores.borde }]}>
              <Ionicons name='heart-outline' size={28} color={colores.acento} accessible={false} />
              <Text style={[estilos.parada, { color: colores.texto }]}>Tu próximo viaje empieza acá</Text>
              <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>
                Todavía no tenés favoritos. Explorá las líneas y guardá las que usás para encontrarlas más rápido.
              </Text>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Explorar líneas para agregar favoritos'
                accessibilityHint='Abre las líneas. Podés guardar una como favorita desde su detalle'
                onPress={() => router.push('/lineas')}
                style={({ pressed }) => [estilos.enlaceFavoritos, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[estilos.botonTexto, { color: colores.acento }]}>Explorá las líneas</Text>
                <Ionicons name='arrow-forward' size={20} color={colores.acento} accessible={false} />
              </Pressable>
            </View>
          ) : errorFavoritos ? (
            <EstadoError mensaje={errorFavoritos.error.mensaje} onReintentar={cargarFavoritos} />
          ) : cargandoFavoritos ? (
            <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando favoritos' />
          ) : (
            <>
              {lineasFavoritas.map((linea) => (
                <View key={linea.id} style={[estilos.tarjetaFavorita, { borderColor: colores.borde }]}>
                  <FilaLinea linea={linea} esGrilla={false} colores={colores} />
                </View>
              ))}
              {paradasFavoritas.map((parada) => (
                <Pressable
                  key={parada.id}
                  onPress={() => router.push({ pathname: '/parada/[id]', params: { id: parada.id } })}
                    accessibilityRole='button'
                    accessibilityLabel={`Parada ${parada.nombre}`}
                    accessibilityHint='Abre el detalle de la parada'
                    style={({ pressed }) => [estilos.filaParada, { borderColor: colores.borde, backgroundColor: pressed ? colores.fondoSecundario : colores.fondo }]}
                  >
                    <CartelParada />
                    <View style={{ flex: 1 }}>
                      <Text style={[estilos.parada, { color: colores.texto }]}>{parada.nombre}</Text>
                      <Text style={{ color: colores.textoSecundario }}>
                        {textoDistancia(miUbicacion, parada.coordenadas) ? `${textoDistancia(miUbicacion, parada.coordenadas)} · ` : ''}Parada · {parada.sentido}
                      </Text>
                    </View>
                  </Pressable>
              ))}
            </>
          )}
        </View>

        <View style={estilos.seccion}>
          <View style={estilos.encabezado}>
            <Text accessibilityRole='header' style={[estilos.titulo, { color: colores.texto }]}>Avisos vigentes</Text>
            <Pressable accessibilityRole='button' accessibilityLabel='Ver todos los avisos' accessibilityHint='Abre la lista completa de avisos' onPress={() => router.push('/avisos')} style={({ pressed }) => [estilos.enlace, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[estilos.botonTexto, { color: colores.acento }]}>Ver todos</Text>
              </Pressable>
          </View>
          <Text style={[estilos.descripcion, { color: colores.textoSecundario }]}>
            Cambios en el servicio, con tus líneas favoritas primero.
          </Text>
          {avisosSinRed ? (
            <EstadoError mensaje='Los avisos necesitan conexión a internet. Conectate para ver los avisos vigentes.' onReintentar={cargarAvisos} />
          ) : errorAvisos ? (
            <EstadoError mensaje={errorAvisos.error.mensaje} onReintentar={cargarAvisos} />
          ) : consultaAvisos.isPending || consultaLineas.isPending ? (
            <ActivityIndicator color={colores.acento} accessibilityLabel='Cargando avisos' />
          ) : avisos.length === 0 ? (
            <EstadoVacio mensaje='No hay avisos activos.' />
          ) : avisos.map((aviso) => (
            <TarjetaAviso key={aviso.id} aviso={aviso} lineasPorId={lineasPorId} videoGuardado={consultaAvisos.data?.videosGuardados.includes(aviso.id)} style={estilos.aviso} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { paddingTop: 16, paddingBottom: 24, gap: 24 },
  hero: { marginHorizontal: 16, padding: 24, borderRadius: 20, gap: 8 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  logoMarca: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FDBB45', alignItems: 'center', justifyContent: 'center' },
  separadorHero: { height: StyleSheet.hairlineWidth, opacity: 0.3, marginTop: 8 },
  nombreApp: { flex: 1, fontSize: 16, fontWeight: '700' },
  empresas: { fontSize: 12, lineHeight: 18, opacity: 0.75 },
  saludo: { fontSize: 30, fontWeight: '700' },
  descripcionHero: { fontSize: 16, lineHeight: 24 },
  seccion: { paddingHorizontal: 16, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '700' },
  descripcion: { fontSize: 15, lineHeight: 22 },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  acceso: { flexBasis: '45%', flexGrow: 1, minHeight: 132, padding: 16, gap: 8, borderWidth: 1, borderRadius: 16 },
  accesoTitulo: { fontSize: 17, fontWeight: '700' },
  accesoIcono: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeAvisos: { minWidth: 24, minHeight: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeAvisosTexto: { fontSize: 13, fontWeight: '700' },
  tarjetaVacia: { padding: 20, gap: 12, borderWidth: 1, borderRadius: 16 },
  tarjetaFavorita: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  botonTexto: { fontSize: 16, fontWeight: '600' },
  enlace: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, justifyContent: 'center' },
  enlaceFavoritos: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 },
  filaParada: { minHeight: 72, padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16 },
  parada: { fontSize: 16, fontWeight: '600' },
  aviso: { marginHorizontal: 0, marginTop: 0 },
});
