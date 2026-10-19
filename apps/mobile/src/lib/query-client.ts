import { QueryClient } from '@tanstack/react-query';

const ONE_MINUTE = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
      retry: 2,
    },
  },
});
