import { Module } from '@nestjs/common';
import { DomainModule } from 'src/domain/domain.module';
import { AccountController } from './controller/account.controller';
import { HomeController } from './controller/home.controller';
import { ImportController } from './controller/import.controller';
import { LeadController } from './controller/lead.controller';
import { LoginController } from './controller/login.controller';
import { StaffController } from './controller/staff.controller';

@Module({
  imports: [DomainModule],
  controllers: [
    LoginController,
    HomeController,
    LeadController,
    ImportController,
    StaffController,
    AccountController,
  ],
})
export class CmsModule {}
