/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import {
  CardDescription,
  CardTitle,
  Flex,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';

interface StatementSelectorProps {
  statements: any[];
  selectedStatementId: string | null;
  onStatementChange: (statementId: string) => void;
  placeholder: string;
}

const StatementSelector = ({
  statements,
  selectedStatementId,
  onStatementChange,
  placeholder,
}: StatementSelectorProps) => {
  if (!statements || statements.length === 0) return null;

  return (
    <Select value={selectedStatementId || ''} onValueChange={onStatementChange}>
      <SelectTrigger className="w-full max-w-[300px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {statements
          .filter((statement) => statement._id)
          .map((statement) => (
            <SelectItem key={statement._id} value={statement._id!}>
              {statement.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};

interface LatestStatementSectionHeaderProps {
  statement: any;
  statements: any[];
  selectedStatementId: string | null;
  onStatementChange: (statementId: string) => void;
  linkText: string;
}

export const LatestStatementSectionHeader = ({
  statement,
  statements,
  selectedStatementId,
  onStatementChange,
  linkText,
}: LatestStatementSectionHeaderProps) => {
  const { t } = useTranslation('dashboards');
  return (
    <Flex direction="row" justify="between" gap="md" className="flex-wrap">
      <Flex direction="col" gap="md">
        <CardTitle>{t('latestStatement')}</CardTitle>
        <CardDescription>{statement.name}</CardDescription>
        {statement.accountingPeriod && <p className="text-sm text-muted-foreground">{statement.accountingPeriod}</p>}
      </Flex>
      <Flex direction="col" gap="md" align="end">
        <StatementSelector
          statements={statements}
          selectedStatementId={selectedStatementId}
          onStatementChange={onStatementChange}
          placeholder={t('changeStatement')}
        />
        {statement._id && (
          <Link
            to={`/statements/${statement._id}`}
            className="text-sm text-[var(--color-curve-primary)] hover:underline"
          >
            {linkText}
          </Link>
        )}
      </Flex>
    </Flex>
  );
};
