import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { ActiveStatus, UserRole } from '../enums';
import { Users } from './entity/user.entity';

export const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

export const hashPassword = (password: string) =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

@Injectable()
export class UserBean {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  findById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async findActiveById(id: string) {
    const user = await this.findById(id);
    return user && user.status === ActiveStatus.ACTIVE ? user : null;
  }

  /** Kiểm tra đăng nhập; trả về null nếu sai username/mật khẩu hoặc tài khoản bị khoá. */
  async verifyCredentials(username: string, password: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .getOne();
    if (!user || !(await bcrypt.compare(password, user.password))) return null;
    if (user.status !== ActiveStatus.ACTIVE) return null;
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`,
      );
    }
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!(await bcrypt.compare(currentPassword ?? '', user.password))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    await this.userRepository.update(userId, {
      password: await hashPassword(newPassword),
    });
  }

  /** Nhân viên Sales đang hoạt động thuộc trưởng phòng (FR-CRM-06). */
  findSalesOfManager(managerId: string) {
    return this.userRepository.find({
      where: {
        managerId,
        role: UserRole.SALES,
        status: ActiveStatus.ACTIVE,
      },
      order: { fullName: 'ASC' },
    });
  }

  /** Lấy đúng các nhân viên được chọn, báo lỗi nếu có người không thuộc phòng. */
  async findSalesOfManagerByIds(managerId: string, salesIds: string[]) {
    const uniqueIds = [...new Set(salesIds.filter(Boolean))];
    if (!uniqueIds.length) {
      throw new BadRequestException('Cần chọn ít nhất một nhân viên');
    }
    const sales = await this.userRepository.find({
      where: {
        id: In(uniqueIds),
        managerId,
        role: UserRole.SALES,
        status: ActiveStatus.ACTIVE,
      },
    });
    if (sales.length !== uniqueIds.length) {
      throw new BadRequestException('Có nhân viên không thuộc phòng của bạn');
    }
    return uniqueIds.map((id) => sales.find((user) => user.id === id)!);
  }
}
