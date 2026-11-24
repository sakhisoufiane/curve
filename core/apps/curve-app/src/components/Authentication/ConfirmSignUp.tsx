import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { AuthBasePage } from '../../pages/AuthBasePage';
import { signupConfirmQuery } from '@/queries/authQueries';
import { AppRoutes } from '@/routing/routes';

export const ConfirmSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data, isLoading, error } = useQuery({
    queryKey: ['signup-confirm', token],
    queryFn: () => signupConfirmQuery(token as string),
  });

  useEffect(() => {
    if (!token) {
      navigate(AppRoutes.Login);
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  return (
    <AuthBasePage>
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Confirm Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md">
            {isLoading && <MessageDisplay variant="loading" message="Verifying your account..." />}
            {error && <MessageDisplay variant="error" message={error.message} />}
            {data && !error && (
              <MessageDisplay
                variant="success"
                message={
                  typeof data === 'string' ? data : 'Your account has been successfully confirmed. You can now log in.'
                }
              >
                <Button variant="outline" onClick={() => navigate(AppRoutes.Login)}>
                  Go to Login
                </Button>
              </MessageDisplay>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthBasePage>
  );
};
