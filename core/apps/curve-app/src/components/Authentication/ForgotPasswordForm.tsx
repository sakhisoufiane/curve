import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Input,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { useState } from 'react';
import { SlideLeft, SlideRight, FormTransition } from '../../motion';
import { useMutation } from '@tanstack/react-query';
import { BackToLogin } from './BackToLogin';
import { forgotPasswordMutation } from '@/queries/authQueries';

export const ForgotPasswordForm = ({ onBackToLogin }: { onBackToLogin: () => void }) => {
  const [email, setEmail] = useState('');
  // These will come from react-query
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: forgotPasswordMutation,
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutate(email);
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <BackToLogin customOnBackToLogin={onBackToLogin} />
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          {!isSubmitted
            ? "Forgot your password? No problem, enter your email below and we'll send you a reset link to get you back into the system."
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormTransition>
          {!isSubmitted ? (
            <SlideLeft key="form" className="grid gap-6">
              <form onSubmit={handleSubmit} className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                {error && <MessageDisplay variant="error" message={error.message} />}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </SlideLeft>
          ) : (
            <SlideRight key="success" className="space-y-6">
              <p className="text-sm text-muted-foreground">
                An email has been sent to that account if it exists within the system, please check your email for a
                link to reset your password
              </p>
            </SlideRight>
          )}
        </FormTransition>
      </CardContent>
    </Card>
  );
};
