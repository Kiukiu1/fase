import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsModule } from './cms/cms.module';
import { dataSourceOptions } from './database/data-source.options';
import { DomainModule } from './domain/domain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...dataSourceOptions(), autoLoadEntities: true }),
    }),
    ScheduleModule.forRoot(),
    DomainModule,
    CmsModule,
  ],
})
export class AppModule {}
