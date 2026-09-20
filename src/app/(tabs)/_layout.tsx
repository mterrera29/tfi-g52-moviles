import { Tabs } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTema } from '@/contextos/tema';

export default function TabsLayout() {
  const { colores } = useTema();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.headerFondo },
        headerTintColor: colores.headerTexto,
        headerTitleStyle: { fontWeight: '700' },
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
        name='lineas'
        options={{
          title: 'Líneas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='bus' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='paradas'
        options={{
          title: 'Paradas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='location' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='avisos'
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='notifications' size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='yo'
        options={{
          title: 'Yo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='person' size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
