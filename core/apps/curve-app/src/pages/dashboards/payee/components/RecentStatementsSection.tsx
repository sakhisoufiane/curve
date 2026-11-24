/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle, SimpleReadOnlyTable } from '@curveroyaltysystems/react-ui-library';
import { formatCurrency } from '../../../../utils/currencyFormatter';
import { Link } from 'react-router-dom';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { AppRoutes } from '@/routing/routes';
import { Icon } from '@curveroyaltysystems/react-ui-library';

export const RecentStatementsSection = ({
  isLoading,
  isError,
  statements,
  currency,
  currencySymbol,
}: {
  isLoading: boolean;
  isError?: boolean;
  statements: any;
  currency: string | null;
  currencySymbol: string | null;
}) => {
  const { t } = useTranslation('dashboards');

  const columns = [
    {
      key: 'statement',
      header: t('statementColumn'),
      renderCell: (value: unknown, row: Record<string, unknown>) => (
        <Link to={`/statements/${row.id}`} className="text-[var(--color-curve-primary)] hover:underline">
          {value as string}
        </Link>
      ),
    },
    { key: 'opening', header: t('openingColumn'), align: 'right' as const },
    { key: 'revenue', header: t('revenueColumn'), align: 'right' as const },
    { key: 'costs', header: t('costsColumn'), align: 'right' as const },
    { key: 'closing', header: t('closingColumn'), align: 'right' as const },
  ];

  const formattedStatements =
    statements?.map((statement: any) => ({
      id: statement._id,
      statement: statement.name,
      opening: formatCurrency(statement.openingBalance, currency, currencySymbol),
      revenue: formatCurrency(statement.netAmount, currency, currencySymbol),
      costs: formatCurrency(statement.netCosts, currency, currencySymbol),
      closing: formatCurrency(statement.closingBalance, currency, currencySymbol),
    })) ?? [];

  return (
    <Card className="w-full">
      <CardHeader>
        {/* CUR-jngawEgO ID required so that the Stonly tour still works */}
        {/* When updating this ID the Stonly tour must be updated! */}
        <CardTitle id="CUR-jngawEgO">{t('recentStatements')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Icon.AlertCircle className="h-6 w-6" />
            <p className="text-sm">Failed to load</p>
          </div>
        ) : (
          <SimpleReadOnlyTable
            columns={columns}
            data={formattedStatements}
            rowKey="statement"
            loading={isLoading}
            emptyMessage={t('noStatementsFound')}
            trailingAction={
              <Link to={AppRoutes.Statements} className="text-[var(--color-curve-primary)] hover:underline p-2">
                {t('viewAllStatementsHere')}
              </Link>
            }
          />
        )}
      </CardContent>
    </Card>
  );
};
