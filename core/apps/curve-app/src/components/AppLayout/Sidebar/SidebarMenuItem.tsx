import type { MenuItem } from '../utils/types';
import { CollapsibleMenuItem } from './CollapsibleMenuItem';
import { SimpleMenuItem } from './SimpleMenuItem';

type Props = {
  item: MenuItem;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
};

export const SidebarMenuItem = ({ item, openKey, setOpenKey }: Props) => {
  return item.items && item.items.length > 0 ? (
    <CollapsibleMenuItem item={item} openKey={openKey} setOpenKey={setOpenKey} />
  ) : (
    <SimpleMenuItem item={item} />
  );
};
