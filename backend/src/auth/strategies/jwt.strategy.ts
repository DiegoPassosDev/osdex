import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { isAdminEmail } from '../../common/admin.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    role: string;
    restaurantId?: string;
  }) {
    if (payload.role === 'GUEST' || payload.role === 'guest') {
      const guest = await this.prisma.guest.findUnique({
        where: { id: payload.sub },
      });

      if (!guest) throw new UnauthorizedException();

      return { id: guest.id, email: guest.email, role: 'GUEST' };
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      include: { restaurant: { select: { active: true } } },
    });

    if (!employee || !employee.active) throw new UnauthorizedException();

    const admin = isAdminEmail(employee.email, this.config);

    if (!admin && employee.restaurant && !employee.restaurant.active)
      throw new UnauthorizedException();

    return {
      id: employee.id,
      email: employee.email,
      role: employee.role,
      restaurantId: employee.restaurantId,
    };
  }
}
