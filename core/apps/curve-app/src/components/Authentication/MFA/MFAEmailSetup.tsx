import { Button, Label, Input, MessageDisplay } from '@curveroyaltysystems/react-ui-library';
import { useState } from 'react';
import { SlideLeft, SlideRight, FormTransition } from '../../../motion';
import { useMutation } from '@tanstack/react-query';
import { useSetupMFA } from '@/hooks/auth/useSetupMFA';
import { setupMFACodeMutation } from '@/queries/authQueries';

interface MFAEmailSetupProps {
  onComplete: (token: string) => Promise<void>;
  email: string;
  tempToken: string;
}

export const MFAEmailSetup = ({ onComplete, email, tempToken }: MFAEmailSetupProps) => {
  const [code, setCode] = useState('');
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [tokenRequested, setTokenRequested] = useState(false);
  const { enableMFA } = useSetupMFA();

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => setupMFACodeMutation({ email, type: 'Email', code: code || undefined, token: tempToken }),
    onSuccess: (response) => {
      if (!code) {
        // Just requested token, show input form
        setTokenRequested(true);
        setIsRequestingToken(false);
      } else {
        enableMFA({ type: 'Email', token: response.token });
        onComplete(response.token);
      }
    },
    onError: () => {
      setIsRequestingToken(false);
    },
  });

  const handleRequestToken = () => {
    setIsRequestingToken(true);
    setCode(''); // Reset code when requesting new token
    mutate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // TODO: Fix invalid code
    e.preventDefault();
    if (!code) return;
    mutate();
  };

  return (
    <div className="space-y-3">
      {error && <MessageDisplay variant="error" message={error.message} />}
      <FormTransition>
        {!tokenRequested ? (
          <SlideLeft key="request">
            <Button onClick={handleRequestToken} disabled={isRequestingToken || isPending} className="w-full">
              {isRequestingToken || isPending ? 'Sending Code...' : 'Send Verification Code'}
            </Button>
          </SlideLeft>
        ) : (
          <SlideRight key="form" className="space-y-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="email-token" className="text-sm">
                  Enter the token from your email below:
                </Label>
                <Input
                  id="email-token"
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending || !code}>
                {isPending ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          </SlideRight>
        )}
      </FormTransition>
    </div>
  );
};
