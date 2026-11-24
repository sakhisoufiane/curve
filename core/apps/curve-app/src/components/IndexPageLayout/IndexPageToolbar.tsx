import React from 'react';

interface IndexPageToolbarProps {
  children: React.ReactNode;
  pills?: React.ReactNode;
}

export function IndexPageToolbar({ children, pills }: IndexPageToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">{children}</div>
      {pills}
    </div>
  );
}
