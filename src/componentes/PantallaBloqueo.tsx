import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSesion } from '@/contextos/sesion';
import { useTema } from '@/contextos/tema';

export function PantallaBloqueo() {
  const { colores } = useTema();
  const { reintentarBiometria, ingresarConContrasena } = useSesion();

  return (
    <View style={[estilos.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[estilos.titulo, { color: colores.texto }]}>
        Sesión bloqueada
      </Text>
      <Pressable
        onPress={reintentarBiometria}
        accessibilityRole='button'
        accessibilityLabel='Reintentar con huella'
        style={({ pressed }) => [
          estilos.boton,
          { backgroundColor: colores.acento, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[estilos.botonTexto, { color: colores.acentoTexto }]}>
          Reintentar con huella
        </Text>
      </Pressable>
      <Pressable
        onPress={ingresarConContrasena}
        accessibilityRole='button'
        accessibilityLabel='Ingresar con email y contraseña'
        style={({ pressed }) => [
          estilos.boton,
          { borderWidth: 1, borderColor: colores.borde, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[estilos.botonTexto, { color: colores.acento }]}>
          Ingresar con email y contraseña
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 20,
    gap: 16,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  boton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonTexto: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
