import { AuthBasePage } from '../../pages/AuthBasePage';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  Button,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { BackToLogin } from './BackToLogin';
import { SlideLeft, SlideRight, ExpandReveal, FormTransition } from '../../motion';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { passwordSchema } from './utils';
import { PasswordValidationChecklist } from './PasswordValidationChecklist';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { resetExpiredPasswordMutation } from '@/queries/authQueries';
import { useTranslation } from '@curveroyaltysystems/i18n';
import type { TFunction } from 'i18next';

const createExpiredPasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t('authentication:expiredPassword.validation.currentPasswordRequired')),
      password: passwordSchema(t),
      confirmPassword: z.string().min(1, t('authentication:expiredPassword.validation.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('authentication:expiredPassword.validation.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

export const ExpiredPassword = () => {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const expiredPasswordSchema = useMemo(() => createExpiredPasswordSchema(t), [t]);

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useForm<z.infer<ReturnType<typeof createExpiredPasswordSchema>>>({
    resolver: zodResolver(expiredPasswordSchema),
    defaultValues: {
      currentPassword: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const { mutate, error, reset } = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
      confirmNewPassword,
    }: {
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    }) => resetExpiredPasswordMutation(token, currentPassword, newPassword, confirmNewPassword),
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const handleSubmit = (data: z.infer<ReturnType<typeof createExpiredPasswordSchema>>) => {
    mutate({
      currentPassword: data.currentPassword,
      newPassword: data.password,
      confirmNewPassword: data.confirmPassword,
    });
  };

  return (
    <AuthBasePage>
      <Card className="max-w-md">
        <CardHeader>
          <BackToLogin />
          <CardTitle>Expired Password</CardTitle>
          <CardDescription>
            For security reasons, we need you to change your password every 90 days. Passwords must be minimum 12
            characters and include lowercase, uppercase, numbers and special characters. Please follow the steps below
            and hit update when you're done.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormTransition>
            {!isSubmitted ? (
              <Form {...form}>
                <SlideLeft key="form" className="grid gap-6">
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
                    <FormItem>
                      <FormLabel htmlFor="currentPassword">Current Password</FormLabel>
                      <FormControl>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Enter your current password"
                          {...form.register('currentPassword', {
                            onChange: () => error && reset(),
                          })}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      {form.formState.errors.currentPassword && (
                        <p className="text-sm text-[var(--color-curve-danger)]">
                          {form.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </FormItem>

                    <FormItem>
                      <FormLabel htmlFor="newPassword">New Password</FormLabel>
                      <FormControl>
                        <Input
                          id="newPassword"
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
