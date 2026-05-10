import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'error.invalidCredentials' })
  errorCode: string;

  @ApiProperty({ example: 'Invalid email or password' })
  message: string;

  @ApiPropertyOptional({ type: [Object] })
  errors?: Record<string, string>[];

  @ApiProperty({ example: 1702234567890 })
  timestamp: number;

  @ApiPropertyOptional({ example: '/v1/auth/login' })
  path?: string;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    errors?: Record<string, string>[],
    path?: string,
  ) {
    this.success = false;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.message = message;
    this.errors = errors;
    this.timestamp = Date.now();
    this.path = path;
  }
}
