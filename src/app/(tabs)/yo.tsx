import { Link, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { useTema } from '@/contextos/tema';
import { obtenerLineas } from '@/servicios/lineas';
import { obtenerParadas } from '@/servicios/paradas';
import type { Linea } from '@/tipos/linea';
import type { Parada } from '@/tipos/parada';
import type { Tema } from '@/tipos/usuario';

function OpcionTema({
  etiqueta,
  valor,
  seleccionado,
  onSeleccionar,
}: {
  etiqueta: string;
  valor: Tema;
  seleccionado: boolean;
  onSeleccionar: (valor: Tema) => void;
}) {
  const { colores } = useTema();

  return (
    <Pressable
      onPress={() => onSeleccionar(valor)}
      accessibilityRole='button'
      accessibilityLabel={`Usar tema ${etiqueta}`}
      accessibilityState={{ selected: seleccionado }}
      style={[
        estilos.opcionTema,
        {
          borderColor: seleccionado ? colores.acento : colores.borde,
          backgroundColor: seleccionado
            ? colores.acento
            : colores.fondoSecundario,
        },
      ]}
    >
      <Text
        style={{
          color: seleccionado ? colores.acentoTexto : colores.texto,
          fontWeight: seleccionado ? '700' : '500',
        }}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

export default function YoScreen() {
  const { colores, preferencia, setPreferencia } = useTema();
  const { sesion, cerrarSesion } = useSesion();
  const usuario = sesion?.usuario ?? null;
  const [lineasFavoritas, setLineasFavoritas] = useState<Linea[]>([]);
  const [paradasFavoritas, setParadasFavoritas] = useState<Parada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarFavoritos = useCallback(async () => {
    if (!usuario) {
      setLineasFavoritas([]);
      setParadasFavoritas([]);
      return;
    }

    setCargando(true);
    setError(null);

    const [respuestaLineas, respuestaParadas] = await Promise.all([
      obtenerLineas(),
      obtenerParadas(),
    ]);

    if ('error' in respuestaLineas) {
      setError(respuestaLineas.error.mensaje);
      setCargando(false);
      return;
    }

    if ('error' in respuestaParadas) {
      setError(respuestaParadas.error.mensaje);
      setCargando(false);
      return;
    }

    setLineasFavoritas(
      respuestaLineas.datos.filter((linea) =>
        usuario.lineasFavoritas.includes(linea.id),
      ),
    );

    setParadasFavoritas(
      respuestaParadas.datos.filter((parada) =>
        usuario.paradasFavoritas.includes(parada.id),
      ),
    );

    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargarFavoritos();
  }, [cargarFavoritos]);

  if (!usuario) {
    return (
      <SafeAreaView
        style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ScrollView contentContainerStyle={estilos.scroll}>
          <View
            style={[
              estilos.tarjetaUsuario,
              { backgroundColor: colores.fondoSecundario },
            ]}
          >
            <Text style={[estilos.nombre, { color: colores.texto }]}>
              Sin sesión
            </Text>
            <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
              Podés consultar líneas, paradas y avisos sin cuenta. Iniciá sesión
              para ver favoritos y reportar demoras.
            </Text>

            <Text style={[estilos.seccionChica, { color: colores.texto }]}>
              Apariencia
            </Text>
            <View style={estilos.filaTemas}>
              <OpcionTema
                etiqueta='Claro'
                valor='claro'
                seleccionado={preferencia === 'claro'}
                onSeleccionar={setPreferencia}
              />
              <OpcionTema
                etiqueta='Oscuro'
                valor='oscuro'
                seleccionado={preferencia === 'oscuro'}
                onSeleccionar={setPreferencia}
              />
              <OpcionTema
                etiqueta='Sistema'
                valor='sistema'
                seleccionado={preferencia === 'sistema'}
                onSeleccionar={setPreferencia}
              />
            </View>

            <Link href='/login' asChild>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Iniciar sesión'
                style={({ pressed }) => [
                  estilos.botonPrimario,
                  {
                    backgroundColor: colores.acento,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    estilos.botonPrimarioTexto,
                    { color: colores.acentoTexto },
                  ]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
            </Link>

            <Link href='/registro' asChild>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Crear cuenta'
              >
                <Text style={[estilos.enlace, { color: colores.acento }]}>
                  Crear cuenta
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (cargando) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <ActivityIndicator size='large' color={colores.acento} />
        <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
          Cargando usuario...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[estilos.centrado, { backgroundColor: colores.fondo }]}
        edges={['bottom']}
      >
        <Text style={[estilos.error, { color: colores.error }]}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[estilos.contenedor, { backgroundColor: colores.fondo }]}
      edges={['bottom']}
    >
      <ScrollView contentContainerStyle={estilos.scroll}>
        <View
          style={[
            estilos.tarjetaUsuario,
            { backgroundColor: colores.fondoSecundario },
          ]}
        >
          <Text style={[estilos.nombre, { color: colores.texto }]}>
            {usuario.nombre}
          </Text>
          <Text style={[estilos.email, { color: colores.textoSecundario }]}>
            {usuario.email}
          </Text>
          <Text style={[estilos.detalle, { color: colores.textoSecundario }]}>
            Avisos activos: {usuario.avisosActivos ? 'Sí' : 'No'}
          </Text>

          <Text style={[estilos.seccionChica, { color: colores.texto }]}>
            Apariencia
          </Text>
          <View style={estilos.filaTemas}>
            <OpcionTema
              etiqueta='Claro'
              valor='claro'
              seleccionado={preferencia === 'claro'}
              onSeleccionar={setPreferencia}
            />
            <OpcionTema
              etiqueta='Oscuro'
              valor='oscuro'
              seleccionado={preferencia === 'oscuro'}
              onSeleccionar={setPreferencia}
            />
            <OpcionTema
              etiqueta='Sistema'
              valor='sistema'
              seleccionado={preferencia === 'sistema'}
              onSeleccionar={setPreferencia}
            />
          </View>

          <Pressable
            onPress={() => cerrarSesion()}
            accessibilityRole='button'
            accessibilityLabel='Cerrar sesión'
            style={({ pressed }) => [
              estilos.botonSecundario,
              {
                backgroundColor: colores.borde,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                estilos.botonSecundarioTexto,
                { color: colores.texto },
              ]}
            >
              Cerrar sesión
            </Text>
          </Pressable>
        </View>

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Mis líneas favoritas
        </Text>

        {lineasFavoritas.length === 0 ? (
          <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
            No tenés líneas favoritas.
          </Text>
        ) : (
          lineasFavoritas.map((linea) => (
            <Pressable
              key={linea.id}
              onPress={() =>
                router.push({
                  pathname: '/linea/[id]',
                  params: { id: linea.id },
                })
              }
              style={({ pressed }) => [
                estilos.fila,
                { borderBottomColor: colores.borde },
                pressed && { backgroundColor: colores.fondoSecundario },
              ]}
            >
              <View style={[estilos.badge, { backgroundColor: linea.color }]}>
                <Text style={estilos.badgeNumero}>{linea.numero}</Text>
              </View>
              <View style={estilos.filaTexto}>
                <Text style={[estilos.filaTitulo, { color: colores.texto }]}>
                  {linea.nombre}
                </Text>
                <Text
                  style={[
                    estilos.filaDetalle,
                    { color: colores.textoSecundario },
                  ]}
                >
                  {linea.empresa}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <Text style={[estilos.seccion, { color: colores.acento }]}>
          Mis paradas favoritas
        </Text>

        {paradasFavoritas.length === 0 ? (
          <Text style={[estilos.mensaje, { color: colores.textoSecundario }]}>
            No tenés paradas favoritas.
          </Text>
        ) : (
          paradasFavoritas.map((parada) => (
            <Pressable
              key={parada.id}
              onPress={() =>
                router.push({
                  pathname: '/parada/[id]',
                  params: { id: parada.id },
                })
              }
              style={({ pressed }) => [
                estilos.fila,
                { borderBottomColor: colores.borde },
                pressed && { backgroundColor: colores.fondoSecundario },
              ]}
            >
              <View
                style={[estilos.iconoParada, { backgroundColor: colores.acento }]}
              >
                <Text style={estilos.iconoParadaTexto}>P</Text>
              </View>
              <View style={estilos.filaTexto}>
                <Text style={[estilos.filaTitulo, { color: colores.texto }]}>
                  {parada.nombre}
                </Text>
                <Text
                  style={[
                    estilos.filaDetalle,
                    { color: colores.textoSecundario },
                  ]}
                >
                  {parada.refugio ? 'Con refugio' : 'Sin refugio'}
                </Text>
              </View>
            </Pressable>
          ))
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
    gap: 10,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  tarjetaUsuario: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  nombre: {
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    fontSize: 15,
  },
  detalle: {
    fontSize: 14,
  },
  seccionChica: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  filaTemas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  opcionTema: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  botonPrimario: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    fontWeight: '700',
    fontSize: 16,
  },
  enlace: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  botonSecundario: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  botonSecundarioTexto: {
    fontWeight: '600',
  },
  seccion: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaTexto: {
    flex: 1,
    gap: 2,
  },
  filaTitulo: {
    fontSize: 16,
    fontWeight: '600',
  },
  filaDetalle: {
    fontSize: 14,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumero: {
    color: '#fff',
    fontWeight: '700',
  },
  iconoParada: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoParadaTexto: {
    color: '#fff',
    fontWeight: '700',
  },
  mensaje: {
    fontSize: 15,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
});
