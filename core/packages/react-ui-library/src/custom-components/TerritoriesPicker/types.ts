export interface TerritoriesPickerProps {
  /** ISO 3166-1 alpha-2 codes of selected territories. */
  value: string[];
  onChange: (value: string[]) => void;
  /** When true, only shows CISAC-approved territories (excludes dependencies and disputed territories). */
  cisacOnly?: boolean;
  /** Renders in read-only mode — checkboxes non-interactive, controls hidden. */
  disabled?: boolean;
  className?: string;
}

export type ContinentCheckState = boolean | 'indeterminate';
