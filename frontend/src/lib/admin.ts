export const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ONBOARDING_ADMIN_EMAILS || "fluixit@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
