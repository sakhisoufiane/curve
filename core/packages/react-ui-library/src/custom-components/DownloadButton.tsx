import { ChevronDown, Download } from 'lucide-react';
import { Button } from '../components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/dropdown-menu';

export interface DownloadOption {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface DownloadButtonProps {
  options: DownloadOption[];
  disabled?: boolean;
  variant?: 'default' | 'outline';
}

export function DownloadButton({ options, disabled = false, variant = 'default' }: DownloadButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} disabled={disabled || options.length === 0}>
          <Download className="size-4" />
          Download
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem key={option.label} onClick={option.onClick} disabled={option.disabled}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
