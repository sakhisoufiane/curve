import { Label } from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';

export type MFAMethod = 'email' | 'authenticator';

interface MFAMethodSelectorProps {
  selectedMethod: MFAMethod;
  onMethodChange: (method: MFAMethod) => void;
}

export const MFAMethodSelector = ({ selectedMethod, onMethodChange }: MFAMethodSelectorProps) => {
  return (
    <div className="grid gap-3">
      <Label className="text-sm">Select Authentication Method</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onMethodChange('email')}
          className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
            selectedMethod === 'email' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Icon.Mail className="h-5 w-5 flex-shrink-0" />
          <div className="text-left">
            <div className="font-medium text-sm">Email</div>
            <div className="text-xs text-muted-foreground">Receive codes via email</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onMethodChange('authenticator')}
          className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
            selectedMethod === 'authenticator' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Icon.Smartphone className="h-5 w-5 flex-shrink-0" />
          <div className="text-left">
            <div className="font-medium text-sm">Authenticator App</div>
            <div className="text-xs text-muted-foreground">Use an authenticator app</div>
          </div>
        </button>
      </div>
    </div>
  );
};
