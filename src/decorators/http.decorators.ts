import type { PipeTransform } from '@nestjs/common';
import { Param, ParseUUIDPipe } from '@nestjs/common';
import type { Type } from '@nestjs/common/interfaces';
import { ApiParam } from '@nestjs/swagger';

export function UUIDParam(
  property: string,
  ...pipes: Array<Type<PipeTransform> | PipeTransform>
): ParameterDecorator {
  return Param(property, new ParseUUIDPipe({ version: '4' }), ...pipes);
}

export function ApiUUIDParam(property: string): MethodDecorator {
  return ApiParam({
    name: property,
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: `${property} (UUID v4)`,
  });
}
