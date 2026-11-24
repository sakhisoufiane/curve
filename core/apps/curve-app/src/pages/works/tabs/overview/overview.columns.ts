import { type ColumnDef } from '@curveroyaltysystems/react-ui-library';
import { LANGUAGE_OPTIONS } from '@/constants/languages';
import { type TranslateFn } from '../../utils/works.constants';
import { type AlternateTitleRow, type PerformerRow, type CompositeWorkRow } from './overview.rows';

export function getAlternateTitleColumns(t: TranslateFn): ColumnDef<AlternateTitleRow>[] {
  return [
    {
      key: 'title',
      label: t('edit.overview.lists.alternateTitle.title'),
      type: 'text',
      placeholder: t('edit.overview.lists.alternateTitle.titlePlaceholder'),
    },
    {
      key: 'language',
      label: t('edit.overview.lists.alternateTitle.language'),
      type: 'select',
      placeholder: t('edit.overview.lists.alternateTitle.languagePlaceholder'),
      options: LANGUAGE_OPTIONS,
    },
  ];
}

export function getPerformerColumns(t: TranslateFn): ColumnDef<PerformerRow>[] {
  return [
    {
      key: 'name',
      label: t('edit.overview.lists.performer.name'),
      type: 'text',
      required: true,
      placeholder: t('edit.overview.lists.performer.namePlaceholder'),
    },
  ];
}

export function getCompositeWorkColumns(t: TranslateFn): ColumnDef<CompositeWorkRow>[] {
  return [
    {
      key: 'title',
      label: t('edit.overview.lists.compositeWork.title'),
      type: 'text',
      required: true,
      placeholder: t('edit.overview.lists.compositeWork.titlePlaceholder'),
    },
    {
      key: 'source',
      label: t('edit.overview.lists.compositeWork.source'),
      type: 'text',
      placeholder: t('edit.overview.lists.compositeWork.sourcePlaceholder'),
    },
  ];
}
