import { type TerritoryGroup, type TerritoryGroupFormData } from '@/api/territoryGroups';

/** Default form values for a new territory group. */
export const emptyTerritoryGroupFormValues: TerritoryGroupFormData = {
  name: '',
  territories: [],
};

/** Maps a loaded TerritoryGroup to the flat form shape, normalising nulls. */
export function territoryGroupToFormValues(group: TerritoryGroup): TerritoryGroupFormData {
  return {
    name: group.name ?? '',
    territories: group.territories ?? [],
  };
}
