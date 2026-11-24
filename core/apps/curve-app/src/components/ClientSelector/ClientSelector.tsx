import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ComboboxWithClear, showToast, Skeleton } from '@curveroyaltysystems/react-ui-library';
import { usePossibleClientsQuery } from '@/hooks/client/usePossibleClientsQuery';
import { useSetClient } from '@/hooks/client/useSetClient';
import { useRemoveClient } from '@/hooks/client/useRemoveClient';
import { useClientStore } from '../../stores/client.store';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { useUserStore } from '@/stores/user.store';
import { AppRoutes } from '@/routing/routes';

export interface ClientSelectorProps {
  searchTerm?: string;
  'data-testid'?: string;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  searchTerm: initialSearchTerm = '',
  'data-testid': testId,
}) => {
  const navigate = useNavigate();
  const { demoMode } = useUserStore();
  const { clientId, clientName } = useClientStore(
    useShallow((state) => ({
      clientId: state.clientId,
      clientName: state.clientName,
    }))
  );

  // Manage search term state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Debounce search term (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Only search if we have at least 2 characters
  const effectiveSearchTerm = debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : '';

  // Fetch possible clients with debounced search term
  const { data: possibleClients, isLoading } = usePossibleClientsQuery(effectiveSearchTerm);

  const hasInitiallyLoaded = useRef(false);
  useEffect(() => {
    if (!isLoading) {
      hasInitiallyLoaded.current = true;
    }
  }, [isLoading]);

  const showSkeleton = isLoading && !hasInitiallyLoaded.current;

  // Transform clients to combobox items
  const clientItems = useMemo(() => {
    return (possibleClients ?? []).map((client) => ({
      label: client.name,
      value: client.clientId ?? (client.payeeId as string),
      type: (client.clientId ? 'client' : 'payee') as 'client' | 'payee',
    }));
  }, [possibleClients]);

  // Set client mutation
  const { mutate: setClient } = useSetClient({
    onSuccess: (data) => {
      navigate(AppRoutes.Dashboard);
      showToast({
        type: 'success',
        title: 'Client selected',
        description: `You are now logged in as ${data.clientName}`,
      });
    },
  });

  // Remove client mutation - hook handles all state resets and redirects to home
  const { mutate: removeClient } = useRemoveClient({});

  // Handle client selection
  const handleSelect = useCallback(
    (currentValue: string) => {
      // Don't set if it's already the current client
      if (currentValue === clientId) {
        return;
      }

      const type = clientItems.find(
        (item: { label: string; value: string; type: string }) => item.value === currentValue
      )!.type;

      setClient({ clientId: currentValue, userType: type });
    },
    [clientId, setClient, clientItems]
  );

  // Handle search term changes from combobox
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle clear
  const handleClear = useCallback(() => {
    removeClient();
  }, [removeClient]);

  const displayValue = clientName ?? '';

  const selectedHeader = clientId ? (
    <div className="flex items-center justify-between px-3 py-2.5 border-b">
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">Selected client</span>
        <span className="text-sm font-medium truncate">{clientName ?? clientId}</span>
      </div>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          handleClear();
        }}
        className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        Remove
      </button>
    </div>
  ) : null;

  return showSkeleton ? (
    <Skeleton className="h-9 w-70" />
  ) : (
    <ComboboxWithClear
      items={clientItems}
      placeholder="Select a client"
      onSelect={handleSelect}
      onClear={handleClear}
      value={displayValue}
      selectedValue={clientId ?? ''}
      onSearchChange={handleSearchChange}
      isLoading={isLoading}
      autoHighlight
      data-testid={testId}
      noItemsMessage="No client found."
      disabled={demoMode}
      headerContent={selectedHeader}
    />
  );
};
