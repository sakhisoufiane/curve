import { EditPageTab } from '@/components/EditPageLayout';
import { DetailsSection } from './sections/DetailsSection';
import { TerritoriesSection } from './sections/TerritoriesSection';

export function OverviewTab({ isLoading }: { isLoading?: boolean }) {
  return (
    <EditPageTab>
      <DetailsSection isLoading={isLoading} />
      <TerritoriesSection isLoading={isLoading} />
    </EditPageTab>
  );
}
