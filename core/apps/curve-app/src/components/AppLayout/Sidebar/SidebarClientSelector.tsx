import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  BaseSidebarMenu,
  BaseSidebarMenuItem,
  Button,
  cn,
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SidebarMenuButton,
  Skeleton,
} from '@curveroyaltysystems/react-ui-library';
import { usePossibleClientsQuery } from '@/hooks/client/usePossibleClientsQuery';
import { useSetClient } from '@/hooks/client/useSetClient';
import { useRemoveClient } from '@/hooks/client/useRemoveClient';
import { useClientStore } from '@/stores/client.store';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { useUserStore } from '@/stores/user.store';
import { AppRoutes } from '@/routing/routes';
import { Icon } from '@curveroyaltysystems/react-ui-library';

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#f97316', '#d946ef'];

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const result = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const match = w.match(/[a-zA-Z0-9]/);
      return match ? match[0].toUpperCase() : '';
    })
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return result || '?';
};

const getAvatarColor = (name: string | null | undefined) => {
  if (!name) return AVATAR_COLORS[0];
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

interface ClientAvatarProps {
  name: string | null | undefined;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const ClientAvatar: React.FC<ClientAvatarProps> = ({ name, imageUrl, size = 'sm', className }) => {
  const sizeClass = size === 'sm' ? 'size-6' : 'size-8';
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';
  return (
    <Avatar className={cn(sizeClass, 'shrink-0', className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name ?? ''} />}
      <AvatarFallback
        style={{ backgroundColor: getAvatarColor(name) }}
        className={cn('text-white font-semibold', textClass)}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export const SidebarClientSelector: React.FC = () => {
  const navigate = useNavigate();
  const { demoMode } = useUserStore();
  const { clientId, clientName, clientType } = useClientStore(
    useShallow((state) => ({
      clientId: state.clientId,
      clientName: state.clientName,
      clientType: state.clientType,
    }))
  );

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedValue, setHighlightedValue] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const effectiveSearchTerm = debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : '';

  const { data: possibleClients, isLoading } = usePossibleClientsQuery(effectiveSearchTerm);

  const clientItems = useMemo(() => {
    const clientById = possibleClients?.find((c) => c.clientId === searchTerm || c.payeeId === searchTerm);
    const items = clientById ? [clientById] : (possibleClients ?? []);
    return items.map((client) => ({
      label: client.name,
      value: client.clientId ?? (client.payeeId as string),
      type: (client.clientId ? 'client' : 'payee') as 'client' | 'payee',
    }));
  }, [possibleClients, searchTerm]);

  useEffect(() => {
    setHighlightedValue(clientItems[0]?.value ?? '');
  }, [clientItems]);

  const { mutate: setClient } = useSetClient({
    onSuccess: () => {
      navigate(AppRoutes.Dashboard);
    },
  });

  const { mutate: removeClient } = useRemoveClient({});

  const closeAndClear = useCallback(() => {
    setOpen(false);
    setSearchTerm('');
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      if (value === clientId) return;
      const item = clientItems.find((i) => i.value === value);
      if (!item) return;
      closeAndClear();
      setClient({ clientId: value, userType: item.type });
    },
    [clientId, clientItems, closeAndClear, setClient]
  );

  const handleClear = useCallback(() => {
    closeAndClear();
    removeClient();
  }, [closeAndClear, removeClient]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) setSearchTerm('');
  };

  return (
    <div data-sidebar="header" className="flex flex-col gap-2 px-2 pb-2">
      <BaseSidebarMenu>
        <BaseSidebarMenuItem>
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                disabled={demoMode}
                tooltip={clientName ?? 'Select a client'}
                className="h-9 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {clientName ? (
                  <ClientAvatar name={clientName} />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted shrink-0">
                    <Icon.Building2 className="size-3.5 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate font-medium">{clientName ?? 'Select a client'}</span>
                <Icon.ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-[28rem] p-0" align="start" side="bottom" sideOffset={0}>
              <Command shouldFilter={false} value={highlightedValue} onValueChange={setHighlightedValue}>
                <div className="relative">
                  <CommandInput
                    placeholder="Search clients..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="pr-14"
                  />
                  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    esc
                  </kbd>
                </div>
                <CommandList className="max-h-[315px]">
                  {isLoading ? (
                    <div className="p-2 space-y-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-sm px-3 py-2.5">
                          <Skeleton className="size-6 rounded-full shrink-0" />
                          <Skeleton className="h-4 flex-1 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : clientItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <Icon.Building2 className="size-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">No client found</p>
                        <p className="text-xs text-muted-foreground">
                          {searchTerm ? 'Try a different search term' : 'No clients available'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-1"
                        onClick={() => {
                          closeAndClear();
                          navigate('/clients/new');
                        }}
                      >
                        <Icon.Plus className="size-4" />
                        Create client
                      </Button>
                    </div>
                  ) : null}
                  {!isLoading && (
                    <CommandGroup>
                      {clientItems.map((item) => (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          onSelect={handleSelect}
                          className="gap-3 px-3 py-2.5 cursor-pointer"
                        >
                          <ClientAvatar name={item.label} />
                          <span className="truncate">{item.label}</span>
                          {item.value === clientId && <Icon.Check className="ml-auto size-4 shrink-0" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
                {clientId && clientName && (
                  <div className="flex items-center gap-3 px-3 py-2.5 border-t sticky bottom-0 bg-muted">
                    <ClientAvatar name={clientName} size="sm" className="shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">{clientName}</span>
                      {clientType && <span className="text-xs text-muted-foreground">{clientType}</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      className="shrink-0 size-7 text-muted-foreground hover:text-destructive"
                    >
                      <Icon.X className="size-4" />
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </BaseSidebarMenuItem>
      </BaseSidebarMenu>
    </div>
  );
};
