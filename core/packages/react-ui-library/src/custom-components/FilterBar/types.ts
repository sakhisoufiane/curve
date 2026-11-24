import type { LucideIcon } from 'lucide-react';

export type FilterFieldType = 'radio' | 'multi-select' | 'date' | 'number';
export type NumberOperator = '<' | '≤' | '=' | '≥' | '>';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  id: string;
  label: string;
  type: FilterFieldType;
  options?: FilterOption[];
  icon?: LucideIcon;
  isLoading?: boolean;
  onSearchChange?: (text: string) => void;
  disabled?: boolean;
}

export interface ActiveFilter {
  fieldId: string;
  operator: string;
  values: string[];
}

export interface FilterBarProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}
