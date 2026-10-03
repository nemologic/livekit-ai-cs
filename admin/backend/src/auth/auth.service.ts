import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../common/config/app-config.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private appConfig: AppConfigService,
  ) {}

  async login(id: string, password: string) {
    const adminId = this.appConfig.adminId;
    const adminPw = this.appConfig.adminPassword;

    if (id !== adminId || password !== adminPw) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = { sub: id, role: 'admin' };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      admin: { id, role: 'admin' },
    };
  }

  getProfile(user: any) {
    return {
      id: user.sub,
      role: user.role,
    };
  }
}
