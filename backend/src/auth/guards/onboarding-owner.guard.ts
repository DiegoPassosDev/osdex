import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OnboardingOwnerGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { email?: string } }>();

    const email = request.user?.email;
    const allowed = (
      this.config.get<string>('ONBOARDING_ADMIN_EMAILS') || 'fluixit@gmail.com'
    )
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!email || !allowed.includes(email.toLowerCase())) {
      throw new ForbiddenException(
        'Apenas o administrador do sistema pode cadastrar restaurantes.',
      );
    }

    return true;
  }
}
