import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAdminEmail } from '../../common/admin.util';

@Injectable()
export class OnboardingOwnerGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { email?: string } }>();

    const email = request.user?.email;

    if (!isAdminEmail(email, this.config)) {
      throw new ForbiddenException(
        'Apenas o administrador do sistema pode cadastrar restaurantes.',
      );
    }

    return true;
  }
}
