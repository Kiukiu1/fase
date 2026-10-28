import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { BusinessHoursService } from './business-hours/business-hours.service';
import { CallLogs } from './lead/entity/call-log.entity';
import { LeadAssignments } from './lead/entity/lead-assignment.entity';
import { LeadImports } from './lead/entity/lead-import.entity';
import { LeadStatusHistory } from './lead/entity/lead-status-history.entity';
import { Leads } from './lead/entity/lead.entity';
import { LeadImportBean } from './lead/import/lead-import.bean';
import { LeadAssignmentBean } from './lead/lead-assignment.bean';
import { LeadCareBean } from './lead/lead-care.bean';
import { LeadQueryBean } from './lead/lead-query.bean';
import { LeadStatusBean } from './lead/lead-status.bean';
import { Notifications } from './notification/entity/notification.entity';
import { NotificationBean } from './notification/notification.bean';
import { NotificationController } from './notification/notification.controller';
import { SalesLeadController } from './sales/sales-lead.controller';
import { LeadScheduler } from './scheduler/lead.scheduler';
import { Users } from './user/entity/user.entity';
import { UserBean } from './user/user.bean';

const beans = [
  BusinessHoursService,
  UserBean,
  NotificationBean,
  LeadStatusBean,
  LeadQueryBean,
  LeadAssignmentBean,
  LeadCareBean,
  LeadImportBean,
  AuthService,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      Leads,
      CallLogs,
      LeadStatusHistory,
      LeadAssignments,
      LeadImports,
      Notifications,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('SECRET_KEY'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController, SalesLeadController, NotificationController],
  providers: [...beans, JwtStrategy, LeadScheduler],
  exports: beans,
})
export class DomainModule {}
