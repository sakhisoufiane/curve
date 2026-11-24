import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { clientApi } from '../../../../api/client';
import { useClientStore } from '../../../../stores/client.store';

export const useChartData = () => {
  const { clientId } = useClientStore();
  const { data: clientPeriodData } = useQuery({
    queryKey: ['clientPeriodData', clientId],
    queryFn: () => clientApi.getClientPeriodData(clientId!),
    enabled: !!clientId,
  });

  return useMemo(() => {
    if (!clientPeriodData?.data || !clientPeriodData?.labels) {
      return [];
    }

    return clientPeriodData.data.map((desktop: number[], index: number) => ({
      month: clientPeriodData.labels[index],
      desktop,
    }));
  }, [clientPeriodData]);
};
