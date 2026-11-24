import React from 'react';
import {
  Avatar,
  AvatarFallback,
  BaseSidebarFooter,
  BaseSidebarMenu,
  BaseSidebarMenuItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  SidebarMenuButton,
} from '@curveroyaltysystems/react-ui-library';
import { useAuthStore } from '@/stores/auth.store';
import { useHandleLogout } from '@/hooks/auth/useHandleLogout';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import { useThemeStore, type Theme } from '@/stores/theme.store';

const getNameFromEmail = (email: string | null): string => {
  if (!email) return 'Account';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._\-+]/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Icon.Sun },
  { value: 'dark', label: 'Dark', icon: Icon.Moon },
  { value: 'system', label: 'System', icon: Icon.Monitor },
];

export const SidebarUser: React.FC = () => {
  const { userEmail, sessionId } = useAuthStore();
  const { logout } = useHandleLogout();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const ActiveThemeIcon = THEME_OPTIONS.find((o) => o.value === theme)?.icon ?? Icon.Monitor;
  const name = getNameFromEmail(userEmail);
  const initials = getInitials(name);

  return (
    <BaseSidebarFooter>
      <BaseSidebarMenu>
        <BaseSidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                tooltip={name}
                className="h-9 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-6 shrink-0 rounded-md">
                  <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                </div>
                <Icon.MoreVertical className="ml-auto size-4 shrink-0 opacity-50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/users/${sessionId}/edit`)}>
                <Icon.Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                  <ActiveThemeIcon className="size-4" />
                  Appearance
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {THEME_OPTIONS.map(({ value, label, icon: ThemeIcon }) => (
                    <DropdownMenuItem key={value} className="cursor-pointer" onClick={() => setTheme(value)}>
                      <ThemeIcon className="size-4" />
                      {label}
                      {theme === value && <Icon.Check className="ml-auto size-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                <Icon.LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BaseSidebarMenuItem>
      </BaseSidebarMenu>
    </BaseSidebarFooter>
  );
};
