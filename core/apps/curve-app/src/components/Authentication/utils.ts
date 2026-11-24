import * as z from 'zod';
import type { TFunction } from 'i18next';

export const passwordSchema = (t: TFunction) =>
  z
    .string()
    .min(12, t('authentication:signUp.passwordErrors.minLength'))
    .regex(/[a-z]/, t('authentication:signUp.passwordErrors.lowercase'))
    .regex(/[A-Z]/, t('authentication:signUp.passwordErrors.uppercase'))
    .regex(/\d/, t('authentication:signUp.passwordErrors.number'))
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, t('authentication:signUp.passwordErrors.specialCharacter'));

export interface PasswordRequirement {
  id: string;
  label: string;
  test?: (password: string) => boolean;
}

export const getPasswordRequirements = (t: TFunction): PasswordRequirement[] => [
  {
    id: 'minLength',
    label: t('authentication:signUp.passwordRequirements.minLength'),
    test: (pwd) => pwd.length >= 12,
  },
  {
    id: 'hasLowercase',
    label: t('authentication:signUp.passwordRequirements.hasLowercase'),
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: 'hasUppercase',
    label: t('authentication:signUp.passwordRequirements.hasUppercase'),
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: 'hasNumber',
    label: t('authentication:signUp.passwordRequirements.hasNumber'),
    test: (pwd) => /\d/.test(pwd),
  },
  {
    id: 'hasSymbol',
    label: t('authentication:signUp.passwordRequirements.hasSymbol'),
    test: (pwd) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
  },
];

export const getPasswordsMatchRequirement = (t: TFunction): PasswordRequirement => ({
  id: 'passwordsMatch',
  label: t('authentication:signUp.passwordRequirements.passwordsMatch'),
});

export const doPasswordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword && password.length > 0 && confirmPassword.length > 0;
};
