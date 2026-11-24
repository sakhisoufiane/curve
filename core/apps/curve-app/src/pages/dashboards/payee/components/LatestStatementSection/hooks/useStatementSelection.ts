/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';

/**
 * Hook to manage statement selection state
 */
export const useStatementSelection = (statements: any[], defaultStatement?: any) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statementsList = statements.length > 0 ? statements : defaultStatement ? [defaultStatement] : [];

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(() => {
    return defaultStatement?._id || statements?.[0]?._id || null;
  });

  // Sync selected statement when statements list changes
  useEffect(() => {
    if (
      statementsList.length > 0 &&
      (!selectedStatementId || !statementsList.find((s) => s._id === selectedStatementId))
    ) {
      setSelectedStatementId(statementsList[0]?._id || null);
    }
  }, [statementsList, selectedStatementId]);

  const selectedStatement =
    statementsList.find((s) => s._id === selectedStatementId) || statementsList[0] || defaultStatement;

  return {
    statementsList,
    selectedStatementId,
    selectedStatement,
    setSelectedStatementId,
  };
};
