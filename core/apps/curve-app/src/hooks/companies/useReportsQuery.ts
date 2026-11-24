import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports';
import { useClientStore } from '@/stores/client.store';
import { useUserStore } from '@/stores/user.store';

/**
 * Loads report templates used by the company edit page's Sales/Costs CSV Design
 * selects. Only internal users see those selects, so the query is gated on
 * `internalUser` to avoid an unnecessary request for everyone else.
 */
export const useReportsQuery = () => {
  const { clientId } = useClientStore();
  const isInternalUser = useUserStore((s) => s.internalUser);
  return useQuery({
    queryKey: ['reports', clientId],
    queryFn: () => reportsApi.getReports({ limit: 10000 }),
    enabled: !!isInternalUser,
  });
};
