import { Tabs } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0B3A5D' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#0B3A5D',
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
