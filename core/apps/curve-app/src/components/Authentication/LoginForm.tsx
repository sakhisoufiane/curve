import {
  Button,
  Card,
  CardContent,
  Input,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  MessageDisplay,
} from '@curveroyaltysystems/react-ui-library';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useMutation } from '@tanstack/react-query';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '../../config';
import { type LoginResponse } from '../../api/authenticate';
import { Trans } from '@curveroyaltysystems/i18n';
import { loginMutation } from '@/queries/authQueries';
import { CurveCookies } from '@/constants/cookies';
import { AppRoutes } from '@/routing/routes';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

interface LoginFormProps {
  onForgotPassword: () => void;
  onMFARequired: (response: LoginResponse, typedEmail: string, setUpRequired: boolean) => void;
}

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  grecaptcha: z.string().min(1, 'Please confirm you are not a robot'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = ({ onForgotPassword, onMFARequired }: LoginFormProps) => {
  const navigate = useNavigate();
  const [, setCookie] = useCookies([CurveCookies.AuthToken]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      grecaptcha: '',
    },
  });

  const {
    mutate: handleLogin,
    isPending,
    error,
  } = useMutation({
    mutationFn: loginMutation,
    onSuccess: (response, variables) => {
      // Check if user has MFA enabled and needs to verify
      if (response.multiFactorAuthentication || response.mfaRequired) {
        onMFARequired(response, variables.email, response.mfaRequired || false);
        return;
      }

      // No MFA required, proceed with login
      setCookie(CurveCookies.AuthToken, response.token, getAuthCookieOptions());
      navigate(AppRoutes.Dashboard);
    },
  });

  const handleSubmit = (data: LoginFormData) => {
    handleLogin(data);
  };

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <Card className="pt-6">
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
              <div className="grid gap-6">
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...form.register('email')}
                      id="email"
                      type="email"
                      placeholder="user@domain.com"
                      disabled={isPending}
                    />
                  </FormControl>
                  {form.formState.errors.email && (
                    <p className="text-sm text-[var(--color-curve-danger)]">{form.formState.errors.email.message}</p>
                  )}
                </FormItem>

                <FormItem>
                  <div className="flex items-center">
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="ml-auto text-sm text-muted-foreground underline-offset-2 underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <FormControl>
                    <Input {...form.register('password')} id="password" type="password" disabled={isPending} />
                  </FormControl>
                  {form.formState.errors.password && (
                    <p className="text-sm text-[var(--color-curve-danger)]">{form.formState.errors.password.message}</p>
                  )}
                </FormItem>

                <FormItem>
                  <div className="flex items-center justify-center p-4 bg-muted/30 rounded-md h-[110px] w-[304px] mx-auto">
                    <FormControl>
                      <Controller
                        name="grecaptcha"
                        control={form.control}
                        render={({ field }) => (
                          <ReCAPTCHA sitekey={RECAPTCHA_SITE_KEY} onChange={(token) => field.onChange(token || '')} />
                        )}
                      />
                    </FormControl>
                  </div>
                  {form.formState.errors.grecaptcha && (
                    <p className="text-sm text-[var(--color-curve-danger)] text-center">
                      {form.formState.errors.grecaptcha.message}
                    </p>
                  )}
                </FormItem>

                {error && <MessageDisplay variant="error" message={error.message} />}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-2">
        <Trans
          i18nKey="authentication:loginAgreement"
          components={{
            termsLink: <a href="https://www.curveroyaltysystems.com/ts-and-cs" />,
            privacyLink: <a href="https://www.curveroyaltysystems.com/privacy-policy" />,
          }}
        />
      </div>
    </div>
  );
};
