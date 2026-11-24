import { EditPageTab } from '@/components/EditPageLayout';
import { type Work } from '@/api/works';
import { DetailsSection } from './sections/DetailsSection';
import { ModificationSection } from './sections/ModificationSection';
import { PerformersSection } from './sections/PerformersSection';
import { ConfigurationSection } from './sections/ConfigurationSection';
import { ClassificationSection } from './sections/ClassificationSection';
import { NotesSection } from './sections/NotesSection';

export function OverviewTab({ work, isLoading }: { work?: Work; isLoading?: boolean }) {
  return (
    <EditPageTab>
      <DetailsSection work={work} isLoading={isLoading} />
      <ModificationSection isLoading={isLoading} />
      <PerformersSection isLoading={isLoading} />
      <ConfigurationSection isLoading={isLoading} />
      <ClassificationSection isLoading={isLoading} />
      <NotesSection isLoading={isLoading} />
    </EditPageTab>
  );
}
