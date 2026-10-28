import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidationError } from 'class-validator';

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

const firstMessage = (errors: ValidationError[]): string =>
  errors
    .map(
      (error) =>
        Object.values(error.constraints ?? {})[0] ??
        firstMessage(error.children ?? []),
    )
    .find(Boolean) ?? 'Dữ liệu không hợp lệ';

export const toValidationException = (errors: ValidationError[]) =>
  new BadRequestException(firstMessage(errors));
