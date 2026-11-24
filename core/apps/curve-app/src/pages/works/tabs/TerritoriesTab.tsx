import { useTranslation } from '@curveroyaltysystems/i18n';
import { EditPageTab } from '@/components/EditPageLayout';

// ── Future implementation (kept for reference) ────────────────────────────────
// Uncomment and finish wiring once `TerritoriesPicker`/`TerritoriesPickerSkeleton`
// are available in the react-ui-library.
//
// import { useState } from 'react';
// import { useFormContext, useWatch } from 'react-hook-form';
// import { TerritoriesPicker, TerritoriesPickerSkeleton } from '@curveroyaltysystems/react-ui-library';
// import { FormSection } from '@/components/EditPageLayout';
// import { type WorkFormData } from '@/api/works';
// import { useTerritoryGroupsQuery } from '@/hooks/territoryGroups/useTerritoryGroupsQuery';

// TODO: build out territory group loading + TerritoriesPicker once the
// picker component is available in the react-ui-library.
export function TerritoriesTab() {
  const { t } = useTranslation('works');

  // const { control, setValue } = useFormContext<WorkFormData>();
  // const territories = useWatch({ control, name: 'territories' }) ?? [];
  //
  // const [selectedGroupId, setSelectedGroupId] = useState('');
  //
  // const { data: groupsData } = useTerritoryGroupsQuery({ limit: 1000 });
  // const groups = groupsData?.territoryGroups ?? [];
  //
  // function handleTerritoriesChange(codes: string[]) {
  //   setSelectedGroupId('');
  //   setValue('territories', codes, { shouldDirty: true });
  // }

  return <EditPageTab>{t('edit.tabs.territories')}</EditPageTab>;

  // return (
  //   <EditPageTab>
  //     <FormSection
  //       title="Territory group"
  //       description="Optionally load territories from a saved group."
  //       defaultOpen={false}
  //     >
  //       Territories
  //     </FormSection>
  //
  //     <FormSection
  //       title="Territory coverage"
  //       description="Countries where this work's rights apply."
  //       collapsible={false}
  //     >
  //       {isLoading ? (
  //         <TerritoriesPickerSkeleton />
  //       ) : (
  //         <TerritoriesPicker cisacOnly value={territories} onChange={handleTerritoriesChange} />
  //       )}
  //     </FormSection>
  //   </EditPageTab>
  // );
}
