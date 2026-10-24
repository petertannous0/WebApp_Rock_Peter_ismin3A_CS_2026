import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { checkHealth, isApiDown } from '../api';

const HEALTH_INTERVAL_MS = 15_000;

/**
 * Is the API up? Asks GET /health every 15 s, and at once when any request of
 * the app could not reach the API. While it is down, App shows ServiceDown in
 * place of the page; the first ok answer brings the page back.
 */
export function useApiHealth() {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: ['health'], queryFn: checkHealth, refetchInterval: HEALTH_INTERVAL_MS });

  useEffect(() => {
    const recheck = (error: unknown) => {
      if (isApiDown(error)) void queryClient.invalidateQueries({ queryKey: ['health'] });
    };
    const stopQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error' && event.query.queryKey[0] !== 'health') recheck(event.action.error);
    });
    const stopMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') recheck(event.action.error);
    });
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [queryClient]);

  return {
    down: isApiDown(health.error),
    retrying: health.isFetching,
    retry: () => void health.refetch(),
  };
}
