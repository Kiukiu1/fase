import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserBean } from '../user/user.bean';
import { UserJwtPayload } from './auth.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userBean: UserBean,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('SECRET_KEY'),
    });
  }

  async validate(payload: UserJwtPayload) {
    const user = await this.userBean.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khoá');
    return user;
  }
}
