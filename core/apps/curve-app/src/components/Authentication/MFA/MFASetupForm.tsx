import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@curveroyaltysystems/react-ui-library';
import { useState } from 'react';
import { SlideLeft, SlideRight, FormTransition } from '../../../motion';
import { MFAMethodSelector, type MFAMethod } from './MFAMethodSelector';
import { MFAEmailSetup } from './MFAEmailSetup';
import { MFAAuthenticatorSetup } from './MFAAuthenticatorSetup';
import { BackToLogin } from '../BackToLogin';

interface MFASetupFormProps {
  email: string;
  tempToken: string;
  onSuccess: (token: string) => void;
  qrCode: string;
}

export const MFASetupForm = ({ email, tempToken, onSuccess, qrCode }: MFASetupFormProps) => {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>('email');

  const handleComplete = async (token: string) => {
    onSuccess(token);
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <BackToLogin />
        <CardTitle>Multifactor Authentication</CardTitle>
        <CardDescription>
          <div className="space-y-3 text-sm">
            <p>
              To protect your account, MFA (Multifactor Authentication) is now required. Your account has access to
              sensitive payment functionality, including the ability to add or edit bank account details.
            </p>
            <p>To keep your data and earnings secure, please enable MFA using one of the following methods:</p>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MFAMethodSelector selectedMethod={selectedMethod} onMethodChange={setSelectedMethod} />

          <FormTransition>
            {selectedMethod === 'email' ? (
              <SlideLeft key="email">
                <MFAEmailSetup email={email} tempToken={tempToken} onComplete={handleComplete} />
              </SlideLeft>
            ) : (
              <SlideRight key="authenticator">
                <MFAAuthenticatorSetup
                  email={email}
                  tempToken={tempToken}
                  onComplete={handleComplete}
                  qrCode={qrCode}
                />
              </SlideRight>
            )}
          </FormTransition>
        </div>
      </CardContent>
    </Card>
  );
};
