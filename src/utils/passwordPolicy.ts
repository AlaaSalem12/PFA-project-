import { z } from 'zod';
import i18n from '../i18n';

/** `label` is an i18n key. Mirrors the backend password policy (contract §1). */
export const PASSWORD_RULES = [
  { key: 'length', label: 'password.ruleLength', test: (value: string) => value.length >= 8 },
  { key: 'upper', label: 'password.ruleUpper', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'password.ruleLower', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', label: 'password.ruleDigit', test: (value: string) => /\d/.test(value) },
  {
    key: 'special',
    label: 'password.ruleSpecial',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

/** Messages are translated when validation runs, so they follow the current language. */
export const newPasswordSchema = z
  .string()
  .min(1, { error: () => i18n.t('password.newRequired') })
  .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), {
    error: () => i18n.t('password.notMeetingRules'),
  });
