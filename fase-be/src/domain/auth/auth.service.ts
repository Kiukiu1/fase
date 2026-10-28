import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../enums';
import { Users } from '../user/entity/user.entity';
import { UserBean } from '../user/user.bean';
import { AuthUserView, UserJwtPayload } from './auth.type';

const REFRESH_TOKEN_EXPIRES_IN = '12h';

export const toAuthUser = (user: Users): AuthUserView => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly userBean: UserBean,
    private readonly jwtService: JwtService,
  ) {}

  /** Đăng nhập Fase-Sales: chỉ tài khoản role sales. */
  async loginSales(username: string, password: string) {
    const user = await this.userBean.verifyCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }
    if (user.role !== UserRole.SALES) {
      throw new ForbiddenException(
        'Tài khoản trưởng phòng vui lòng đăng nhập Fase-CRM',
      );
    }
    return this.issueTokens(user);
  }

  async refreshToken(refreshToken: string) {
    let decoded: UserJwtPayload;
    try {
      decoded = this.jwtService.verify<UserJwtPayload>(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
    const user = await this.userBean.findActiveById(decoded.sub);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    return this.issueTokens(user);
  }

  issueTokens(user: Users) {
    const payload: UserJwtPayload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }),
      user: toAuthUser(user),
    };
  }
}
