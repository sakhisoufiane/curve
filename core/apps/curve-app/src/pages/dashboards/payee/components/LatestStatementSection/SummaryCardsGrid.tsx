/* eslint-disable @typescript-eslint/no-explicit-any */
import { Flex, SummaryCard } from '@curveroyaltysystems/react-ui-library';
import { formatCurrency } from '../../../../../utils/currencyFormatter';

interface SummaryCardsGridProps {
  cards: any[];
  currency: string | null;
  currencySymbol: string | null;
}

export const SummaryCardsGrid = ({ cards, currency, currencySymbol }: SummaryCardsGridProps) => {
  return (
    <Flex responsive="mobile-stack" align="stretch" justify="center" gap="lg" className="w-full" wrap="wrap">
      {cards.map((card, index) => (
        <SummaryCard
          key={`${card.title}-${index}`}
          className="min-w-[220px]"
          color={card.color}
          title={card.title}
          value={formatCurrency(card.value, currency, currencySymbol)}
          chevron
        />
      ))}
    </Flex>
  );
};
