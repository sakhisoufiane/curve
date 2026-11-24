import { type DefaultValues } from 'react-hook-form';
import { type Work, type WorkFormData } from '@/api/works';

// ── Form values ─────────────────────────────────────────────────────────────

/** Default form values for a new work. Other fields fall back in the form fields themselves. */
export const emptyWorkFormValues: DefaultValues<WorkFormData> = { title: '' };

/** Maps a loaded Work to the flat form shape, normalising nulls and date formats. */
export function workToFormValues(work: Work): WorkFormData {
  return {
    title: work.title ?? '',
    composer: work.composer ?? '',
    foreignId: work.foreignId ?? '',
    projectId: work.projectId ?? '',
    identifier: work.identifier ?? '',
    iswc: work.iswc ?? '',
    tunecode: work.tunecode ?? '',
    copyrightDate: work.copyrightDate ? work.copyrightDate.slice(0, 10) : '',
    labelCopy: work.labelCopy ?? '',
    notes: work.notes ?? '',
    alternateTitles: work.alternateTitles ?? [],
    performers: work.performers ?? [],
    priority: work.priority ?? false,
    productionLibrary: work.productionLibrary ?? false,
    workLanguage: work.workLanguage ?? '',
    compositeWorks: work.compositeWorks?.map(({ title, source }) => ({ title, source })) ?? [],
    versionType: work.versionType ?? '',
    arrangementType: work.arrangementType ?? '',
    lyricAdaptionType: work.lyricAdaptionType ?? '',
    originalWorkTitle: work.originalWorkTitle ?? '',
    originalIswc: work.originalIswc ?? '',
    originalWorkSource: work.originalWorkSource ?? '',
    originalWorkWriterLastName: work.originalWorkWriterLastName ?? '',
    originalWorkWriterFirstName: work.originalWorkWriterFirstName ?? '',
    workDescriptionCategory: work.workDescriptionCategory ?? '',
    compositeType: work.compositeType ?? '',
    libraryTitle: work.libraryTitle ?? '',
    productionTitle: work.productionTitle ?? '',
    cdIdentifier: work.cdIdentifier ?? '',
    cutNo: work.cutNo ?? '',
    enablePublisherMapping: work.enablePublisherMapping ?? false,
    territories: work.territories ?? [],
    rightsChain: work.rightsChain ?? [],
  };
}

// ── Status ──────────────────────────────────────────────────────────────────

export type WorkStatus = 'approved' | 'approvedOnHold' | 'readyForApproval' | 'invalid';

export function getWorkStatus(work: Work): WorkStatus {
  if (work.approvalStatus === 'Approved') {
    if (work.onHold) return 'approvedOnHold';
    return 'approved';
  }
  if (work.approvalStatus === 'Ready for Approval') return 'readyForApproval';
  return 'invalid';
}
