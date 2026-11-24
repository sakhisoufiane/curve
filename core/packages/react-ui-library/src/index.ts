import './index.css';

// Export all components
// Ignoring the ESLint barrel exports rule for this directory to avoid lots of duplication
// Most of the time we are going to want to export all ShadCN components anyway
// eslint-disable-next-line no-restricted-syntax
export * from './components';

// Icons — import as: import { Icon } from '@curveroyaltysystems/react-ui-library'
export { Icon } from './icons';
export type { LucideIcon } from 'lucide-react';

// Export utility functions
export { cn } from './lib/utils';

// Export Curve brand color types
export { CURVE_COLORS, SUMMARY_CARD_COLORS, SUMMARY_CARD_COLOR_MAP } from './lib/curve-color-types';
export type { CurveColor, SummaryCardColor } from './lib/curve-color-types';

// Export hooks
export { useIsMobile } from './hooks/use-mobile';

// Export custom components
export { SummaryCard } from './custom-components/SummaryCard';
export { CurveBreadcrumb } from './custom-components/CurveBreadcrumb';
export type { CurveBreadcrumbItem } from './custom-components/CurveBreadcrumb';
export { ListCard } from './custom-components/ListCard';
export { description, LineAreaChart } from './custom-components/LineAreaChart';
export { SimpleReadOnlyTable } from './custom-components/SimpleReadOnlyTable';
export type {
  SimpleTableColumn,
  SimpleTableFooterCell,
  SimpleTableProps,
} from './custom-components/SimpleReadOnlyTable';
export { MessageDisplay } from './custom-components/MessageDisplay';
export type { MessageVariant, MessageDisplayProps } from './custom-components/MessageDisplay';
export { ComboboxWithClear } from './custom-components/Combobox';
export type { ComboboxItemType } from './custom-components/Combobox';
export { CheckboxField } from './custom-components/CheckboxField';
export type { CheckboxFieldProps } from './custom-components/CheckboxField';
export { ValidationItem } from './custom-components/ValidationItem';
export type { ValidationItemProps } from './custom-components/ValidationItem';
export { AppDialog } from './custom-components/AppDialog';
export type { AppDialogProps } from './custom-components/AppDialog';
export { MobileMenuItem } from './custom-components/MobileMenuItem';
export type { MobileMenuItemProps } from './custom-components/MobileMenuItem';
export { PillTag } from './custom-components/PillTag';
export type { PillTagProps } from './custom-components/PillTag';
export { PercentPill } from './custom-components/PercentPill';
export type { PercentPillProps } from './custom-components/PercentPill';
export { StatusBadge, statusBadgeVariants } from './custom-components/StatusBadge';
export type { StatusBadgeProps } from './custom-components/StatusBadge';
export {
  ReportingPeriodStatusBadge,
  reportingPeriodStatusBadgeVariants,
} from './custom-components/ReportingPeriodStatusBadge';
export type { ReportingPeriodStatusBadgeProps } from './custom-components/ReportingPeriodStatusBadge';
export { ReportingPeriodCalculationLoader } from './custom-components/ReportingPeriodCalculationLoader';
export type { ReportingPeriodCalculationLoaderProps } from './custom-components/ReportingPeriodCalculationLoader';
export { EmptyState } from './custom-components/EmptyState';
export type { EmptyStateProps } from './custom-components/EmptyState';
export { NoResultsState } from './custom-components/NoResultsState';
export type { NoResultsStateProps } from './custom-components/NoResultsState';
export { HelpTooltip } from './custom-components/HelpTooltip';
export type { HelpTooltipProps } from './custom-components/HelpTooltip';
export { CreateButton } from './custom-components/CreateButton/CreateButton';
export type { CreateButtonProps } from './custom-components/CreateButton/CreateButton';
export { ImportButton } from './custom-components/ImportButton';
export type { ImportButtonProps } from './custom-components/ImportButton';
export { FileDrop } from './custom-components/FileDrop';
export type { FileDropProps } from './custom-components/FileDrop';
export { ImportDialog } from './custom-components/ImportDialog';
export type { ImportDialogProps } from './custom-components/ImportDialog';
export { FilterBar, FilterPills } from './custom-components/FilterBar';
export type {
  FilterBarProps,
  FilterField,
  FilterOption,
  ActiveFilter,
  FilterFieldType,
} from './custom-components/FilterBar';
export { DataTable } from './custom-components/DataTable';
export type { DataTableProps, DataTableColumn } from './custom-components/DataTable';
export { ColumnVisibilityButton } from './custom-components/ColumnVisibilityButton';
export type { ColumnVisibilityButtonProps } from './custom-components/ColumnVisibilityButton';
export { ConfirmDialog } from './custom-components/Dialogs';
export type { ConfirmDialogProps } from './custom-components/Dialogs';
export { DeleteDialog } from './custom-components/Dialogs';
export type { DeleteDialogProps } from './custom-components/Dialogs';
export { FormattedNumber } from './custom-components/FormattedNumber';
export type { FormattedNumberProps } from './custom-components/FormattedNumber';
export { SaveButton } from './custom-components/SaveButton';
export type { SaveButtonProps } from './custom-components/SaveButton';
export { DownloadButton } from './custom-components/DownloadButton';
export type { DownloadButtonProps, DownloadOption } from './custom-components/DownloadButton';
export { Spinner } from './components/spinner';
export { EditableList } from './custom-components/EditableList';
export type { EditableListProps } from './custom-components/EditableList';
export { EditableObjectList } from './custom-components/EditableObjectList';
export type { EditableObjectListProps, ColumnDef, Option } from './custom-components/EditableObjectList';
export { TerritoriesPicker, TerritoriesPickerSkeleton } from './custom-components/TerritoriesPicker';
export type { TerritoriesPickerProps } from './custom-components/TerritoriesPicker';
export type { Territory, Continent } from './data/territories';
