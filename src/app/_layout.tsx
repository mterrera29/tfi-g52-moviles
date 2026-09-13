import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0B3A5D' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      <Stack.Screen name='linea/[id]' options={{ title: 'Línea' }} />
      <Stack.Screen name='parada/[id]' options={{ title: 'Parada' }} />
    </Stack>
  );
}
