import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Switch,
  FormDescription,
  MessageDisplay,
  CardDescription,
} from '@curveroyaltysystems/react-ui-library';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '../../config';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AuthBasePage } from '../../pages/AuthBasePage';
import { Trans, useTranslation } from '@curveroyaltysystems/i18n';
import { signUpMutation } from '@/queries/authQueries';
import { passwordSchema, doPasswordsMatch } from './utils';
import { PasswordValidationChecklist } from './PasswordValidationChecklist';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';

const createSignUpSchema = (t: TFunction) =>
  z
    .object({
      clientName: z.string().min(1, t('authentication:signUp.validation.nameRequired')),
      clientType: z.enum(['label', 'publisher', 'distributor'], {
        message: t('authentication:signUp.validation.companyTypeRequired'),
      }),
      email: z.email(t('authentication:signUp.validation.emailInvalid')),
      password: passwordSchema(t),
      confirmPassword: z.string().min(1, t('authentication:signUp.validation.confirmPasswordRequired')),
      marketingPermissions: z.boolean(),
      grecaptcha: z.string().min(1, t('authentication:signUp.validation.captchaRequired')),
    })
    .refine((data) => doPasswordsMatch(data.password, data.confirmPassword), {
      message: t('authentication:signUp.validation.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

export const SignUp = () => {
  const { t } = useTranslation();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const signUpSchema = useMemo(() => createSignUpSchema(t), [t]);

  const form = useForm<z.infer<ReturnType<typeof createSignUpSchema>>>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      clientName: '',
      clientType: undefined,
      email: '',
      password: '',
      confirmPassword: '',
      marketingPermissions: false,
      grecaptcha: '',
    },
  });

  const {
    mutate: handleSignUp,
    isPending,
    error,
  } = useMutation({
    mutationFn: signUpMutation,
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const handleSubmit = (data: z.infer<ReturnType<typeof createSignUpSchema>>) => {
    handleSignUp(data);
  };

  return (
    <AuthBasePage>
      <div className="flex flex-col gap-6 items-center">
        <Card className="max-w-xl">
          <CardHeader className="text-center">
            <CardTitle>{t('authentication:signUp.title')}</CardTitle>
            <CardDescription>{t('authentication:signUp.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && !isSuccess && <MessageDisplay variant="error" message={error.message} className="mb-4" />}
            {isSuccess ? (
              <MessageDisplay
                variant="success"
                message={t('authentication:signUp.successMessage')}
                className="mb-4"
              />
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{t('authentication:signUp.fields.companyName.label')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('authentication:signUp.fields.companyName.placeholder')} />
                        </FormControl>
                        {fieldState.error && (
                          <p className="text-sm text-(--color-curve-danger)">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientType"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{t('authentication:signUp.fields.companyType.label')}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('authentication:signUp.fields.companyType.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="label">{t('authentication:signUp.fields.companyType.label_label')}</SelectItem>
                              <SelectItem value="publisher">{t('authentication:signUp.fields.companyType.publisher')}</SelectItem>
                              <SelectItem value="distributor">{t('authentication:signUp.fields.companyType.distributor')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        {fieldState.error && (
                          <p className="text-sm text-(--color-curve-danger)">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{t('authentication:signUp.fields.email.label')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('authentication:signUp.fields.email.placeholder')} />
                        </FormControl>
                        {fieldState.error && (
                          <p className="text-sm text-(--color-curve-danger)">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{t('authentication:signUp.fields.password.label')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('authentication:signUp.fields.password.placeholder')} type="password" />
                        </FormControl>
                        {fieldState.error && !field.value && (
                          <p className="text-sm text-(--color-curve-danger)">{t('authentication:signUp.validation.passwordRequired')}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{t('authentication:signUp.fields.confirmPassword.label')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('authentication:signUp.fields.confirmPassword.placeholder')} type="password" />
                        </FormControl>
                        {fieldState.error && !field.value && (
                          <p className="text-sm text-(--color-curve-danger)">{t('authentication:signUp.validation.confirmPasswordRequired')}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <PasswordValidationChecklist password={password} confirmPassword={confirmPassword} />
                  <FormField
                    control={form.control}
                    name="marketingPermissions"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between p-4 border rounded-lg shadow-sm gap-16">
                          <div className="space-y-4">
                            <FormLabel className="text-sm font-medium">{t('authentication:signUp.fields.marketingEmails.label')}</FormLabel>
                            <FormDescription className="text-xs text-muted-foreground">
                              {t('authentication:signUp.fields.marketingEmails.description')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grecaptcha"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <div className="flex items-center justify-center p-4 bg-muted/30">
                          <FormControl>
                            <ReCAPTCHA sitekey={RECAPTCHA_SITE_KEY} onChange={(token) => field.onChange(token || '')} />
                          </FormControl>
                        </div>
                        {fieldState.error && (
                          <p className="text-sm text-(--color-curve-danger)">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isPending}>
                    {isPending ? t('authentication:signUp.submittingButton') : t('authentication:signUp.submitButton')}
                  </Button>
                  <Link className="text-center text-sm text-muted-foreground underline-offset-2 underline" to="/login">{t('authentication:signUp.loginLink')}</Link>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 w-1/2">
          <Trans
            i18nKey="authentication:signUpAgreement"
            components={{
              termsLink: <a href="https://www.curveroyaltysystems.com/ts-and-cs" />,
              privacyLink: <a href="https://www.curveroyaltysystems.com/privacy-policy" />,
            }}
          />
        </div>
      </div>
    </AuthBasePage>
  );
};
