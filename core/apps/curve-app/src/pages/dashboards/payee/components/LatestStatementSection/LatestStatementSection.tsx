/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, Spinner } from '@curveroyaltysystems/react-ui-library';
import { useStatementSelection } from './hooks/useStatementSelection';
import { getStatementViewConfig } from './utils/getStatementViewConfig';
import { LatestStatementSectionHeader } from './LatestStatementSectionHeader';
import { SummaryCardsGrid } from './SummaryCardsGrid';

interface LatestStatementSectionProps {
  isLoading: boolean;
  statement?: any;
  statements?: any[];
  currency: string | null;
  currencySymbol: string | null;
  userType: string | null;
  clientType: string | null;
}

export const LatestStatementSection = ({
  isLoading,
  statement,
  statements = [],
  currency,
  currencySymbol,
  userType,
  clientType,
}: LatestStatementSectionProps) => {
  const { statementsList, selectedStatementId, selectedStatement, setSelectedStatementId } = useStatementSelection(
    statements,
    statement
  );

  const viewConfig = getStatementViewConfig(selectedStatement, userType, clientType);

  if (isLoading) {
    return <Spinner />;
  }

  if (!selectedStatement || !viewConfig) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <LatestStatementSectionHeader
          statement={selectedStatement}
          statements={statementsList}
          selectedStatementId={selectedStatementId}
          onStatementChange={setSelectedStatementId}
          linkText={viewConfig.linkText}
        />
      </CardHeader>
      <CardContent className="space-y-4 flex justify-center items-center">
        <SummaryCardsGrid cards={viewConfig.cards} currency={currency} currencySymbol={currencySymbol} />
      </CardContent>
    </Card>
  );
};
