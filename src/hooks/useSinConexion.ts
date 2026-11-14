import { useNetworkState } from 'expo-network';

// true solo cuando expo-network confirma que no hay internet (U5.Pers diap. 26).
export function useSinConexion() {
  const red = useNetworkState();
  return red.isInternetReachable === false;
}
