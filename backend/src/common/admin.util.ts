import { ConfigService } from '@nestjs/config';

export function isAdminEmail(
  email: string | null | undefined,
  config: ConfigService,
): boolean {
  if (!email) return false;
  const allowed = (
    config.get<string>('ONBOARDING_ADMIN_EMAILS') || 'fluixit@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
