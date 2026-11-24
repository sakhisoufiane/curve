import { useCallback, useEffect, useRef } from 'react';

interface UseEditableListOptions<T> {
  value: T[];
  onChange: (value: T[]) => void;
  createEmpty: () => T;
}

/**
 * Shared logic for editable list components.
 * Handles add, remove, update, and focus-on-add for any item type T.
 */
function useEditableList<T>({ value, onChange, createEmpty }: UseEditableListOptions<T>) {
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingFocusRef = useRef(false);

  const handleAdd = useCallback(() => {
    pendingFocusRef.current = true;
    onChange([...value, createEmpty()]);
  }, [value, onChange, createEmpty]);

  // After a new row is appended and the DOM updates, focus its first input
  useEffect(() => {
    if (pendingFocusRef.current && value.length > 0) {
      const lastRow = rowRefs.current[value.length - 1];
      if (lastRow) {
        const firstInput = lastRow.querySelector<HTMLElement>('input, [role="combobox"]');
        firstInput?.focus();
      }
      pendingFocusRef.current = false;
    }
  }, [value.length]);

  const handleUpdate = useCallback(
    (index: number, updatedItem: T) => {
      const next = [...value];
      next[index] = updatedItem;
      onChange(next);
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  return { handleAdd, handleUpdate, handleRemove, rowRefs };
}

export { useEditableList };
export type { UseEditableListOptions };
