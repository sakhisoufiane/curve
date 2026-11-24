import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { useEffect, useMemo, useState } from 'react';
import { SlideLeft, SlideRight, ExpandReveal, FormTransition } from '../../motion';
import { useMutation } from '@tanstack/react-query';
import { AuthBasePage } from '../../pages/AuthBasePage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackToLogin } from './BackToLogin';
import { doPasswordsMatch, passwordSchema } from './utils';
import { PasswordValidationChecklist } from './PasswordValidationChecklist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { resetPasswordMutation } from '@/queries/authQueries';
import { AppRoutes } from '@/routing/routes';
import { useTranslation } from '@curveroyaltysystems/i18n';
import type { TFunction } from 'i18next';

const createResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: passwordSchema(t),
      confirmPassword: z.string().min(1, t('authentication:resetPassword.validation.confirmPasswordRequired')),
    })
    .refine((data) => doPasswordsMatch(data.password, data.confirmPassword), {
      message: t('authentication:resetPassword.validation.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

export const ResetPassword = () => {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);

  // Move to its own hook:
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useForm<z.infer<ReturnType<typeof createResetPasswordSchema>>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const { mutate, error, reset } = useMutation({
    mutationFn: ({ password, confirmPassword }: { password: string; confirmPassword: string }) =>
      resetPasswordMutation(token, password, confirmPassword),
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  useEffect(() => {
    if (!token) {
      navigate(AppRoutes.Login);
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  const handleSubmit = (data: z.infer<ReturnType<typeof createResetPasswordSchema>>) => {
    mutate({ password: data.password, confirmPassword: data.confirmPassword });
  };

  return (
    <AuthBasePage>
      <Card className="max-w-md">
        <CardHeader>
          <BackToLogin />
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>{!isSubmitted ? 'Reset your password by entering a new one below.' : null}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormTransition>
            {!isSubmitted ? (
              <Form {...form}>
                <SlideLeft key="form" className="grid gap-6">
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
                    <FormItem>
                      <FormLabel htmlFor="password">New Password</FormLabel>
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your new password"
                          {...form.register('password', {
                            onChange: () => error && reset(),
                          })}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                    </FormItem>

                    <FormItem>
                      <FormLabel htmlFor="confirmPassword">Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your new password"
                          {...form.register('confirmPassword', {
                            onChange: () => error && reset(),
                          })}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                    </FormItem>

                    {error && (
                      <ExpandReveal>
                        <MessageDisplay variant="error" message={error.message} showIcon />
                      </ExpandReveal>
                    )}

                    <PasswordValidationChecklist password={password} confirmPassword={confirmPassword} />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={form.formState.isSubmitting || !form.formState.isValid}
                    >
                      {form.formState.isSubmitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </form>
                </SlideLeft>
              </Form>
            ) : (
              <SlideRight key="success" className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </SlideRight>
            )}
          </FormTransition>
        </CardContent>
      </Card>
    </AuthBasePage>
  );
};
