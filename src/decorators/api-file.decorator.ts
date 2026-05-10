import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

interface ApiFileOptions {
  required?: boolean;
  description?: string;
}

export function ApiFile(
  fieldName = 'file',
  options: ApiFileOptions = {},
): MethodDecorator {
  const { required = true, description = 'File upload' } = options;

  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required,
      description,
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
            description,
          },
        },
      },
    }),
  );
}
