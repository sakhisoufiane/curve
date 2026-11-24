import { Button, Label, Input, MessageDisplay } from '@curveroyaltysystems/react-ui-library';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSetupMFA } from '@/hooks/auth/useSetupMFA';
import { setupMFACodeMutation } from '@/queries/authQueries';

interface MFAAuthenticatorSetupProps {
  onComplete: (token: string) => Promise<void>;
  email: string;
  tempToken: string;
  qrCode: string;
}

export const MFAAuthenticatorSetup = ({ onComplete, email, tempToken, qrCode }: MFAAuthenticatorSetupProps) => {
  const [code, setCode] = useState('');
  const { enableMFA } = useSetupMFA();

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => setupMFACodeMutation({ email, type: 'Authenticator', code, token: tempToken }),
    onSuccess: (response) => {
      enableMFA({ type: 'Authenticator', token: response.token });
      onComplete(response.token);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col items-center gap-3">
        <div className="border rounded-lg p-3 bg-card">
          {qrCode ? (
            <img src={qrCode} alt="QR Code for authenticator app" className="w-36 h-36" />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center bg-[var(--color-curve-master-lighter)] rounded">
              <span className="text-sm text-muted-foreground">QR Code not available</span>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="authenticator-token" className="text-sm">
          Scan the QR code with your authenticator app, then enter the token below:
        </Label>
        <Input
          id="authenticator-token"
          type="text"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      {error && <MessageDisplay variant="error" message={error.message} />}
      <Button type="submit" className="w-full" disabled={isPending || !code}>
        {isPending ? 'Verifying...' : 'Verify Code'}
      </Button>
    </form>
  );
};
