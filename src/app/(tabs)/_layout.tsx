import { Tabs } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTema } from '@/contextos/tema';
import { useSinConexion } from '@/hooks/useSinConexion';

export default function TabsLayout() {
  const { colores } = useTema();
  const sinConexion = useSinConexion();

  return (
    <Tabs
      initialRouteName='index'
      screenOptions={{
        headerStyle: { backgroundColor: colores.headerFondo },
        headerTintColor: colores.headerTexto,
        headerTitleStyle: { fontWeight: '700' },
        // Sin conexión, el aviso ya ocupa la barra de estado.
        ...(sinConexion ? { headerStatusBarHeight: 0 } : {}),
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarStyle: {
          backgroundColor: colores.fondo,
          borderTopColor: colores.borde,
        },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Inicio',
          tabBarAccessibilityLabel: 'Inicio',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='lineas'
        options={{
          title: 'Líneas',
          tabBarAccessibilityLabel: 'Líneas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='bus' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='paradas'
        options={{
          title: 'Paradas',
          tabBarAccessibilityLabel: 'Paradas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='location' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='mapa'
        options={{
          title: 'Mapa',
          tabBarAccessibilityLabel: 'Mapa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='map' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='avisos'
        options={{
          title: 'Avisos',
          href: null,
          tabBarAccessibilityLabel: 'Avisos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='notifications' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='yo'
        options={{
          title: 'Yo',
          tabBarAccessibilityLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='person' size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
