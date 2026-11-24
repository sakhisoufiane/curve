import {
  Button,
  Label,
  Input,
  CardContent,
  CardHeader,
  Card,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { type MultiFactorAuthenticationType } from '../../../api/authenticate';
import { BackToLogin } from '../BackToLogin';
import { verifyMFACodeMutation } from '@/queries/authQueries';

interface MFAVerificationProps {
  email: string;
  mfaType: MultiFactorAuthenticationType;
  tempToken: string;
  onComplete: (token: string) => void;
  onBackToLogin: () => void;
}

export const MFAVerification = ({ email, mfaType, tempToken, onComplete, onBackToLogin }: MFAVerificationProps) => {
  const [code, setCode] = useState('');

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => verifyMFACodeMutation({ email, type: mfaType, code, token: tempToken }),
    onSuccess: (response) => {
      onComplete(response.token);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
    if (error) {
      reset();
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="p-3">
        <BackToLogin customOnBackToLogin={onBackToLogin} />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm">
            Multi-factor Authentication is enabled for your user. Please fill in the code below.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="mfa-code">
              {mfaType === 'Email'
                ? 'Enter token found in your email.'
                : 'Enter token found in your authenticator app.'}
            </Label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={handleCodeChange}
              required
              disabled={isPending}
              autoFocus
              autoComplete="off"
            />
          </div>
          {error && <MessageDisplay variant="error" message={error.message} />}
          <Button type="submit" className="w-full" disabled={isPending || !code}>
            {isPending ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
