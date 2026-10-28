import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CallResult, LeadStatus } from '../enums';
import { SalesDue } from '../lead/lead-query.bean';
import { Trim } from '../validation';

export class SalesLeadQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo MST / SĐT' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus, { message: 'Trạng thái không hợp lệ' })
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: SalesDue })
  @IsOptional()
  @IsEnum(SalesDue, { message: 'Bộ lọc hạn chăm sóc không hợp lệ' })
  due?: SalesDue;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;
}

export class LogCallDto {
  @ApiProperty({ enum: CallResult })
  @IsEnum(CallResult, { message: 'Vui lòng chọn kết quả cuộc gọi' })
  result: CallResult;

  @ApiPropertyOptional({ description: 'Thời lượng (phút)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thời lượng phải là số phút' })
  @Min(0)
  @Max(600)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000, { message: 'Ghi chú tối đa 2000 ký tự' })
  note?: string;

  @ApiPropertyOptional({ enum: LeadStatus, description: 'Trạng thái mới (bỏ trống = giữ nguyên)' })
  @IsOptional()
  @IsEnum(LeadStatus, { message: 'Trạng thái không hợp lệ' })
  status?: LeadStatus;

  @ApiPropertyOptional({ description: 'Bắt buộc khi chuyển sang Dừng' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus, { message: 'Trạng thái không hợp lệ' })
  status: LeadStatus;

  @ApiPropertyOptional({ description: 'Lý do / ghi chú (bắt buộc với Dừng)' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class CallbackDto {
  @ApiPropertyOptional({ description: 'ISO time; null để huỷ lịch', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Thời gian gọi lại không hợp lệ' })
  callbackAt?: Date | null;
}
