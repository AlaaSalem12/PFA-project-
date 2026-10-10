import { z } from 'zod';

/** Mirrors the backend password policy (contract §1). */
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', label: 'One digit', test: (value: string) => /\d/.test(value) },
  {
    key: 'special',
    label: 'One special character',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export const newPasswordSchema = z
  .string()
  .min(1, 'New password is required')
  .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), {
    message: 'Password does not meet the requirements',
  });
