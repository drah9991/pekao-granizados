import { useQuery, type UseQueryOptions, type QueryKey } from "@tanstack/react-query";

interface StaleWhileRevalidateOptions<TData, TError>
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, "queryKey" | "queryFn"> {
  staleTime?: number;
  gcTime?: number;
}

export function useSupabaseQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: StaleWhileRevalidateOptions<TData, TError>
) {
  return useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 1000 * 60,
    gcTime: options?.gcTime ?? 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    ...options,
  });
}
