import type { LucideIcon } from '@curveroyaltysystems/react-ui-library';

export interface SubMenuItem {
  title: string;
  url: string;
  condition?: () => boolean;
  key: string;
}

export interface MenuItem {
  key: string; // Stable identifier for persistence (translation key, not translated value)
  title: string;
  url?: string;
  icon: LucideIcon;
  items?: SubMenuItem[];
  condition?: () => boolean;
  isActive: boolean;
}
