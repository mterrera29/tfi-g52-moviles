import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0B3A5D' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name='index' options={{ title: 'Transporte Paraná' }} />
    </Stack>
  );
}
