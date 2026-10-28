import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../validation';
import { UserBean } from '../user/user.bean';
import type { Users } from '../user/entity/user.entity';
import { Authenticated, CurrentUser } from './auth.guard';
import { AuthService, toAuthUser } from './auth.service';

class LoginDto {
  @ApiProperty({ example: 'sales1' })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập' })
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'Fase@123' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}

class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  newPassword: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userBean: UserBean,
  ) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.loginSales(dto.username, dto.password);
  }

  @Post('refresh-token')
  @HttpCode(200)
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @Authenticated()
  me(@CurrentUser() user: Users) {
    return toAuthUser(user);
  }

  @Put('password')
  @Authenticated()
  async changePassword(
    @CurrentUser() user: Users,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userBean.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Đã đổi mật khẩu' };
  }
}
