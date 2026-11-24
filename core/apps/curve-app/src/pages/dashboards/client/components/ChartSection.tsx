import { LineAreaChart } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from 'react-i18next';

interface ChartDataPoint {
  month: string;
  desktop: number;
}

export const ChartSection = ({ data = [] }: { data: ChartDataPoint[] }) => {
  const { t } = useTranslation('dashboards');
  return (
    <div className="w-full">
      <LineAreaChart
        title={t('revenueOverTime')}
        description={t('revenueOverTimeDesc')}
        data={data}
        config={{
          desktop: {
            label: t('revenue'),
            color: 'var(--chart-1)',
          },
        }}
      />
    </div>
  );
};
