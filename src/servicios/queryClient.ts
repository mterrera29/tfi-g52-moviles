import { QueryClient } from '@tanstack/react-query';

// Una caché estable para la app (U05.T01 diap. 22).
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 2 } },
});
